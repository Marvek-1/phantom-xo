import * as Cesium from "cesium";
import type { CorridorTrack } from "@/types/phantom";
import { T, type CesiumDrawContext } from "./types";

/**
 * Layer 2 — Phantom Corridor (hidden path)
 * Three-layer polyline stack: glow → animated dash → spine
 * Plus start/end markers
 */
export function drawCorridor(ctx: CesiumDrawContext, corridor: CorridorTrack) {
  const positions = corridor.pathCoords
    ? Cesium.Cartesian3.fromDegreesArray(
        corridor.pathCoords.flatMap((p) => [p.lng, p.lat])
      )
    : Cesium.Cartesian3.fromDegreesArray([
        corridor.startLng, corridor.startLat,
        corridor.endLng, corridor.endLat,
      ]);

  // Layer 3: Glow ribbon — wide, low alpha
  ctx.addEntity(`${corridor.id}-glow`, {
    polyline: {
      positions,
      clampToGround: true,
      width: 24,
      material: Cesium.Color.fromCssColorString(T.green).withAlpha(0.08),
    },
  });

  // Layer 2: Animated dashed flow
  ctx.addEntity(`${corridor.id}-dash`, {
    polyline: {
      positions,
      clampToGround: true,
      width: 5,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.fromCssColorString(T.green).withAlpha(0.7),
        dashLength: 20,
        dashPattern: 255,
      }),
    },
  });

  // Layer 1: Solid spine
  ctx.addEntity(`${corridor.id}-spine`, {
    polyline: {
      positions,
      clampToGround: true,
      width: 2,
      material: Cesium.Color.fromCssColorString(T.green),
    },
  });

  // Start / End markers
  const markers: Array<[number, number, string, string]> = [
    [corridor.startLat, corridor.startLng, "START", T.green],
    [corridor.endLat, corridor.endLng, "END", T.red],
  ];

  for (const [lat, lng, label, color] of markers) {
    ctx.addEntity(`${corridor.id}-marker-${label}`, {
      position: Cesium.Cartesian3.fromDegrees(lng, lat),
      point: {
        pixelSize: 10,
        color: Cesium.Color.fromCssColorString(color),
        outlineColor: Cesium.Color.fromCssColorString(T.bg),
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      label: {
        text: label,
        font: '11px "IBM Plex Mono",monospace',
        fillColor: Cesium.Color.fromCssColorString(color),
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
}
