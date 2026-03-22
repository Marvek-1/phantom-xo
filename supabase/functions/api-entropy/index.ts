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

    // Try poe_entropy first (lane-scoped), fall back to entropy_results
    const { data: lanes } = await db.from("data_lanes").select("id").eq("is_active", true).limit(1);
    const laneId = lanes?.[0]?.id;

    let query = laneId
      ? db.from("poe_entropy").select("*").eq("lane_id", laneId)
      : db.from("entropy_results").select("*");

    const spiked = url.searchParams.get("spiked");
    const risk = url.searchParams.get("risk");
    if (spiked === "1") query = query.eq("spiked", true);
    if (risk) query = query.eq("risk_class", risk);

    const { data, error } = await query.order("computed_at", { ascending: false }).limit(200);
    if (error) throw error;

    const spikedCount = (data ?? []).filter((e: any) => e.spiked).length;

    return new Response(JSON.stringify({
      total: data?.length ?? 0,
      spiked_count: spikedCount,
      entries: data ?? [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
