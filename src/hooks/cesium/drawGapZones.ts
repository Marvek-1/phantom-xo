import * as Cesium from "cesium";
import { supabase } from "@/integrations/supabase/client";
import { T, type CesiumDrawContext } from "./types";

/**
 * Layer 4 — Gap Zone Highlighting
 * Queries corridor_gap_zones for a given corridor definition.
 * Renders translucent red buffer along gap path segments
 * with nearest formal POE label.
 */
export async function drawGapZones(
  ctx: CesiumDrawContext,
  corridorDefId: string
) {
  const { data, error } = await supabase
    .from("corridor_gap_zones")
    .select("*")
    .eq("corridor_def_id", corridorDefId)
    .eq("is_gap_zone", true);

  if (error || !data || data.length === 0) return;

  // We also need the corridor nodes to know where to draw the gap buffer
  const { data: nodes } = await supabase
    .from("corridor_nodes")
    .select("lat, lng, node_order, name")
    .eq("corridor_def_id", corridorDefId)
    .order("node_order", { ascending: true });

  if (!nodes || nodes.length < 2) return;

  // Draw a red-tinted wide polyline along the full corridor path
  // to indicate the gap zone (no official monitoring)
  const pathCoords = nodes.flatMap((n) => [n.lng, n.lat]);
  const positions = Cesium.Cartesian3.fromDegreesArray(pathCoords);

  for (const gap of data) {
    const gapId = `gap-${gap.id}`;

    // Wide translucent red corridor buffer
    ctx.addEntity(`${gapId}-buffer`, {
      polyline: {
        positions,
        clampToGround: true,
        width: 30,
        material: Cesium.Color.fromCssColorString(T.red).withAlpha(0.12),
      },
    });

    // Thinner red dashed edge
    ctx.addEntity(`${gapId}-edge`, {
      polyline: {
        positions,
        clampToGround: true,
        width: 2,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.fromCssColorString(T.red).withAlpha(0.4),
          dashLength: 12,
          dashPattern: 255,
        }),
      },
    });

    // Label at midpoint showing nearest formal POE
    const midIdx = Math.floor(nodes.length / 2);
    const midNode = nodes[midIdx];
    if (midNode) {
      ctx.addEntity(`${gapId}-label`, {
        position: Cesium.Cartesian3.fromDegrees(midNode.lng, midNode.lat),
        label: {
          text: `GAP ZONE · ${gap.total_km.toFixed(0)}km\nNearest POE: ${gap.nearest_formal_poe}`,
          font: '10px "IBM Plex Mono",monospace',
          fillColor: Cesium.Color.fromCssColorString(T.red).withAlpha(0.8),
          outlineColor: Cesium.Color.fromCssColorString(T.bg),
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          pixelOffset: new Cesium.Cartesian2(0, 20),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(1.0e4, 1.0, 5.0e6, 0.4),
        },
      });
    }
  }
}
