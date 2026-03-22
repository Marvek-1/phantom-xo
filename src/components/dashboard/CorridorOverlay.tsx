import type { CorridorAnalysisResult } from "@/types/phantom";

interface CorridorOverlayProps {
  analysis: CorridorAnalysisResult;
}

const riskColor = (risk: string) => {
  switch (risk?.toLowerCase()) {
    case "critical": return "text-phantom-red";
    case "high": return "text-phantom-amber";
    case "medium": return "text-phantom-blue";
    default: return "text-phantom-teal";
  }
};

const CorridorOverlay = ({ analysis }: CorridorOverlayProps) => {
  return (
    <div className="absolute top-4 left-4 z-10 w-80 max-h-[calc(100vh-8rem)] overflow-y-auto animate-fade-in-up">
      <div className="bg-card/95 border border-border rounded-lg backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-phantom-green tracking-wide">
              {analysis.id}
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase">
              {analysis.latentState ?? "unknown"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>{analysis.region}</span>
            <span className={riskColor(analysis.riskClass ?? "")}>
              {analysis.riskClass}
            </span>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-px bg-border">
          {[
            { label: "SCORE", value: analysis.score?.toFixed(4) },
            { label: "VELOCITY", value: analysis.velocity },
            { label: "DISTANCE", value: `${analysis.totalKm} km` },
            { label: "MODE", value: analysis.mode },
          ].map((m) => (
            <div key={m.label} className="bg-card px-3 py-2">
              <span className="text-[9px] font-mono text-muted-foreground block">{m.label}</span>
              <span className="text-xs font-mono font-semibold text-foreground">{m.value ?? "—"}</span>
            </div>
          ))}
        </div>

        {/* Souls */}
        {analysis.souls && (
          <div className="px-4 py-3 border-t border-border">
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">
              7 Mathematical Souls
            </span>
            <div className="space-y-1.5">
              {Object.entries(analysis.souls).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-muted-foreground w-20 uppercase truncate">{key}</span>
                  <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-phantom-green/70 transition-all duration-500"
                      style={{ width: `${Math.min(val * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-foreground tabular-nums w-8 text-right">
                    {val.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Forecast */}
        {analysis.forecast && (
          <div className="px-4 py-3 border-t border-border">
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">
              Forecast
            </span>
            <div className="flex gap-4">
              <div>
                <span className="text-[9px] font-mono text-muted-foreground block">NEXT ACTIVATION</span>
                <span className="text-xs font-mono font-semibold text-phantom-amber">
                  {((analysis.forecast.nextActivationLikelihood ?? 0) * 100).toFixed(0)}%
                </span>
              </div>
              <div>
                <span className="text-[9px] font-mono text-muted-foreground block">DRIFT</span>
                <span className="text-xs font-mono font-semibold text-foreground">
                  {analysis.forecast.driftDirectionDeg}°
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Nodes — type-differentiated */}
        {analysis.nodes && analysis.nodes.length > 0 && (
          <div className="px-4 py-3 border-t border-border">
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">
              Corridor Nodes
            </span>
            <div className="space-y-1">
              {analysis.nodes.map((node) => (
                <div key={node.id} className="flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`inline-block w-2 h-2 flex-shrink-0 ${
                      node.type === "FORMAL_POE" ? "rotate-45 bg-[hsl(var(--phantom-blue))]" :
                      node.type === "PHANTOM_POE" ? "rounded-full bg-[hsl(var(--phantom-amber))] animate-pulse" :
                      "rounded-full bg-[hsl(var(--phantom-teal))]"
                    }`} />
                    <span className="text-foreground truncate max-w-[110px]">{node.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] ${
                      node.type === "FORMAL_POE" ? "text-phantom-blue" :
                      node.type === "PHANTOM_POE" ? "text-phantom-amber" :
                      "text-muted-foreground"
                    }`}>{node.type.replace(/_/g, " ")}</span>
                    {node.risk && <span className={riskColor(node.risk)}>{node.risk}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence */}
        {analysis.evidence && analysis.evidence.length > 0 && (
          <div className="px-4 py-3 border-t border-border">
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">
              Evidence Provenance
            </span>
            <div className="space-y-1.5">
              {analysis.evidence.map((ev, i) => (
                <div key={i} className="text-[10px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-phantom-blue">{ev.source}</span>
                    <span className="text-muted-foreground">{ev.type}</span>
                  </div>
                  <span className="text-muted-foreground/60">
                    t:{ev.truthScore} · {ev.locationConfidence}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trace lines */}
        {analysis.traceLines && analysis.traceLines.length > 0 && (
          <div className="px-4 py-3 border-t border-border">
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">
              Inference Trace
            </span>
            <pre className="text-[9px] font-mono text-muted-foreground/80 whitespace-pre-wrap leading-relaxed">
              {analysis.traceLines.join("\n")}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export { CorridorOverlay };
