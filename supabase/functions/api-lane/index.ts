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

    // PUT — switch active lane
    if (req.method === "PUT") {
      const laneId = url.searchParams.get("lane_id");
      if (!laneId) return new Response(JSON.stringify({ error: "lane_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: lane } = await db.from("data_lanes").select("*").eq("id", laneId).maybeSingle();
      if (!lane) return new Response(JSON.stringify({ error: "Lane not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Deactivate all, then activate target
      await db.from("data_lanes").update({ is_active: false }).neq("id", "__force__");
      await db.from("data_lanes").update({ is_active: true }).eq("id", laneId);

      return new Response(JSON.stringify({ message: "Lane switched", active_lane: laneId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET — list lanes
    const { data: lanes, error } = await db.from("data_lanes").select("*").order("is_active", { ascending: false });
    if (error) throw error;

    const active = (lanes ?? []).find((l: any) => l.is_active);

    return new Response(JSON.stringify({
      active_lane: active ? { id: active.id, mode: active.lane, label: active.label, badge_color: active.badge_color } : null,
      available: (lanes ?? []).map((l: any) => ({ id: l.id, mode: l.lane, label: l.label, badge_color: l.badge_color, is_active: l.is_active })),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
