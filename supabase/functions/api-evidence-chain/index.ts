import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { handleCorsPreflight, withCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const url = new URL(req.url);
    const corridorId = url.searchParams.get("corridor_id");
    if (!corridorId) return new Response(JSON.stringify({ error: "corridor_id required" }), { status: 400, headers: withCorsHeaders({ "Content-Type": "application/json" }) });

    const { data: lanes } = await db.from("data_lanes").select("id").eq("is_active", true).limit(1);
    if (!lanes?.length) return new Response(JSON.stringify({ error: "No active data lane" }), { status: 503, headers: withCorsHeaders({ "Content-Type": "application/json" }) });
    const laneId = lanes[0].id;

    // Verify corridor
    const { data: corridor } = await db.from("poe_corridors").select("id, start_node, end_node, score, risk_class, start_country, end_country").eq("id", corridorId).eq("lane_id", laneId).maybeSingle();
    if (!corridor) return new Response(JSON.stringify({ error: "Corridor not found" }), { status: 404, headers: withCorsHeaders({ "Content-Type": "application/json" }) });

    // Get evidence
    const { data: evidence } = await db.from("poe_evidence").select("*").eq("corridor_id", corridorId).eq("lane_id", laneId).order("timestamp", { ascending: true });

    // Group by source
    const bySource: Record<string, number> = {};
    for (const e of evidence ?? []) {
      bySource[e.source] = (bySource[e.source] || 0) + 1;
    }

    return new Response(JSON.stringify({
      corridor,
      total_evidence: evidence?.length ?? 0,
      by_source: bySource,
      chain: evidence ?? [],
    }), { headers: withCorsHeaders({ "Content-Type": "application/json" }) });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: withCorsHeaders({ "Content-Type": "application/json" }) });
  }
});
