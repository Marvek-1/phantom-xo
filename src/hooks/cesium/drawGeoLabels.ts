import * as Cesium from "cesium";
import { type CesiumDrawContext } from "./types";

const BOUNDS = { minLat: -40, maxLat: 40, minLng: -20, maxLng: 60 };

// ── Tier 1: Country labels (hardcoded centroids) ──────────────────────

const COUNTRIES: { name: string; lat: number; lng: number }[] = [
  { name: "DR CONGO", lat: -2.5, lng: 23.5 },
  { name: "CONGO", lat: -0.7, lng: 15.8 },
  { name: "CENTRAL AFRICAN\nREPUBLIC", lat: 6.6, lng: 20.9 },
  { name: "SOUTH SUDAN", lat: 7.0, lng: 30.0 },
  { name: "SUDAN", lat: 15.5, lng: 30.2 },
  { name: "ETHIOPIA", lat: 9.0, lng: 39.5 },
  { name: "SOMALIA", lat: 5.1, lng: 46.2 },
  { name: "KENYA", lat: -0.5, lng: 37.9 },
  { name: "UGANDA", lat: 1.4, lng: 32.3 },
  { name: "RWANDA", lat: -1.9, lng: 29.9 },
  { name: "BURUNDI", lat: -3.4, lng: 29.9 },
  { name: "TANZANIA", lat: -6.4, lng: 34.9 },
  { name: "CAMEROON", lat: 5.9, lng: 12.7 },
  { name: "NIGERIA", lat: 9.1, lng: 8.7 },
  { name: "NIGER", lat: 17.6, lng: 8.1 },
  { name: "CHAD", lat: 15.5, lng: 18.7 },
  { name: "EGYPT", lat: 26.8, lng: 30.8 },
  { name: "ERITREA", lat: 15.2, lng: 39.8 },
  { name: "DJIBOUTI", lat: 11.6, lng: 43.1 },
  { name: "MOZAMBIQUE", lat: -18.7, lng: 35.5 },
  { name: "MALAWI", lat: -13.3, lng: 34.3 },
  { name: "ZAMBIA", lat: -13.1, lng: 27.8 },
  { name: "ANGOLA", lat: -11.2, lng: 17.9 },
  { name: "GABON", lat: -0.8, lng: 11.6 },
  { name: "LIBYA", lat: 26.3, lng: 17.2 },
  { name: "SOUTH AFRICA", lat: -30.6, lng: 25.0 },
  { name: "MADAGASCAR", lat: -18.8, lng: 46.9 },
  { name: "MALI", lat: 17.6, lng: -2.0 },
  { name: "BURKINA FASO", lat: 12.4, lng: -1.6 },
  { name: "ZIMBABWE", lat: -20.0, lng: 30.0 },
  { name: "BOTSWANA", lat: -22.3, lng: 24.7 },
  { name: "NAMIBIA", lat: -22.9, lng: 18.5 },
];

function drawCountryLabels(ctx: CesiumDrawContext): void {
  for (let i = 0; i < COUNTRIES.length; i++) {
    const c = COUNTRIES[i];
    ctx.addEntity(`geo-country-${i}`, {
      position: Cesium.Cartesian3.fromDegrees(c.lng, c.lat),
      label: {
        text: c.name,
        font: 'bold 16px "IBM Plex Mono", "Courier New", monospace',
        fillColor: Cesium.Color.WHITE.withAlpha(0.7),
        outlineColor: Cesium.Color.BLACK.withAlpha(0.8),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(800_000, 20_000_000),
        scaleByDistance: new Cesium.NearFarScalar(1_500_000, 1.0, 8_000_000, 0.6),
      },
    });
  }
  console.log(`[Cesium] Drew ${COUNTRIES.length} country labels`);
}

// ── Tier 2: Admin-1 state/province labels ─────────────────────────────

const ADMIN1_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_1_states_provinces.geojson";

async function drawAdmin1Labels(ctx: CesiumDrawContext): Promise<void> {
  try {
    const res = await fetch(ADMIN1_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const gj = await res.json();

    let idx = 0;
    for (const f of gj.features) {
      const props = f.properties;
      const geom = f.geometry;
      if (!geom || !props?.name) continue;

      // Get centroid — use label point or compute from bbox
      let lng: number, lat: number;
      if (geom.type === "Point") {
        [lng, lat] = geom.coordinates;
      } else if (geom.type === "Polygon" || geom.type === "MultiPolygon") {
        // Simple centroid from first ring
        const ring = geom.type === "Polygon" ? geom.coordinates[0] : geom.coordinates[0]?.[0];
        if (!ring || ring.length === 0) continue;
        let sumLng = 0, sumLat = 0;
        for (const [lo, la] of ring) { sumLng += lo; sumLat += la; }
        lng = sumLng / ring.length;
        lat = sumLat / ring.length;
      } else continue;

      if (lat < BOUNDS.minLat || lat > BOUNDS.maxLat || lng < BOUNDS.minLng || lng > BOUNDS.maxLng) continue;

      ctx.addEntity(`geo-admin1-${idx}`, {
        position: Cesium.Cartesian3.fromDegrees(lng, lat),
        label: {
          text: props.name,
          font: '13px "IBM Plex Mono", "Courier New", monospace',
          fillColor: Cesium.Color.fromCssColorString("#9CA3AF").withAlpha(0.6),
          outlineColor: Cesium.Color.BLACK.withAlpha(0.6),
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(200_000, 3_000_000),
          scaleByDistance: new Cesium.NearFarScalar(500_000, 1.0, 3_000_000, 0.5),
        },
      });
      idx++;
    }
    console.log(`[Cesium] Drew ${idx} admin-1 labels`);
  } catch (err) {
    console.warn("[Cesium] Failed to load admin-1 labels:", err);
  }
}

// ── Tier 3: City / community labels ───────────────────────────────────

const CITIES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_populated_places_simple.geojson";

async function drawCityLabels(ctx: CesiumDrawContext): Promise<void> {
  try {
    const res = await fetch(CITIES_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const gj = await res.json();

    let idx = 0;
    for (const f of gj.features) {
      const props = f.properties;
      const geom = f.geometry;
      if (!geom || geom.type !== "Point" || !props?.name) continue;

      const [lng, lat] = geom.coordinates;
      if (lat < BOUNDS.minLat || lat > BOUNDS.maxLat || lng < BOUNDS.minLng || lng > BOUNDS.maxLng) continue;

      const pos = Cesium.Cartesian3.fromDegrees(lng, lat);

      // Dot marker
      ctx.addEntity(`geo-city-dot-${idx}`, {
        position: pos,
        point: {
          pixelSize: 3,
          color: Cesium.Color.WHITE.withAlpha(0.6),
          outlineWidth: 0,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 800_000),
        },
      });

      // Label
      ctx.addEntity(`geo-city-${idx}`, {
        position: pos,
        label: {
          text: props.name,
          font: '11px "IBM Plex Mono", "Courier New", monospace',
          fillColor: Cesium.Color.fromCssColorString("#D1D5DB").withAlpha(0.5),
          outlineColor: Cesium.Color.BLACK.withAlpha(0.5),
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          pixelOffset: new Cesium.Cartesian2(6, 0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 800_000),
          scaleByDistance: new Cesium.NearFarScalar(100_000, 1.0, 800_000, 0.5),
        },
      });
      idx++;
    }
    console.log(`[Cesium] Drew ${idx} city labels`);
  } catch (err) {
    console.warn("[Cesium] Failed to load city labels:", err);
  }
}

// ── Main export ───────────────────────────────────────────────────────

export async function drawGeoLabels(ctx: CesiumDrawContext): Promise<string[]> {
  const startLen = ctx.entityIds.length;
  drawCountryLabels(ctx);
  await Promise.all([drawAdmin1Labels(ctx), drawCityLabels(ctx)]);
  return ctx.entityIds.slice(startLen);
}
