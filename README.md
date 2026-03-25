# Welcome to your Lovable project

TODO: Document your project here

## Mapbox GL JS v3 Basemap Modes

`mapbox-gl` is wired for v3 and supports both your existing custom basemap and Mapbox Standard styles.

Optional `.env` flags:

- `VITE_MAPBOX_BASEMAP=custom|standard|standard-satellite` (default: `custom`)
- `VITE_MAPBOX_LIGHT_PRESET=day|dawn|dusk|night`
- `VITE_MAPBOX_STANDARD_THEME=default|faded|monochrome` (Standard only)
- `VITE_MAPBOX_STANDARD_FONT=<Mapbox font option>`
- `VITE_MAPBOX_SHOW_POI_LABELS=true|false`
- `VITE_MAPBOX_SHOW_ROAD_LABELS=true|false`
- `VITE_MAPBOX_SHOW_PLACE_LABELS=true|false`
- `VITE_MAPBOX_SHOW_TRANSIT_LABELS=true|false`
- `VITE_MAPBOX_SHOW_3D_OBJECTS=true|false` (Standard only)
- `VITE_MAPBOX_SHOW_ROADS_AND_TRANSIT=true|false` (Standard-Satellite only)
- `VITE_MAPBOX_SHOW_PEDESTRIAN_ROADS=true|false` (Standard-Satellite only)

## Backend Endpoints (Neon-First)

Frontend API calls can target a Neon-backed API directly and only fall back to Supabase function URLs if Neon endpoints are not configured.

- `VITE_API_BASE_URL=https://<your-neon-api-host>`
  - Expected routes:
  - `/compute-scores`
  - `/api-temporal`
  - `/ollam-chat`
  - `/phantom-mcp`
- Optional per-route overrides:
  - `VITE_API_COMPUTE_SCORES_URL=...`
  - `VITE_API_TEMPORAL_URL=...`
  - `VITE_API_OLLAM_CHAT_URL=...`
  - `VITE_API_PHANTOM_MCP_URL=...`
- Optional public header for custom gateway auth:
  - `VITE_API_PUBLIC_KEY=...` (sent as `x-api-key`)
