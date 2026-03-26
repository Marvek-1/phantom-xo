import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Play, Square, Layers, Eye, EyeOff } from "lucide-react";

interface CorridorMeta {
  id: string;
  name: string;
  risk: string;
  km: number;
  mode: string;
}

interface CoverageStats {
  monitoredPct: number;
  unmonitoredPct: number;
  totalCorridors: number;
  totalPhantomKm: number;
  totalFormalKm: number;
}

interface MapLegendProps {
  officialPOEsVisible: boolean;
  onTogglePOEs: (visible: boolean) => void;
  corridorsMeta?: CorridorMeta[];
  corridorsLoaded?: boolean;
  coverageStats?: CoverageStats | null;
  evidenceVisible?: boolean;
  onToggleEvidence?: () => void;
  cascadeActive?: boolean;
  onStartCascade?: (corridorId: string) => void;
  onScrub?: (corridorId: string, position: number) => void;
  onStopCascade?: () => void;
  scrubberPosition?: number;
  currentDate?: Date | null;
  temporalRange?: { min: Date; max: Date } | null;
  layerVisibility?: Record<string, boolean>;
  onToggleLayer?: (layer: string) => void;
  selectedCorridorId?: string | null;
  driftResult?: {
    corridorId: string;
    confidence: number;
    avgMagnitudeKm: number;
    bearingDeg: number;
    activationLikelihood: number;
    drivers: Array<{ name: string; weight: number; signalCount: number }>;
  } | null;
  onComputeDrift?: (corridorId: string) => void;
  onClearDrift?: () => void;
}

const LAYER_DEFS = [
  { key: "corridors", label: "Corridors", color: "hsl(var(--phantom-green))" },
  { key: "borders", label: "Borders", color: "#FFFFFF" },
  { key: "labels", label: "Geo Labels", color: "#9CA3AF" },
  { key: "officialPOEs", label: "Official POEs", color: "hsl(217, 91%, 60%)" },
  { key: "evidence", label: "Evidence Signals", color: "hsl(var(--phantom-amber))" },
  { key: "deviationAnalytics", label: "Deviation Heatline", color: "#EF4444" },
];

const MapLegend = ({
  officialPOEsVisible,
  onTogglePOEs,
  corridorsMeta = [],
  corridorsLoaded = false,
  coverageStats,
  evidenceVisible = false,
  onToggleEvidence,
  cascadeActive = false,
  onStartCascade,
  onScrub,
  onStopCascade,
  scrubberPosition = 0,
  currentDate,
  temporalRange,
  layerVisibility = {},
  onToggleLayer,
  selectedCorridorId,
  driftResult,
  onComputeDrift,
  onClearDrift,
}: MapLegendProps) => {
  const [expanded, setExpanded] = useState(true);
  const [layersExpanded, setLayersExpanded] = useState(true);
  const [cascadeCorridorId, setCascadeCorridorId] = useState("");
  const [driftCorridorId, setDriftCorridorId] = useState("");
  const activeDate = currentDate ?? temporalRange?.min ?? null;
  const rangeStart = temporalRange?.min
    ? temporalRange.min.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : "Apr 2023";
  const rangeEnd = temporalRange?.max
    ? temporalRange.max.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : "Jan 2025";

  useEffect(() => {
    if (selectedCorridorId && !driftCorridorId) {
      setDriftCorridorId(selectedCorridorId);
    }
  }, [selectedCorridorId, driftCorridorId]);

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
              label="Detected route \u2014 risk gradient"
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
                label="Official route \u2014 monitored"
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
            {corridorsLoaded && coverageStats && (
              <div className="pt-2 mt-1.5 border-t border-border">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  Coverage Gap
                </p>
                <div className="flex h-3 rounded-full overflow-hidden border border-border">
                  <div
                    className="bg-[hsl(217,91%,60%)]"
                    style={{ width: `${coverageStats.monitoredPct}%` }}
                    title={`Formal coverage: ${coverageStats.monitoredPct}%`}
                  />
                  <div
                    className="bg-destructive/60"
                    style={{ width: `${coverageStats.unmonitoredPct}%` }}
                    title={`Unmonitored: ${coverageStats.unmonitoredPct}%`}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs font-mono text-[hsl(217,91%,60%)]">{coverageStats.monitoredPct}% monitored</span>
                  <span className="text-xs font-mono text-destructive">{coverageStats.unmonitoredPct}% hidden</span>
                </div>
                <p className="text-xs font-mono text-muted-foreground tabular-nums mt-1">
                  {coverageStats.totalCorridors} corridors \u00b7 {coverageStats.totalPhantomKm.toLocaleString()} km phantom \u00b7 {coverageStats.totalFormalKm.toLocaleString()} km formal
                </p>
              </div>
            )}

            {/* Layer controls */}
            {onToggleLayer && (
              <div className="pt-2 mt-1.5 border-t border-border">
                <button
                  onClick={() => setLayersExpanded(!layersExpanded)}
                  className="w-full flex items-center justify-between text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5 hover:text-foreground transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3 h-3" />
                    Layers
                  </span>
                  {layersExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {layersExpanded && (
                  <div className="space-y-1">
                    {LAYER_DEFS.map((layer) => {
                      const isOn = layer.key === "officialPOEs"
                        ? officialPOEsVisible
                        : layer.key === "evidence"
                        ? evidenceVisible
                        : (layerVisibility[layer.key] ?? true);
                      return (
                        <button
                          key={layer.key}
                          onClick={() => {
                            if (layer.key === "evidence") {
                              onToggleEvidence?.();
                            } else {
                              onToggleLayer(layer.key);
                            }
                          }}
                          className="w-full flex items-center gap-2 px-1.5 py-1 rounded hover:bg-white/5 transition-colors group"
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-sm flex-shrink-0 border"
                            style={{
                              backgroundColor: isOn ? layer.color : "transparent",
                              borderColor: layer.color,
                              opacity: isOn ? 1 : 0.3,
                            }}
                          />
                          <span className={`text-xs font-mono flex-1 text-left ${isOn ? "text-foreground/80" : "text-muted-foreground/40 line-through"}`}>
                            {layer.label}
                          </span>
                          {isOn ? (
                            <Eye className="w-3 h-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <EyeOff className="w-3 h-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Cascade controls */}
            {onStartCascade && corridorsMeta.length > 0 && (
              <div className="pt-2 mt-1.5 border-t border-border space-y-1.5">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                  Cascade Replay
                </p>
                <select
                  value={cascadeCorridorId}
                  onChange={(e) => setCascadeCorridorId(e.target.value)}
                  aria-label="Select corridor for cascade replay"
                  className="w-full text-xs font-mono bg-background border border-border rounded px-2 py-1.5 text-foreground/80"
                  disabled={cascadeActive}
                >
                  <option value="">Select corridor\u2026</option>
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
                <div className="pt-1">
                  <div className="text-[10px] font-mono text-muted-foreground mb-1">
                    {activeDate
                      ? activeDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
                      : rangeStart}
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={scrubberPosition}
                    title="Scrub cascade replay timeline"
                    placeholder="Scrub timeline"
                    onChange={(e) => onScrub?.(cascadeCorridorId, Number(e.target.value))}
                    disabled={!cascadeCorridorId}
                    className="w-full accent-red-500 disabled:opacity-40"
                  />
                  <div className="flex justify-between mt-1 text-[9px] font-mono text-muted-foreground">
                    <span>{rangeStart}</span>
                    <span>{rangeEnd}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Drift controls */}
            {onComputeDrift && corridorsMeta.length > 0 && (
              <div className="pt-2 mt-1.5 border-t border-border space-y-1.5">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                  Predictive Drift
                </p>
                <select
                  value={driftCorridorId}
                  onChange={(e) => setDriftCorridorId(e.target.value)}
                  aria-label="Select corridor for predictive drift analysis"
                  className="w-full text-xs font-mono bg-background border border-border rounded px-2 py-1.5 text-foreground/80"
                >
                  <option value="">Select corridor\u2026</option>
                  {corridorsMeta.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.risk})
                    </option>
                  ))}
                </select>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => driftCorridorId && onComputeDrift(driftCorridorId)}
                    disabled={!driftCorridorId}
                    className="px-2.5 py-1 text-xs font-mono rounded bg-[hsl(var(--phantom-amber))]/20 text-[hsl(var(--phantom-amber))] hover:bg-[hsl(var(--phantom-amber))]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Run Drift
                  </button>
                  {driftResult && onClearDrift && (
                    <button
                      onClick={onClearDrift}
                      className="px-2.5 py-1 text-xs font-mono rounded bg-muted/30 text-muted-foreground hover:bg-muted/40 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {driftResult && (
                  <div className="mt-1.5 p-2 rounded border border-border bg-muted/15 space-y-1.5">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="text-foreground tabular-nums text-right">
                        {(driftResult.confidence * 100).toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground">Activation</span>
                      <span className="text-foreground tabular-nums text-right">
                        {(driftResult.activationLikelihood * 100).toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground">Avg shift</span>
                      <span className="text-foreground tabular-nums text-right">
                        {driftResult.avgMagnitudeKm.toFixed(1)} km
                      </span>
                      <span className="text-muted-foreground">Bearing</span>
                      <span className="text-foreground tabular-nums text-right">
                        {Math.round(driftResult.bearingDeg)}\u00b0
                      </span>
                    </div>
                    {driftResult.drivers.length > 0 && (
                      <div className="pt-1 border-t border-border">
                        <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                          Top Drivers
                        </p>
                        <div className="space-y-0.5">
                          {driftResult.drivers.slice(0, 3).map((d) => (
                            <div key={d.name} className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-foreground/80 truncate pr-2">{d.name}</span>
                              <span className="text-muted-foreground tabular-nums">
                                {(d.weight * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* \u2500\u2500 Legend swatch components \u2500\u2500 */

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
