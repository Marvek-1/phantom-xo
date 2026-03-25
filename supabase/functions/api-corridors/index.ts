import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { handleCorsPreflight, withCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const url = new URL(req.url);

    // Get active lane
    const { data: lanes } = await db.from("data_lanes").select("id").eq("is_active", true).limit(1);
    if (!lanes?.length) return new Response(JSON.stringify({ error: "No active data lane" }), { status: 503, headers: withCorsHeaders({ "Content-Type": "application/json" }) });
    const laneId = lanes[0].id;

    // Check for corridor ID in path: /api-corridors?id=xxx
    const corridorId = url.searchParams.get("id");

    if (corridorId) {
      // GET single corridor with terrain, divergence, evidence
      const { data: corridor } = await db.from("poe_corridors").select("*").eq("id", corridorId).eq("lane_id", laneId).maybeSingle();
      if (!corridor) return new Response(JSON.stringify({ error: "Corridor not found" }), { status: 404, headers: withCorsHeaders({ "Content-Type": "application/json" }) });

      const [{ data: terrain }, { data: divergence }, { data: evidence }] = await Promise.all([
        db.from("poe_terrain").select("*").eq("corridor_id", corridorId).eq("lane_id", laneId).maybeSingle(),
        db.from("poe_divergence").select("*").eq("corridor_id", corridorId).eq("lane_id", laneId).order("computed_at", { ascending: false }).limit(1).maybeSingle(),
        db.from("poe_evidence").select("*").eq("corridor_id", corridorId).eq("lane_id", laneId).order("timestamp", { ascending: false }).limit(50),
      ]);

      return new Response(JSON.stringify({ ...corridor, terrain, divergence, evidence: evidence ?? [] }), {
        headers: withCorsHeaders({ "Content-Type": "application/json" }),
      });
    }

    // GET list with filters
    let query = db.from("poe_corridors").select("*").eq("lane_id", laneId);
    const risk = url.searchParams.get("risk");
    const country = url.searchParams.get("country");
    const activated = url.searchParams.get("activated");
    if (risk) query = query.eq("risk_class", risk);
    if (country) query = query.or(`start_country.eq.${country},end_country.eq.${country}`);
    if (activated === "1") query = query.eq("activated", true);
    if (activated === "0") query = query.eq("activated", false);

    const { data: corridors, error } = await query.order("score", { ascending: false });
    if (error) throw error;

    return new Response(JSON.stringify({ lane_id: laneId, count: corridors?.length ?? 0, corridors: corridors ?? [] }), {
      headers: withCorsHeaders({ "Content-Type": "application/json" }),
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: withCorsHeaders({ "Content-Type": "application/json" }) });
  }
});
