import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCorsPreflight, withCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const key = Deno.env.get("MAPTILER_API_KEY") ?? "";

  return new Response(JSON.stringify({ key }), {
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
});
