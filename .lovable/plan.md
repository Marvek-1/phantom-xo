

# Add Real IOM DTM Temporal Flow Data

Create 3 new tables and populate them with verified IOM DTM published data: temporal flows, real crossing points, and corridor temporal events. Also insert new corridors (Kasai Ring legs, Bossaso sea route) and their nodes.

## Step 1: Database Migration — Create 3 new tables

**`temporal_flows`** — Monthly/quarterly flow counts from IOM FMPs
- id (text PK), corridor_id, period_start, period_end, flow_count (integer), flow_direction, source_report, source_url, notes, provenance

**`real_crossing_points`** — Verified border crossing locations with IOM FMP data
- id (text PK), name, alt_names, lat (real), lng (real), country_a, country_b, crossing_type, iom_fmp_active (boolean), monthly_avg_flow (integer), peak_daily_flow (integer), status, closure_periods, source

**`corridor_temporal_events`** — Key conflict/displacement/health events
- id (text PK), corridor_id, crossing_point_id, event_date, event_type, description, flow_impact, source

All tables get RLS: admin full CRUD, authenticated read.

## Step 2: Insert crossing points (10 records)
Metema, Nimule, Renk, Adré, Doolow, Dhobley, Bossaso, Kazumba, Moyale, Nadapal — all with real IOM coordinates and flow stats.

## Step 3: Insert temporal flows (~45 records)
- Metema monthly FMP data (22 months: Apr 2023 → Jan 2025)
- Sudan cross-border aggregate flows (6 records covering 3.3M movements)
- Somalia FMP annual breakdowns (6 records, 283K total)
- Nimule quarterly flows (4 records)
- Kasai/Angola ring flows (5 records, 1.2M affected)
- Adré/Chad flows (4 records)

## Step 4: Insert temporal events (12 key events)
Sudan conflict onset, Metema closure/reopening, El Geneina massacre, Kasai cholera, Bossaso smuggling surge, 3.3M milestone, etc.

## Step 5: Insert new corridors + definitions + nodes
- C-CD-005 Cazombo→Kazumba (Kasai Ring Leg 1)
- C-CD-006 Luiza→Dilolo (Kasai Ring Leg 2)
- C-SO-003 Bossaso→Aden (Sea Route)
- 3 corridor_definitions entries
- 10 corridor_nodes entries

## Step 6: Create `api-temporal` edge function
New edge function exposing:
- `GET /api-temporal` — list all temporal flows with optional corridor_id filter
- `GET /api-temporal?crossing_points=1` — list crossing points
- `GET /api-temporal?events=1` — list temporal events
- `GET /api-temporal?corridor_id=X` — flows for specific corridor

## Files
| File | Action |
|---|---|
| Migration SQL | Create 3 tables with RLS |
| Data inserts (via insert tool) | ~70 records across 3 new tables + corridors/definitions/nodes |
| `supabase/functions/api-temporal/index.ts` | New edge function |

