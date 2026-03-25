import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { handleCorsPreflight, withCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const corridorId = url.searchParams.get("corridor_id");
    const latest = url.searchParams.get("latest") !== "0";
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));

    if (corridorId) {
      let q = db
        .from("corridor_drift")
        .select("*")
        .eq("corridor_id", corridorId)
        .order("computed_at", { ascending: false });

      if (latest) {
        const { data, error } = await q.limit(1).maybeSingle();
        if (error) throw error;
        return new Response(JSON.stringify({ corridor_id: corridorId, drift: data ?? null }), {
          headers: withCorsHeaders({ "Content-Type": "application/json" }),
        });
      }

      const { data, error } = await q.limit(limit);
      if (error) throw error;
      return new Response(JSON.stringify({ corridor_id: corridorId, count: data?.length ?? 0, drifts: data ?? [] }), {
        headers: withCorsHeaders({ "Content-Type": "application/json" }),
      });
    }

    const { data, error } = await db
      .from("corridor_drift")
      .select("*")
      .order("computed_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    return new Response(JSON.stringify({ count: data?.length ?? 0, drifts: data ?? [] }), {
      headers: withCorsHeaders({ "Content-Type": "application/json" }),
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: withCorsHeaders({ "Content-Type": "application/json" }),
    });
  }
});
