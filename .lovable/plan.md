

# Bridge the Gap: Live Ingestion via Edge Functions

## The Problem
The uploaded ingestion scripts (ACLED, DTM, DHIS2, orchestrator) are written for a Node.js backend with raw Postgres queries. This project runs on Supabase Edge Functions (Deno). The frontend can't reach external APIs directly, but Edge Functions can.

## Errors in the Uploaded Scripts

1. **`import { v4 as uuid } from 'uuid'`** — Not available in Deno. Replace with `crypto.randomUUID()`.
2. **`params.db.query(...)` with `$1` placeholders** — Supabase Edge Functions use the Supabase JS client (`db.from().insert()`), not raw SQL.
3. **`btoa()` in DHIS2** — Works in Deno, but the overall pattern needs restructuring.
4. **Orchestrator passes `db: any`** — Must be replaced with a Supabase client created from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
5. **Missing `period` field** — DHIS2 signals lack `admin1`, `admin2`, `latitude`, `longitude` fields required by `normalized_signals`.
6. **DTM `uuid` import** — Same Deno issue. Also `f.latitude` / `f.longitude` may be strings, needs parsing.
7. **No error isolation** — If one provider fails, the orchestrator continues but doesn't track per-provider errors in `ingestion_runs`.
8. **Cascade spec** — This is a data contract comment file, not executable code. No errors per se, but needs an actual Edge Function to serve the API.

## Implementation Plan

### Step 1: Create `ingest-signals` Edge Function
A single Deno edge function that:
- Accepts `POST` with optional `{ providers: ['acled', 'dtm', 'dhis2'] }`
- Creates an `ingestion_runs` record
- Calls each provider's external API directly (Edge Functions have unrestricted outbound HTTP)
- Normalizes responses into `normalized_signals` format
- Inserts raw data into `raw_acled_events`, `raw_dtm_flows`, `raw_dhis2_data_values`
- Updates `ingestion_runs` with counts and status
- Requires admin role (checked via auth header)

All three ingestion scripts are inlined into one function file, converted to Deno idioms:
- `crypto.randomUUID()` instead of `uuid()`
- `supabase.from().insert()` instead of raw SQL
- Secrets read from `Deno.env.get()`: `ACLED_API_KEY`, `ACLED_EMAIL`, `DTM_API_KEY`, `DHIS2_BASE_URL`, `DHIS2_USERNAME`, `DHIS2_PASSWORD`

### Step 2: Create `cascade` Edge Function
Serves `GET /functions/v1/cascade?corridor_id=X`:
- Queries `normalized_signals` + `corridor_evidence_chains` + `entropy_results` for the corridor
- Groups signals by timestamp into frames
- Computes cumulative scores and HMM state per frame
- Returns the cascade spec shape from `cascade_spec.ts`

### Step 3: Add `ingest_signals` tool to `phantom-mcp`
Add a 7th tool to the MCP function so the chat can trigger ingestion:
- Tool name: `ingest_signals`
- Calls the `ingest-signals` Edge Function internally
- Returns signal counts and status

### Step 4: Wire frontend trigger
Add an "Ingest" command pattern to `ChatPanel.tsx`'s `parseToolFromMessage`:
- `"ingest signals"` or `"ingest acled"` triggers the new tool
- Display progress in chat

### Step 5: Request missing secrets
Before any of this works, the user needs to provide:
- `ACLED_API_KEY` + `ACLED_EMAIL`
- `DTM_API_KEY`  
- `DHIS2_BASE_URL` + `DHIS2_USERNAME` + `DHIS2_PASSWORD` (optional, skip if no real instance)

### Files Created/Modified
| File | Action |
|------|--------|
| `supabase/functions/ingest-signals/index.ts` | Create — full ingestion orchestrator in Deno |
| `supabase/functions/cascade/index.ts` | Create — cascade API endpoint |
| `supabase/functions/phantom-mcp/index.ts` | Edit — add `ingest_signals` tool |
| `src/components/dashboard/ChatPanel.tsx` | Edit — add ingest command parsing |
| `src/lib/mcp-client.ts` | No changes needed |

### Technical Details

**Ingestion function structure:**
```text
ingest-signals/index.ts
├── corsHeaders + admin auth check
├── ingestACLED(supabase, runId)     — fetch from api.acleddata.com
│   ├── insert raw_acled_events
│   └── insert normalized_signals
├── ingestDTM(supabase, runId)       — fetch from api.displacement.iom.int
│   ├── insert raw_dtm_flows
│   └── insert normalized_signals  
├── ingestDHIS2(supabase, runId)     — fetch from user's DHIS2 instance
│   ├── insert raw_dhis2_data_values
│   └── insert normalized_signals
└── update ingestion_runs with totals
```

**Secret requirements:**
- `ACLED_API_KEY`, `ACLED_EMAIL` — required for ACLED
- `DTM_API_KEY` — required for IOM-DTM  
- `DHIS2_BASE_URL`, `DHIS2_USERNAME`, `DHIS2_PASSWORD` — optional, skipped if not set

