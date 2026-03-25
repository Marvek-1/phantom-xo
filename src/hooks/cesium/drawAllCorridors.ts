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

function scoreToGradient(t: number, riskClass: string): string {
  const midT = Math.abs(t - 0.5) * 2;
  const riskIntensity = 1 - midT;
  const baseShift = riskClass === "CRITICAL" ? 0.5 : riskClass === "HIGH" ? 0.3 : 0.1;
  const v = Math.min(1, riskIntensity * 0.85 + baseShift);

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

/* ── Main export ── */

export async function drawAllCorridors(ctx: CesiumDrawContext): Promise<CorridorMeta[]> {
  const [temporalRes, deviationRes, metaRes] = await Promise.all([
    fetch("/data/corridors_temporal.geojson"),
    fetch("/data/deviation/all_deviations.geojson"),
    fetch("/data/corridors_meta.json"),
  ]);

  const temporal = await temporalRes.json();
  const deviations = await deviationRes.json();
  const meta: CorridorMeta[] = await metaRes.json();

  console.log("[Corridors] Temporal corridors loaded:", temporal.features.length);
  console.log("[Corridors] Deviation segments loaded:", deviations.features.length);

  // Draw all temporal corridors
  for (const feature of temporal.features) {
    if (feature.geometry.type === "LineString") {
      drawTemporalCorridor(ctx, feature);
    }
  }

  // Draw deviation overlay segments
  for (const feature of deviations.features) {
    if (feature.geometry.type === "LineString") {
      drawDeviationSegment(ctx, feature);
    }
  }

  return meta;
}

/* ── Temporal corridor renderer ── */

function drawTemporalCorridor(ctx: CesiumDrawContext, feature: any) {
  const props = feature.properties;
  const id = props.id as string;
  const risk = (props.risk || props.risk_class || "MEDIUM") as string;
  const name = props.name as string;
  const mode = props.mode || "mixed";
  const km = props.km || props.distance_km || 0;
  const color = RISK_COLORS[risk] ?? RISK_COLORS.MEDIUM;

  const coords = feature.geometry.coordinates as [number, number][];
  const n = coords.length;
  if (n < 2) return;

  const allPositions = Cesium.Cartesian3.fromDegreesArray(
    coords.flatMap((c) => [c[0], c[1]])
  );

  // ── LAYER 1: Gradient ribbon — CorridorGraphics, smooth edges ──
  const BATCH = 20;
  for (let i = 0; i < n - 1; i += BATCH) {
    const end = Math.min(i + BATCH + 1, n);
    const segCoords = coords.slice(i, end);
    if (segCoords.length < 2) continue;

    const t = (i + BATCH / 2) / (n - 1);
    const hexColor = scoreToGradient(t, risk);
    const cesiumColor = Cesium.Color.fromCssColorString(hexColor);

    const positions = Cesium.Cartesian3.fromDegreesArray(
      segCoords.flatMap((c) => [c[0], c[1]])
    );

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
    });
  }

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
  const tooltipHtml = buildTemporalTooltip(props, color);
  ctx.addEntity(`corr-${id}-spine`, {
    name,
    description: tooltipHtml,
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

  // Start/End nodes
  const startCoord = coords[0];
  const endCoord = coords[n - 1];
  const startName = name.split("→")[0]?.trim() || "Origin";
  const endName = name.split("→")[1]?.trim() || "Destination";

  ctx.addEntity(`corr-${id}-start`, {
    position: Cesium.Cartesian3.fromDegrees(startCoord[0], startCoord[1]),
    point: {
      pixelSize: 7,
      color: Cesium.Color.fromCssColorString("#22C55E"),
      outlineColor: Cesium.Color.fromCssColorString(T.bg),
      outlineWidth: 1.5,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
    label: {
      text: startName,
      font: '10px "IBM Plex Mono", monospace',
      fillColor: Cesium.Color.fromCssColorString("#22C55E"),
      outlineColor: Cesium.Color.fromCssColorString(T.bg),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -12),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 400_000),
    },
  });

  ctx.addEntity(`corr-${id}-end`, {
    position: Cesium.Cartesian3.fromDegrees(endCoord[0], endCoord[1]),
    point: {
      pixelSize: 7,
      color: Cesium.Color.fromCssColorString("#EF4444"),
      outlineColor: Cesium.Color.fromCssColorString(T.bg),
      outlineWidth: 1.5,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
    label: {
      text: endName,
      font: '10px "IBM Plex Mono", monospace',
      fillColor: Cesium.Color.fromCssColorString("#EF4444"),
      outlineColor: Cesium.Color.fromCssColorString(T.bg),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -12),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 400_000),
    },
  });
}

/* ── Deviation segment renderer ── */

function drawDeviationSegment(ctx: CesiumDrawContext, feature: any) {
  const props = feature.properties;
  const id = props.id as string;
  const segIdx = props.segment_index ?? 0;
  const deviationColor = Cesium.Color.fromCssColorString(props.color || "#EF4444");

  const coords = feature.geometry.coordinates as [number, number][];
  if (coords.length < 2) return;

  const positions = Cesium.Cartesian3.fromDegreesArray(
    coords.flatMap((c) => [c[0], c[1]])
  );

  // Deviation ribbon — dashed red, narrower than phantom band
  ctx.addEntity(`dev-${id}-${segIdx}`, {
    polyline: {
      positions,
      clampToGround: true,
      width: 4,
      material: new Cesium.PolylineDashMaterialProperty({
        color: deviationColor.withAlpha(0.85),
        dashLength: 12,
        dashPattern: 0xff00,
      }),
    },
    properties: {
      corridorId: id,
      routeType: "DEVIATION",
      segmentIndex: segIdx,
    },
  });
}

/* ── Tooltip for temporal corridors ── */

function buildTemporalTooltip(props: any, color: string): string {
  const id = props.id;
  const risk = props.risk || props.risk_class || "MEDIUM";
  const km = props.km || props.distance_km || 0;
  const mode = props.mode || "mixed";
  const context = props.context || "";
  const trigger = props.trigger_event || "";
  const countries = props.countries ? props.countries.join(", ") : "";
  const healthZones = props.health_zones_along_corridor;
  const cumulative = props.cumulative_since_conflict;
  const iomConfirmed = props.iom_confirmed;

  // Temporal flows summary
  let flowSection = "";
  const flows = props.temporal_flows;
  if (flows && flows.length > 0) {
    const latest = flows[flows.length - 1];
    const totalAll = flows.reduce((s: number, f: any) => s + (f.total || 0), 0);
    flowSection = `
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Temporal Flows</div>
        <div>Latest: <strong>${latest.period}</strong> — ${latest.total?.toLocaleString()} movements</div>
        <div>Inbound: ${latest.inbound?.toLocaleString()} · Outbound: ${latest.outbound?.toLocaleString()}</div>
        <div style="margin-top:4px;color:#71717a">Total across ${flows.length} periods: <strong>${totalAll.toLocaleString()}</strong></div>
        ${latest.source ? `<div style="font-size:9px;color:#71717a">Source: ${latest.source}</div>` : ""}
      </div>`;
  }

  let contextSection = "";
  if (context || trigger) {
    contextSection = `
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Context</div>
        ${trigger ? `<div style="color:#F97316">⚡ ${trigger}</div>` : ""}
        ${context ? `<div>${context}</div>` : ""}
      </div>`;
  }

  let healthSection = "";
  if (healthZones && healthZones.length > 0) {
    healthSection = `
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Health Zones</div>
        <div>${healthZones.join(", ")}</div>
      </div>`;
  }

  return `
    <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;line-height:1.6;color:#d4d4d8;max-width:340px">
      <div style="margin-bottom:8px">
        <span style="background:#FFD70022;color:#FFD700;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:0.05em">⚠ PHANTOM</span>
        <span style="background:${color}22;color:${color};padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600;margin-left:4px">${risk}</span>
        ${iomConfirmed ? '<span style="background:#3B82F622;color:#3B82F6;padding:2px 6px;border-radius:3px;font-size:10px;margin-left:4px">IOM ✓</span>' : ""}
        <span style="color:#71717a;margin-left:6px;font-size:10px">${id}</span>
      </div>
      <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
        <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Route</div>
        <div><strong>${km} km</strong> · ${mode}${countries ? ` · ${countries}` : ""}</div>
      </div>
      ${cumulative ? `<div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px"><div style="color:#EF4444;font-weight:600">Cumulative: ${cumulative.toLocaleString()} since conflict</div></div>` : ""}
      ${flowSection}
      ${contextSection}
      ${healthSection}
      <div style="border-top:1px solid #27272a;padding-top:6px;color:#71717a;font-size:9px">
        Click corridor for detailed analysis
      </div>
    </div>
  `;
}
