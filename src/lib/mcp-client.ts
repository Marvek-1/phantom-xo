import { supabase } from "@/integrations/supabase/client";
import type { MapParams } from "@/types/phantom";

interface McpToolResult {
  mapParams?: MapParams;
  text: string;
  isError?: boolean;
}

export async function listMcpTools(): Promise<Array<{ name: string; description: string }>> {
  const { data, error } = await supabase.functions.invoke("phantom-mcp", {
    body: { action: "list_tools" },
  });
  if (error) throw new Error(`MCP list_tools failed: ${error.message}`);
  return data.tools ?? [];
}

export async function callMcpTool(
  tool: string,
  args: Record<string, unknown> = {}
): Promise<McpToolResult> {
  const { data, error } = await supabase.functions.invoke("phantom-mcp", {
    body: { action: "call_tool", tool, args },
  });
  if (error) throw new Error(`MCP call_tool failed: ${error.message}`);
  return data;
}
