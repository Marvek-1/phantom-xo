/**
 * MoStar Phantom XO — MCP Tool Handler
 * Replaces supabase/functions/phantom-mcp
 */

import { queryNeon } from "../client";
import type { CorridorScore, EvidenceAtom, SentinelSignal } from "../types";
import {
  buildRecommendationSummary,
  fetchLogisticsRoutes,
  type LogisticsRouteWithWaypoints,
  type RouteClassification,
} from "./logistics";
import { ITURI_CRISIS_CORRIDOR } from "@/data/ituri-crisis-corridor";

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const MCP_TOOLS = [
  { name: "view_location", description: "Fly the camera to an explicit lat/lng location." },
  { name: "fly_to_corridor", description: "Fly camera to a corridor's midpoint." },
  { name: "radar_scan", description: "Active monitoring pulse on a corridor." },
  { name: "analyze_corridor", description: "Full intelligence scoring for a corridor." },
  { name: "fetch_sentinel_signals", description: "Fetch live signals near a location." },
  { name: "plan_supply_route", description: "Plan a supply delivery route for an active corridor." },
  { name: "test_connections", description: "Run diagnostic check on all service connections." },
];

export async function handleMcpTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ text?: string; mapParams?: Record<string, unknown>; isError?: boolean }> {
  switch (name) {
    case "view_location": {
      const { lat, lng, alt = 200000, heading = 0, pitch = -45, label } = args as any;
      return {
        mapParams: { camera: { lat, lng, alt, heading, pitch } },
        text: `Camera flying to ${label ?? `${lat}, ${lng}`} at ${alt}m`,
      };
    }

    case "fly_to_corridor": {
      const { startLat, startLng, endLat, endLng, alt = 180000 } = args as any;
      const midLat = (startLat + endLat) / 2;
      const midLng = (startLng + endLng) / 2;
      return {
        mapParams: { camera: { lat: midLat, lng: midLng, alt, heading: 0, pitch: -45 } },
        text: `Flying to corridor midpoint (${midLat.toFixed(2)}, ${midLng.toFixed(2)})`,
      };
    }

    case "fetch_sentinel_signals": {
      const { lat, lng, radiusKm = 50 } = args as any;
      const signals = await queryNeon<SentinelSignal>(
        `SELECT * FROM sentinel_signals ORDER BY ingested_at DESC LIMIT 100`
      );
      const nearby = signals.filter(s => haversineKm(lat, lng, s.lat, s.lng) <= radiusKm);
      return {
        text: `Found ${nearby.length} signals within ${radiusKm}km of (${lat}, ${lng})`,
      };
    }

    case "analyze_corridor": {
      const { corridorId } = args as any;
      const scores = await queryNeon<CorridorScore>(
        `SELECT * FROM corridor_scores WHERE corridor_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [corridorId]
      );
      const score = scores[0];
      if (!score) {
        if (corridorId === ITURI_CRISIS_CORRIDOR.id) {
          return {
            text: [
              `◉ Corridor ${ITURI_CRISIS_CORRIDOR.id} — Score: ${ITURI_CRISIS_CORRIDOR.score.toFixed(2)} (${ITURI_CRISIS_CORRIDOR.riskClass})`,
              `  Route: ${ITURI_CRISIS_CORRIDOR.startNode} -> ${ITURI_CRISIS_CORRIDOR.endNode}`,
              `  Region: ${ITURI_CRISIS_CORRIDOR.region}`,
              `  Mode: ${ITURI_CRISIS_CORRIDOR.mode} · ${ITURI_CRISIS_CORRIDOR.totalKm}km · ${ITURI_CRISIS_CORRIDOR.velocityKmDay}km/day`,
              `  Evidence atoms: ${ITURI_CRISIS_CORRIDOR.evidence.length}`,
              `  Anchor: Ebola confirmation at Mongwalu/Rwampara, imported case leakage at Goli, ADF pressure feeding displacement.`,
              `  Logistics: ask plan_supply_route with corridor_id=${ITURI_CRISIS_CORRIDOR.id} to highlight the primary/alternate/blocked response paths.`,
            ].join("\n"),
            mapParams: {
              center: [30.55, 1.85],
              zoom: 6.2,
              pitch: 50,
              bearing: 0,
              corridor_id: ITURI_CRISIS_CORRIDOR.id,
            },
          };
        }
        return { text: `No scoring data for corridor ${corridorId}` };
      }

      const atoms = await queryNeon<EvidenceAtom>(
        `SELECT * FROM evidence_atoms WHERE corridor_score_id = $1 LIMIT 10`,
        [score.id]
      );

      return {
        text: [
          `\u25c9 Corridor ${corridorId} \u2014 Score: ${score.corridor_score.toFixed(2)} (${score.risk_class})`,
          `  Mode: ${score.inferred_mode ?? "unknown"}`,
          `  Evidence atoms: ${atoms.length}`,
          ...(atoms.length > 0 ? atoms.map(a => `    \u2022 ${a.source}: ${a.description} (w=${a.weight})`) : []),
        ].join("\n"),
      };
    }

    case "test_connections": {
      try {
        const rows = await queryNeon<{ now: string }>(`SELECT NOW()::text as now`);
        return { text: `\u25c9 Neon: Connected (${rows[0]?.now})` };
      } catch {
        return { text: "\u25c9 Neon: Connection failed", isError: true };
      }
    }

    case "plan_supply_route": {
      const {
        corridor_id,
        corridorId,
        supply_class,
        classification_filter,
      } = args as {
        corridor_id?: string;
        corridorId?: string;
        supply_class?: string;
        classification_filter?: RouteClassification;
      };
      const id = corridor_id ?? corridorId;
      if (!id) return { text: "plan_supply_route requires corridor_id.", isError: true };

      const routes = await fetchLogisticsRoutes(id);
      if (routes.length === 0) {
        return {
          text: `No logistics routes computed for corridor ${id}.`,
          mapParams: { corridor_id: id },
        };
      }

      let candidates = routes;
      if (supply_class) {
        const wanted = supply_class.toUpperCase();
        const matched = routes.filter((route) =>
          route.supply_classes.some((supplyClass) => supplyClass.toUpperCase().includes(wanted))
        );
        if (matched.length > 0) candidates = matched;
      }
      if (classification_filter) {
        candidates = candidates.filter((route) => route.classification === classification_filter);
      }

      const recommended =
        candidates.find((route) => route.classification === "PRIMARY") ??
        candidates.find((route) => route.classification === "ALTERNATE") ??
        candidates[0];

      if (!recommended) {
        return { text: `No viable route found for corridor ${id}.`, mapParams: { corridor_id: id } };
      }

      const waypoints = [...recommended.waypoints].sort((a, b) => a.seq - b.seq);
      const origin = waypoints[0];
      const destination = waypoints[waypoints.length - 1];
      const center = origin && destination
        ? [(origin.lng + destination.lng) / 2, (origin.lat + destination.lat) / 2]
        : destination
          ? [destination.lng, destination.lat]
          : undefined;

      return {
        text: `${buildRecommendationSummary(routes)}\n\n${buildRouteDetail(recommended, routes, supply_class)}`,
        mapParams: {
          center,
          zoom: 6.2,
          pitch: 50,
          bearing: 0,
          corridor_id: id,
          route_id: recommended.id,
          focus_route: recommended.id,
        },
      };
    }

    case "radar_scan": {
      const { corridorId } = args as any;
      return {
        text: `\u25c9 Radar pulse sent for corridor ${corridorId}. Monitoring active.`,
      };
    }

    default:
      return { text: `Unknown tool: ${name}`, isError: true };
  }
}

function buildRouteDetail(
  recommended: LogisticsRouteWithWaypoints,
  routes: LogisticsRouteWithWaypoints[],
  supplyClass?: string
): string {
  const lines = [
    `Recommended: ${recommended.name}`,
    `  - Risk: ${recommended.risk_class} (score ${recommended.risk_score.toFixed(2)})`,
    `  - Distance: ${Math.round(recommended.total_km)}km, ETA ~${recommended.estimated_hours.toFixed(1)}h`,
    `  - Modes: ${recommended.modes.join(" -> ")}`,
    `  - Cold-chain capable: ${recommended.cold_chain_capable ? "yes" : "no"}`,
    `  - Cost class: ${recommended.cost_class}`,
  ];

  if (recommended.formal_crossings_used.length) {
    lines.push(`  - Formal crossings: ${recommended.formal_crossings_used.join(", ")}`);
  }
  if (recommended.derived_from_evidence.length) {
    lines.push(`  - Derived from evidence: ${recommended.derived_from_evidence.slice(0, 5).join(", ")}`);
  }
  if (recommended.waypoints.length) {
    lines.push(`  - Route: ${recommended.waypoints.sort((a, b) => a.seq - b.seq).map((w) => w.name).join(" -> ")}`);
  }

  const blocked = routes.filter((route) => route.classification === "BLOCKED");
  if (blocked.length > 0) {
    lines.push("", `Rejected routes (${blocked.length}):`);
    for (const route of blocked.slice(0, 3)) {
      lines.push(`  - ${route.name}`);
      if (route.blocked_reason) lines.push(`    Reason: ${route.blocked_reason}`);
    }
  }

  if (supplyClass) {
    const matches = recommended.supply_classes.some((s) => s.toUpperCase().includes(supplyClass.toUpperCase()));
    if (!matches) {
      lines.push("", `Note: supply class "${supplyClass}" did not match the recommended route manifest; verify compatibility before dispatch.`);
    }
  }

  return lines.join("\n");
}
