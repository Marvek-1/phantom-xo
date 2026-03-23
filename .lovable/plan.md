

# Smooth Corridor Rendering — Replace Polyline Segments with Cesium CorridorGraphics

## Problem
The current approach draws corridors as batches of 8-segment `polyline` entities. Each batch gets one flat color, creating visible seams and hard color jumps between segments — the "broken color lines" effect visible in the screenshot.

## Solution
Replace `polyline` entities with Cesium `CorridorGraphics` (aka ribbon/strip geometry). `CorridorGraphics` takes an array of positions and a `width` in **meters** (not pixels), producing a smooth, terrain-following filled band with naturally rounded edges and no seams.

For the gradient effect, group coordinates into larger color-similar batches (sharing endpoint positions to prevent gaps), and render each as a `corridor` entity instead of a `polyline`.

```text
BEFORE:  polyline batch 1 ][  polyline batch 2 ][  polyline batch 3
         visible seams, hard color jumps, pixel-width lines

AFTER:   ═══════════════════════════════════════════════════════
         smooth corridor ribbon, overlapping endpoints, meter-width
```

## Changes in `src/hooks/cesium/drawAllCorridors.ts`

1. **Replace gradient band polylines with `corridor` entities**:
   - Change `polyline` → `corridor` using `CorridorGraphics` with `width: 8000` (8km ribbon — visible at continental zoom)
   - Each batch shares its last position with the next batch's first position (overlap-by-one) to eliminate gaps
   - Increase batch size from 8 to 20 segments for smoother color transitions and fewer entities

2. **Replace glow polylines with wider corridor entities**:
   - Same approach but `width: 16000` and lower alpha for the halo effect

3. **Keep flowing dash and clickable spine as polylines** (they don't need smooth edges — they're thin overlays)

4. **Switch from pixel width to meter width** for the band/glow layers only. This makes corridors scale naturally with zoom level — wide ribbons at high altitude, detailed paths when zoomed in.

## File changes

| File | Change |
|---|---|
| `src/hooks/cesium/drawAllCorridors.ts` | In `drawPhantomCorridor()`: replace band+glow `polyline` entities with `corridor` entities, increase batch to 20, overlap endpoints |

