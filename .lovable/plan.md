

# Replace Dense GeoJSON + Fix Pulse Crash

## Changes

### 1. Copy dense GeoJSON data file
Copy `user-uploads://phantom_formal_paired_dense.geojson` → `public/data/corridors_paired.geojson`. The dense file has 73–653 points per corridor (vs 3–15 currently), so lines will follow real terrain. The `densifyLine()` function will pass through since coords already exceed the target count.

### 2. Fix Cesium ellipse pulse crash (`drawAllCorridors.ts`)
**Root cause**: `drawPhantomPoe()` at line 637 creates two separate `CallbackProperty` instances via `makePulse()`. Even though they share closure variables, Cesium can call them at slightly different frame boundaries, producing different radius values → `semiMinorAxis > semiMajorAxis` → crash.

**Fix**: Use a single shared `CallbackProperty` instance for both axes, and add `Math.max(1, ...)` guard with `Math.abs()` on the sin wave to prevent any edge case:

```typescript
const pulse = new Cesium.CallbackProperty(() => {
  return Math.max(1, 3000 + Math.abs(Math.sin(Date.now() * 0.003)) * 1500);
}, false);

ellipse: {
  semiMinorAxis: pulse,
  semiMajorAxis: pulse,  // same instance = always equal
  ...
}
```

### 3. No other code changes needed
The renderer already reads `corridors_paired.geojson` and handles all `route_type` values. Dense coordinates just flow through existing drawing functions.

## Files

| File | Action |
|---|---|
| `public/data/corridors_paired.geojson` | Replace with dense upload |
| `src/hooks/cesium/drawAllCorridors.ts` | Fix pulse — single CallbackProperty + Math.abs guard |

