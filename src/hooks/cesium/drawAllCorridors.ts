import * as Cesium from "cesium";
import { type CesiumDrawContext, T } from "./types";

interface CorridorMeta {
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
};

/**
 * Fetch corridors_dense.geojson and render all corridors
 * as 3-layer polyline stacks with rich tooltip/description data.
 */
export async function drawAllCorridors(ctx: CesiumDrawContext): Promise<CorridorMeta[]> {
  const [geoRes, metaRes] = await Promise.all([
    fetch("/data/corridors_dense.geojson"),
    fetch("/data/corridors_meta.json"),
  ]);

  const geo = await geoRes.json();
  const meta: CorridorMeta[] = await metaRes.json();
  const metaMap = new Map(meta.map((m) => [m.id, m]));

  for (const feature of geo.features) {
    const id = feature.properties.id as string;
    const risk = feature.properties.risk as string;
    const name = feature.properties.name as string;
    const km = feature.properties.km as number;
    const mode = (feature.properties.mode as string) || "mixed";
    const color = RISK_COLORS[risk] ?? T.green;
    const cesiumColor = Cesium.Color.fromCssColorString(color);

    const modeInfo = MODE_INFO[mode] ?? MODE_INFO.mixed;

    // GeoJSON coords are [lng, lat]
    const coords: number[] = feature.geometry.coordinates.flatMap(
      (c: [number, number]) => [c[0], c[1]]
    );
    const positions = Cesium.Cartesian3.fromDegreesArray(coords);

    // Build rich description for InfoBox / tooltip
    const descriptionHtml = `
      <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;line-height:1.6;color:#d4d4d8;max-width:320px">
        <div style="margin-bottom:8px">
          <span style="background:${color}22;color:${color};padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600">${risk}</span>
          <span style="color:#71717a;margin-left:6px;font-size:10px">${id}</span>
        </div>
        <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
          <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Distance &amp; Mode</div>
          <div><strong>${km} km</strong> · ${mode}</div>
        </div>
        <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
          <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Terrain</div>
          <div>${modeInfo.terrain}</div>
        </div>
        <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
          <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Weather &amp; Seasonal</div>
          <div>${modeInfo.weather}</div>
        </div>
        <div style="border-top:1px solid #27272a;padding-top:6px;margin-bottom:6px">
          <div style="color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">Movement Pattern</div>
          <div>${modeInfo.description}</div>
        </div>
        <div style="border-top:1px solid #27272a;padding-top:6px;color:#71717a;font-size:9px">
          Click corridor for temporal flow data
        </div>
      </div>
    `;

    // Layer 3: Glow ribbon
    ctx.addEntity(`corr-${id}-glow`, {
      polyline: {
        positions,
        clampToGround: true,
        width: 20,
        material: cesiumColor.withAlpha(0.06),
      },
    });

    // Layer 2: Animated dash
    let dashOffset = 0;
    ctx.addEntity(`corr-${id}-dash`, {
      polyline: {
        positions,
        clampToGround: true,
        width: 4,
        material: new Cesium.PolylineDashMaterialProperty({
          color: cesiumColor.withAlpha(0.6),
          dashLength: 18,
          dashPattern: new Cesium.CallbackProperty(() => {
            dashOffset = (dashOffset + 1) % 16;
            const base = 0xff00;
            return ((base << dashOffset) | (base >>> (16 - dashOffset))) & 0xffff;
          }, false) as any,
        }),
      },
    });

    // Layer 1: Solid spine — carries the name + description for hover
    ctx.addEntity(`corr-${id}-spine`, {
      name: name,
      description: descriptionHtml,
      polyline: {
        positions,
        clampToGround: true,
        width: 1.5,
        material: cesiumColor,
      },
      properties: {
        corridorId: id,
        risk,
        km,
        mode,
        terrain: modeInfo.terrain,
        weather: modeInfo.weather,
        movementPattern: modeInfo.description,
      },
    });
  }

  return meta;
}
