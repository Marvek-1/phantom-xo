import * as Cesium from "cesium";
import type { CorridorAnalysisResult } from "@/types/phantom";
import { T, type CesiumDrawContext } from "./types";

/**
 * Node type → visual config
 */
function nodeVisual(type: string) {
  switch (type) {
    case "FORMAL_POE":
      return { color: T.blue, size: 14, pulse: false };
    case "PHANTOM_POE":
      return { color: T.amber, size: 13, pulse: true };
    case "SETTLEMENT":
      return { color: T.teal, size: 9, pulse: false };
    default:
      return { color: T.blue, size: 9, pulse: false };
  }
}

/**
 * Layer 3+4+5 — Full corridor analysis rendering
 * - Inferred path (amber dotted)
 * - Nodes differentiated by type
 * - Location belief circles
 */
export function drawAnalysis(
  ctx: CesiumDrawContext,
  analysis: CorridorAnalysisResult
) {
  // Inferred path — amber dotted line
  if (analysis.inferredPath?.coordinates) {
    ctx.addEntity(`${analysis.id}-inferred-path`, {
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(
          analysis.inferredPath.coordinates.flatMap((c) => [c.lng, c.lat])
        ),
        clampToGround: true,
        width: 5,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.fromCssColorString(T.amber).withAlpha(0.9),
          dashLength: 8,
          dashPattern: 170, // shorter dots
        }),
      },
    });
  }

  // Nodes — differentiated by type
  for (const node of analysis.nodes ?? []) {
    const vis = nodeVisual(node.type);
    const entityId = `${analysis.id}-node-${node.id}`;

    // Pulsing PHANTOM_POE nodes use CallbackProperty for pixelSize
    const pixelSize = vis.pulse
      ? new Cesium.CallbackProperty(() => {
          const t = Date.now() / 1000;
          return 10 + Math.sin(t * 3) * 3; // oscillate 7-13
        }, false)
      : vis.size;

    ctx.addEntity(entityId, {
      position: Cesium.Cartesian3.fromDegrees(node.lng, node.lat),
      point: {
        pixelSize: pixelSize as any,
        color: Cesium.Color.fromCssColorString(vis.color),
        outlineColor: vis.pulse
          ? Cesium.Color.fromCssColorString(vis.color).withAlpha(0.3)
          : Cesium.Color.fromCssColorString(T.bg),
        outlineWidth: vis.pulse ? 4 : 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      label: {
        text: node.name,
        font: '11px "IBM Plex Mono",monospace',
        fillColor: Cesium.Color.fromCssColorString(vis.color),
        outlineColor: Cesium.Color.fromCssColorString(T.bg),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        pixelOffset: new Cesium.Cartesian2(0, -16),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
  }

  // Location belief circles — yellow, opacity = confidence
  if (analysis.locationBeliefs) {
    for (const [bId, belief] of Object.entries(analysis.locationBeliefs)) {
      const radius = belief.radiusM / 111320;
      const segs = 32;
      const pts: number[] = [];
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        pts.push(
          belief.center.lng + Math.cos(a) * radius,
          belief.center.lat + Math.sin(a) * radius
        );
      }
      ctx.addEntity(`belief-${bId}`, {
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray(pts),
          clampToGround: true,
          width: 2,
          material: Cesium.Color.YELLOW.withAlpha(belief.confidence ?? 0.5),
        },
      });
    }
  }
}
