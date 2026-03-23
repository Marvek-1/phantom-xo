import * as Cesium from "cesium";
import { type CesiumDrawContext, T } from "./types";

export interface CorridorMeta {
  id: string;
  name: string;
  risk: string;
  km: number;
  mode: string;
  center: [number, number];
  zoom: number;
}

const RISK_COLORS: Record<string, string> = {
  CRITICAL: "#EF4444",
  HIGH: "#F97316",
  MEDIUM: "#EAB308",
};

const MODE_INFO: Record<string, { terrain: string; weather: string; description: string }> = {
  canoe: {
    terrain: "Riverine — Congo/Ubangi basin waterways",
    weather: "Wet season: high water (Sep–Nov), Dry: low water (Jan–Mar)",
    description: "Pirogue/canoe transport along river systems. Night crossings common.",
  },
  foot: {
    terrain: "Footpaths, bush trails, savanna corridors",
    weather: "Rainy season increases friction. Flash floods possible.",
    description: "On foot through informal trails. Typical 15–25 km/day.",
  },
  "foot/truck": {
    terrain: "Mixed: unpaved roads, market routes, bush tracks",
    weather: "Roads degrade in wet season. Truck access seasonal.",
    description: "Foot segments linked by informal truck/motorcycle transport.",
  },
  truck: {
    terrain: "Unpaved/partially paved roads, trade corridors",
    weather: "Mud season restricts vehicle access. Dust in dry season.",
    description: "Commercial truck routes. Often overnight crossings at informal points.",
  },
  mixed: {
    terrain: "Multiple terrain types along route",
    weather: "Variable by segment. Seasonal patterns affect passage.",
    description: "Multi-modal movement: foot, motorcycle, truck, or boat by segment.",
  },
  sea: {
    terrain: "Coastal / Gulf of Aden maritime",
    weather: "Monsoon winds (Jun–Sep) create dangerous swells. Calmer Oct–May.",
    description: "Smuggling vessels, dhows. High-risk maritime crossing.",
  },
  livestock: {
    terrain: "Pastoral corridors, seasonal grazing routes",
    weather: "Movement follows seasonal rainfall. Dry season concentrates at water sources.",
    description: "Livestock-driven movement along traditional pastoral corridors.",
  },
};

const NODE_TYPE_CONFIG: Record<string, { pixelSize: number; showLabel: boolean; distMax?: number; color: string }> = {
  start: { pixelSize: 7, showLabel: true, color: "#22C55E" },
  end: { pixelSize: 7, showLabel: true, color: "#EF4444" },
  phantom: { pixelSize: 10, showLabel: true, distMax: 400_000, color: "#F59E0B" },
  border: { pixelSize: 5, showLabel: false, color: "#F97316" },
  waypoint: { pixelSize: 3, showLabel: false, distMax: 300_000, color: "#9CA3AF" },
};

/**
 * Unified renderer: loads corridors_paired.geojson and renders
 * PHANTOM corridors, FORMAL routes, NODEs, FORMAL_GATEs, IOM_FMPs, and PHANTOM_POEs.
 */
export async function drawAllCorridors(ctx: CesiumDrawContext): Promise<CorridorMeta[]> {
  const [geoRes, metaRes] = await Promise.all([
    fetch("/data/corridors_paired.geojson"),
    fetch("/data/corridors_meta.json"),
  ]);

  const geo = await geoRes.json();
  const meta: CorridorMeta[] = await metaRes.json();

  for (const feature of geo.features) {
    const props = feature.properties;
    const routeType = props.route_type as string;
    const geomType = feature.geometry.type;

    if (geomType === "LineString" && routeType === "PHANTOM") {
      drawPhantomCorridor(ctx, feature);
    } else if (geomType === "LineString" && routeType === "FORMAL") {
      drawFormalRoute(ctx, feature);
    } else if (geomType === "Point" && routeType === "NODE") {
      drawNode(ctx, feature);
    } else if (geomType === "Point" && routeType === "FORMAL_GATE") {
      drawFormalGate(ctx, feature);
    } else if (geomType === "Point" && routeType === "IOM_FMP") {
      drawIomFmp(ctx, feature);
    } else if (geomType === "Point" && routeType === "PHANTOM_POE") {
      drawPhantomPoe(ctx, feature);
    }
  }

  return meta;
}

function drawPhantomCorridor(ctx: CesiumDrawContext, feature: any) {
  const props = feature.properties;
  const id = props.id as string;
  const risk = props.risk_class as string;
  const name = props.name as string;
  const km = props.distance_km as number;
  const mode = props.inferred_mode || props.mode || "mixed";
  const gapKm = props.gap_km ?? 0;
  const coverage = props.formal_poe_coverage ?? "N/A";
  const color = RISK_COLORS[risk] ?? RISK_COLORS.MEDIUM;
  const cesiumColor = Cesium.Color.fromCssColorString(color);
  const modeInfo = MODE_INFO[mode] ?? MODE_INFO.mixed;

  const coords: number[] = feature.geometry.coordinates.flatMap(
    (c: [number, number]) => [c[0], c[1]]
  );
  const positions = Cesium.Cartesian3.fromDegreesArray(coords);

  const descriptionHtml = `
    <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;line-height:1.6;color:#d4d4d8;max-width:320px">
      <div style="margin-bottom:8px">
        <span style="background:#FFD70022;color:#FFD700;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:0.05em">⚠ PHANTOM</span>
        <span style="background:${color}22;color:${color};padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600;margin-left:4px">${risk}</span>
        <span style="color:#71717a;margin-left:6px;font-size:10px">${id}</span>
      </div>
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Distance &amp; Mode</div>
        <div><strong>${km} km</strong> · ${mode}</div>
      </div>
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Formal Coverage</div>
        <div style="color:#EF4444;font-weight:600">${coverage} monitored · ${gapKm} km gap</div>
      </div>
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Terrain</div>
        <div>${modeInfo.terrain}</div>
      </div>
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Weather &amp; Seasonal</div>
        <div>${modeInfo.weather}</div>
      </div>
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Movement Pattern</div>
        <div>${modeInfo.description}</div>
      </div>
      <div style="border-top:1px solid #27272a;padding-top:6px;color:#71717a;font-size:9px">
        Click corridor for temporal flow data
      </div>
    </div>
  `;

  // Glow ribbon
  ctx.addEntity(`corr-${id}-glow`, {
    polyline: {
      positions,
      clampToGround: true,
      width: 20,
      material: cesiumColor.withAlpha(0.06),
    },
  });

  // Animated dash
  let dashOffset = 0;
  ctx.addEntity(`corr-${id}-dash`, {
    polyline: {
      positions,
      clampToGround: true,
      width: 4,
      material: new Cesium.PolylineDashMaterialProperty({
        color: cesiumColor.withAlpha(0.6),
        dashLength: 18,
        dashPattern: new Cesium.CallbackProperty(() => {
          dashOffset = (dashOffset + 1) % 16;
          const base = 0xff00;
          return ((base << dashOffset) | (base >>> (16 - dashOffset))) & 0xffff;
        }, false) as any,
      }),
    },
  });

  // Solid spine — clickable, carries tooltip
  ctx.addEntity(`corr-${id}-spine`, {
    name: name,
    description: descriptionHtml,
    polyline: {
      positions,
      clampToGround: true,
      width: 1.5,
      material: cesiumColor,
    },
    properties: {
      corridorId: id,
      routeType: "PHANTOM",
      risk,
      km,
      mode,
      gapKm,
      formalCoverage: coverage,
    },
  });

  // Midpoint label — shows PHANTOM · mode when zoomed in
  const midIdx = Math.floor(feature.geometry.coordinates.length / 2);
  const midCoord = feature.geometry.coordinates[midIdx];
  if (midCoord) {
    ctx.addEntity(`corr-${id}-label`, {
      position: Cesium.Cartesian3.fromDegrees(midCoord[0], midCoord[1]),
      label: {
        text: `⚠ PHANTOM · ${mode}`,
        font: 'bold 9px "IBM Plex Mono", monospace',
        fillColor: cesiumColor.withAlpha(0.8),
        outlineColor: Cesium.Color.fromCssColorString(T.bg),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1_500_000),
        scaleByDistance: new Cesium.NearFarScalar(5e4, 1.0, 1.5e6, 0.5),
      },
    });
  }
}

function drawFormalRoute(ctx: CesiumDrawContext, feature: any) {
  const props = feature.properties;
  const id = props.id as string;
  const name = props.name as string;
  const phantomId = props.phantom_id ?? "";
  const coveragePct = props.coverage_pct ?? 0;
  const gapNote = props.gap_note ?? "";
  const monitoring = props.monitoring ?? "unknown";
  const distKm = props.distance_km ?? 0;
  const hasCustoms = props.customs ? "✓" : "✗";
  const hasImmigration = props.immigration ? "✓" : "✗";
  const hasFmp = props.iom_fmp ? "✓" : "✗";

  const formalBlue = Cesium.Color.fromCssColorString("#3B82F6");

  const coords: number[] = feature.geometry.coordinates.flatMap(
    (c: [number, number]) => [c[0], c[1]]
  );
  const positions = Cesium.Cartesian3.fromDegreesArray(coords);

  const descriptionHtml = `
    <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;line-height:1.6;color:#d4d4d8;max-width:320px">
      <div style="margin-bottom:8px">
        <span style="background:#3B82F622;color:#3B82F6;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:0.05em">FORMAL</span>
        <span style="color:#71717a;margin-left:6px;font-size:10px">${id} → ${phantomId}</span>
      </div>
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Monitoring Coverage</div>
        <div style="font-size:18px;font-weight:700;color:${coveragePct >= 50 ? '#3B82F6' : '#EF4444'}">${coveragePct}%</div>
      </div>
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Infrastructure</div>
        <div>${distKm} km · ${monitoring?.replace(/_/g, " ")}</div>
        <div style="margin-top:4px">Customs ${hasCustoms} · Immigration ${hasImmigration} · IOM FMP ${hasFmp}</div>
      </div>
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px;color:#F97316">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Coverage Gap</div>
        <div>${gapNote}</div>
      </div>
    </div>
  `;

  // Single solid blue line — no glow, no animation
  ctx.addEntity(`formal-${id}-line`, {
    name: name,
    description: descriptionHtml,
    polyline: {
      positions,
      clampToGround: true,
      width: 3,
      material: formalBlue.withAlpha(0.7),
    },
    properties: {
      corridorId: phantomId,
      routeType: "FORMAL",
      coveragePct,
    },
  });

  // Midpoint label
  const midIdx = Math.floor(feature.geometry.coordinates.length / 2);
  const midCoord = feature.geometry.coordinates[midIdx];
  if (midCoord) {
    ctx.addEntity(`formal-${id}-label`, {
      position: Cesium.Cartesian3.fromDegrees(midCoord[0], midCoord[1]),
      label: {
        text: `FORMAL · ${coveragePct}%`,
        font: 'bold 9px "IBM Plex Mono", monospace',
        fillColor: formalBlue.withAlpha(0.8),
        outlineColor: Cesium.Color.fromCssColorString(T.bg),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1_500_000),
        scaleByDistance: new Cesium.NearFarScalar(5e4, 1.0, 1.5e6, 0.5),
      },
    });
  }
}

function drawNode(ctx: CesiumDrawContext, feature: any) {
  const props = feature.properties;
  const nodeType = (props.node_type as string) || "waypoint";
  const cfg = NODE_TYPE_CONFIG[nodeType] ?? NODE_TYPE_CONFIG.waypoint;
  const [lng, lat] = feature.geometry.coordinates as [number, number];
  const nodeColor = props.color || cfg.color;
  const color = Cesium.Color.fromCssColorString(nodeColor);
  const nodeId = props.id || `node-${lng}-${lat}`;

  const pointOpts: Cesium.PointGraphics.ConstructorOptions = {
    pixelSize: cfg.pixelSize,
    color,
    outlineColor: Cesium.Color.fromCssColorString(T.bg),
    outlineWidth: 1.5,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
  };

  if (cfg.distMax) {
    pointOpts.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(0, cfg.distMax);
  }

  const entityOpts: Cesium.Entity.ConstructorOptions = {
    position: Cesium.Cartesian3.fromDegrees(lng, lat),
    point: pointOpts,
  };

  if (cfg.showLabel && props.name) {
    entityOpts.label = {
      text: props.name,
      font: '10px "IBM Plex Mono", monospace',
      fillColor: color,
      outlineColor: Cesium.Color.fromCssColorString(T.bg),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      pixelOffset: new Cesium.Cartesian2(0, -12),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      distanceDisplayCondition: cfg.distMax
        ? new Cesium.DistanceDisplayCondition(0, cfg.distMax)
        : undefined,
    };
  }

  ctx.addEntity(`node-${nodeId}`, entityOpts);
}

function drawFormalGate(ctx: CesiumDrawContext, feature: any) {
  const props = feature.properties;
  const [lng, lat] = feature.geometry.coordinates as [number, number];
  const gateId = props.id || `gate-${lng}-${lat}`;
  const name = props.name || "Official Gate";
  const coveragePct = props.coverage_pct ?? 0;
  const formalBlue = Cesium.Color.fromCssColorString("#3B82F6");

  // Blue diamond marker
  ctx.addEntity(`gate-${gateId}`, {
    position: Cesium.Cartesian3.fromDegrees(lng, lat),
    point: {
      pixelSize: 14,
      color: formalBlue,
      outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
    label: {
      text: `${name}\n${coveragePct}% coverage`,
      font: '10px "IBM Plex Mono", monospace',
      fillColor: formalBlue,
      outlineColor: Cesium.Color.fromCssColorString(T.bg),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      pixelOffset: new Cesium.Cartesian2(0, -16),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 3e6, 0.4),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2_000_000),
    },
    properties: { type: "formal_gate", gateId },
  });
}

function drawIomFmp(ctx: CesiumDrawContext, feature: any) {
  const props = feature.properties;
  const [lng, lat] = feature.geometry.coordinates as [number, number];
  const fmpId = props.id || `fmp-${lng}-${lat}`;
  const name = props.name || "IOM FMP";
  const flow = props.monthly_avg_flow ?? 0;
  const status = props.status ?? "active";

  const statusColor =
    status === "active" ? T.teal
    : status === "partially_restricted" ? T.amber
    : T.red;

  const cesiumColor = Cesium.Color.fromCssColorString(statusColor);
  const size = 10 + Math.min(18, (flow / 40000) * 18);

  // Flow ring
  ctx.addEntity(`fmp-${fmpId}-ring`, {
    position: Cesium.Cartesian3.fromDegrees(lng, lat),
    ellipse: {
      semiMinorAxis: Math.max(2000, flow * 0.15),
      semiMajorAxis: Math.max(2000, flow * 0.15),
      material: cesiumColor.withAlpha(0.08),
      outline: true,
      outlineColor: cesiumColor.withAlpha(0.25),
      outlineWidth: 1,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
  });

  // Core point
  ctx.addEntity(`fmp-${fmpId}`, {
    position: Cesium.Cartesian3.fromDegrees(lng, lat),
    point: {
      pixelSize: size,
      color: cesiumColor.withAlpha(0.9),
      outlineColor: cesiumColor.withAlpha(0.3),
      outlineWidth: 3,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
    label: {
      text: `${name}\n${(flow / 1000).toFixed(0)}k/mo`,
      font: '10px "IBM Plex Mono",monospace',
      fillColor: cesiumColor,
      outlineColor: Cesium.Color.fromCssColorString(T.bg),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      pixelOffset: new Cesium.Cartesian2(0, -(size / 2 + 8)),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 5e6, 0.4),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3e6),
    },
    properties: { type: "iom_fmp", fmpId },
  });

  // FMP badge
  ctx.addEntity(`fmp-${fmpId}-badge`, {
    position: Cesium.Cartesian3.fromDegrees(lng, lat),
    label: {
      text: "FMP",
      font: 'bold 8px "IBM Plex Mono",monospace',
      fillColor: Cesium.Color.fromCssColorString(T.blue),
      outlineColor: Cesium.Color.fromCssColorString(T.bg),
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.TOP,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      pixelOffset: new Cesium.Cartesian2(0, size / 2 + 4),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 3e6, 0),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2e6),
    },
  });
}

function drawPhantomPoe(ctx: CesiumDrawContext, feature: any) {
  const props = feature.properties;
  const [lng, lat] = feature.geometry.coordinates as [number, number];
  const poeId = props.id || `ppoe-${lng}-${lat}`;
  const name = props.name || "Phantom POE";
  const gold = Cesium.Color.fromCssColorString("#FFD700");

  // Pulsing outer ring
  let pulsePhase = 0;
  ctx.addEntity(`ppoe-${poeId}-pulse`, {
    position: Cesium.Cartesian3.fromDegrees(lng, lat),
    ellipse: {
      semiMinorAxis: new Cesium.CallbackProperty(() => {
        pulsePhase = (pulsePhase + 0.03) % (Math.PI * 2);
        return 3000 + Math.sin(pulsePhase) * 1500;
      }, false),
      semiMajorAxis: new Cesium.CallbackProperty(() => {
        return 3000 + Math.sin(pulsePhase) * 1500;
      }, false),
      material: gold.withAlpha(0.1),
      outline: true,
      outlineColor: gold.withAlpha(0.3),
      outlineWidth: 1,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
  });

  // Core gold point
  ctx.addEntity(`ppoe-${poeId}`, {
    position: Cesium.Cartesian3.fromDegrees(lng, lat),
    point: {
      pixelSize: 16,
      color: gold.withAlpha(0.95),
      outlineColor: gold.withAlpha(0.4),
      outlineWidth: 4,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
    label: {
      text: name,
      font: 'bold 10px "IBM Plex Mono", monospace',
      fillColor: gold,
      outlineColor: Cesium.Color.fromCssColorString(T.bg),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      pixelOffset: new Cesium.Cartesian2(0, -20),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 3e6, 0.4),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2_500_000),
    },
    properties: { type: "phantom_poe", poeId },
  });
}
