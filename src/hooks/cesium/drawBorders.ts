import * as Cesium from "cesium";
import { type CesiumDrawContext, T } from "./types";

/**
 * Draw admin-0 (country) boundary lines on the globe.
 * Uses Natural Earth 110m GeoJSON from a public CDN.
 * Renders subtle boundary polylines so analysts can see country edges.
 */

const GEOJSON_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_boundary_lines_land.geojson";

// Focus region bounding box (Africa + Middle East + Horn)
const BOUNDS = { minLat: -40, maxLat: 40, minLng: -20, maxLng: 60 };

function inBounds(coords: [number, number][]): boolean {
  return coords.some(
    ([lng, lat]) =>
      lat >= BOUNDS.minLat &&
      lat <= BOUNDS.maxLat &&
      lng >= BOUNDS.minLng &&
      lng <= BOUNDS.maxLng
  );
}

export async function drawBorders(ctx: CesiumDrawContext): Promise<void> {
  try {
    const res = await fetch(GEOJSON_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const gj = await res.json();

    const borderColor = Cesium.Color.fromCssColorString("#9CA3AF").withAlpha(0.45);
    const glowColor = Cesium.Color.fromCssColorString("#9CA3AF").withAlpha(0.08);

    let idx = 0;
    for (const feature of gj.features) {
      const geom = feature.geometry;
      if (!geom) continue;

      const lines: number[][][] =
        geom.type === "MultiLineString"
          ? geom.coordinates
          : geom.type === "LineString"
          ? [geom.coordinates]
          : [];

      for (const line of lines) {
        if (line.length < 2) continue;
        const coords = line as [number, number][];
        if (!inBounds(coords)) continue;

        const flat = coords.flatMap(([lng, lat]) => [lng, lat]);
        const positions = Cesium.Cartesian3.fromDegreesArray(flat);

        // Glow layer
        ctx.addEntity(`border-glow-${idx}`, {
          polyline: {
            positions,
            clampToGround: true,
            width: 6,
            material: glowColor,
          },
        });

        // Crisp boundary line
        ctx.addEntity(`border-line-${idx}`, {
          polyline: {
            positions,
            clampToGround: true,
            width: 1.2,
            material: new Cesium.PolylineDashMaterialProperty({
              color: borderColor,
              dashLength: 12,
              dashPattern: 0b1111111100000000,
            }),
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
