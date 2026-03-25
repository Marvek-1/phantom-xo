import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { handleCorsPreflight, withCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const url = new URL(req.url);

    const { data: lanes } = await db.from("data_lanes").select("id").eq("is_active", true).limit(1);
    if (!lanes?.length) return new Response(JSON.stringify({ error: "No active data lane" }), { status: 503, headers: withCorsHeaders({ "Content-Type": "application/json" }) });
    const laneId = lanes[0].id;

    let query = db.from("poe_divergence").select("*").eq("lane_id", laneId);
    const trend = url.searchParams.get("trend");
    if (trend) query = query.eq("trend", trend);

    const { data: divergences, error } = await query.order("divergence_ratio", { ascending: false });
    if (error) throw error;

    // Enrich with corridor context
    const corridorIds = [...new Set((divergences ?? []).map((d: any) => d.corridor_id))];
    const { data: corridors } = await db.from("poe_corridors").select("id, start_node, end_node, start_country, end_country, score, risk_class").eq("lane_id", laneId).in("id", corridorIds.length > 0 ? corridorIds : ["__none__"]);

    const corridorMap = new Map((corridors ?? []).map((c: any) => [c.id, c]));
    const enriched = (divergences ?? []).map((d: any) => ({ ...d, corridor: corridorMap.get(d.corridor_id) ?? null }));

    return new Response(JSON.stringify({ lane_id: laneId, count: enriched.length, divergences: enriched }), {
      headers: withCorsHeaders({ "Content-Type": "application/json" }),
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: withCorsHeaders({ "Content-Type": "application/json" }) });
  }
});
