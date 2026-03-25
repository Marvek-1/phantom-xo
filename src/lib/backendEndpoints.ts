const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "");
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_FUNCTIONS_BASE = SUPABASE_URL ? `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1` : "";

function pickUrl(explicit: string | undefined, routeName: string): string {
  if (explicit) return explicit;
  if (API_BASE) return `${API_BASE}/${routeName}`;
  if (SUPABASE_FUNCTIONS_BASE) return `${SUPABASE_FUNCTIONS_BASE}/${routeName}`;
  throw new Error(`No backend URL configured for ${routeName}. Set VITE_API_BASE_URL or function-specific URL.`);
}

export function getTemporalApiUrl(): string {
  return pickUrl(import.meta.env.VITE_API_TEMPORAL_URL as string | undefined, "api-temporal");
}

export function getComputeScoresApiUrl(): string {
  return pickUrl(import.meta.env.VITE_API_COMPUTE_SCORES_URL as string | undefined, "compute-scores");
}

export function getOllamChatApiUrl(): string {
  return pickUrl(import.meta.env.VITE_API_OLLAM_CHAT_URL as string | undefined, "ollam-chat");
}

export function getPhantomMcpApiUrl(): string {
  return pickUrl(import.meta.env.VITE_API_PHANTOM_MCP_URL as string | undefined, "phantom-mcp");
}

export function isSupabaseFunctionUrl(url: string): boolean {
  return /supabase\.co\/functions\/v1\//.test(url) || /\/functions\/v1\//.test(url);
}

export function getPublicApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const publicKey = import.meta.env.VITE_API_PUBLIC_KEY as string | undefined;
  if (publicKey) headers["x-api-key"] = publicKey;
  return headers;
}
