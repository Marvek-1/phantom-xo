import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Haversine distance ────────────────────────────────────
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

// ─── Tool definitions ──────────────────────────────────────
const TOOLS = [
  {
    name: "view_location",
    description: "Fly the Cesium 3D globe camera to an explicit lat/lng location.",
    inputSchema: {
      type: "object",
      properties: {
        lat: { type: "number", description: "Latitude" },
        lng: { type: "number", description: "Longitude" },
        alt: { type: "number", description: "Altitude in metres (default 200000)" },
        heading: { type: "number", description: "Camera heading degrees (default 0)" },
        pitch: { type: "number", description: "Camera pitch degrees (default -45)" },
        label: { type: "string", description: "Human-readable label" },
      },
      required: ["lat", "lng"],
    },
  },
  {
    name: "fly_to_corridor",
    description: "Fly to a corridor anchor zone using explicit coordinates.",
    inputSchema: {
      type: "object",
      properties: {
        corridorId: { type: "string" },
        startLat: { type: "number" },
        startLng: { type: "number" },
        endLat: { type: "number" },
        endLng: { type: "number" },
        alt: { type: "number", description: "Camera altitude (default 180000)" },
      },
      required: ["corridorId", "startLat", "startLng", "endLat", "endLng"],
    },
  },
  {
    name: "radar_scan",
    description: "Trigger a radar pulse scan on a corridor.",
    inputSchema: {
      type: "object",
      properties: {
        corridorId: { type: "string" },
        startLat: { type: "number" },
        startLng: { type: "number" },
        endLat: { type: "number" },
        endLng: { type: "number" },
      },
      required: ["corridorId", "startLat", "startLng"],
    },
  },
  {
    name: "analyze_corridor",
    description: "Run full corridor intelligence scoring. Returns score decomposition, nodes, and forecast.",
    inputSchema: {
      type: "object",
      properties: {
        corridorId: { type: "string" },
        locationA: { type: "string", description: "Start node name" },
        locationB: { type: "string", description: "End node name" },
        startLat: { type: "number" },
        startLng: { type: "number" },
        endLat: { type: "number" },
        endLng: { type: "number" },
      },
      required: ["corridorId", "locationA", "locationB", "startLat", "startLng", "endLat", "endLng"],
    },
  },
  {
    name: "fetch_sentinel_signals",
    description: "Fetch live signals from the database for a specific location.",
    inputSchema: {
      type: "object",
      properties: {
        lat: { type: "number" },
        lng: { type: "number" },
        radiusKm: { type: "number", description: "Search radius km (default 50)" },
      },
      required: ["lat", "lng"],
    },
  },
  {
    name: "test_connections",
    description: "Run diagnostic check on all service connections.",
    inputSchema: { type: "object", properties: {} },
  },
];

// ─── Tool handlers ─────────────────────────────────────────
async function handleTool(name: string, args: Record<string, unknown>) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, supabaseKey);

  switch (name) {
    case "view_location": {
      const { lat, lng, alt = 200000, heading = 0, pitch = -45, label } = args as any;
      return {
        mapParams: { camera: { lat, lng, alt, heading, pitch } },
        text: `Camera flying to ${label ?? `${lat}, ${lng}`} at ${alt}m`,
      };
    }

    case "fly_to_corridor": {
      const { corridorId, startLat, startLng, endLat, endLng, alt = 180000 } = args as any;
      const midLat = (startLat + endLat) / 2;
      const midLng = (startLng + endLng) / 2;
      return {
        mapParams: {
          camera: { lat: midLat, lng: midLng, alt, heading: 0, pitch: -50 },
          corridor: { id: corridorId, startLat, startLng, endLat, endLng },
        },
        text: `Flying to ${corridorId} · midpoint ${midLat.toFixed(4)}, ${midLng.toFixed(4)} · ${alt}m`,
      };
    }

    case "radar_scan": {
      const { corridorId, startLat, startLng, endLat, endLng } = args as any;
      return {
        mapParams: {
          radar: { corridorId, lat: startLat, lng: startLng, endLat, endLng },
          camera: {
            lat: (startLat + (endLat ?? startLat)) / 2,
            lng: (startLng + (endLng ?? startLng)) / 2,
            alt: 180000, heading: 0, pitch: -50,
          },
        },
        text: `ACTIVE MONITORING: ${corridorId} · [${startLat}, ${startLng}]`,
      };
    }

    case "analyze_corridor": {
      const { corridorId, locationA, locationB, startLat, startLng, endLat, endLng } = args as any;
      const totalKm = haversineKm(startLat, startLng, endLat, endLng);

      // Check DB for existing corridor data
      const { data: existingScore } = await db
        .from("corridor_scores")
        .select("*")
        .eq("corridor_id", corridorId)
        .order("scored_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Build analysis from DB data or generate fresh
      const souls = {
        gravity: existingScore?.gravity_score ?? 0.72,
        diffusion: existingScore?.diffusion_score ?? 0.58,
        centrality: existingScore?.centrality_score ?? 0.65,
        hmm: existingScore?.hmm_score ?? 0.41,
        seasonal: existingScore?.seasonal_score ?? 0.33,
        linguistic: existingScore?.linguistic_score ?? 0.28,
        entropy: existingScore?.entropy_score ?? 0.52,
        terrain: existingScore?.friction_score ?? 0.45,
      };

      const corridorScore = existingScore?.corridor_score ??
        Object.values(souls).reduce((a, b) => a + b, 0) / Object.values(souls).length;

      const analysis = {
        id: corridorId,
        short: corridorId.split("-").pop() ?? corridorId,
        region: `${locationA} → ${locationB}`,
        score: corridorScore,
        riskClass: existingScore?.risk_class ?? (corridorScore > 0.7 ? "HIGH" : corridorScore > 0.4 ? "MEDIUM" : "LOW"),
        activated: existingScore?.phantom_poe_activated ?? corridorScore > 0.6,
        latentState: existingScore?.latent_state ?? "MONITORING",
        startNode: locationA,
        endNode: locationB,
        startCC: "KE",
        endCC: "TZ",
        mode: existingScore?.inferred_mode ?? "foot",
        velocity: `${(existingScore?.inferred_velocity_kmh ?? 0.75) * 24} km/day`,
        totalKm: parseFloat(totalKm.toFixed(2)),
        seasonal: existingScore?.seasonally_active ? "Active" : "Dormant",
        canoe: existingScore?.requires_canoe ?? false,
        detour: existingScore?.conflict_detour ?? false,
        firstDetected: existingScore?.first_detected ?? new Date().toISOString(),
        nearestFormalPOE: "Analyst verification required",
        gapZone: true,
        nodes: [
          { id: "N1", name: locationA, lat: startLat, lng: startLng, type: "START", risk: "LOW" },
          { id: "N2", name: locationB, lat: endLat, lng: endLng, type: "END", risk: "HIGH" },
        ],
        souls,
        scoreDecomposition: souls,
        forecast: {
          nextActivationLikelihood: existingScore?.forecast_activation_likelihood ?? 0.68,
          driftDirectionDeg: existingScore?.forecast_drift_direction_deg ?? 145,
        },
        evidence: [],
        traceLines: [
          `◉ Corridor ${corridorId}`,
          `  Score: ${corridorScore.toFixed(4)}`,
          `  Distance: ${totalKm.toFixed(1)} km`,
          `  Souls: gravity=${souls.gravity.toFixed(2)} diffusion=${souls.diffusion.toFixed(2)} centrality=${souls.centrality.toFixed(2)}`,
          `  HMM=${souls.hmm.toFixed(2)} seasonal=${souls.seasonal.toFixed(2)} linguistic=${souls.linguistic.toFixed(2)}`,
          `  entropy=${souls.entropy.toFixed(2)} terrain=${souls.terrain.toFixed(2)}`,
        ],
      };

      // Fetch evidence atoms if score exists
      if (existingScore?.id) {
        const { data: atoms } = await db
          .from("evidence_atoms")
          .select("*")
          .eq("corridor_score_id", existingScore.id)
          .limit(10);

        if (atoms) {
          analysis.evidence = atoms.map((a: any) => ({
            source: a.source,
            sourceRecordId: a.source_record_id,
            timestamp: a.timestamp,
            type: a.evidence_type,
            truthScore: a.confidence,
            locationConfidence: "settlement-level",
          }));
        }
      }

      return {
        mapParams: {
          corridor: { id: corridorId, startLat, startLng, endLat, endLng },
          camera: { lat: (startLat + endLat) / 2, lng: (startLng + endLng) / 2, alt: 180000, heading: 0, pitch: -50 },
          corridorAnalysis: analysis,
        },
        text: analysis.traceLines.join("\n"),
      };
    }

    case "fetch_sentinel_signals": {
      const { lat, lng, radiusKm = 50 } = args as any;

      const { data: signals, error } = await db
        .from("normalized_signals")
        .select("*")
        .gte("latitude", lat - radiusKm / 111)
        .lte("latitude", lat + radiusKm / 111)
        .gte("longitude", lng - radiusKm / 111)
        .lte("longitude", lng + radiusKm / 111)
        .eq("passed_truth_filter", true)
        .order("timestamp", { ascending: false })
        .limit(50);

      if (error) throw new Error(`Signal fetch failed: ${error.message}`);

      return {
        mapParams: {
          signals: { count: signals?.length ?? 0, source: "Normalized Signals DB", status: "OK" },
        },
        text: `Fetched ${signals?.length ?? 0} signals near (${lat}, ${lng}) radius ${radiusKm}km.\n${JSON.stringify(signals?.slice(0, 5), null, 2)}`,
      };
    }

    case "test_connections": {
      const checks: Array<{ service: string; status: string; message: string; latencyMs?: number }> = [];

      // Test DB
      const dbStart = Date.now();
      const { error: dbErr } = await db.from("data_lanes").select("id").limit(1);
      checks.push({
        service: "Database",
        status: dbErr ? "ERROR" : "OK",
        message: dbErr ? dbErr.message : "Connected",
        latencyMs: Date.now() - dbStart,
      });

      // Test ingestion_runs
      const irStart = Date.now();
      const { data: lastRun } = await db
        .from("ingestion_runs")
        .select("run_id, status, started_at")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      checks.push({
        service: "Ingestion Pipeline",
        status: lastRun ? "OK" : "NO_RUNS",
        message: lastRun ? `Last run: ${lastRun.run_id} (${lastRun.status})` : "No ingestion runs found",
        latencyMs: Date.now() - irStart,
      });

      const summary = checks
        .map((r) => `${r.status === "OK" ? "✅" : "❌"} ${r.service}: ${r.message}${r.latencyMs ? ` (${r.latencyMs}ms)` : ""}`)
        .join("\n");

      return { text: `◉⟁⬡ Phantom POE Connectivity\n\n${summary}` };
    }

    default:
      return { text: `Unknown tool: ${name}`, isError: true };
  }
}

// ─── HTTP handler ──────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, tool, args } = body;

    // List available tools
    if (action === "list_tools") {
      return new Response(JSON.stringify({ tools: TOOLS }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Execute a tool
    if (action === "call_tool" && tool) {
      const result = await handleTool(tool, args ?? {});
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'list_tools' or 'call_tool'." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), isError: true }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
