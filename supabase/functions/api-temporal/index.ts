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

    const wantCrossingPoints = url.searchParams.get("crossing_points") === "1";
    const wantEvents = url.searchParams.get("events") === "1";
    const corridorId = url.searchParams.get("corridor_id");

    // Crossing points mode
    if (wantCrossingPoints) {
      const countryFilter = url.searchParams.get("country");
      let query = db.from("real_crossing_points").select("*");
      if (countryFilter) query = query.or(`country_a.eq.${countryFilter},country_b.eq.${countryFilter}`);
      const { data, error } = await query.order("monthly_avg_flow", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ count: data?.length ?? 0, crossing_points: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Events mode
    if (wantEvents) {
      let query = db.from("corridor_temporal_events").select("*");
      if (corridorId) query = query.eq("corridor_id", corridorId);
      const eventType = url.searchParams.get("event_type");
      if (eventType) query = query.eq("event_type", eventType);
      const { data, error } = await query.order("event_date", { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify({ count: data?.length ?? 0, events: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: temporal flows
    let query = db.from("temporal_flows").select("*");
    if (corridorId) query = query.eq("corridor_id", corridorId);
    const direction = url.searchParams.get("direction");
    if (direction) query = query.eq("flow_direction", direction);
    const { data, error } = await query.order("period_start", { ascending: true });
    if (error) throw error;

    const totalFlow = (data ?? []).reduce((sum: number, r: any) => sum + (r.flow_count || 0), 0);

    return new Response(JSON.stringify({
      count: data?.length ?? 0,
      total_flow: totalFlow,
      flows: data ?? [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
