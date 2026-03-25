import { supabase } from "@/integrations/supabase/client";
import { getOllamChatApiUrl, getPublicApiHeaders, isSupabaseFunctionUrl } from "@/lib/backendEndpoints";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = getOllamChatApiUrl();

async function getChatHeaders(url: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getPublicApiHeaders(),
  };

  if (isSupabaseFunctionUrl(url)) {
    const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
    if (apikey) {
      headers.apikey = apikey;
      headers.Authorization = `Bearer ${apikey}`;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  }

  return headers;
}

export async function streamOllam({
  messages,
  thinking,
  onDelta,
  onDone,
  signal,
}: {
  messages: Msg[];
  thinking?: boolean;
  onDelta: (chunk: string) => void;
  onDone: () => void;
  signal?: AbortSignal;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: await getChatHeaders(CHAT_URL),
    body: JSON.stringify({ messages, thinking }),
    signal,
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `Ollam responded ${resp.status}`);
  }

  if (!resp.body) throw new Error("No stream body");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const json = line.slice(6).trim();
      if (json === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }

  if (buf.trim()) {
    for (let raw of buf.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (!raw.startsWith("data: ")) continue;
      const json = raw.slice(6).trim();
      if (json === "[DONE]") continue;
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        // ignore partial frame
      }
    }
  }

  onDone();
}

export function extractToolCalls(
  text: string
): Array<{ tool: string; args: Record<string, unknown> }> {
  const results: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const regex = /```tool\s*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.tool) {
        results.push(parsed);
      }
    } catch {
      // skip malformed block
    }
  }
  return results;
}
