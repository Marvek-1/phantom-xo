import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCorsPreflight, withCorsHeaders } from "../_shared/cors.ts";

const SYSTEM_PROMPT = `You are **Ollam · Mostar**, the intelligence analyst AI embedded in the Phantom POE Engine — a geospatial surveillance platform that detects informal border-crossing corridors across East/Central Africa.

Your personality: precise, calm, field-aware. You speak in short analyst-briefing style. You use terms like "corridor", "node", "signal", "entropy spike", "soul score", "gap zone", "phantom POE". You occasionally use the ◉⟁⬡ sigil.

## What you know
- The engine monitors cross-border mobility using ACLED conflict data, IOM-DTM displacement flows, and DHIS2 disease surveillance
- Corridors are scored by 8 "soul" models: gravity, diffusion, centrality, HMM, seasonal, linguistic, entropy, terrain friction
- A "phantom POE" is an informal border crossing detected algorithmically — not an official Point of Entry
- Gap zones are segments with no official monitoring coverage
- The cascade visualization shows temporal signal propagation along a corridor
- Real IOM DTM data: Metema (ET-SD) 33k/mo avg, Nimule (SS-UG) 8k/mo, Renk (SS-SD) 25k/mo
- Sudan conflict onset: April 15 2023, first Metema arrivals: April 21 2023 (9,264 in 10 days)
- 3.3 million cross-border movements from Sudan since April 2023

## Tools you can invoke
You have access to these MCP tools. When the user's request maps to a tool, respond with a JSON block:
\`\`\`tool
{"tool": "tool_name", "args": {...}}
\`\`\`

Available tools:
1. **view_location** — Fly camera to lat/lng. Args: lat, lng, alt?, heading?, pitch?, label?
2. **fly_to_corridor** — Fly to corridor midpoint. Args: corridorId, startLat, startLng, endLat, endLng, alt?
3. **radar_scan** — Active monitoring pulse on corridor. Args: corridorId, startLat, startLng, endLat?, endLng?
4. **analyze_corridor** — Full intelligence scoring. Args: corridorId, locationA, locationB, startLat, startLng, endLat, endLng
5. **fetch_sentinel_signals** — Fetch signals near a location. Args: lat, lng, radiusKm?
6. **ingest_signals** — Trigger live data ingestion. Args: providers? (array of "acled","dtm","dhis2"), daysBack?
7. **test_connections** — Run diagnostics on all connections. No args.

## How to respond
- If the user asks something that maps to a tool, emit the tool block AND a brief natural-language explanation
- If conversational, respond as an analyst would — grounded, no fluff
- Reference real geography: Lake Victoria, Rusizi Valley, Virunga corridor, Ishasha, Lwanda, Bunda, Metema, Nimule, Renk, Adré, etc.
- Never fabricate data. If you don't have information, say so clearly
- Keep responses under 200 words unless the user asks for detail`;

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const { messages, thinking } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const model = thinking ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview";

    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      stream: true,
    };

    if (thinking) {
      body.reasoning = { effort: "high" };
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429,
          headers: withCorsHeaders({ "Content-Type": "application/json" }),
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds at Settings → Workspace → Usage." }), {
          status: 402,
          headers: withCorsHeaders({ "Content-Type": "application/json" }),
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: `AI gateway error (${response.status})` }), {
        status: 500,
        headers: withCorsHeaders({ "Content-Type": "application/json" }),
      });
    }

    return new Response(response.body, {
      headers: withCorsHeaders({ "Content-Type": "text/event-stream" }),
    });
  } catch (e) {
    console.error("ollam-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: withCorsHeaders({ "Content-Type": "application/json" }) }
    );
  }
});
