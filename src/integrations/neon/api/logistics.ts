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

export async function fetchLogisticsRoutes(
  corridorId: string
): Promise<LogisticsRouteWithWaypoints[]> {
  const laneId = await getActiveLaneId();
  if (!laneId) return [];

  const now = new Date().toISOString();

  const [routes, waypoints] = await Promise.all([
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
