/**
 * Ollam · Mostar — Streaming chat client
 * Calls the ollam-chat edge function and streams tokens back.
 */

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ollam-chat`;

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
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
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

  // flush remainder
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
      } catch { /* partial */ }
    }
  }

  onDone();
}

/**
 * Parse tool invocations from Ollam's response text.
 * Looks for ```tool\n{...}\n``` blocks.
 */
export function extractToolCalls(
  text: string
): Array<{ tool: string; args: Record<string, unknown> }> {
  const results: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const regex = /```tool\s*\n([\s\S]*?)```/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (parsed.tool) results.push(parsed);
    } catch { /* skip bad JSON */ }
  }
  return results;
}
