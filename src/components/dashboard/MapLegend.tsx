import { useState } from "react";
import { ChevronDown, ChevronUp, Play, Square } from "lucide-react";

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
}: MapLegendProps) => {
  const [expanded, setExpanded] = useState(true);
  const [cascadeCorridorId, setCascadeCorridorId] = useState("");

  return (
    <div className="absolute bottom-4 right-4 z-10 animate-fade-in">
      <div className="bg-card/90 border border-border rounded-lg backdrop-blur-sm overflow-hidden min-w-[210px] max-h-[70vh] overflow-y-auto">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        >
          <span>Legend</span>
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>

        {expanded && (
          <div className="px-3 pb-2.5 space-y-1.5 border-t border-border pt-2">
            {/* MONITORED section */}
            <p className="text-[9px] font-mono text-[hsl(217,91%,60%)] uppercase tracking-wider font-semibold">
              Monitored
            </p>
            <LegendItem
              label="Formal Route"
              swatch={<FormalLineSwatch />}
            />
            <LegendItem
              label="Official Gate"
              swatch={<GateSwatch />}
            />
            <LegendItem
              label="IOM FMP"
              swatch={<FmpSwatch />}
            />

            {/* UNMONITORED section */}
            <div className="pt-1.5 mt-1 border-t border-border">
              <p className="text-[9px] font-mono text-[hsl(var(--phantom-amber))] uppercase tracking-wider font-semibold mb-1">
                Unmonitored
              </p>
              <LegendItem
                label="Phantom Corridor"
                swatch={<PhantomDashSwatch />}
              />
              <LegendItem
                label="Phantom POE"
                swatch={<PhantomPoeSwatch />}
              />
              <LegendItem
                label="Gap Zone"
                swatch={<GapZoneSwatch />}
              />
            </div>

            {/* Risk classes */}
            <div className="pt-1.5 mt-1 border-t border-border">
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                Risk Class
              </p>
              {[
                { color: "#EF4444", label: "CRITICAL" },
                { color: "#F97316", label: "HIGH" },
                { color: "#EAB308", label: "MEDIUM" },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-2 text-[10px] font-mono text-foreground/80">
                  <span className="w-5 h-0.5 rounded-full" style={{ backgroundColor: r.color }} />
                  <span>{r.label}</span>
                </div>
              ))}
            </div>

            {/* Evidence sources */}
            <div className="pt-1.5 mt-1 border-t border-border">
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                Sources
              </p>
              {[
                { color: "#EF4444", label: "ACLED" },
                { color: "#3B82F6", label: "IOM-DTM" },
                { color: "#22C55E", label: "DHIS2" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-[10px] font-mono text-foreground/80">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Coverage gap indicator */}
            {corridorsLoaded && (
              <div className="pt-1.5 mt-1 border-t border-border">
                <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                  Coverage Gap
                </p>
                <div className="flex h-2.5 rounded-full overflow-hidden border border-border">
                  <div
                    className="bg-[hsl(217,91%,60%)]"
                    style={{ width: "29.4%" }}
                    title="Formal coverage: 29.4%"
                  />
                  <div
                    className="bg-destructive/60"
                    style={{ width: "70.6%" }}
                    title="Unmonitored: 70.6%"
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] font-mono text-[hsl(217,91%,60%)]">29.4% seen</span>
                  <span className="text-[8px] font-mono text-destructive">70.6% hidden</span>
                </div>
                <p className="text-[9px] font-mono text-muted-foreground tabular-nums mt-1">
                  {corridorsMeta.length} corridors
                </p>
              </div>
            )}

            {/* Toggles */}
            <div className="pt-1.5 mt-1 border-t border-border space-y-1">
              <label className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={officialPOEsVisible}
                  onChange={(e) => onTogglePOEs(e.target.checked)}
                  className="w-3 h-3 rounded border-border accent-[hsl(217,91%,60%)]"
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
              <div className="pt-1.5 mt-1 border-t border-border space-y-1">
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
                    className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono rounded bg-[hsl(var(--phantom-green))]/20 text-[hsl(var(--phantom-green))] hover:bg-[hsl(var(--phantom-green))]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Play className="w-2.5 h-2.5" />
                    Play
                  </button>
                  {cascadeActive && onStopCascade && (
                    <button
                      onClick={onStopCascade}
                      className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono rounded bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
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

/* ── Legend swatch components ── */

function LegendItem({ label, swatch }: { label: string; swatch: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono text-foreground/80">
      <div className="w-5 flex-shrink-0 flex items-center justify-center">{swatch}</div>
      <span>{label}</span>
    </div>
  );
}

/** Solid blue line matching the formal route on the map */
function FormalLineSwatch() {
  return (
    <div className="w-5 h-[3px] rounded-full bg-[hsl(217,91%,60%)]" />
  );
}

/** Animated dashed line mimicking the phantom corridor flow */
function PhantomDashSwatch() {
  return (
    <div className="relative w-5 h-[4px] overflow-hidden rounded-sm">
      <div
        className="absolute inset-0"
        style={{
          background: "repeating-linear-gradient(90deg, hsl(var(--phantom-green)) 0px, hsl(var(--phantom-green)) 3px, transparent 3px, transparent 6px)",
          animation: "legendDashFlow 1.5s linear infinite",
        }}
      />
      <style>{`
        @keyframes legendDashFlow {
          0% { transform: translateX(0); }
          100% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

/** Blue square with white border — matching formal gate point */
function GateSwatch() {
  return (
    <div
      className="w-2.5 h-2.5 rotate-45 border border-white/60"
      style={{ backgroundColor: "hsl(217, 91%, 60%)" }}
    />
  );
}

/** Gold pulsing circle matching the phantom POE on map */
function PhantomPoeSwatch() {
  return (
    <div className="relative w-3 h-3 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: "#FFD700" }} />
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#FFD700" }} />
    </div>
  );
}

/** Cyan circle with outer ring matching IOM FMP flow ring */
function FmpSwatch() {
  return (
    <div className="relative w-3 h-3 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border" style={{ borderColor: "hsl(var(--phantom-teal))", opacity: 0.4 }} />
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--phantom-teal))" }} />
    </div>
  );
}

/** Red semi-transparent zone matching gap zones */
function GapZoneSwatch() {
  return (
    <div
      className="w-5 h-2.5 rounded-sm border"
      style={{
        backgroundColor: "hsl(var(--phantom-red) / 0.2)",
        borderColor: "hsl(var(--phantom-red) / 0.4)",
      }}
    />
  );
}

export { MapLegend };
