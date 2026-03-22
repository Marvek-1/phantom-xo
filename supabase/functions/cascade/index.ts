import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HMM_STATES = ["dormant", "probing", "active_crossing", "surge", "dissipating"] as const;

function hmmState(score: number): typeof HMM_STATES[number] {
  if (score < 0.2) return "dormant";
  if (score < 0.4) return "probing";
  if (score < 0.65) return "active_crossing";
  if (score < 0.85) return "surge";
  return "dissipating";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const corridorId = url.searchParams.get("corridor_id");
    if (!corridorId) {
      return new Response(JSON.stringify({ error: "corridor_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceKey);

    // Get corridor definition
    const { data: corridor } = await db
      .from("corridor_definitions")
      .select("*")
      .eq("id", corridorId)
      .maybeSingle();

    if (!corridor) {
      return new Response(JSON.stringify({ error: `Corridor ${corridorId} not found` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get evidence chains ordered by day_offset
    const { data: evidence } = await db
      .from("corridor_evidence_chains")
      .select("*")
      .eq("corridor_def_id", corridorId)
      .order("day_offset", { ascending: true });

    // Get corridor nodes
    const { data: nodes } = await db
      .from("corridor_nodes")
      .select("*")
      .eq("corridor_def_id", corridorId)
      .order("node_order", { ascending: true });

    // Get latest corridor score
    const { data: latestScore } = await db
      .from("corridor_scores")
      .select("*")
      .eq("corridor_id", corridorId)
      .order("scored_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get entropy results for corridor nodes
    const nodeIds = (nodes ?? []).map((n: any) => n.id);
    const { data: entropyData } = await db
      .from("entropy_results")
      .select("*")
      .in("node_id", nodeIds.length > 0 ? nodeIds : ["__none__"])
      .order("computed_at", { ascending: true });

    // Group evidence by day_offset into frames
    const frameMap = new Map<number, any[]>();
    for (const ev of evidence ?? []) {
      const day = ev.day_offset;
      if (!frameMap.has(day)) frameMap.set(day, []);
      frameMap.get(day)!.push(ev);
    }

    const sortedDays = [...frameMap.keys()].sort((a, b) => a - b);
    let cumulativeScore = 0;
    const frames = sortedDays.map((day, idx) => {
      const eventsInFrame = frameMap.get(day)!;
      // Evidence-weighted scoring — average of actual evidence scores, not cosmetic
      const frameScore = eventsInFrame.reduce((s: number, e: any) => s + (e.score || 0), 0) / eventsInFrame.length;
      const recencyWeight = 1 - (day / (sortedDays[sortedDays.length - 1] || 1)) * 0.3;
      const delta = frameScore * 0.1 * recencyWeight;
      cumulativeScore = Math.min(1, cumulativeScore + delta);

      // Find entropy for this frame's nodes
      const frameNodeIds = eventsInFrame.map((e: any) => e.location_name);
      const entropyForFrame = (entropyData ?? []).find((er: any) =>
        frameNodeIds.some((n: string) => er.node_id.includes(n)),
      );

      const activeNodes = eventsInFrame.reduce((acc: any[], e: any) => {
        const existing = acc.find((n: any) => n.name === e.location_name);
        if (existing) {
          existing.signal_count++;
        } else {
          acc.push({
            name: e.location_name,
            lat: e.lat,
            lng: e.lng,
            signal_count: 1,
            brightest_source: e.source,
          });
        }
        return acc;
      }, []);

      return {
        frame_index: idx,
        timestamp: `day_${day}`,
        cumulative_score: Math.round(cumulativeScore * 1000) / 1000,
        score_delta: Math.round(delta * 1000) / 1000,
        active_km_range: [
          Math.min(...eventsInFrame.map((e: any) => e.km_marker)),
          Math.max(...eventsInFrame.map((e: any) => e.km_marker)),
        ],
        signals_in_frame: eventsInFrame.map((e: any) => ({
          id: e.evidence_id,
          source: e.source,
          type: e.evidence_type,
          element: e.tag?.includes("conflict") ? "fire" : e.tag?.includes("displacement") ? "water" : "earth",
          location: e.location_name,
          lat: e.lat,
          lng: e.lng,
          km_marker: e.km_marker,
          magnitude: e.score,
          truth_score: e.score,
          tag: e.tag,
        })),
        entropy: {
          value: entropyForFrame?.h_current ?? 0,
          is_spike: entropyForFrame?.spiked ?? false,
          risk_class: entropyForFrame?.risk_class ?? "LOW",
        },
        hmm_state: hmmState(cumulativeScore),
        active_nodes: activeNodes,
        phantom_poe_detected: cumulativeScore > 0.6,
        phantom_poe_location: cumulativeScore > 0.6
          ? { lat: activeNodes[0]?.lat ?? 0, lng: activeNodes[0]?.lng ?? 0, name: activeNodes[0]?.name ?? "Unknown" }
          : null,
      };
    });

    // Soul timeline
    const soulTimeline = frames.map((f: any) => ({
      frame_index: f.frame_index,
      gravity: latestScore?.gravity_score ?? 0,
      diffusion: latestScore?.diffusion_score ?? 0,
      centrality: latestScore?.centrality_score ?? 0,
      hmm: latestScore?.hmm_score ?? 0,
      seasonal: latestScore?.seasonal_score ?? 0,
      linguistic: latestScore?.linguistic_score ?? 0,
      entropy: latestScore?.entropy_score ?? 0,
      friction: latestScore?.friction_score ?? 0,
    }));

    const totalKm = Math.sqrt(
      Math.pow((corridor.end_lat - corridor.start_lat) * 111, 2) +
      Math.pow((corridor.end_lng - corridor.start_lng) * 111, 2),
    );

    const response = {
      corridor_id: corridorId,
      corridor_name: `${corridor.start_node} → ${corridor.end_node}`,
      start_node: corridor.start_node,
      end_node: corridor.end_node,
      total_km: Math.round(totalKm * 10) / 10,
      total_frames: frames.length,
      time_range: {
        start: sortedDays.length > 0 ? `day_${sortedDays[0]}` : null,
        end: sortedDays.length > 0 ? `day_${sortedDays[sortedDays.length - 1]}` : null,
      },
      frames,
      soul_timeline: soulTimeline,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
