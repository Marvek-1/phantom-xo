

# Phantom POE Visualization Strategy: Hidden vs Official Paths

## The Core Concept

The Phantom POE Engine detects **informal border crossing corridors** — paths people actually use that bypass official Points of Entry. The visualization must make this distinction immediately obvious on the 3D globe.

## Current State

Right now, all corridors render identically: green dashed polylines with glow ribbons and START/END markers. There is no visual distinction between official POEs, phantom corridors, or inferred paths. The `corridor_nodes` table has a `node_type` field and the `corridor_gap_zones` table tracks whether a zone is a gap (no official coverage), but neither is used visually yet.

## Visualization Design

### Layer 1 — Official POE Reference Layer (static, always visible)
- Pull `corridor_nodes` where `node_type = 'FORMAL_POE'` from the database
- Render as **solid blue diamonds** (the `T.blue` token) with a subtle constant glow
- Label: node name + country code in blue mono text
- These are the "known" crossings — the baseline truth

### Layer 2 — Phantom Corridor (the hidden path)
- The inferred corridor track renders as a **three-layer polyline stack**:

```text
┌─────────────────────────────────────────────┐
│  LAYER 3: Glow ribbon   — wide, 0.08 alpha  │  phantom-green, 24px
│  LAYER 2: Dashed flow   — animated dash      │  phantom-green, 5px, moving pattern
│  LAYER 1: Spine         — solid core line     │  phantom-green, 2px
└─────────────────────────────────────────────┘
```

- Color: `phantom-green` (#00E87A) — signals "detected but informal"
- The dashed flow uses `CallbackProperty` to animate dash offset over time, creating a "flowing" effect that implies movement along the path

### Layer 3 — Inferred Path (AI-computed probable route)
- When `corridorAnalysis.inferredPath` exists, render in **amber** (`T.amber`)
- This is the engine's best guess at the actual walking/canoe route between nodes
- Uses a **dotted pattern** (shorter dashes) to distinguish from the corridor spine
- Visual meaning: "we think people move along this specific terrain"

### Layer 4 — Gap Zone Highlighting
- Query `corridor_gap_zones` for the active corridor
- Where `is_gap_zone = true`, draw a **translucent red polygon buffer** around the path segment
- This highlights "here is where there is NO official monitoring"
- The gap between the nearest blue diamond (official POE) and the green corridor makes the "phantom" nature self-evident

### Layer 5 — Location Belief Circles
- Already partially implemented — yellow circles from `locationBeliefs`
- Represent probabilistic confidence: "we believe activity occurs within this radius"
- Opacity scales with `confidence` value (0.3 to 0.8)

### Node Differentiation by Type
Using the `node_type` field from `corridor_nodes`:

| node_type     | Shape        | Color   | Size |
|---------------|-------------|---------|------|
| FORMAL_POE    | Diamond      | Blue    | 14px |
| PHANTOM_POE   | Pulsing dot  | Amber   | 13px |
| SETTLEMENT    | Circle       | Teal    | 9px  |
| START / END   | Circle       | Green/Red | 10px |

PHANTOM_POE nodes get a **pulsing animation** via `CallbackProperty` on `pixelSize` — oscillating 10-16px — to draw the eye to the informal crossing.

### The "Aha" Moment: Side-by-Side Contrast
When `analyze_corridor` runs, the visualization shows:
1. Blue diamonds at official POEs (often 50-100km away)
2. Green dashed corridor cutting through the gap between them
3. Amber dots at inferred phantom crossing points
4. Red translucent zones where no monitoring exists
5. Yellow belief circles showing confidence bounds

The spatial gap between blue (official) and green (phantom) IS the story.

## Implementation Plan

### Step 1: Official POE reference layer
- New function `drawOfficialPOEs()` in `useCesiumMap.ts`
- Queries `corridor_nodes` where `node_type = 'FORMAL_POE'` via Supabase
- Renders blue diamond points with labels, always visible

### Step 2: Animated corridor rendering
- Upgrade `drawCorridor()` to use `CallbackProperty` for animated dash offset
- Add pulsing animation for PHANTOM_POE nodes

### Step 3: Gap zone visualization
- New function `drawGapZones()` that queries `corridor_gap_zones`
- Renders translucent red buffer polygons along gap segments
- Shows `nearest_formal_poe` label with distance

### Step 4: Enhanced node type rendering
- Update `drawAnalysis()` to differentiate node types by shape/color/animation
- Add interaction: click a node to see its details in `CorridorOverlay`

### Step 5: Legend overlay component
- New `MapLegend` component showing color/shape meanings
- Positioned bottom-right, collapsible, monospace styling

### Files Modified
- `src/hooks/useCesiumMap.ts` — new drawing functions, animated materials
- `src/components/dashboard/MapArea.tsx` — pass official POE layer toggle
- `src/components/dashboard/MapLegend.tsx` — new component
- `src/components/dashboard/CorridorOverlay.tsx` — node click detail
- `src/pages/Index.tsx` — wire legend + POE layer state

