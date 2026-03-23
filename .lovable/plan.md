

# Add Geographic Labels + Solid White Borders

## Two tasks from the approved plan plus the border style change:

### 1. New file: `src/hooks/cesium/drawGeoLabels.ts`

Three-tier geographic labels with zoom-dependent visibility:

- **Countries** (~30 hardcoded centroids): bold 16px white labels, visible above 800km altitude
- **Admin1 states**: fetched from Natural Earth 110m admin-1 GeoJSON, 13px gray labels, visible 200km–3,000km
- **Cities**: fetched from Natural Earth 110m populated places, 11px dim labels + 3px dot, visible below 800km

All use `distanceDisplayCondition` and `scaleByDistance` for clean zoom transitions.

### 2. Modify `src/hooks/cesium/drawBorders.ts`

Replace the current dashed gray lines + glow with solid bold white lines:

- Remove the glow layer entirely
- Replace `PolylineDashMaterialProperty` with a solid white `ColorMaterialProperty`
- Color: white at alpha 0.6
- Width: 2 (clean, not overpowering)

### 3. Modify `src/hooks/useCesiumMap.ts`

Add `drawGeoLabels(ctx)` call alongside `drawBorders(ctx)` in `loadAllCorridors`.

| File | Change |
|---|---|
| `src/hooks/cesium/drawGeoLabels.ts` | New — three-tier label renderer |
| `src/hooks/cesium/drawBorders.ts` | Remove glow + dashes → solid white line, width 2, alpha 0.6 |
| `src/hooks/useCesiumMap.ts` | Add `drawGeoLabels(ctx)` to parallel load |

