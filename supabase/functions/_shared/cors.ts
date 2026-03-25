export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export function withCorsHeaders(headers: HeadersInit = {}): Headers {
  const merged = new Headers(corsHeaders);
  const extra = new Headers(headers);
  extra.forEach((value, key) => merged.set(key, value));
  return merged;
}

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response("ok", {
    status: 200,
    headers: withCorsHeaders(),
  });
}
