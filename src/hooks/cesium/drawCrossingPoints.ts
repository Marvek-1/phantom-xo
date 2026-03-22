import * as Cesium from "cesium";
import { supabase } from "@/integrations/supabase/client";
import { T, type CesiumDrawContext } from "./types";

export interface CrossingPointData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country_a: string;
  country_b: string;
  crossing_type: string;
  iom_fmp_active: boolean;
  monthly_avg_flow: number;
  peak_daily_flow: number;
  status: string;
  closure_periods: string | null;
  alt_names: string | null;
}

/**
 * Draw real crossing points from the database as sized markers.
 * Size scales with monthly_avg_flow. Color reflects status.
 */
export async function drawCrossingPoints(ctx: CesiumDrawContext): Promise<CrossingPointData[]> {
  const { data, error } = await supabase
    .from("real_crossing_points")
    .select("*")
    .order("monthly_avg_flow", { ascending: false });

  if (error || !data) {
    console.warn("[Cesium] Failed to load crossing points:", error);
    return [];
  }

  const points = data as CrossingPointData[];
  const maxFlow = Math.max(...points.map((p) => p.monthly_avg_flow || 1));

  for (const pt of points) {
    const flow = pt.monthly_avg_flow || 0;
    // Scale pixel size between 10 and 28 based on flow volume
    const size = 10 + (flow / maxFlow) * 18;

    // Status-based color
    const statusColor =
      pt.status === "active"
        ? T.teal
        : pt.status === "partially_restricted"
        ? T.amber
        : T.red;

    const cesiumColor = Cesium.Color.fromCssColorString(statusColor);
    const entityId = `xp-${pt.id}`;

    // Outer ring — flow volume indicator
    ctx.addEntity(`${entityId}-ring`, {
      position: Cesium.Cartesian3.fromDegrees(pt.lng, pt.lat),
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
    ctx.addEntity(entityId, {
      position: Cesium.Cartesian3.fromDegrees(pt.lng, pt.lat),
      point: {
        pixelSize: size,
        color: cesiumColor.withAlpha(0.9),
        outlineColor: cesiumColor.withAlpha(0.3),
        outlineWidth: 3,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      label: {
        text: `${pt.name}\n${(flow / 1000).toFixed(0)}k/mo`,
        font: '10px "IBM Plex Mono",monospace',
        fillColor: Cesium.Color.fromCssColorString(statusColor),
        outlineColor: Cesium.Color.fromCssColorString(T.bg),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        pixelOffset: new Cesium.Cartesian2(0, -(size / 2 + 8)),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(1.0e4, 1.0, 5.0e6, 0.4),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3.0e6),
      },
      properties: {
        type: "crossing_point",
        crossingId: pt.id,
        crossingName: pt.name,
      },
    });

    // FMP badge if active
    if (pt.iom_fmp_active) {
      ctx.addEntity(`${entityId}-fmp`, {
        position: Cesium.Cartesian3.fromDegrees(pt.lng, pt.lat),
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
          scaleByDistance: new Cesium.NearFarScalar(1.0e4, 1.0, 3.0e6, 0),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2.0e6),
        },
      });
    }
  }

  console.log(`[Cesium] Drew ${points.length} crossing points`);
  return points;
}
