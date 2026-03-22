import * as Cesium from "cesium";
import type { RadarPulse } from "@/types/phantom";
import { T, type CesiumDrawContext } from "./types";

/**
 * Radar pulse — three expanding animated rings
 */
export function drawRadar(ctx: CesiumDrawContext, radar: RadarPulse) {
  for (let ring = 0; ring < 3; ring++) {
    const ringId = `${radar.corridorId}-radar-${ring}`;
    const coords = new Cesium.CallbackProperty(() => {
      const t = Date.now() / 1000;
      const radius = ((t + ring * 0.4) % 1.2) * 0.006;
      const segs = 48;
      const pts: Cesium.Cartesian3[] = [];
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        pts.push(
          Cesium.Cartesian3.fromDegrees(
            radar.lng + Math.cos(a) * radius,
            radar.lat + Math.sin(a) * radius
          )
        );
      }
      return pts;
    }, false);

    ctx.addEntity(ringId, {
      polyline: {
        positions: coords,
        clampToGround: true,
        width: 2,
        material: Cesium.Color.fromCssColorString(T.green).withAlpha(0.7),
      },
    });
  }
}
