import mapboxgl from "mapbox-gl";
import type {
  LogisticsRouteWithWaypoints,
  RouteClassification,
} from "@/integrations/neon/api/logistics";

const SOURCE_ID = "logistics-routes";

export const LOGISTICS_ROUTE_LINE_LAYER_IDS = [
  "logistics-routes-primary-highlight",
  "logistics-routes-lines-primary",
  "logistics-routes-lines-alternate",
  "logistics-routes-lines-contingency",
  "logistics-routes-lines-blocked",
];

export const LOGISTICS_LAYER_IDS = [
  ...LOGISTICS_ROUTE_LINE_LAYER_IDS,
  "logistics-routes-waypoints",
  "logistics-routes-waypoint-labels",
];

const DASH_BY_CLASS: Record<RouteClassification, number[]> = {
  PRIMARY: [6, 3],
  ALTERNATE: [4, 4],
  BLOCKED: [2, 6],
  CONTINGENCY: [3, 3],
};

function routesToGeoJSON(routes: LogisticsRouteWithWaypoints[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const route of routes) {
    const waypoints = [...route.waypoints].sort((a, b) => a.seq - b.seq);
    const waypointChain = waypoints.map((waypoint) => waypoint.name).join(" -> ");
    if (waypoints.length >= 2) {
      features.push({
        type: "Feature",
        id: `${route.id}-line`,
        properties: {
          route_id: route.id,
          kind: "route_line",
          classification: route.classification,
          name: route.name,
          color: route.style_color,
          risk_class: route.risk_class,
          risk_score: route.risk_score,
          total_km: route.total_km,
          estimated_hours: route.estimated_hours,
          blocked_reason: route.blocked_reason,
          purpose: route.purpose,
          cold_chain_capable: route.cold_chain_capable,
          modes: route.modes.join(" -> "),
          waypoint_count: waypoints.length,
          waypoint_chain: waypointChain,
          movement_summary:
            route.classification === "PRIMARY"
              ? "Recommended response movement. Prioritizes speed, risk reduction, and cold-chain continuity."
              : route.classification === "ALTERNATE"
                ? "Bulk movement option. Slower route for non-cold-chain or high-volume supplies."
                : route.classification === "BLOCKED"
                  ? "Rejected movement path. Displayed for transparency because current evidence makes transit unsafe."
                  : "Contingency movement path for changed operating conditions.",
        },
        geometry: {
          type: "LineString",
          coordinates: waypoints.map((waypoint) => [waypoint.lng, waypoint.lat]),
        },
      });
    }

    for (const waypoint of waypoints) {
      features.push({
        type: "Feature",
        id: waypoint.id,
        properties: {
          route_id: route.id,
          route_name: route.name,
          kind: "waypoint",
          classification: route.classification,
          waypoint_type: waypoint.waypoint_type,
          seq: waypoint.seq,
          name: waypoint.name,
          leg_mode: waypoint.leg_mode,
          leg_km: waypoint.leg_km,
          leg_hours: waypoint.leg_hours,
          leg_risk_score: waypoint.leg_risk_score,
          operator: waypoint.operator,
          notes: waypoint.notes,
          color: route.style_color,
          movement_summary:
            waypoint.leg_mode && waypoint.leg_km != null
              ? `${waypoint.leg_mode} leg into ${waypoint.name}: ${Math.round(waypoint.leg_km)} km, ${waypoint.leg_hours ?? "?"}h.`
              : `Waypoint ${waypoint.seq + 1} on ${route.name}.`,
        },
        geometry: {
          type: "Point",
          coordinates: [waypoint.lng, waypoint.lat],
        },
      });
    }
  }

  return { type: "FeatureCollection", features };
}

export function drawLogisticsRoutes(
  map: mapboxgl.Map,
  routes: LogisticsRouteWithWaypoints[]
) {
  const data = routesToGeoJSON(routes);

  if (map.getSource(SOURCE_ID)) {
    (map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource).setData(data);
  } else {
    map.addSource(SOURCE_ID, { type: "geojson", data });
  }

  for (const cls of Object.keys(DASH_BY_CLASS) as RouteClassification[]) {
    const layerId = `logistics-routes-lines-${cls.toLowerCase()}`;
    if (map.getLayer(layerId)) continue;

    map.addLayer({
      id: layerId,
      type: "line",
      source: SOURCE_ID,
      filter: [
        "all",
        ["==", ["get", "kind"], "route_line"],
        ["==", ["get", "classification"], cls],
      ],
      layout: { "line-cap": "butt", "line-join": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.4, 6, 2.6, 10, 4.2],
        "line-opacity": cls === "BLOCKED" ? 0.55 : 0.94,
        "line-dasharray": DASH_BY_CLASS[cls],
      },
    });
  }

  if (!map.getLayer("logistics-routes-primary-highlight")) {
    map.addLayer({
      id: "logistics-routes-primary-highlight",
      type: "line",
      source: SOURCE_ID,
      filter: [
        "all",
        ["==", ["get", "kind"], "route_line"],
        ["==", ["get", "classification"], "PRIMARY"],
      ],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#86efac",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 5, 6, 8, 10, 12],
        "line-opacity": 0.42,
        "line-blur": 3,
      },
    });
  }

  if (!map.getLayer("logistics-routes-waypoints")) {
    map.addLayer({
      id: "logistics-routes-waypoints",
      type: "circle",
      source: SOURCE_ID,
      filter: ["==", ["get", "kind"], "waypoint"],
      paint: {
        "circle-radius": [
          "match",
          ["get", "waypoint_type"],
          "final_delivery",
          8,
          "origin",
          7,
          "airport",
          6,
          "border_formal",
          6,
          "staging_hub",
          5,
          "transit",
          4,
          4,
        ],
        "circle-color": ["get", "color"],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#0a0a0a",
        "circle-opacity": ["case", ["==", ["get", "classification"], "BLOCKED"], 0.55, 0.95],
      },
    });
  }

  if (!map.getLayer("logistics-routes-waypoint-labels")) {
    map.addLayer({
      id: "logistics-routes-waypoint-labels",
      type: "symbol",
      source: SOURCE_ID,
      filter: [
        "all",
        ["==", ["get", "kind"], "waypoint"],
        [
          "in",
          ["get", "waypoint_type"],
          ["literal", ["origin", "final_delivery", "staging_hub", "border_formal", "airport"]],
        ],
      ],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
        "text-size": 11,
        "text-offset": [0, 1.4],
        "text-anchor": "top",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "#0a0a0a",
        "text-halo-width": 1.2,
      },
    });
  }
}

export function removeLogisticsRoutes(map: mapboxgl.Map) {
  for (const id of LOGISTICS_LAYER_IDS) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}

export function toggleLogisticsRoutes(map: mapboxgl.Map, visible: boolean) {
  const visibility = visible ? "visible" : "none";
  for (const id of LOGISTICS_LAYER_IDS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility);
  }
}

