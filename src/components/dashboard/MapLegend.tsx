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
      <div className="bg-card/90 border border-border rounded-lg backdrop-blur-sm overflow-hidden min-w-[240px] max-h-[70vh] overflow-y-auto">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-mono text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        >
          <span>Legend</span>
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {expanded && (
          <div className="px-3 pb-3 space-y-2 border-t border-border pt-2.5">
            {/* UNMONITORED — Phantom corridors */}
            <p className="text-xs font-mono text-[hsl(var(--phantom-amber))] uppercase tracking-wider font-semibold">
              Phantom Corridors
            </p>
            <LegendItem
              label="Detected route — risk gradient"
              swatch={<GradientBarSwatch />}
            />
            <LegendItem
              label="Phantom crossing point"
              swatch={<PhantomPoeSwatch />}
            />

            {/* MONITORED — Formal routes */}
            <div className="pt-2 mt-1.5 border-t border-border">
              <p className="text-xs font-mono text-[hsl(217,91%,60%)] uppercase tracking-wider font-semibold mb-1.5">
                Formal Routes
              </p>
              <LegendItem
                label="Official route — monitored"
                swatch={<FormalLineSwatch />}
              />
              <LegendItem
                label="Official gate"
                swatch={<GateSwatch />}
              />
              <LegendItem
                label="IOM FMP"
                swatch={<FmpSwatch />}
              />
            </div>

            {/* Coverage gap */}
            {corridorsLoaded && (
              <div className="pt-2 mt-1.5 border-t border-border">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  Coverage Gap
                </p>
                <div className="flex h-3 rounded-full overflow-hidden border border-border">
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
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs font-mono text-[hsl(217,91%,60%)]">29.4% monitored</span>
                  <span className="text-xs font-mono text-destructive">70.6% hidden</span>
                </div>
                <p className="text-xs font-mono text-muted-foreground tabular-nums mt-1">
                  {corridorsMeta.length} corridors
                </p>
              </div>
            )}

            {/* Toggles */}
            <div className="pt-2 mt-1.5 border-t border-border space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-mono text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={officialPOEsVisible}
                  onChange={(e) => onTogglePOEs(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-border accent-[hsl(217,91%,60%)]"
                />
                <span>Show Official POEs</span>
              </label>
              {onToggleEvidence && (
                <label className="flex items-center gap-2 text-sm font-mono text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={evidenceVisible}
                    onChange={onToggleEvidence}
                    className="w-3.5 h-3.5 rounded border-border accent-[hsl(var(--phantom-green))]"
                  />
                  <span>Show Evidence Signals</span>
                </label>
              )}
            </div>

            {/* Cascade controls */}
            {onStartCascade && corridorsMeta.length > 0 && (
              <div className="pt-2 mt-1.5 border-t border-border space-y-1.5">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                  Cascade Replay
                </p>
                <select
                  value={cascadeCorridorId}
                  onChange={(e) => setCascadeCorridorId(e.target.value)}
                  className="w-full text-xs font-mono bg-background border border-border rounded px-2 py-1.5 text-foreground/80"
                  disabled={cascadeActive}
                >
                  <option value="">Select corridor…</option>
                  {corridorsMeta.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.risk})
                    </option>
                  ))}
                </select>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => cascadeCorridorId && onStartCascade(cascadeCorridorId)}
                    disabled={!cascadeCorridorId || cascadeActive}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded bg-[hsl(var(--phantom-green))]/20 text-[hsl(var(--phantom-green))] hover:bg-[hsl(var(--phantom-green))]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    Play
                  </button>
                  {cascadeActive && onStopCascade && (
                    <button
                      onClick={onStopCascade}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
                    >
                      <Square className="w-3 h-3" />
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
    <div className="flex items-center gap-2 text-sm font-mono text-foreground/80">
      <div className="w-5 flex-shrink-0 flex items-center justify-center">{swatch}</div>
      <span>{label}</span>
    </div>
  );
}

function GradientBarSwatch() {
  return (
    <div
      className="w-5 h-[4px] rounded-full"
      style={{
        background: "linear-gradient(90deg, #22C55E 0%, #EAB308 50%, #EF4444 100%)",
      }}
    />
  );
}

function FormalLineSwatch() {
  return (
    <div className="w-5 h-[3px] rounded-full bg-[hsl(217,91%,60%)]" />
  );
}

function PhantomPoeSwatch() {
  return (
    <div
      className="w-2.5 h-2.5 rotate-45 bg-white border"
      style={{ borderColor: "#FFD700" }}
    />
  );
}

function GateSwatch() {
  return (
    <div
      className="w-2.5 h-2.5 rotate-45 border border-white/60"
      style={{ backgroundColor: "hsl(217, 91%, 60%)" }}
    />
  );
}

function FmpSwatch() {
  return (
    <div className="relative w-3.5 h-3.5 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border" style={{ borderColor: "hsl(var(--phantom-teal))", opacity: 0.4 }} />
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--phantom-teal))" }} />
    </div>
  );
}

export { MapLegend };
