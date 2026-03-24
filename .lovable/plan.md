

# Migrate Map Engine: CesiumJS to Mapbox GL JS

## Overview

Replace CesiumJS (3D globe engine — heavy, broken corridor rendering) with Mapbox GL JS (native line-gradient support, smooth curves, lighter). The user's working script provides the foundation. We keep all existing data layers and UI integrations.

## Architecture

```text
BEFORE                              AFTER
──────                              ─────
cesium (npm) + vite-plugin-cesium    mapbox-gl (npm) + @turf/turf
useCesiumMap.ts                      useMapboxMap.ts
hooks/cesium/*.ts (13 files)         hooks/mapbox/*.ts (6 files)
CesiumDrawContext                    MapboxDrawContext (map instance)
Cesium entities                      Mapbox sources + layers
```

## Changes

### 1. Package changes
- **Remove**: `cesium`, `vite-plugin-cesium`
- **Add**: `mapbox-gl`, `@turf/turf`, `@types/mapbox-gl` (dev)
- **Update** `vite.config.ts`: remove `cesium()` plugin import

### 2. New hook: `src/hooks/useMapboxMap.ts`
Core map hook replacing `useCesiumMap.ts`. Initializes Mapbox with:
- Style: `mapbox://styles/mapbox/standard-satellite`
- Center: `[34.0, -1.5]`, zoom 4 (East Africa)
- Access token from the user's script (public key)
- On `load` event: calls all draw functions, sets `mapReady`
- Exposes same API surface: `mapReady`, `corridorsMeta`, `layerVisibility`, `toggleLayer`, `selectedCorridorId`, `handleMapQuery`, cascade controls, etc.
- Click handler: query rendered features on corridor layers to set `selectedCorridorId`
- Camera coordinate readout via `moveend` event

### 3. New drawing modules in `src/hooks/mapbox/`

**`drawCorridors.ts`** — Temporal corridors + deviations
- Source `corridors-temporal` from `/data/corridors_temporal.geojson` with `lineMetrics: true`
- Layer: `line` type with `line-gradient` interpolation (blue → cyan → lime → yellow → red based on `line-progress`)
- Width: 5px, opacity from feature `opacity` property, round caps/joins
- Deviation source from `/data/deviation/all_deviations.geojson` — dashed red line layer
- Animated point along formal routes using turf (from user's script)
- Formal routes from `/data/formal/all_formal_routes.geojson` — red line layer
- Midpoint labels as symbol layer with `text-field: ["get", "name"]`
- Start/end node markers as circle + symbol layers
- Returns `CorridorMeta[]` from corridors_meta.json

**`drawBorders.ts`** — Admin boundaries
- Source from Natural Earth GeoJSON
- Solid white line, width 2, opacity 0.6

**`drawGeoLabels.ts`** — Three-tier labels
- Countries: symbol layer, `minzoom: 2`, `maxzoom: 6`, bold white text
- Admin-1: symbol layer, `minzoom: 5`, `maxzoom: 8`, gray text
- Cities: symbol layer with circle marker, `minzoom: 7`

**`drawEvidenceLayer.ts`** — Evidence signals
- GeoJSON source from temporal adapter data
- Circle layer (initially invisible) with data-driven radius and color
- Symbol layer for labels
- Toggle via `setLayoutProperty` visibility

**`drawOfficialPOEs.ts`** — from database query
- GeoJSON source built from Supabase corridor_nodes query
- Circle + symbol layers for blue diamond markers

**`cascadeEngine.ts`** — Minimal adaptation
- Instead of Cesium entity show/hide, use `setFilter` on evidence layer to show signals by ID
- Same start/stop/seek API

### 4. Update `MapArea.tsx`
- Remove Cesium imports, use `useMapboxMap` instead
- Container ref stays the same
- Remove clipping polygon logic (already removed)
- Keep coordinate readout, legend, cascade HUD
- Click handler via Mapbox `queryRenderedFeatures`

### 5. Update `MapLegend.tsx`
- No changes needed — it already works with layer visibility toggles via callbacks

### 6. Update `Index.tsx` and types
- `MapParams` type: rename `CesiumCameraTarget` to `CameraTarget` (remove Cesium prefix)
- `handleMapQuery` uses `map.flyTo` instead of Cesium camera

### 7. Cleanup
- Delete all files in `src/hooks/cesium/` (13 files)
- Delete `src/hooks/useCesiumMap.ts`
- Remove cesium type references from `phantom.ts`

## Files Summary

| Action | File |
|--------|------|
| Create | `src/hooks/useMapboxMap.ts` |
| Create | `src/hooks/mapbox/drawCorridors.ts` |
| Create | `src/hooks/mapbox/drawBorders.ts` |
| Create | `src/hooks/mapbox/drawGeoLabels.ts` |
| Create | `src/hooks/mapbox/drawEvidenceLayer.ts` |
| Create | `src/hooks/mapbox/drawOfficialPOEs.ts` |
| Create | `src/hooks/mapbox/cascadeEngine.ts` |
| Create | `src/hooks/mapbox/types.ts` |
| Edit | `src/components/dashboard/MapArea.tsx` |
| Edit | `src/pages/Index.tsx` |
| Edit | `src/types/phantom.ts` |
| Edit | `vite.config.ts` |
| Edit | `package.json` |
| Delete | `src/hooks/useCesiumMap.ts` |
| Delete | `src/hooks/cesium/*` (13 files) |

## Key Technical Decisions

- **Mapbox token**: Use the public token from the user's script directly in code (it's a publishable key)
- **Line gradients**: Native Mapbox `line-gradient` expression — no batching, no seams, smooth curves out of the box
- **Layer toggle**: `map.setLayoutProperty(layerId, 'visibility', 'visible'|'none')`
- **Animated point**: Uses `@turf/turf` for `along()` and `lineDistance()` with `requestAnimationFrame`
- **Cascade engine**: Filters evidence layer by feature IDs instead of toggling Cesium entity visibility

