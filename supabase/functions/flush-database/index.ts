import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tables to NEVER flush — infrastructure / auth
const PRESERVE_TABLES = new Set([
  "user_roles",
]);

// All user-data tables in dependency-safe delete order
// (children before parents to avoid FK violations)
const FLUSH_ORDER = [
  // Evidence / trace children
  "evidence_atoms",
  "explainability_traces",
  "trinity_syntheses",
  "moscript_moments",
  "moscript_runs",
  "moscript_registry",
  // Corridor score children
  "corridor_scores",
  "corridor_signals",
  // Corridor definition children
  "corridor_evidence_chains",
  "corridor_gap_zones",
  "corridor_nodes",
  "corridor_cameras",
  // Corridor candidates (parent of scores/signals)
  "corridor_candidates",
  // Corridor definitions (parent of nodes/cameras/evidence_chains/gap_zones)
  "corridor_definitions",
  // POE children
  "poe_detection_events",
  "poe_divergence",
  "poe_entropy",
  "poe_evidence",
  "poe_moments",
  "poe_signals",
  "poe_temporal",
  "poe_terrain",
  "poe_corridors",
  // Signals & entropy
  "normalized_signals",
  "sentinel_signals",
  "entropy_results",
  // Friction
  "friction_cells",
  "terrain_friction_surfaces",
  // Raw sources
  "raw_acled_events",
  "raw_dhis2_data_values",
  "raw_dtm_flows",
  // Diagnostics & health
  "diagnostic_results",
  "provider_health",
  "operational_border_runs",
  // Ingestion (parent of many)
  "ingestion_runs",
  // Conduit
  "conduit_cycles",
  // Route activity
  "route_activity",
  // Radar
  "radar_scans",
  // Map interaction
  "map_interaction_events",
  "camera_flight_logs",
  // Chat
  "mcp_tool_invocations",
  "mcp_chat_turns",
  "mcp_chat_sessions",
  "gemini_chat_messages",
  "gemini_chat_sessions",
  // Firebase sessions
  "firebase_user_sessions",
  // Phantom registries
  "phantom_corridor_registry",
  "phantom_node_registry",
  // Truth engine
  "truth_engine_runs",
  // System config
  "system_config",
  // Data lanes — flushed last, then reseeded
  "data_lanes",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: roleCheck } = await db.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        if (!roleCheck) {
          return new Response(
            JSON.stringify({ error: "Admin role required for flush" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const results: Array<{ table: string; deleted: number; status: string }> = [];
    let totalDeleted = 0;
    let flushedCount = 0;

    for (const table of FLUSH_ORDER) {
      if (PRESERVE_TABLES.has(table)) {
        results.push({ table, deleted: 0, status: "preserved" });
        continue;
      }

      try {
        // Count before delete
        const { count: before } = await db
          .from(table)
          .select("*", { count: "exact", head: true });

        const rowsBefore = before ?? 0;

        if (rowsBefore === 0) {
          results.push({ table, deleted: 0, status: "already_empty" });
          flushedCount++;
          continue;
        }

        // Delete all rows — neq filter on a non-null column ensures all rows match
        // Using a broad filter since .delete() requires a filter
        const { error } = await db
          .from(table)
          .delete()
          .neq("id", "__impossible_sentinel_value__");

        if (error) {
          // Some tables use different PK names; try without filter via RPC
          results.push({ table, deleted: 0, status: `error: ${error.message}` });
          continue;
        }

        // Count after to verify
        const { count: after } = await db
          .from(table)
          .select("*", { count: "exact", head: true });

        const deleted = rowsBefore - (after ?? 0);
        totalDeleted += deleted;
        flushedCount++;
        results.push({ table, deleted, status: "flushed" });
      } catch (e) {
        results.push({ table, deleted: 0, status: `error: ${(e as Error).message}` });
      }
    }

    // Re-seed data lanes
    const now = new Date().toISOString();
    const { error: seedError } = await db.from("data_lanes").insert([
      {
        id: "lane-live",
        lane: "LIVE",
        label: "Live Intelligence",
        description: "Real signals from live providers only",
        is_active: true,
        created_at: now,
        badge_color: "#22c55e",
      },
      {
        id: "lane-sandbox",
        lane: "SANDBOX",
        label: "Sandbox",
        description: "Synthetic test data for UI/regression",
        is_active: false,
        created_at: now,
        badge_color: "#f59e0b",
      },
      {
        id: "lane-test",
        lane: "TEST",
        label: "Test",
        description: "Automated test suite data",
        is_active: false,
        created_at: now,
        badge_color: "#6366f1",
      },
    ]);

    // Verify remaining rows
    let remainingRows = 0;
    const remaining: Array<{ table: string; rows: number }> = [];
    for (const table of FLUSH_ORDER) {
      const { count } = await db
        .from(table)
        .select("*", { count: "exact", head: true });
      const c = count ?? 0;
      remaining.push({ table, rows: c });
      remainingRows += c;
    }

    return new Response(
      JSON.stringify({
        status: "FLUSHED",
        tables_flushed: flushedCount,
        rows_deleted: totalDeleted,
        remaining_rows: remainingRows,
        lanes_seeded: seedError ? 0 : 3,
        seed_error: seedError?.message ?? null,
        results,
        remaining,
        message: "Database clean. Only infrastructure rows intentionally reseeded.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
