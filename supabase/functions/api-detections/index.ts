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

    // PUT ack
    if (req.method === "PUT") {
      const detectionId = url.searchParams.get("detection_id");
      if (!detectionId) return new Response(JSON.stringify({ error: "detection_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { error } = await db.from("poe_detection_events").update({ acknowledged: true }).eq("id", detectionId);
      if (error) throw error;
      return new Response(JSON.stringify({ message: "Acknowledged", id: detectionId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET detections
    const { data: lanes } = await db.from("data_lanes").select("id").eq("is_active", true).limit(1);
    if (!lanes?.length) return new Response(JSON.stringify({ error: "No active data lane" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const laneId = lanes[0].id;

    let query = db.from("poe_detection_events").select("*").eq("lane_id", laneId);
    const since = url.searchParams.get("since");
    const severity = url.searchParams.get("severity");
    const unread = url.searchParams.get("unread");
    if (since) query = query.gte("created_at", since);
    if (severity) query = query.eq("severity", severity);
    if (unread === "1") query = query.eq("acknowledged", false);

    const { data, error } = await query.order("created_at", { ascending: false }).limit(100);
    if (error) throw error;

    return new Response(JSON.stringify({ lane_id: laneId, count: data?.length ?? 0, detections: data ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
