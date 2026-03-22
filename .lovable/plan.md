

# Adapt Code Review Fixes to the Map

The user's code review references a Next.js `PhantomMap.tsx` from a different codebase. This project uses CesiumJS via `useCesiumMap.ts` with modular draw functions. I'll adapt the relevant errors/fixes to the actual files here.

## What applies and what doesn't

| Review Error | Applies? | Reason |
|---|---|---|
| 1. Ion asset IDs | No | This project doesn't use Cesium Ion assets at all — uses MapTiler |
| 2. Hardcoded Ion token | No | No Ion token in this codebase |
| 3. imageryProvider: false cast | No | Already uses `viewer.imageryLayers.removeAll()` correctly |
| 4. getWindowDays | No | No TimeWindow type in this codebase |
| 5. CascadeTab Math.sin cosmetic | **Yes** | The cascade edge function needs evidence-based scoring |
| 6. Entity rebuild dependency guards | **Yes** | `drawOfficialPOEs` re-runs on every render cycle due to `loadOfficialPOEs` recreating |
| 7. Google Photorealistic | No | Not used here |
| 8. GeoJsonDataSource cast | No | Not used here |
| 9. Bar component nullable | No | No Bar component in this codebase |
| 10. Evidence source filtering | **Yes** | `CorridorOverlay` shows all evidence without source badges |

**Additional issues found in the actual codebase:**

| Issue | File | Description |
|---|---|---|
| Static coordinate readout | `MapArea.tsx:65-69` | Always shows "LAT -1.5000, LNG 34.0000" — never updates with camera |
| `drawOfficialPOEs` queries `country_code` column | `drawOfficialPOEs.ts:13` | Types show the column is `country`, not `country_code` |
| No animated dash flow | `drawCorridor.ts` | Uses static `PolylineDashMaterialProperty` — no `CallbackProperty` animation |
| `corridor_nodes` column mismatch | `drawGapZones.ts:26` | Queries `node_order` but types show `order_index` |
| Cascade function returns static HMM states | `cascade/index.ts` | Should compute from evidence scores, not hardcode |

## Implementation Plan

### Step 1: Fix column name mismatches
- `drawOfficialPOEs.ts`: Change `country_code` → `country` in select
- `drawGapZones.ts`: Change `node_order` → `order_index` in select and order clause

### Step 2: Animated corridor dash flow
- In `drawCorridor.ts`, replace static `PolylineDashMaterialProperty` with a `CallbackProperty`-based animated dash that shifts offset over time, creating flowing movement along the path

### Step 3: Live coordinate readout
- In `MapArea.tsx`, add a `postRender` event listener on the Cesium viewer to read camera position
- Update the coordinate display with actual lat/lng/alt from camera

### Step 4: Evidence source badges in CorridorOverlay
- Add source-type badge (color-coded by ACLED/DTM/DHIS2/AFRO-SENTINEL)
- Filter indicator to distinguish conflict/displacement/disease signals

### Step 5: Stabilize entity rebuild
- In `useCesiumMap.ts`, guard `loadOfficialPOEs` with a ref to prevent re-fetching on every render
- Only reload when `officialPOEsVisible` transitions from false→true

### Step 6: Cascade evidence-based scoring
- In `supabase/functions/cascade/index.ts`, replace any cosmetic Math.sin scoring with actual evidence-weighted averages from `normalized_signals`

### Files Modified
| File | Change |
|---|---|
| `src/hooks/cesium/drawOfficialPOEs.ts` | Fix `country_code` → `country` |
| `src/hooks/cesium/drawGapZones.ts` | Fix `node_order` → `order_index` |
| `src/hooks/cesium/drawCorridor.ts` | Add animated dash flow via `CallbackProperty` |
| `src/components/dashboard/MapArea.tsx` | Live coordinate readout from camera |
| `src/components/dashboard/CorridorOverlay.tsx` | Source badges + evidence filtering |
| `src/hooks/useCesiumMap.ts` | Stable POE loading guard |
| `supabase/functions/cascade/index.ts` | Evidence-based frame scoring |

