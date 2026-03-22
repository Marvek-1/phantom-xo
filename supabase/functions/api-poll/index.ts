import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const url = new URL(req.url);

    const { data: lanes } = await db.from("data_lanes").select("*").eq("is_active", true).limit(1);
    if (!lanes?.length) return new Response(JSON.stringify({ error: "No active data lane" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const lane = lanes[0];
    const laneId = lane.id;

    const since = url.searchParams.get("since") || new Date(Date.now() - 60000).toISOString();

    // Parallel queries
    const [corridorsRes, detectionsRes, signalsRes, entropyRes] = await Promise.all([
      db.from("poe_corridors").select("id, start_node, end_node, score, risk_class, activated, phantom_poe_activated, last_updated").eq("lane_id", laneId).order("score", { ascending: false }).limit(50),
      db.from("poe_detection_events").select("*").eq("lane_id", laneId).gte("created_at", since).order("created_at", { ascending: false }).limit(20),
      db.from("poe_signals").select("id, source, type, latitude, longitude, magnitude, truth_score, timestamp").eq("lane_id", laneId).gte("ingested_at", since).order("ingested_at", { ascending: false }).limit(50),
      db.from("poe_entropy").select("node_id, h_current, delta_h, spiked, risk_class").eq("lane_id", laneId).eq("spiked", true).order("computed_at", { ascending: false }).limit(10),
    ]);

    const activeCorridors = (corridorsRes.data ?? []).filter((c: any) => c.activated);
    const criticalCount = activeCorridors.filter((c: any) => c.risk_class === "CRITICAL").length;
    const phantomCount = activeCorridors.filter((c: any) => c.phantom_poe_activated).length;

    return new Response(JSON.stringify({
      polled_at: new Date().toISOString(),
      since,
      lane: { id: lane.id, mode: lane.lane, label: lane.label },
      summary: {
        active_corridors: activeCorridors.length,
        critical: criticalCount,
        phantom_poes: phantomCount,
        new_detections: detectionsRes.data?.length ?? 0,
        new_signals: signalsRes.data?.length ?? 0,
        entropy_spikes: entropyRes.data?.length ?? 0,
      },
      corridors: corridorsRes.data ?? [],
      detections: detectionsRes.data ?? [],
      signals: signalsRes.data ?? [],
      entropy_spikes: entropyRes.data ?? [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
