import type { MapboxDrawContext, CorridorMeta } from "./types";
import { RISK_COLORS } from "./types";

const FORMAL_BLUE = "#3B82F6";

export interface CoverageStats {
  monitoredPct: number;
  unmonitoredPct: number;
  totalCorridors: number;
  totalPhantomKm: number;
  totalFormalKm: number;
}

export interface DrawCorridorsResult {
  meta: CorridorMeta[];
  phantomLayerIds: string[];
  coverageStats: CoverageStats;
}

export async function drawCorridors(ctx: MapboxDrawContext): Promise<DrawCorridorsResult> {
  const { map } = ctx;

  const [pairedRes, metaRes, formalRes] = await Promise.all([
    fetch("/data/corridors_paired.geojson"),
    fetch("/data/corridors_meta.json"),
    fetch("/data/formal/all_formal_routes.geojson"),
  ]);

  const paired = await pairedRes.json();
  const meta: CorridorMeta[] = await metaRes.json();
  console.log("[Mapbox] Paired GeoJSON loaded:", paired.features.length, "features");

  // ── Separate features by type ──
  const phantomLines: GeoJSON.Feature[] = [];
  const formalLinesOld: GeoJSON.Feature[] = [];
  const nodePoints: GeoJSON.Feature[] = [];

  for (const feature of paired.features) {
    const rt = feature.properties?.route_type;
    const gt = feature.geometry?.type;
    if (gt === "LineString" && rt === "PHANTOM") phantomLines.push(feature);
    else if (gt === "LineString" && rt === "FORMAL") formalLinesOld.push(feature);
    else if (gt === "Point") nodePoints.push(feature);
  }

  // ── 1. Phantom corridors (per-feature line-gradient) ──
  const phantomLayerIds: string[] = [];

  for (let i = 0; i < phantomLines.length; i++) {
    const f = phantomLines[i];
    const cid = f.properties?.id ?? `phantom-${i}`;
    const srcId = `phantom-src-${cid}`;
    const lyrId = `phantom-line-${cid}`;

    map.addSource(srcId, {
      type: "geojson",
      data: f as GeoJSON.Feature,
      lineMetrics: true,
    });

    map.addLayer({
      id: lyrId,
      type: "line",
      source: srcId,
      paint: {
        "line-color": "red",
        "line-width": 5,
        "line-gradient": [
          "interpolate",
          ["linear"],
          ["line-progress"],
          0, "blue",
          0.1, "royalblue",
          0.3, "cyan",
          0.5, "lime",
          0.7, "yellow",
          1, "red",
        ],
      },
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
    });

    phantomLayerIds.push(lyrId);
  }

  // Phantom corridor labels at midpoints
  const phantomLabelFeatures: GeoJSON.Feature[] = phantomLines.map((f) => {
    const coords = (f.geometry as GeoJSON.LineString).coordinates;
    const mid = coords[Math.floor(coords.length / 2)];
    return {
      type: "Feature",
      properties: {
        name: f.properties?.name ?? "",
        risk_class: f.properties?.risk_class ?? "",
        score: f.properties?.score ?? 0,
      },
      geometry: { type: "Point", coordinates: mid },
    };
  });

  map.addSource("phantom-labels", {
    type: "geojson",
    data: { type: "FeatureCollection", features: phantomLabelFeatures },
  });

  map.addLayer({
    id: "phantom-corridor-labels",
    type: "symbol",
    source: "phantom-labels",
    layout: {
      "text-field": ["concat", ["get", "name"], "\n", ["get", "risk_class"], " · ", ["to-string", ["get", "score"]]],
      "text-font": ["Open Sans Bold"],
      "text-size": 10,
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": [
        "match", ["get", "risk_class"],
        "CRITICAL", RISK_COLORS.CRITICAL,
        "HIGH", RISK_COLORS.HIGH,
        "ELEVATED", RISK_COLORS.ELEVATED,
        "MODERATE", RISK_COLORS.MODERATE,
        "LOW", RISK_COLORS.LOW,
        "#9CA3AF",
      ],
      "text-halo-color": "#070A10",
      "text-halo-width": 2,
    },
  });

  // ── 2. Formal routes (road-snapped from Mapbox Directions API) ──
  let formalGeo: { features: GeoJSON.Feature[] } = { features: [] };
  try {
    if (formalRes.ok) {
      formalGeo = await formalRes.json();
      console.log("[Mapbox] Formal routes loaded:", formalGeo.features.length, "routes");
    }
  } catch (err) {
    console.warn("[Mapbox] Error loading formal routes:", err);
  }

  // Build metadata lookup from old formal features (paired file)
  const formalMetaMap = new Map<string, Record<string, unknown>>();
  for (const f of formalLinesOld) {
    const pid = f.properties?.phantom_id;
    if (pid) formalMetaMap.set(pid, f.properties ?? {});
  }

  // Enrich formal features with paired metadata
  for (const f of formalGeo.features) {
    const cid = f.properties?.id;
    const pairedMeta = formalMetaMap.get(cid);
    if (pairedMeta) {
      f.properties = { ...f.properties, ...pairedMeta };
    }
  }

  map.addSource("formal-routes", {
    type: "geojson",
    data: { type: "FeatureCollection", features: formalGeo.features },
  });

  map.addLayer({
    id: "formal-routes-line",
    type: "line",
    source: "formal-routes",
    paint: {
      "line-color": FORMAL_BLUE,
      "line-width": 5,
      "line-opacity": 0.7,
    },
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
  });

  // Formal labels at midpoints
  const formalLabelFeatures: GeoJSON.Feature[] = formalGeo.features.map((f) => {
    const coords = (f.geometry as GeoJSON.LineString).coordinates;
    const mid = coords[Math.floor(coords.length / 2)];
    const distKm = f.properties?.distance_km ?? 0;
    const coverage = f.properties?.coverage_pct ?? 0;
    const label = coverage > 0
      ? `FORMAL · ${coverage}% · ${Math.round(distKm)} km`
      : `FORMAL · ${Math.round(distKm)} km`;
    return {
      type: "Feature",
      properties: { label, name: f.properties?.name ?? "" },
      geometry: { type: "Point", coordinates: mid },
    };
  });

  map.addSource("formal-labels", {
    type: "geojson",
    data: { type: "FeatureCollection", features: formalLabelFeatures },
  });

  map.addLayer({
    id: "formal-route-labels",
    type: "symbol",
    source: "formal-labels",
    layout: {
      "text-field": ["get", "label"],
      "text-font": ["Open Sans Bold"],
      "text-size": 9,
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": FORMAL_BLUE,
      "text-halo-color": "#070A10",
      "text-halo-width": 2,
    },
  });

  // ── 3. Point features (nodes, gates, FMPs, phantom POEs) ──
  const nodesByType: Record<string, GeoJSON.Feature[]> = {};
  for (const f of nodePoints) {
    const rt = f.properties?.route_type ?? "UNKNOWN";
    (nodesByType[rt] ??= []).push(f);
  }

  // Nodes (start/end/waypoint)
  if (nodesByType["NODE"]?.length) {
    map.addSource("corridor-nodes", {
      type: "geojson",
      data: { type: "FeatureCollection", features: nodesByType["NODE"] },
    });
    map.addLayer({
      id: "corridor-nodes-circle",
      type: "circle",
      source: "corridor-nodes",
      paint: {
        "circle-radius": [
          "match", ["get", "node_type"],
          "start", 6, "end", 6, "phantom", 8, "border", 4, 3,
        ],
        "circle-color": [
          "match", ["get", "node_type"],
          "start", "#22C55E", "end", "#EF4444", "phantom", "#F59E0B", "border", "#F97316", "#9CA3AF",
        ],
        "circle-stroke-color": "#070A10",
        "circle-stroke-width": 1,
      },
    });
    map.addLayer({
      id: "corridor-nodes-labels",
      type: "symbol",
      source: "corridor-nodes",
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Regular"],
        "text-size": 9,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#D1D5DB",
        "text-halo-color": "#070A10",
        "text-halo-width": 1.5,
      },
    });
  }

  // Formal gates
  if (nodesByType["FORMAL_GATE"]?.length) {
    map.addSource("formal-gates", {
      type: "geojson",
      data: { type: "FeatureCollection", features: nodesByType["FORMAL_GATE"] },
    });
    map.addLayer({
      id: "formal-gates-circle",
      type: "circle",
      source: "formal-gates",
      paint: {
        "circle-radius": 6,
        "circle-color": FORMAL_BLUE,
        "circle-stroke-color": "rgba(59,130,246,0.3)",
        "circle-stroke-width": 3,
      },
    });
  }

  // IOM FMPs
  if (nodesByType["IOM_FMP"]?.length) {
    map.addSource("iom-fmps", {
      type: "geojson",
      data: { type: "FeatureCollection", features: nodesByType["IOM_FMP"] },
    });
    map.addLayer({
      id: "iom-fmps-circle",
      type: "circle",
      source: "iom-fmps",
      paint: {
        "circle-radius": 6,
        "circle-color": "#3DD9C4",
        "circle-stroke-color": "rgba(61,217,196,0.3)",
        "circle-stroke-width": 3,
      },
    });
  }

  // Phantom POEs
  if (nodesByType["PHANTOM_POE"]?.length) {
    map.addSource("phantom-poes", {
      type: "geojson",
      data: { type: "FeatureCollection", features: nodesByType["PHANTOM_POE"] },
    });
    map.addLayer({
      id: "phantom-poes-circle",
      type: "circle",
      source: "phantom-poes",
      paint: {
        "circle-radius": 7,
        "circle-color": "#FFD700",
        "circle-stroke-color": "#070A10",
        "circle-stroke-width": 2,
      },
    });
    map.addLayer({
      id: "phantom-poes-labels",
      type: "symbol",
      source: "phantom-poes",
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Bold"],
        "text-size": 9,
        "text-offset": [0, -1.5],
        "text-anchor": "bottom",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#FFD700",
        "text-halo-color": "#070A10",
        "text-halo-width": 1,
      },
    });
  }

  // ── Compute real coverage stats ──
  let totalPhantomKm = 0;
  let weightedCoverage = 0;
  let totalFormalKm = 0;

  for (const f of phantomLines) {
    const km = Number(f.properties?.distance_km) || 0;
    totalPhantomKm += km;
  }

  for (const f of formalLinesOld) {
    const km = Number(f.properties?.distance_km) || 0;
    const cov = Number(f.properties?.coverage_pct) || 0;
    totalFormalKm += km;
    weightedCoverage += km * cov;
  }

  const monitoredPct = totalFormalKm > 0
    ? Math.round((weightedCoverage / totalFormalKm) * 10) / 10
    : 0;
  const unmonitoredPct = Math.round((100 - monitoredPct) * 10) / 10;

  const coverageStats: CoverageStats = {
    monitoredPct,
    unmonitoredPct,
    totalCorridors: phantomLines.length,
    totalPhantomKm: Math.round(totalPhantomKm),
    totalFormalKm: Math.round(totalFormalKm),
  };

  setCorridorLayerIds(phantomLayerIds);
  return { meta, phantomLayerIds, coverageStats };
}

// Dynamic layer IDs populated at draw time
export let CORRIDOR_LAYER_IDS: string[] = [];

export function setCorridorLayerIds(phantomIds: string[]) {
  CORRIDOR_LAYER_IDS = [
    ...phantomIds,
    "phantom-corridor-labels",
    "formal-routes-line",
    "formal-route-labels",
    "corridor-nodes-circle",
    "corridor-nodes-labels",
    "formal-gates-circle",
    "iom-fmps-circle",
    "phantom-poes-circle",
    "phantom-poes-labels",
  ];
}

export const BORDER_LAYER_IDS = ["admin-borders-line"];

export const LABEL_LAYER_IDS = [
  "geo-country-labels",
  "geo-admin1-labels",
  "geo-city-dots",
  "geo-city-labels",
];


