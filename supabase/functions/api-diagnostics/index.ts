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

    const { data: lanes } = await db.from("data_lanes").select("*").eq("is_active", true).limit(1);
    if (!lanes?.length) return new Response(JSON.stringify({ error: "No active data lane" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get latest diagnostic per service
    const { data: diags } = await db.from("diagnostic_results").select("*").order("tested_at", { ascending: false }).limit(100);

    // Deduplicate: keep latest per service
    const latest = new Map<string, any>();
    for (const d of diags ?? []) {
      if (!latest.has(d.service)) latest.set(d.service, d);
    }

    // Provider health
    const { data: providers } = await db.from("provider_health").select("*").order("checked_at", { ascending: false }).limit(50);
    const latestProviders = new Map<string, any>();
    for (const p of providers ?? []) {
      if (!latestProviders.has(p.provider_id)) latestProviders.set(p.provider_id, p);
    }

    const allHealthy = [...latestProviders.values()].every((p: any) => p.healthy);

    return new Response(JSON.stringify({
      lane: lanes[0],
      overall_status: allHealthy ? "healthy" : "degraded",
      diagnostics: [...latest.values()],
      providers: [...latestProviders.values()],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
