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

/* ── Gradient risk color utility ── */

/**
 * V-shape gradient: green at both ends, risk-colored peak at center.
 * `t` = 0→1 along the corridor. `score` = corridor confidence 0→1.
 */
function scoreToGradient(t: number, riskClass: string, score: number): string {
  const midT = Math.abs(t - 0.5) * 2;
  const riskIntensity = 1 - midT;

  const baseShift = riskClass === "CRITICAL" ? 0.5
    : riskClass === "HIGH" ? 0.3 : 0.1;

  const v = Math.min(1, riskIntensity * (0.7 + score * 0.3) + baseShift);

  if (v < 0.5) {
    const blend = v / 0.5;
    const r = Math.round(0x22 + (0xea - 0x22) * blend);
    const g = Math.round(0xc5 + (0xb3 - 0xc5) * blend);
    const b = Math.round(0x5e + (0x08 - 0x5e) * blend);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } else {
    const blend = (v - 0.5) / 0.5;
    const r = Math.round(0xea + (0xef - 0xea) * blend);
    const g = Math.round(0xb3 + (0x44 - 0xb3) * blend);
    const b = Math.round(0x08 + (0x44 - 0x08) * blend);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
}

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

/* ── Geodesic densification ── */

/**
 * Interpolate points along the great-circle arc between two lon/lat pairs.
 */
function interpolateGreatCircle(
  lon1: number, lat1: number,
  lon2: number, lat2: number,
  numSegments: number
): [number, number][] {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const φ1 = lat1 * toRad, λ1 = lon1 * toRad;
  const φ2 = lat2 * toRad, λ2 = lon2 * toRad;

  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((φ2 - φ1) / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
  ));

  if (d < 1e-10) return [[lon2, lat2]];

  const points: [number, number][] = [];
  for (let i = 1; i <= numSegments; i++) {
    const f = i / numSegments;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    const φ = Math.atan2(z, Math.sqrt(x * x + y * y));
    const λ = Math.atan2(y, x);
    points.push([λ * toDeg, φ * toDeg]);
  }
  return points;
}

/**
 * Densify a coordinate array to have at least `targetTotal` points
 * using geodesic (great-circle) interpolation.
 */
function densifyLine(coords: [number, number][], targetTotal = 40): [number, number][] {
  // Dense terrain data already present — pass through
  if (coords.length >= targetTotal) return coords;
  const segmentCount = coords.length - 1;
  if (segmentCount < 1) return coords;

  const pointsPerSeg = Math.max(2, Math.ceil((targetTotal - coords.length) / segmentCount));
  const result: [number, number][] = [coords[0]];

  for (let i = 0; i < segmentCount; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[i + 1];
    const interpolated = interpolateGreatCircle(lon1, lat1, lon2, lat2, pointsPerSeg + 1);
    result.push(...interpolated);
  }
  return result;
}

/* ── Tooltip builders ── */

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function buildPhantomTooltip(props: any, modeInfo: any, color: string): string {
  const id = props.id;
  const risk = props.risk_class;
  const km = props.distance_km;
  const mode = props.inferred_mode || props.mode || "mixed";
  const gapKm = props.gap_km ?? 0;
  const coverage = props.formal_poe_coverage ?? "N/A";
  const people = props.est_monthly_people;
  const vehicles = props.est_vehicles_day;
  const canoe = props.est_canoe_crossings_day;
  const sea = props.est_sea_crossings_day;
  const livestock = props.est_livestock_heads_day;
  const marketDays = props.market_days;
  const commodities = props.key_commodities;
  const conflict = props.conflict_factor;
  const healthRisk = props.health_risk;
  const nearestHealth = props.nearest_health_km;
  const mobileCoverage = props.mobile_coverage;

  // Movement volume section
  let movementLines = "";
  if (people) movementLines += `<div>👥 <strong>${formatNum(people)}</strong> people/month (est.)</div>`;
  if (vehicles > 0) movementLines += `<div>🚛 ${vehicles} vehicles/day</div>`;
  if (canoe > 0) movementLines += `<div>🛶 ${canoe} canoe crossings/day</div>`;
  if (sea > 0) movementLines += `<div>⛵ ${sea} sea crossings/day</div>`;
  if (livestock > 0) movementLines += `<div>🐄 ${livestock} livestock heads/day</div>`;

  // Market section
  let marketSection = "";
  if (marketDays || commodities) {
    marketSection = `
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Market Activity</div>
        ${marketDays ? `<div>📅 Market days: <strong>${marketDays}</strong></div>` : ""}
        ${commodities ? `<div>📦 ${commodities}</div>` : ""}
      </div>`;
  }

  // Health & risk
  let riskSection = "";
  if (healthRisk || conflict) {
    riskSection = `
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Risk Factors</div>
        ${conflict ? `<div style="color:#F97316">⚔ ${conflict}</div>` : ""}
        ${healthRisk ? `<div style="color:#EF4444">🦠 ${healthRisk}</div>` : ""}
      </div>`;
  }

  // Infrastructure
  let infraSection = "";
  if (nearestHealth || mobileCoverage) {
    infraSection = `
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Infrastructure</div>
        ${nearestHealth ? `<div>🏥 Nearest health post: <strong>${nearestHealth} km</strong></div>` : ""}
        ${mobileCoverage ? `<div>📶 Mobile: ${mobileCoverage}</div>` : ""}
      </div>`;
  }

  return `
    <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;line-height:1.6;color:#d4d4d8;max-width:340px">
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
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Estimated Movement</div>
        ${movementLines}
      </div>
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Formal Coverage</div>
        <div style="color:#EF4444;font-weight:600">${coverage} monitored · ${typeof gapKm === 'number' ? gapKm.toFixed(0) : gapKm} km gap</div>
      </div>
      ${marketSection}
      ${riskSection}
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Terrain</div>
        <div>${modeInfo.terrain}</div>
      </div>
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Weather &amp; Seasonal</div>
        <div>${modeInfo.weather}</div>
      </div>
      ${infraSection}
      <div style="border-top:1px solid #27272a;padding-top:6px;color:#71717a;font-size:9px">
        Click corridor for temporal flow data
      </div>
    </div>
  `;
}

function buildFormalTooltip(props: any): string {
  const id = props.id;
  const phantomId = props.phantom_id ?? "";
  const coveragePct = props.coverage_pct ?? 0;
  const gapNote = props.gap_note ?? "";
  const monitoring = props.monitoring ?? "unknown";
  const distKm = props.distance_km ?? 0;
  const hasCustoms = props.customs ? "✓" : "✗";
  const hasImmigration = props.immigration ? "✓" : "✗";
  const hasFmp = props.iom_fmp ? "✓" : "✗";
  const registered = props.formal_monthly_registered;
  const totalEst = props.est_total_monthly;
  const captureRate = props.capture_rate_pct;

  let flowComparison = "";
  if (registered != null && totalEst) {
    const missed = totalEst - registered;
    flowComparison = `
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Flow Capture</div>
        <div>📊 Registered: <strong>${formatNum(registered)}</strong>/mo</div>
        <div>📊 Estimated total: <strong>${formatNum(totalEst)}</strong>/mo</div>
        <div style="color:${captureRate >= 50 ? '#3B82F6' : '#EF4444'};font-weight:600;margin-top:2px">
          Capture rate: ${captureRate}% — <span style="color:#EF4444">${formatNum(missed)} unseen</span>
        </div>
      </div>`;
  }

  return `
    <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;line-height:1.6;color:#d4d4d8;max-width:340px">
      <div style="margin-bottom:8px">
        <span style="background:#3B82F622;color:#3B82F6;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:0.05em">FORMAL</span>
        <span style="color:#71717a;margin-left:6px;font-size:10px">${id} → ${phantomId}</span>
      </div>
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Monitoring Coverage</div>
        <div style="font-size:18px;font-weight:700;color:${coveragePct >= 50 ? '#3B82F6' : '#EF4444'}">${coveragePct}%</div>
      </div>
      ${flowComparison}
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
}

/* ── Main export ── */

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

/* ── Feature renderers ── */

function drawPhantomCorridor(ctx: CesiumDrawContext, feature: any) {
  const props = feature.properties;
  const id = props.id as string;
  const risk = props.risk_class as string;
  const name = props.name as string;
  const score = props.score ?? 0.5;
  const mode = props.inferred_mode || props.mode || "mixed";
  const modeInfo = MODE_INFO[mode] ?? MODE_INFO.mixed;
  const color = RISK_COLORS[risk] ?? RISK_COLORS.MEDIUM;

  // Use dense coords directly — no re-densification
  const coords = feature.geometry.coordinates as [number, number][];
  const n = coords.length;

  const allPositions = Cesium.Cartesian3.fromDegreesArray(
    coords.flatMap((c) => [c[0], c[1]])
  );

  // ── LAYER 1: Gradient ribbon — CorridorGraphics for smooth edges ──
  // Batch every 20 segments, overlap-by-one to eliminate gaps
  const BATCH = 20;
  for (let i = 0; i < n - 1; i += BATCH) {
    const end = Math.min(i + BATCH + 1, n); // +1 overlap
    const segCoords = coords.slice(i, end);
    if (segCoords.length < 2) continue;

    const t = (i + BATCH / 2) / (n - 1); // color at batch midpoint
    const hexColor = scoreToGradient(t, risk, score);
    const cesiumColor = Cesium.Color.fromCssColorString(hexColor);

    const positions = Cesium.Cartesian3.fromDegreesArray(
      segCoords.flatMap((c) => [c[0], c[1]])
    );

    // Smooth filled ribbon — 6km band, clamped to terrain
    ctx.addEntity(`corr-${id}-band-${i}`, {
      corridor: {
        positions,
        width: 4000,
        material: cesiumColor.withAlpha(0.92),
        cornerType: Cesium.CornerType.MITERED,
        height: 0,
        extrudedHeight: 0,
        outline: false,
      },
      // @ts-ignore — CorridorGraphics heightReference
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    });
  } // close batch for-loop

  // ── LAYER 2: Flowing white dash — single entity ──
  let dashOffset = 0;
  ctx.addEntity(`corr-${id}-flow`, {
    polyline: {
      positions: allPositions,
      clampToGround: true,
      width: 3,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.WHITE.withAlpha(0.7),
        dashLength: 20,
        dashPattern: new Cesium.CallbackProperty(() => {
          dashOffset = (dashOffset + 0.3) % 16;
          const shift = Math.floor(dashOffset);
          const base = 0xff00;
          return ((base << shift) | (base >>> (16 - shift))) & 0xffff;
        }, false) as any,
      }),
      arcType: Cesium.ArcType.GEODESIC,
    },
  });

  // ── LAYER 3: Clickable spine (invisible, carries tooltip) ──
  ctx.addEntity(`corr-${id}-spine`, {
    name,
    description: buildPhantomTooltip(props, modeInfo, color),
    polyline: {
      positions: allPositions,
      clampToGround: true,
      width: 14,
      material: Cesium.Color.TRANSPARENT,
    },
    properties: {
      corridorId: id,
      routeType: "PHANTOM",
      risk,
      mode,
    },
  });

  // Midpoint label
  const midCoord = coords[Math.floor(n / 2)];
  if (midCoord) {
    ctx.addEntity(`corr-${id}-label`, {
      position: Cesium.Cartesian3.fromDegrees(midCoord[0], midCoord[1]),
      label: {
        text: `⚠ ${name}`,
        font: 'bold 12px "IBM Plex Mono", monospace',
        fillColor: Cesium.Color.WHITE.withAlpha(0.9),
        outlineColor: Cesium.Color.fromCssColorString(T.bg),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        pixelOffset: new Cesium.Cartesian2(0, -20),
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
  const formalBlue = Cesium.Color.fromCssColorString("#3B82F6");

  // Densify
  const rawCoords = feature.geometry.coordinates as [number, number][];
  const denseCoords = densifyLine(rawCoords, 40);
  const coords: number[] = denseCoords.flatMap((c) => [c[0], c[1]]);
  const positions = Cesium.Cartesian3.fromDegreesArray(coords);

  const descriptionHtml = buildFormalTooltip(props);

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
  const midIdx = Math.floor(denseCoords.length / 2);
  const midCoord = denseCoords[midIdx];
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

  // Static white diamond marker — no pulsing ellipse, no semiMajorAxis crash
  ctx.addEntity(`ppoe-${poeId}`, {
    position: Cesium.Cartesian3.fromDegrees(lng, lat),
    point: {
      pixelSize: 8,
      color: Cesium.Color.WHITE.withAlpha(0.95),
      outlineColor: Cesium.Color.fromCssColorString("#FFD700").withAlpha(0.6),
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
    label: {
      text: `◇ ${name}`,
      font: 'bold 9px "IBM Plex Mono", monospace',
      fillColor: Cesium.Color.WHITE.withAlpha(0.9),
      outlineColor: Cesium.Color.fromCssColorString(T.bg),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      pixelOffset: new Cesium.Cartesian2(0, -12),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 3e6, 0.4),
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2_500_000),
    },
    properties: { type: "phantom_poe", poeId },
  });
}
