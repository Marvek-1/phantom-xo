

# Integrate PhantomMap Visualizations into CesiumJS

The uploaded `PhantomMap.tsx` is a self-contained Mapbox GL component rendering 14 corridors with dense coordinate tracks, 91 typed nodes, 168 evidence signals, and a cascade animation engine. The existing project uses CesiumJS with MapTiler. This plan ports all visualization features into the existing Cesium architecture.

## Data files

Copy GeoJSON files to `public/data/` for runtime loading. The CSV files contain temporal data already in the database (inserted in the previous migration). The `PhantomMap.tsx` itself is a reference — its embedded data (CORRIDORS_META, NODE_GJ, EVID_GJ, EVID_DATA) will be extracted into the GeoJSON files.

## Step 1: Copy data files to public/data/

| File | Source |
|---|---|
| `public/data/corridors_dense.geojson` | `corridors_dense_1.geojson` — 14 LineString features with dense coordinate arrays |
| `public/data/corridors_temporal.geojson` | `corridors_temporal.geojson` — same corridors with temporal context |
| `public/data/nodes.json` | Extract NODE_GJ from PhantomMap.tsx (91 Point features with type/color/size) |
| `public/data/evidence.json` | Extract EVID_DATA from PhantomMap.tsx (168 evidence signals with cid/day/lat/lng/src/score) |

## Step 2: Create `drawAllCorridors.ts`

New file: `src/hooks/cesium/drawAllCorridors.ts`

- Fetch `/data/corridors_dense.geojson` at runtime
- For each LineString feature: parse coordinates → `Cesium.Cartesian3.fromDegreesArray`
- Render 3-layer stack per corridor (matching existing `drawCorridor.ts` pattern):
  - Glow ribbon (wide, low alpha, risk-colored)
  - Animated dash (using `PolylineDashMaterialProperty` with `CallbackProperty`)
  - Solid spine (thin, full color)
- Risk color map: CRITICAL → `#EF4444`, HIGH → `#F97316`, MEDIUM → `#EAB308`
- Returns cleanup function

## Step 3: Create `drawNodes.ts`

New file: `src/hooks/cesium/drawNodes.ts`

- Fetch `/data/nodes.json` at runtime
- Render each node as a point entity with type-specific styling:
  - START: green (#22C55E), 7px, labeled
  - END: red (#EF4444), 7px, labeled
  - PHANTOM: gold (#F59E0B), 10px, pulsing billboard, bold label, `distanceDisplayCondition` up to 400km
  - BORDER: orange (#F97316), 5px, no label
  - WAYPOINT: gray (#9CA3AF), 3px, `distanceDisplayCondition` up to 300km
- Labels use existing `T.bg` for outline, `IBM Plex Mono` font

## Step 4: Create `drawEvidenceLayer.ts`

New file: `src/hooks/cesium/drawEvidenceLayer.ts`

- Fetch `/data/evidence.json` at runtime
- Render each signal as a colored point entity:
  - ACLED → red, IOM-DTM → blue, DHIS2 → green
  - Size scaled by score (6-16px)
- All entities start hidden (show=false), togglable via returned function
- Returns `{ toggle: () => void, visible: boolean }`

## Step 5: Create `cascadeEngine.ts`

New file: `src/hooks/cesium/cascadeEngine.ts`

- Uses the evidence data array (168 signals with `cid`, `day`, `score`, `src`)
- `startCascade(corridorId)`: filters evidence for corridor, groups by day, iterates with 2s interval
- Each frame: reveals that day's evidence entities with pop-in animation (scale from 0)
- When a phantom node location is hit: flash a gold pulsing entity
- `stopCascade()`: clears interval, removes cascade entities
- Returns day counter and cumulative score for HUD display

## Step 6: Update `useCesiumMap.ts`

Add new state and methods:
- `corridorsLoaded` state — load all corridors + nodes on map ready
- `evidenceVisible` state + `toggleEvidence()`
- `cascadeActive` state + `startCascade(corridorId)` + `stopCascade()`
- Call `drawAllCorridors` and `drawNodes` in the `mapReady` effect
- Expose corridor selector data (CORRIDORS_META array) for UI

## Step 7: Update `MapLegend.tsx`

Add new sections to the existing legend:
- **Risk class swatches**: CRITICAL (red), HIGH (orange), MEDIUM (yellow)
- **Evidence source dots**: ACLED (red), IOM-DTM (blue), DHIS2 (green)
- **Corridor count badge**: "14 corridors · 91 nodes"
- **Evidence toggle checkbox**: "Show Evidence Signals"
- **Cascade controls**: corridor selector dropdown + play/stop button

## Step 8: Update `MapArea.tsx`

- Pass new props from `useCesiumMap` to `MapLegend` (evidence toggle, cascade controls)
- Add cascade HUD overlay (absolute positioned) showing day counter and cumulative score when cascade is active

## Files

| File | Action |
|---|---|
| `public/data/corridors_dense.geojson` | Copy from upload |
| `public/data/corridors_temporal.geojson` | Copy from upload |
| `public/data/nodes.json` | Extract from PhantomMap.tsx NODE_GJ |
| `public/data/evidence.json` | Extract from PhantomMap.tsx EVID_DATA |
| `src/hooks/cesium/drawAllCorridors.ts` | Create — GeoJSON → Cesium corridor rendering |
| `src/hooks/cesium/drawNodes.ts` | Create — typed node markers |
| `src/hooks/cesium/drawEvidenceLayer.ts` | Create — togglable evidence points |
| `src/hooks/cesium/cascadeEngine.ts` | Create — day-by-day replay engine |
| `src/hooks/useCesiumMap.ts` | Extend — auto-load corridors, evidence, cascade controls |
| `src/components/dashboard/MapLegend.tsx` | Extend — risk classes, sources, controls |
| `src/components/dashboard/MapArea.tsx` | Extend — cascade HUD, pass new props |

