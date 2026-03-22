import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OLLAMA_HOST = "https://ollama.mostarindustries.com";
const MODELS: Record<string, string> = {
  dcx0: "Mostar/mostar-ai:dcx0",
  dcx1: "Mostar/mostar-ai:dcx1",
  dcx2: "Mostar/mostar-ai:dcx2",
};
const DEFAULT_MODEL = "dcx0";

const SYSTEM_PROMPT = `You are **Ollam · Mostar**, the intelligence analyst AI embedded in the Phantom POE Engine — a geospatial surveillance platform that detects informal border-crossing corridors across East/Central Africa.

Your personality: precise, calm, field-aware. You speak in short analyst-briefing style. You use terms like "corridor", "node", "signal", "entropy spike", "soul score", "gap zone", "phantom POE". You occasionally use the ◉⟁⬡ sigil.

## What you know
- The engine monitors cross-border mobility using ACLED conflict data, IOM-DTM displacement flows, and DHIS2 disease surveillance
- Corridors are scored by 8 "soul" models: gravity, diffusion, centrality, HMM, seasonal, linguistic, entropy, terrain friction
- A "phantom POE" is an informal border crossing detected algorithmically — not an official Point of Entry
- Gap zones are segments with no official monitoring coverage
- The cascade visualization shows temporal signal propagation along a corridor

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
- Reference real geography: Lake Victoria, Rusizi Valley, Virunga corridor, Ishasha, Lwanda, Bunda, etc.
- Never fabricate data. If you don't have information, say so clearly
- Keep responses under 200 words unless the user asks for detail`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, thinking, model: requestedModel } = await req.json();

    const modelKey = requestedModel && MODELS[requestedModel] ? requestedModel : DEFAULT_MODEL;
    const ollamaModel = MODELS[modelKey];

    // Build Ollama-compatible messages
    const ollamaMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        messages: ollamaMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Ollama error:", response.status, t);
      return new Response(
        JSON.stringify({ error: `Ollama error (${response.status}): ${t}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform Ollama's streaming format (NDJSON) to OpenAI-compatible SSE
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;

            try {
              const chunk = JSON.parse(line);
              // Ollama streams { message: { role, content }, done: bool }
              if (chunk.message?.content) {
                const ssePayload = {
                  choices: [{ delta: { content: chunk.message.content }, index: 0 }],
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(ssePayload)}\n\n`));
              }
              if (chunk.done) {
                await writer.write(encoder.encode("data: [DONE]\n\n"));
              }
            } catch { /* skip bad lines */ }
          }
        }
      } catch (err) {
        console.error("Stream transform error:", err);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ollam-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
