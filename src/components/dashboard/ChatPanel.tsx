import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { MapParams } from "@/types/phantom";
import { ChatState as CS } from "@/types/phantom";
import { callMcpTool } from "@/lib/mcp-client";
import { streamOllam, extractToolCalls } from "@/lib/ollam-stream";

const EXAMPLE_PROMPTS = [
  "Fly to the corridor between Lwanda KE and Bunda TZ.",
  "Analyze CORRIDOR-KE-TZ-047 — start at -0.60,34.10 end at -2.45,33.80.",
  "What corridors are active near Lake Victoria?",
  "Run diagnostics on all connections.",
  "Explain the soul scoring model for corridor risk.",
  "What is a phantom POE and how is it detected?",
  "Trigger radar scan on CORRIDOR-UG-CD-018.",
];

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  onMapQuery?: (params: MapParams) => void;
}

const ChatPanel = ({ collapsed, onToggle, onMapQuery }: ChatPanelProps) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatState, setChatState] = useState(CS.IDLE);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [placeholder] = useState(
    () => EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const executeToolCalls = useCallback(
    async (toolCalls: Array<{ tool: string; args: Record<string, unknown> }>) => {
      for (const tc of toolCalls) {
        try {
          const result = await callMcpTool(tc.tool, tc.args);
          if (result.mapParams && onMapQuery) {
            onMapQuery(result.mapParams);
          }
        } catch (err) {
          console.error("Tool execution error:", err);
        }
      }
    },
    [onMapQuery]
  );

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || chatState !== CS.IDLE) return;

    const userMsg: ChatMessage = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setChatState(isThinkingMode ? CS.THINKING : CS.GENERATING);

    const ac = new AbortController();
    abortRef.current = ac;

    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      await streamOllam({
        messages: history,
        thinking: isThinkingMode,
        onDelta: upsertAssistant,
        onDone: () => {},
        signal: ac.signal,
      });

      // Check for tool calls in final response
      const toolCalls = extractToolCalls(assistantSoFar);
      if (toolCalls.length > 0) {
        setChatState(CS.EXECUTING);
        await executeToolCalls(toolCalls);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `◉ Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ]);
      }
    } finally {
      setChatState(CS.IDLE);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const stateLabel = {
    [CS.GENERATING]: "Ollam is responding…",
    [CS.THINKING]: "Deep analysis…",
    [CS.EXECUTING]: "Executing tool…",
    [CS.IDLE]: "",
  };

  return (
    <div
      className={`relative flex flex-col border-l border-border bg-card transition-[width] duration-300 ease-out ${
        collapsed ? "w-0 overflow-hidden border-l-0" : "w-[380px]"
      }`}
    >
      {/* Toggle */}
      <button
        onClick={onToggle}
        className="absolute -left-8 top-3 z-20 flex h-7 w-8 items-center justify-center rounded-l-md border border-r-0 border-border bg-card text-muted-foreground hover:text-foreground transition-colors active:scale-95"
        aria-label={collapsed ? "Open chat" : "Close chat"}
      >
        {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {!collapsed && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-phantom-green font-mono text-xs font-semibold tracking-wider">
                Ollam · Mostar
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-phantom-green/60 animate-pulse" />
            </div>
            {isThinkingMode && (
              <span className="text-[9px] font-mono text-phantom-amber px-1.5 py-0.5 rounded bg-phantom-amber/10 border border-phantom-amber/20">
                DEEP THINK
              </span>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                <span className="text-phantom-green/30 font-mono text-3xl select-none">
                  ◉⟁⬡
                </span>
                <p className="text-xs text-muted-foreground text-center max-w-[240px] leading-relaxed">
                  Ollam · Mostar is online. Ask about corridors, signals, threat analysis, or give direct commands.
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center max-w-[280px] mt-2">
                  {EXAMPLE_PROMPTS.slice(0, 3).map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(p)}
                      className="text-[9px] font-mono text-muted-foreground/70 px-2 py-1 rounded border border-border hover:border-phantom-green/30 hover:text-foreground transition-colors active:scale-95 text-left"
                    >
                      {p.slice(0, 40)}…
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`animate-fade-in-up ${msg.role === "user" ? "ml-8" : "mr-4"}`}
                style={{ animationDelay: `${Math.min(i * 40, 200)}ms` }}
              >
                <div
                  className={`rounded-lg px-3 py-2.5 text-sm leading-relaxed overflow-wrap-break-word ${
                    msg.role === "user"
                      ? "bg-secondary text-foreground"
                      : "bg-phantom-surface border border-border text-foreground font-mono text-xs"
                  }`}
                >
                  {msg.content.split("\n").map((line, j) => (
                    <span key={j}>
                      {line}
                      {j < msg.content.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>
                <span className="text-[9px] font-mono text-muted-foreground/50 mt-1 block px-1">
                  {msg.role === "user" ? "you" : "ollam"} · just now
                </span>
              </div>
            ))}

            {/* Status */}
            {chatState !== CS.IDLE && (
              <div className="flex items-center gap-2 px-2 py-1.5 animate-fade-in-up">
                <Loader2 className="w-3.5 h-3.5 text-phantom-green animate-spin" />
                <span className="text-[10px] font-mono text-phantom-green">
                  {stateLabel[chatState]}
                </span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={chatState !== CS.IDLE}
                className="flex-1 h-9 bg-secondary border border-border rounded-md px-3 text-sm text-foreground placeholder:text-muted-foreground/50 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-phantom-green/40 transition-shadow disabled:opacity-50"
                autoComplete="off"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || chatState !== CS.IDLE}
                className="flex items-center justify-center h-9 w-9 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3 px-1">
              <button
                className="text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                aria-label="Voice input"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isThinkingMode}
                  onChange={(e) => setIsThinkingMode(e.target.checked)}
                  className="sr-only peer"
                />
                <span className="w-3 h-3 rounded-sm border border-muted-foreground/40 peer-checked:bg-phantom-green peer-checked:border-phantom-green transition-colors" />
                <span className="text-[10px] font-mono text-muted-foreground">
                  Deep Think
                </span>
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export { ChatPanel };
