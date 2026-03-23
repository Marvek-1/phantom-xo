import * as Cesium from "cesium";
import { type CesiumDrawContext } from "./types";

/**
 * Draw admin-0 (country) boundary lines on the globe.
 * Uses Natural Earth 110m GeoJSON from a public CDN.
 * Renders solid white boundary polylines.
 */

const GEOJSON_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_boundary_lines_land.geojson";

const BOUNDS = { minLat: -40, maxLat: 40, minLng: -20, maxLng: 60 };

function inBounds(coords: [number, number][]): boolean {
  return coords.some(
    ([lng, lat]) => lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat && lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng,
  );
}

export async function drawBorders(ctx: CesiumDrawContext): Promise<string[]> {
  const startLen = ctx.entityIds.length;
  try {
    const res = await fetch(GEOJSON_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const gj = await res.json();

    const borderColor = Cesium.Color.WHITE.withAlpha(0.6);

    let idx = 0;
    for (const feature of gj.features) {
      const geom = feature.geometry;
      if (!geom) continue;

      const lines: number[][][] =
        geom.type === "MultiLineString" ? geom.coordinates : geom.type === "LineString" ? [geom.coordinates] : [];

      for (const line of lines) {
        if (line.length < 2) continue;
        const coords = line as [number, number][];
        if (!inBounds(coords)) continue;

        const flat = coords.flatMap(([lng, lat]) => [lng, lat]);
        const positions = Cesium.Cartesian3.fromDegreesArray(flat);

        ctx.addEntity(`border-line-${idx}`, {
          polyline: {
            positions,
            clampToGround: true,
            width: 2,
            material: new Cesium.ColorMaterialProperty(borderColor),
          },
        });

        idx++;
      }
    }
    console.log(`[Cesium] Drew ${idx} border segments`);
  } catch (err) {
    console.warn("[Cesium] Failed to load admin boundaries:", err);
  }
}
