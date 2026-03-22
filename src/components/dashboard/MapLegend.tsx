import { useState } from "react";
import { ChevronDown, ChevronUp, Play, Square } from "lucide-react";

interface LegendItem {
  color: string;
  shape: "circle" | "diamond" | "line" | "dash" | "zone";
  label: string;
  pulse?: boolean;
}

const items: LegendItem[] = [
  { color: "hsl(var(--phantom-blue))", shape: "diamond", label: "Official POE" },
  { color: "hsl(var(--phantom-green))", shape: "line", label: "Phantom Corridor" },
  { color: "hsl(var(--phantom-amber))", shape: "dash", label: "Inferred Path" },
  { color: "hsl(var(--phantom-amber))", shape: "circle", label: "Phantom POE", pulse: true },
  { color: "hsl(var(--phantom-teal))", shape: "circle", label: "Settlement" },
  { color: "hsl(var(--phantom-red))", shape: "zone", label: "Gap Zone" },
  { color: "hsl(48 100% 50%)", shape: "circle", label: "Belief Circle" },
];

const riskItems = [
  { color: "#EF4444", label: "CRITICAL" },
  { color: "#F97316", label: "HIGH" },
  { color: "#EAB308", label: "MEDIUM" },
];

const sourceItems = [
  { color: "#EF4444", label: "ACLED" },
  { color: "#3B82F6", label: "IOM-DTM" },
  { color: "#22C55E", label: "DHIS2" },
];

function ShapeIcon({ item }: { item: LegendItem }) {
  const base = "inline-block flex-shrink-0";

  switch (item.shape) {
    case "diamond":
      return (
        <span
          className={`${base} w-2.5 h-2.5 rotate-45`}
          style={{ backgroundColor: item.color }}
        />
      );
    case "circle":
      return (
        <span
          className={`${base} w-2.5 h-2.5 rounded-full ${item.pulse ? "animate-pulse" : ""}`}
          style={{ backgroundColor: item.color }}
        />
      );
    case "line":
      return (
        <span
          className={`${base} w-5 h-0.5 rounded-full`}
          style={{ backgroundColor: item.color }}
        />
      );
    case "dash":
      return (
        <span className={`${base} flex items-center gap-0.5`}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1 h-0.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
          ))}
        </span>
      );
    case "zone":
      return (
        <span
          className={`${base} w-5 h-2.5 rounded-sm`}
          style={{ backgroundColor: item.color, opacity: 0.25 }}
        />
      );
  }
}

interface CorridorMeta {
  id: string;
  name: string;
  risk: string;
  km: number;
  mode: string;
}

interface MapLegendProps {
  officialPOEsVisible: boolean;
  onTogglePOEs: (visible: boolean) => void;
  corridorsMeta?: CorridorMeta[];
  corridorsLoaded?: boolean;
  evidenceVisible?: boolean;
  onToggleEvidence?: () => void;
  cascadeActive?: boolean;
  onStartCascade?: (corridorId: string) => void;
  onStopCascade?: () => void;
  crossingPointCount?: number;
}

const MapLegend = ({
  officialPOEsVisible,
  onTogglePOEs,
  corridorsMeta = [],
  corridorsLoaded = false,
  evidenceVisible = false,
  onToggleEvidence,
  cascadeActive = false,
  onStartCascade,
  onStopCascade,
  crossingPointCount = 0,
}: MapLegendProps) => {
  const [expanded, setExpanded] = useState(true);
  const [cascadeCorridorId, setCascadeCorridorId] = useState("");

  return (
    <div className="absolute bottom-4 right-4 z-10 animate-fade-in-up">
      <div className="bg-card/90 border border-border rounded-lg backdrop-blur-sm overflow-hidden min-w-[180px] max-h-[70vh] overflow-y-auto">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        >
          <span>Legend</span>
          {expanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronUp className="w-3 h-3" />
          )}
        </button>

        {expanded && (
          <div className="px-3 pb-2.5 space-y-1.5 border-t border-border pt-2">
            {items.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-[10px] font-mono text-foreground/80"
              >
                <ShapeIcon item={item} />
                <span>{item.label}</span>
              </div>
            ))}

            {/* Risk classes */}
            <div className="pt-1.5 mt-1.5 border-t border-border">
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                Risk Class
              </p>
              {riskItems.map((r) => (
                <div key={r.label} className="flex items-center gap-2 text-[10px] font-mono text-foreground/80">
                  <span className="w-5 h-0.5 rounded-full" style={{ backgroundColor: r.color }} />
                  <span>{r.label}</span>
                </div>
              ))}
            </div>

            {/* Evidence sources */}
            <div className="pt-1.5 mt-1.5 border-t border-border">
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                Sources
              </p>
              {sourceItems.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-[10px] font-mono text-foreground/80">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Corridor count */}
            {corridorsLoaded && (
              <div className="pt-1.5 mt-1.5 border-t border-border">
                <p className="text-[9px] font-mono text-muted-foreground tabular-nums">
                  {corridorsMeta.length} corridors · 91 nodes
                  {crossingPointCount > 0 && ` · ${crossingPointCount} FMPs`}
                </p>
              </div>
            )}

            {/* Toggles */}
            <div className="pt-1.5 mt-1.5 border-t border-border space-y-1">
              <label className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={officialPOEsVisible}
                  onChange={(e) => onTogglePOEs(e.target.checked)}
                  className="w-3 h-3 rounded border-border accent-[hsl(var(--phantom-blue))]"
                />
                <span>Show Official POEs</span>
              </label>
              {onToggleEvidence && (
                <label className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={evidenceVisible}
                    onChange={onToggleEvidence}
                    className="w-3 h-3 rounded border-border accent-[hsl(var(--phantom-green))]"
                  />
                  <span>Show Evidence Signals</span>
                </label>
              )}
            </div>

            {/* Cascade controls */}
            {onStartCascade && corridorsMeta.length > 0 && (
              <div className="pt-1.5 mt-1.5 border-t border-border space-y-1">
                <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                  Cascade Replay
                </p>
                <select
                  value={cascadeCorridorId}
                  onChange={(e) => setCascadeCorridorId(e.target.value)}
                  className="w-full text-[9px] font-mono bg-background border border-border rounded px-1.5 py-1 text-foreground/80"
                  disabled={cascadeActive}
                >
                  <option value="">Select corridor…</option>
                  {corridorsMeta.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.risk})
                    </option>
                  ))}
                </select>
                <div className="flex gap-1">
                  <button
                    onClick={() => cascadeCorridorId && onStartCascade(cascadeCorridorId)}
                    disabled={!cascadeCorridorId || cascadeActive}
                    className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono rounded bg-phantom-green/20 text-phantom-green hover:bg-phantom-green/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Play className="w-2.5 h-2.5" />
                    Play
                  </button>
                  {cascadeActive && onStopCascade && (
                    <button
                      onClick={onStopCascade}
                      className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono rounded bg-phantom-red/20 text-phantom-red hover:bg-phantom-red/30 transition-colors"
                    >
                      <Square className="w-2.5 h-2.5" />
                      Stop
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export { MapLegend };
