import * as Cesium from "cesium";
import { supabase } from "@/integrations/supabase/client";
import { T, type CesiumDrawContext } from "./types";

/**
 * Layer 1 — Official POE Reference Layer
 * Queries corridor_nodes where node_type = 'FORMAL_POE'
 * Renders blue diamond points with labels
 */
export async function drawOfficialPOEs(ctx: CesiumDrawContext) {
  const { data, error } = await supabase
    .from("corridor_nodes")
    .select("id, name, lat, lng, country_code, node_type")
    .eq("node_type", "FORMAL_POE");

  if (error || !data) return;

  for (const node of data) {
    const entityId = `official-poe-${node.id}`;

    // Diamond shape via rotated point
    ctx.addEntity(entityId, {
      position: Cesium.Cartesian3.fromDegrees(node.lng, node.lat),
      point: {
        pixelSize: 14,
        color: Cesium.Color.fromCssColorString(T.blue),
        outlineColor: Cesium.Color.fromCssColorString(T.blue).withAlpha(0.3),
        outlineWidth: 4,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      label: {
        text: `${node.name} [${node.country_code}]`,
        font: '10px "IBM Plex Mono",monospace',
        fillColor: Cesium.Color.fromCssColorString(T.blue),
        outlineColor: Cesium.Color.fromCssColorString(T.bg),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        pixelOffset: new Cesium.Cartesian2(0, -20),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(1.0e4, 1.0, 5.0e6, 0.4),
      },
    });
  }
}
