import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Layers, Eye, EyeOff, History, Radio, RefreshCw, Wifi, WifiOff, Clock, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  // Mode & Live Monitoring
  mode?: "historical" | "live";
  onSetMode?: (mode: "historical" | "live") => void;
  isCascadeEnabled?: boolean;
  liveStatus?: {
    connectionState: "idle" | "polling" | "error" | "stale";
    lastFetchAt: Date | null;
    lastSuccessfulFetchAt: Date | null;
    newSignalsCount: number;
    pollLatencyMs: number;
    dataFreshnessSeconds: number;
    errorMessage: string | null;
  };
  onRefreshLiveData?: () => void;
}

const LAYER_DEFS = [
  { key: "corridors", label: "Corridors", color: "hsl(var(--phantom-green))", tip: "Inferred phantom paths and paired formal routes currently drawn on the map." },
  { key: "borders", label: "Borders", color: "#FFFFFF", tip: "Administrative border outlines used for geographic orientation." },
  { key: "labels", label: "Geo Labels", color: "#9CA3AF", tip: "Country, region, city, and geographic reference labels." },
  { key: "officialPOEs", label: "Official POEs", color: "hsl(217, 91%, 60%)", tip: "Known formal points of entry and monitored border gates." },
  { key: "evidence", label: "Evidence Signals", color: "hsl(var(--phantom-amber))", tip: "Time-stamped signals from flows, events, health, conflict, and static live seeds." },
  { key: "deviationAnalytics", label: "Deviation Heatline", color: "#EF4444", tip: "Selected-corridor analysis showing where phantom movement diverges from monitored roads." },
  { key: "logisticsRoutes", label: "Logistics Routes", color: "#22C55E", tip: "Evidence-derived response routes for the selected corridor: primary, alternate, contingency, and blocked." },
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
  mode = "historical",
  onSetMode,
  isCascadeEnabled = true,
  liveStatus,
  onRefreshLiveData,
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
    <div className="absolute bottom-4 left-4 z-10 animate-fade-in">
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
            {/* MODE TOGGLE & STATUS */}
            <div className="space-y-2">
              {/* Mode Toggle */}
              <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-md">
                <button
                  onClick={() => onSetMode?.("historical")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-mono rounded transition-colors ${
                    mode === "historical"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Historical: deterministic replay of loaded corridor and evidence data. Live polling is paused."
                >
                  <History className="w-3.5 h-3.5" />
                  Historical
                </button>
                <button
                  onClick={() => onSetMode?.("live")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-mono rounded transition-colors ${
                    mode === "live"
                      ? "bg-card text-phantom-green shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Live: polling mode for fresh signals. Historical replay controls are disabled."
                >
                  <Radio className="w-3.5 h-3.5" />
                  Live
                </button>
              </div>

              {/* Status Chip */}
              {mode === "historical" ? (
                <div
                  className="flex items-center gap-2 px-2 py-1.5 bg-muted/30 rounded border border-border/50"
                  title="Loaded evidence time span used by replay, cascade, animation, and historical analytics."
                >
                  <History className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-mono text-muted-foreground">
                    Historical Snapshot
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 ml-auto">
                    {rangeStart}–{rangeEnd}
                  </span>
                </div>
              ) : liveStatus && (
                <div
                  className={`flex items-center gap-2 px-2 py-1.5 rounded border ${
                  liveStatus.connectionState === "error"
                    ? "bg-destructive/10 border-destructive/30"
                    : liveStatus.connectionState === "stale"
                    ? "bg-phantom-amber/10 border-phantom-amber/30"
                    : liveStatus.connectionState === "polling"
                    ? "bg-primary/10 border-primary/30"
                    : "bg-phantom-green/10 border-phantom-green/30"
                }`}
                  title={liveStatus.errorMessage ?? "Live polling status, latest fetch latency, and new signal count."}
                >
                  {liveStatus.connectionState === "error" ? (
                    <WifiOff className="w-3.5 h-3.5 text-destructive" />
                  ) : liveStatus.connectionState === "stale" ? (
                    <Clock className="w-3.5 h-3.5 text-phantom-amber" />
                  ) : liveStatus.connectionState === "polling" ? (
                    <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
                  ) : (
                    <Wifi className="w-3.5 h-3.5 text-phantom-green" />
                  )}
                  <span className={`text-xs font-mono ${
                    liveStatus.connectionState === "error"
                      ? "text-destructive"
                      : liveStatus.connectionState === "stale"
                      ? "text-phantom-amber"
                      : liveStatus.connectionState === "polling"
                      ? "text-primary"
                      : "text-phantom-green"
                  }`}>
                    {liveStatus.connectionState === "error"
                      ? "Connection Error"
                      : liveStatus.connectionState === "stale"
                      ? `Stale (${liveStatus.dataFreshnessSeconds}s)`
                      : liveStatus.connectionState === "polling"
                      ? "Refreshing..."
                      : "Live Refreshing"}
                  </span>
                  {liveStatus.newSignalsCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded-full">
                      +{liveStatus.newSignalsCount}
                    </span>
                  )}
                  <button
                    onClick={onRefreshLiveData}
                    className="ml-auto p-1 hover:bg-white/10 rounded transition-colors"
                    title="Manual refresh"
                  >
                    <RefreshCw className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              )}

              {/* Latency / Freshness Detail */}
              {mode === "live" && liveStatus?.lastSuccessfulFetchAt && (
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/70 px-1">
                  <span>Latency: {liveStatus.pollLatencyMs}ms</span>
                  <span>Fresh: {liveStatus.dataFreshnessSeconds}s ago</span>
                </div>
              )}
            </div>

            {/* UNMONITORED — Phantom corridors */}
            <PanelLabel
              label="Phantom Corridors"
              className="text-[hsl(var(--phantom-amber))] pt-2 border-t border-border"
              tip="Unmonitored or under-monitored routes inferred from corridor geometry and evidence."
            />
            <LegendItem
              label="Detected route \u2014 risk gradient"
              swatch={<GradientBarSwatch />}
              tip="Route color encodes relative risk along the detected phantom path."
            />
            <LegendItem
              label="Phantom crossing point"
              swatch={<PhantomPoeSwatch />}
              tip="Inferred crossing node outside or beside formal monitoring infrastructure."
            />

            {/* PREDICTIVE DRIFT */}
            <div className="pt-2 mt-1.5 border-t border-border">
              <PanelLabel
                label="Predictive Analysis"
                className="text-yellow-400 mb-1.5"
                tip="Drift engine output — projects where this corridor may shift based on conflict pressure, flow attraction, closure deflection, and seasonal factors."
              />
              <LegendItem
                label="Predicted future path"
                swatch={<DriftPathSwatch />}
                tip="Dashed white line showing the projected corridor trajectory. Activate via the Predictive button after selecting a corridor."
              />
              <LegendItem
                label="Confidence halo"
                swatch={<DriftHaloSwatch />}
                tip="Yellow glow around the projected path — wider means higher model confidence in the drift direction."
              />
              <LegendItem
                label="Drift force vectors"
                swatch={<DriftVectorSwatch />}
                tip="Short directional arrows showing pressure intensity at each point. Yellow = low, orange = moderate, red = high. Hover any arrow on the map for details."
              />
              {driftResult && (
                <div className="mt-2 p-2 bg-yellow-400/5 border border-yellow-400/20 rounded text-[10px] font-mono space-y-1">
                  <div className="flex justify-between text-yellow-300/80">
                    <span title="Probability that this corridor's drift will result in a new active route within the projection window.">Activation likelihood</span>
                    <span className="tabular-nums font-semibold">{(driftResult.activationLikelihood * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span title="Model confidence in the projected drift direction and distance.">Confidence</span>
                    <span className="tabular-nums">{(driftResult.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span title="Mean displacement distance of the projected corridor from its current position.">Avg shift</span>
                    <span className="tabular-nums">{driftResult.avgMagnitudeKm.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span title="Compass bearing of the projected corridor drift direction.">Bearing</span>
                    <span className="tabular-nums">{driftResult.bearingDeg.toFixed(0)}°</span>
                  </div>
                  {driftResult.drivers.length > 0 && (
                    <div className="pt-1 border-t border-yellow-400/10">
                      <p className="text-muted-foreground/60 mb-1" title="The weighted evidence drivers that produced this drift projection.">Drivers</p>
                      {driftResult.drivers.slice(0, 4).map(d => (
                        <div key={d.name} className="flex justify-between">
                          <span className="text-muted-foreground/70 truncate max-w-[140px]" title={`${d.signalCount} signals contributing to this driver.`}>{d.name}</span>
                          <span className="tabular-nums text-yellow-300/60">{(d.weight * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MONITORED — Formal routes */}
            <div className="pt-2 mt-1.5 border-t border-border">
              <PanelLabel
                label="Logistics Routes"
                className="text-green-400 mb-1.5"
                tip="Response routing generated from current evidence. Green is primary, amber is alternate, red is blocked or rejected."
              />
              <LegendItem
                label="Primary delivery"
                swatch={<LogisticsLineSwatch color="#22C55E" dash="6 3" />}
                tip="Recommended route with lowest current operational risk for the corridor."
              />
              <LegendItem
                label="Alternate delivery"
                swatch={<LogisticsLineSwatch color="#F59E0B" dash="4 4" />}
                tip="Backup route for bulk or non-cold-chain supplies when the primary path is not suitable."
              />
              <LegendItem
                label="Blocked / rejected"
                swatch={<LogisticsLineSwatch color="#EF4444" dash="2 5" />}
                tip="Route rejected by current evidence, usually conflict, closure, or convoy-risk pressure."
              />
            </div>

            <div className="pt-2 mt-1.5 border-t border-border">
              <PanelLabel
                label="Formal Routes"
                className="text-[hsl(217,91%,60%)] mb-1.5"
                tip="Road-snapped official routes, formal gates, and monitored flow points paired against phantom movement."
              />
              <LegendItem
                label="Official route \u2014 monitored"
                swatch={<FormalLineSwatch />}
                tip="Known route with formal road or border monitoring."
              />
              <LegendItem
                label="Official gate"
                swatch={<GateSwatch />}
                tip="Recognized official gate or checkpoint on the formal network."
              />
              <LegendItem
                label="IOM FMP"
                swatch={<FmpSwatch />}
                tip="IOM flow monitoring point used as a formal observation anchor."
              />
            </div>

            {/* Coverage gap */}
            {corridorsLoaded && coverageStats && (
              <div className="pt-2 mt-1.5 border-t border-border">
                <PanelLabel
                  label="Coverage Gap"
                  className="text-muted-foreground mb-2"
                  tip="Blue is monitored formal coverage. Red is estimated hidden or unmonitored corridor exposure."
                />
                <div
                  className="flex h-3 rounded-full overflow-hidden border border-border"
                  title={`${coverageStats.monitoredPct}% monitored, ${coverageStats.unmonitoredPct}% hidden across ${coverageStats.totalCorridors} corridors.`}
                >
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
                <p
                  className="text-xs font-mono text-muted-foreground tabular-nums mt-1"
                  title="Total corridor count plus summed phantom and formal route distance currently loaded."
                >
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
                    <InfoTip text="Toggle map layer groups without changing the underlying loaded data." />
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
                          title={layer.tip}
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
          </div>
        )}
      </div>
    </div>
  );
};

/* \u2500\u2500 Legend swatch components \u2500\u2500 */

function LegendItem({ label, swatch, tip }: { label: string; swatch: React.ReactNode; tip: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-mono text-foreground/80" title={tip}>
      <div className="w-5 flex-shrink-0 flex items-center justify-center">{swatch}</div>
      <span>{label}</span>
      <InfoTip text={tip} />
    </div>
  );
}

function PanelLabel({ label, tip, className = "" }: { label: string; tip: string; className?: string }) {
  return (
    <p className={`text-xs font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 ${className}`}>
      <span>{label}</span>
      <InfoTip text={tip} />
    </p>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="w-3 h-3 text-muted-foreground/50 hover:text-foreground/80 shrink-0" />
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[260px] text-xs font-mono leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
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

function DriftPathSwatch() {
  return (
    <svg width="20" height="6" viewBox="0 0 20 6">
      <line x1="0" y1="3" x2="20" y2="3" stroke="white" strokeWidth="2" strokeDasharray="4 3" strokeOpacity="0.5" />
    </svg>
  );
}

function DriftHaloSwatch() {
  return (
    <div
      className="w-5 h-[6px] rounded-full"
      style={{ background: "#EAB308", opacity: 0.35, filter: "blur(2px)" }}
    />
  );
}

function DriftVectorSwatch() {
  return (
    <svg width="20" height="8" viewBox="0 0 20 8">
      <defs>
        <linearGradient id="dv-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#EAB308" />
          <stop offset="50%" stopColor="#F5A623" />
          <stop offset="100%" stopColor="#FF453A" />
        </linearGradient>
      </defs>
      <line x1="1" y1="4" x2="16" y2="4" stroke="url(#dv-grad)" strokeWidth="2" />
      <polyline points="13,1 16,4 13,7" fill="none" stroke="#F5A623" strokeWidth="1.5" />
    </svg>
  );
}

function LogisticsLineSwatch({ color, dash }: { color: string; dash: string }) {
  return (
    <svg width="20" height="6" viewBox="0 0 20 6">
      <line x1="0" y1="3" x2="20" y2="3" stroke={color} strokeWidth="2" strokeDasharray={dash} />
    </svg>
  );
}

export { MapLegend };
