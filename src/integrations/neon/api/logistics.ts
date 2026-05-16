import { getActiveLaneId, queryNeon } from "../client";

export type RouteClassification = "PRIMARY" | "ALTERNATE" | "BLOCKED" | "CONTINGENCY";
export type WaypointType =
  | "origin"
  | "airport"
  | "border_formal"
  | "border_informal"
  | "staging_hub"
  | "transit"
  | "final_delivery";

export interface LogisticsRouteRow {
  id: string;
  lane_id: string;
  corridor_id: string;
  name: string;
  classification: RouteClassification;
  purpose: string;
  supply_classes: string[];
  origin_name: string;
  origin_cc: string;
  destination_name: string;
  destination_cc: string;
  total_km: number;
  estimated_hours: number;
  modes: string[];
  risk_class: string;
  risk_score: number;
  cold_chain_capable: boolean;
  cost_class: string;
  formal_crossings_used: string[];
  blocked_reason: string | null;
  derived_from_evidence: string[];
  valid_from: string;
  valid_until: string | null;
  computed_at: string;
  style_color: string;
  style_dash_pattern: number[];
  notes: string | null;
}

export interface LogisticsWaypointRow {
  id: string;
  lane_id: string;
  route_id: string;
  seq: number;
  name: string;
  lat: number;
  lng: number;
  alt_m: number;
  country_code: string;
  waypoint_type: WaypointType;
  leg_mode: string | null;
  leg_km: number | null;
  leg_hours: number | null;
  leg_risk_score: number | null;
  operator: string | null;
  notes: string | null;
}

export interface LogisticsRouteWithWaypoints extends LogisticsRouteRow {
  waypoints: LogisticsWaypointRow[];
}

const CLASSIFICATION_ORDER: Record<RouteClassification, number> = {
  PRIMARY: 1,
  ALTERNATE: 2,
  CONTINGENCY: 3,
  BLOCKED: 4,
};

const ITURI_CORRIDOR_ID = "CORRIDOR-CD-UG-ITU-001";

const ITURI_STATIC_LOGISTICS_ROUTES: LogisticsRouteWithWaypoints[] = [
  {
    id: "LR-CD-UG-ITU-PRIMARY-AIR-001",
    lane_id: "static",
    corridor_id: ITURI_CORRIDOR_ID,
    name: "Entebbe -> Bunia -> Mongwalu (Air Bridge)",
    classification: "PRIMARY",
    purpose: "EBOLA RESPONSE SUPPLY",
    supply_classes: ["VACCINE", "PPE", "LAB-SAMPLES", "MEDICAL-EQUIPMENT"],
    origin_name: "Entebbe International Airport",
    origin_cc: "UG",
    destination_name: "Mongwalu (Djugu Health Zone)",
    destination_cc: "CD",
    total_km: 580,
    estimated_hours: 5,
    modes: ["AIR", "TRUCK"],
    risk_class: "LOW",
    risk_score: 0.18,
    cold_chain_capable: true,
    cost_class: "HIGH",
    formal_crossings_used: ["Bunia Airport Customs"],
    blocked_reason: null,
    derived_from_evidence: ["TE-ITU-EBO-001", "TE-ITU-EBO-002", "TE-ITU-ADF-001"],
    valid_from: "2026-05-16T00:00:00Z",
    valid_until: null,
    computed_at: "2026-05-16T00:00:00Z",
    style_color: "#22c55e",
    style_dash_pattern: [6, 3],
    notes: "Bypasses land conflict buffers. Cold-chain maintained for outbreak response payload.",
    waypoints: [
      { id: "LW-PRIM-001-0", lane_id: "static", route_id: "LR-CD-UG-ITU-PRIMARY-AIR-001", seq: 0, name: "Entebbe International Airport", lat: 0.042, lng: 32.4435, alt_m: 1155, country_code: "UG", waypoint_type: "origin", leg_mode: null, leg_km: null, leg_hours: null, leg_risk_score: null, operator: null, notes: "Regional humanitarian flight hub" },
      { id: "LW-PRIM-001-1", lane_id: "static", route_id: "LR-CD-UG-ITU-PRIMARY-AIR-001", seq: 1, name: "Bunia Airport (Murongo)", lat: 1.5722, lng: 30.2206, alt_m: 1300, country_code: "CD", waypoint_type: "airport", leg_mode: "AIR", leg_km: 520, leg_hours: 1.5, leg_risk_score: 0.05, operator: "UNHAS", notes: "Cargo offload and customs" },
      { id: "LW-PRIM-001-2", lane_id: "static", route_id: "LR-CD-UG-ITU-PRIMARY-AIR-001", seq: 2, name: "Bunia Staging Hub", lat: 1.5667, lng: 30.25, alt_m: 1280, country_code: "CD", waypoint_type: "staging_hub", leg_mode: "TRUCK", leg_km: 3, leg_hours: 0.3, leg_risk_score: 0.2, operator: "MSF-Convoy", notes: "PPE breakout and cold-chain transfer" },
      { id: "LW-PRIM-001-3", lane_id: "static", route_id: "LR-CD-UG-ITU-PRIMARY-AIR-001", seq: 3, name: "Mongwalu Health Centre", lat: 1.9667, lng: 30.05, alt_m: 1180, country_code: "CD", waypoint_type: "final_delivery", leg_mode: "TRUCK", leg_km: 60, leg_hours: 3.2, leg_risk_score: 0.35, operator: "MSF-Convoy", notes: "Final delivery to outbreak epicenter" },
    ],
  },
  {
    id: "LR-CD-UG-ITU-ALTERNATE-GROUND-001",
    lane_id: "static",
    corridor_id: ITURI_CORRIDOR_ID,
    name: "Kampala -> Arua -> Mahagi -> Bunia -> Mongwalu (Ground)",
    classification: "ALTERNATE",
    purpose: "EBOLA RESPONSE SUPPLY",
    supply_classes: ["FOOD", "WATER", "SHELTER", "BULK-PPE", "NON-COLD-CHAIN-MEDICAL"],
    origin_name: "Kampala (WFP Logistics Hub)",
    origin_cc: "UG",
    destination_name: "Mongwalu (Djugu Health Zone)",
    destination_cc: "CD",
    total_km: 690,
    estimated_hours: 30,
    modes: ["TRUCK"],
    risk_class: "MODERATE",
    risk_score: 0.52,
    cold_chain_capable: false,
    cost_class: "LOW",
    formal_crossings_used: ["Goli", "Mahagi"],
    blocked_reason: null,
    derived_from_evidence: ["TE-ITU-EBO-001", "TE-ITU-ADF-002", "TF-ITU-DIS-001"],
    valid_from: "2026-05-16T00:00:00Z",
    valid_until: null,
    computed_at: "2026-05-16T00:00:00Z",
    style_color: "#f59e0b",
    style_dash_pattern: [4, 4],
    notes: "Formal monitored crossing for high-volume bulk supplies.",
    waypoints: [
      { id: "LW-ALT-001-0", lane_id: "static", route_id: "LR-CD-UG-ITU-ALTERNATE-GROUND-001", seq: 0, name: "Kampala (WFP Logistics Hub)", lat: 0.3476, lng: 32.5825, alt_m: 1190, country_code: "UG", waypoint_type: "origin", leg_mode: null, leg_km: null, leg_hours: null, leg_risk_score: null, operator: null, notes: "Regional bulk stockpile" },
      { id: "LW-ALT-001-1", lane_id: "static", route_id: "LR-CD-UG-ITU-ALTERNATE-GROUND-001", seq: 1, name: "Arua OCHA Hub", lat: 3.02, lng: 30.91, alt_m: 1200, country_code: "UG", waypoint_type: "staging_hub", leg_mode: "TRUCK", leg_km: 480, leg_hours: 8, leg_risk_score: 0.15, operator: "WFP-Logistics", notes: "West Nile coordination and refuel" },
      { id: "LW-ALT-001-2", lane_id: "static", route_id: "LR-CD-UG-ITU-ALTERNATE-GROUND-001", seq: 2, name: "Goli Border Post", lat: 2.34, lng: 31.005, alt_m: 720, country_code: "UG", waypoint_type: "border_formal", leg_mode: "TRUCK", leg_km: 70, leg_hours: 2, leg_risk_score: 0.25, operator: "WFP-Logistics", notes: "Formal Uganda-side border post" },
      { id: "LW-ALT-001-3", lane_id: "static", route_id: "LR-CD-UG-ITU-ALTERNATE-GROUND-001", seq: 3, name: "Mahagi (DRC Entry)", lat: 2.3, lng: 30.98, alt_m: 740, country_code: "CD", waypoint_type: "border_formal", leg_mode: "TRUCK", leg_km: 5, leg_hours: 0.5, leg_risk_score: 0.3, operator: "WFP-Logistics", notes: "DRC customs and escort handover" },
      { id: "LW-ALT-001-4", lane_id: "static", route_id: "LR-CD-UG-ITU-ALTERNATE-GROUND-001", seq: 4, name: "Bunia Staging Hub", lat: 1.5667, lng: 30.25, alt_m: 1280, country_code: "CD", waypoint_type: "staging_hub", leg_mode: "TRUCK", leg_km: 130, leg_hours: 6.5, leg_risk_score: 0.55, operator: "MONUSCO-escort", notes: "Mahagi-Bunia road via Djugu plains" },
      { id: "LW-ALT-001-5", lane_id: "static", route_id: "LR-CD-UG-ITU-ALTERNATE-GROUND-001", seq: 5, name: "Mongwalu Health Centre", lat: 1.9667, lng: 30.05, alt_m: 1180, country_code: "CD", waypoint_type: "final_delivery", leg_mode: "TRUCK", leg_km: 60, leg_hours: 3.5, leg_risk_score: 0.4, operator: "MSF-Convoy", notes: "Final delivery to outbreak epicenter" },
    ],
  },
  {
    id: "LR-CD-UG-ITU-BLOCKED-SOUTH-001",
    lane_id: "static",
    corridor_id: ITURI_CORRIDOR_ID,
    name: "Kigali -> Goma -> Beni -> Bunia -> Mongwalu (BLOCKED)",
    classification: "BLOCKED",
    purpose: "EBOLA RESPONSE SUPPLY",
    supply_classes: ["ANY"],
    origin_name: "Kigali International Airport",
    origin_cc: "RW",
    destination_name: "Mongwalu (Djugu Health Zone)",
    destination_cc: "CD",
    total_km: 750,
    estimated_hours: 36,
    modes: ["TRUCK"],
    risk_class: "BLOCKED",
    risk_score: 1,
    cold_chain_capable: false,
    cost_class: "LOW",
    formal_crossings_used: [],
    blocked_reason: "M23 occupation of Goma and ADF pressure on the Beni-Mambasa axis make transit infeasible.",
    derived_from_evidence: ["TE-ITU-ADF-001", "TE-ITU-ADF-002", "TE-ITU-ADF-003"],
    valid_from: "2026-05-16T00:00:00Z",
    valid_until: null,
    computed_at: "2026-05-16T00:00:00Z",
    style_color: "#ef4444",
    style_dash_pattern: [2, 6],
    notes: "Displayed for transparency as a rejected route.",
    waypoints: [
      { id: "LW-BLK-001-0", lane_id: "static", route_id: "LR-CD-UG-ITU-BLOCKED-SOUTH-001", seq: 0, name: "Kigali (origin)", lat: -1.9686, lng: 30.1395, alt_m: 1567, country_code: "RW", waypoint_type: "origin", leg_mode: null, leg_km: null, leg_hours: null, leg_risk_score: null, operator: null, notes: null },
      { id: "LW-BLK-001-1", lane_id: "static", route_id: "LR-CD-UG-ITU-BLOCKED-SOUTH-001", seq: 1, name: "Goma (M23-occupied)", lat: -1.679, lng: 29.2206, alt_m: 1493, country_code: "CD", waypoint_type: "transit", leg_mode: "TRUCK", leg_km: 160, leg_hours: 5, leg_risk_score: 1, operator: null, notes: "BLOCKED - M23 occupation" },
      { id: "LW-BLK-001-2", lane_id: "static", route_id: "LR-CD-UG-ITU-BLOCKED-SOUTH-001", seq: 2, name: "Beni (ADF zone)", lat: 0.5, lng: 29.47, alt_m: 1050, country_code: "CD", waypoint_type: "transit", leg_mode: "TRUCK", leg_km: 350, leg_hours: 12, leg_risk_score: 0.98, operator: null, notes: "BLOCKED - ADF active operations" },
      { id: "LW-BLK-001-3", lane_id: "static", route_id: "LR-CD-UG-ITU-BLOCKED-SOUTH-001", seq: 3, name: "Mongwalu (intended destination)", lat: 1.9667, lng: 30.05, alt_m: 1180, country_code: "CD", waypoint_type: "final_delivery", leg_mode: "TRUCK", leg_km: 60, leg_hours: 4, leg_risk_score: 0.35, operator: null, notes: "Destination unreachable via this corridor" },
    ],
  },
];

function fallbackRoutes(corridorId: string): LogisticsRouteWithWaypoints[] {
  return corridorId === ITURI_CORRIDOR_ID ? ITURI_STATIC_LOGISTICS_ROUTES : [];
}

export async function fetchLogisticsRoutes(
  corridorId: string
): Promise<LogisticsRouteWithWaypoints[]> {
  const laneId = await getActiveLaneId();
  if (!laneId) return fallbackRoutes(corridorId);

  const now = new Date().toISOString();

  let routes: LogisticsRouteRow[] = [];
  let waypoints: LogisticsWaypointRow[] = [];

  try {
    [routes, waypoints] = await Promise.all([
      queryNeon<LogisticsRouteRow>(
        `SELECT *
         FROM logistics_routes
         WHERE corridor_id = $1
           AND lane_id = $2
           AND (valid_until IS NULL OR valid_until > $3)
         ORDER BY computed_at DESC`,
        [corridorId, laneId, now]
      ),
      queryNeon<LogisticsWaypointRow>(
        `SELECT lw.*
         FROM logistics_waypoints lw
         JOIN logistics_routes lr ON lr.id = lw.route_id
         WHERE lr.corridor_id = $1
           AND lr.lane_id = $2
           AND (lr.valid_until IS NULL OR lr.valid_until > $3)
         ORDER BY lw.route_id, lw.seq`,
        [corridorId, laneId, now]
      ),
    ]);
  } catch (err) {
    console.warn("[Neon] logistics route query failed; using static fallback when available", err);
    return fallbackRoutes(corridorId);
  }

  if (routes.length === 0) return fallbackRoutes(corridorId);

  const byRoute = new Map<string, LogisticsWaypointRow[]>();
  for (const waypoint of waypoints) {
    const bucket = byRoute.get(waypoint.route_id) ?? [];
    bucket.push(waypoint);
    byRoute.set(waypoint.route_id, bucket);
  }

  return routes
    .map((route) => ({
      ...route,
      waypoints: byRoute.get(route.id) ?? [],
    }))
    .sort((a, b) => {
      const ao = CLASSIFICATION_ORDER[a.classification] ?? 99;
      const bo = CLASSIFICATION_ORDER[b.classification] ?? 99;
      if (ao !== bo) return ao - bo;
      return b.computed_at.localeCompare(a.computed_at);
    });
}

export async function fetchPrimaryRoute(
  corridorId: string
): Promise<LogisticsRouteWithWaypoints | null> {
  const routes = await fetchLogisticsRoutes(corridorId);
  return routes.find((route) => route.classification === "PRIMARY") ?? null;
}

export function buildRecommendationSummary(
  routes: LogisticsRouteWithWaypoints[]
): string {
  const primary = routes.find((route) => route.classification === "PRIMARY");
  const alternate = routes.find((route) => route.classification === "ALTERNATE");
  const blocked = routes.filter((route) => route.classification === "BLOCKED");

  const parts: string[] = [];
  if (primary) {
    parts.push(
      `Primary route '${primary.name}' - ${Math.round(primary.total_km)}km, ` +
        `~${primary.estimated_hours.toFixed(1)}h, risk ${primary.risk_class}, ` +
        `cold-chain ${primary.cold_chain_capable ? "maintained" : "not maintained"}.`
    );
  }
  if (alternate) {
    parts.push(
      `Alternate '${alternate.name}' for bulk supplies ` +
        `(${Math.round(alternate.total_km)}km, ~${alternate.estimated_hours.toFixed(1)}h).`
    );
  }
  if (blocked.length) {
    parts.push(`${blocked.length} route(s) rejected by current evidence.`);
  }

  return parts.length ? parts.join(" ") : "No active logistics routes for this corridor.";
}
