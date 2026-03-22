interface CorridorOverlayProps {
  analysis: {
    id: string;
    latentState?: string;
    region?: string;
    riskClass?: string;
    score?: number;
    velocity?: string;
    totalKm?: number;
    mode?: string;
    souls?: Record<string, number>;
    forecast?: {
      nextActivationLikelihood?: number;
      driftDirectionDeg?: number;
    };
    nodes?: Array<{ id: string; name: string; type: string; risk?: string }>;
    evidence?: Array<{
      source: string;
      type: string;
      truthScore?: number;
      locationConfidence?: string;
    }>;
    traceLines?: string[];
  };
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

        {/* Nodes */}
        {analysis.nodes && analysis.nodes.length > 0 && (
          <div className="px-4 py-3 border-t border-border">
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">
              Corridor Nodes
            </span>
            <div className="space-y-1">
              {analysis.nodes.map((node) => (
                <div key={node.id} className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-foreground truncate max-w-[120px]">{node.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{node.type}</span>
                    {node.risk && <span className={riskColor(node.risk)}>{node.risk}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { CorridorOverlay };
