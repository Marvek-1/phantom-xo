import { supabase } from "@/integrations/supabase/client";
import type { MapParams } from "@/types/phantom";
import { getPhantomMcpApiUrl, getPublicApiHeaders, isSupabaseFunctionUrl } from "@/lib/backendEndpoints";

interface McpToolResult {
  mapParams?: MapParams;
  text: string;
  isError?: boolean;
}

async function getMcpHeaders(url: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getPublicApiHeaders(),
  };

  if (isSupabaseFunctionUrl(url)) {
    const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
    if (apikey) headers.apikey = apikey;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  }

  return headers;
}

async function postMcp(body: Record<string, unknown>) {
  const url = getPhantomMcpApiUrl();
  const resp = await fetch(url, {
    method: "POST",
    headers: await getMcpHeaders(url),
    body: JSON.stringify(body),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || `MCP request failed (${resp.status})`);
  return data;
}

export async function listMcpTools(): Promise<Array<{ name: string; description: string }>> {
  const data = await postMcp({ action: "list_tools" });
  return data.tools ?? [];
}

export async function callMcpTool(
  tool: string,
  args: Record<string, unknown> = {}
): Promise<McpToolResult> {
  const data = await postMcp({ action: "call_tool", tool, args });
  return data;
}
