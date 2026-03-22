import { useState, useRef, useEffect } from "react";
import { Send, Mic, ChevronLeft, ChevronRight } from "lucide-react";

const EXAMPLE_PROMPTS = [
  "Fly to the corridor between Lwanda KE and Bunda TZ.",
  "Analyze CORRIDOR-KE-TZ-047 — start at -0.60,34.10 end at -2.45,33.80.",
  "Ingest disease intelligence signals from Kenya.",
  "Run diagnostics on all connections.",
  "Fetch AFRO Sentinel signals at lat -1.12 lng 34.18.",
];

interface ChatPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

const ChatPanel = ({ collapsed, onToggle }: ChatPanelProps) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [placeholder] = useState(
    () => EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg) return;
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");
    // TODO: wire up to MCP/Gemini backend
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`relative flex flex-col border-l border-border bg-card transition-[width] duration-300 ease-out ${
        collapsed ? "w-0 overflow-hidden border-l-0" : "w-[380px]"
      }`}
    >
      {/* Toggle button — always visible */}
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
                Phantom POE
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-phantom-green/60 animate-pulse" />
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                <span className="text-phantom-green/30 font-mono text-3xl select-none">◉⟁⬡</span>
                <p className="text-xs text-muted-foreground text-center max-w-[240px] leading-relaxed">
                  Query corridors, signals, locations, or run diagnostics. The engine is listening.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`animate-fade-in-up ${
                  msg.role === "user" ? "ml-8" : "mr-8"
                }`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div
                  className={`rounded-lg px-3 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-secondary text-foreground"
                      : "bg-phantom-surface border border-border text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[9px] font-mono text-muted-foreground/50 mt-1 block px-1">
                  {msg.role === "user" ? "you" : "phantom-poe"} · just now
                </span>
              </div>
            ))}
          </div>

          {/* Input area */}
          <div className="border-t border-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1 h-9 bg-secondary border border-border rounded-md px-3 text-sm text-foreground placeholder:text-muted-foreground/50 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-phantom-green/40 transition-shadow"
                autoComplete="off"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex items-center justify-center h-9 w-9 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3 px-1">
              <button className="text-muted-foreground hover:text-foreground transition-colors active:scale-95" aria-label="Voice input">
                <Mic className="w-3.5 h-3.5" />
              </button>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" className="sr-only peer" />
                <span className="w-3 h-3 rounded-sm border border-muted-foreground/40 peer-checked:bg-phantom-green peer-checked:border-phantom-green transition-colors" />
                <span className="text-[10px] font-mono text-muted-foreground">Thinking Mode</span>
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export { ChatPanel };
