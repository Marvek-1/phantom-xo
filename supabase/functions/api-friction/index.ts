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
    const corridorId = url.searchParams.get("corridor_id");
    if (!corridorId) return new Response(JSON.stringify({ error: "corridor_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: cells, error } = await db.from("friction_cells").select("*").eq("corridor_id", corridorId).order("cell_index", { ascending: true });
    if (error) throw error;

    // Summary stats
    const total = cells?.length ?? 0;
    const impassable = cells?.filter((c: any) => !c.passable).length ?? 0;
    const avgFriction = total > 0 ? (cells!.reduce((s: number, c: any) => s + c.friction_cost, 0) / total) : 0;
    const riverCrossings = cells?.filter((c: any) => c.river_present).length ?? 0;

    return new Response(JSON.stringify({
      corridor_id: corridorId,
      total_cells: total,
      impassable_cells: impassable,
      avg_friction_cost: Math.round(avgFriction * 1000) / 1000,
      river_crossings: riverCrossings,
      cells: cells ?? [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
