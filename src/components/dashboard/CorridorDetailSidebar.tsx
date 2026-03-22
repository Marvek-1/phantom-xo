import { useEffect, useState } from "react";
import { X, MapPin, Calendar, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CorridorMeta {
  id: string;
  name: string;
  risk: string;
  km: number;
  mode: string;
}

interface TemporalFlow {
  id: string;
  corridor_id: string;
  period_start: string;
  period_end: string;
  flow_count: number;
  flow_direction: string;
  source_report: string;
  notes: string | null;
}

interface TemporalEvent {
  id: string;
  corridor_id: string | null;
  event_date: string;
  event_type: string;
  description: string;
  flow_impact: string | null;
  source: string;
}

interface CrossingPoint {
  id: string;
  name: string;
  country_a: string;
  country_b: string;
  monthly_avg_flow: number;
  peak_daily_flow: number;
  status: string;
  iom_fmp_active: boolean;
  closure_periods: string | null;
}

interface Props {
  corridor: CorridorMeta;
  onClose: () => void;
}

const EVENT_COLORS: Record<string, string> = {
  CONFLICT_ONSET: "text-phantom-red",
  CROSSING_SURGE: "text-phantom-amber",
  MASSACRE: "text-phantom-red",
  BORDER_CLOSURE: "text-phantom-red",
  BORDER_REOPENING: "text-phantom-green",
  HEALTH_CRISIS: "text-phantom-amber",
  POLICY_CHANGE: "text-phantom-blue",
  SMUGGLING_SURGE: "text-phantom-amber",
  MILESTONE: "text-phantom-teal",
  SEASONAL_SHIFT: "text-phantom-blue",
};

const RISK_BADGE: Record<string, string> = {
  CRITICAL: "bg-destructive/20 text-phantom-red border-destructive/30",
  HIGH: "bg-accent/20 text-phantom-amber border-accent/30",
  MEDIUM: "bg-[hsl(48_90%_50%/0.2)] text-[hsl(48_90%_50%)] border-[hsl(48_90%_50%/0.3)]",
};

const IMPACT_ICONS: Record<string, string> = {
  MASSIVE_SURGE: "↑↑↑",
  PEAK: "↑↑",
  SURGE: "↑",
  DISRUPTION: "⚡",
  HALT: "⛔",
  RECOVERY: "↗",
};

export function CorridorDetailSidebar({ corridor, onClose }: Props) {
  const [flows, setFlows] = useState<TemporalFlow[]>([]);
  const [events, setEvents] = useState<TemporalEvent[]>([]);
  const [crossings, setCrossings] = useState<CrossingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"flows" | "events" | "crossings">("flows");

  useEffect(() => {
    setLoading(true);
    const cid = corridor.id;

    Promise.all([
      supabase
        .from("temporal_flows")
        .select("*")
        .eq("corridor_id", cid)
        .order("period_start", { ascending: true }),
      supabase
        .from("corridor_temporal_events")
        .select("*")
        .or(`corridor_id.eq.${cid},corridor_id.eq.MULTI-CORRIDOR-SUDAN,corridor_id.eq.MULTI-CORRIDOR-SOMALIA`)
        .order("event_date", { ascending: true }),
      supabase
        .from("real_crossing_points")
        .select("*")
        .order("monthly_avg_flow", { ascending: false }),
    ]).then(([flowsRes, eventsRes, xpRes]) => {
      setFlows((flowsRes.data as TemporalFlow[]) ?? []);
      setEvents((eventsRes.data as TemporalEvent[]) ?? []);
      setCrossings((xpRes.data as CrossingPoint[]) ?? []);
      setLoading(false);
    });
  }, [corridor.id]);

  const totalFlow = flows.reduce((s, f) => s + (f.flow_count || 0), 0);
  const peakFlow = flows.length ? Math.max(...flows.map((f) => f.flow_count || 0)) : 0;
  const riskClass = RISK_BADGE[corridor.risk] ?? RISK_BADGE.MEDIUM;

  return (
    <div className="absolute top-0 left-0 bottom-0 z-20 w-[380px] bg-card/95 border-r border-border backdrop-blur-md flex flex-col animate-fade-in-up overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${riskClass}`}>
              {corridor.risk}
            </span>
            <span className="text-[9px] font-mono text-muted-foreground">{corridor.id}</span>
          </div>
          <h2 className="text-sm font-medium text-foreground leading-tight truncate">
            {corridor.name}
          </h2>
          <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-muted-foreground">
            <span>{corridor.km} km</span>
            <span>{corridor.mode}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Stats strip */}
      <div className="px-4 py-2.5 border-b border-border grid grid-cols-3 gap-2">
        <div>
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Total Flow</p>
          <p className="text-base font-mono text-foreground tabular-nums">
            {totalFlow >= 1000 ? `${(totalFlow / 1000).toFixed(0)}k` : totalFlow}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Peak</p>
          <p className="text-base font-mono text-phantom-amber tabular-nums">
            {peakFlow >= 1000 ? `${(peakFlow / 1000).toFixed(0)}k` : peakFlow}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Records</p>
          <p className="text-base font-mono text-foreground tabular-nums">{flows.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-1.5 border-b border-border flex gap-1">
        {(["flows", "events", "crossings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-2.5 py-1 text-[10px] font-mono rounded transition-colors ${
              tab === t
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            {t === "flows" && <TrendingUp className="w-3 h-3 inline mr-1" />}
            {t === "events" && <AlertTriangle className="w-3 h-3 inline mr-1" />}
            {t === "crossings" && <MapPin className="w-3 h-3 inline mr-1" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span className="ml-1 text-muted-foreground tabular-nums">
              {t === "flows" ? flows.length : t === "events" ? events.length : crossings.length}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!loading && tab === "flows" && (
          <>
            {/* Mini bar chart */}
            {flows.length > 0 && (
              <div className="mb-3 p-2 bg-muted/20 rounded border border-border">
                <div className="flex items-end gap-px h-16">
                  {flows.map((f) => {
                    const h = peakFlow > 0 ? (f.flow_count / peakFlow) * 100 : 0;
                    return (
                      <div
                        key={f.id}
                        className="flex-1 min-w-[3px] rounded-t-sm transition-all hover:opacity-80"
                        style={{
                          height: `${Math.max(h, 2)}%`,
                          backgroundColor: `hsl(var(--phantom-green) / ${0.4 + (h / 100) * 0.6})`,
                        }}
                        title={`${f.period_start}: ${f.flow_count.toLocaleString()}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1 text-[8px] font-mono text-muted-foreground">
                  <span>{flows[0]?.period_start?.slice(0, 7)}</span>
                  <span>{flows[flows.length - 1]?.period_start?.slice(0, 7)}</span>
                </div>
              </div>
            )}

            {flows.map((f) => (
              <div key={f.id} className="p-2 rounded border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {f.period_start?.slice(0, 10)}
                    <ArrowRight className="w-3 h-3 inline mx-1" />
                    {f.period_end?.slice(0, 10)}
                  </span>
                  <span className="text-[10px] font-mono text-phantom-green tabular-nums font-medium">
                    {f.flow_count?.toLocaleString()}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-muted-foreground/80">
                  {f.flow_direction}
                </div>
                {f.notes && (
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">{f.notes}</p>
                )}
              </div>
            ))}
            {flows.length === 0 && (
              <p className="text-[10px] font-mono text-muted-foreground py-6 text-center">
                No temporal flow data for this corridor
              </p>
            )}
          </>
        )}

        {!loading && tab === "events" && (
          <>
            {events.map((e) => (
              <div key={e.id} className="p-2 rounded border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {e.event_date}
                  </span>
                  <span className={`text-[9px] font-mono ${EVENT_COLORS[e.event_type] ?? "text-muted-foreground"}`}>
                    {e.event_type?.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-[10px] text-foreground/90 leading-relaxed">{e.description}</p>
                {e.flow_impact && (
                  <span className="inline-block mt-1 text-[9px] font-mono text-phantom-amber">
                    {IMPACT_ICONS[e.flow_impact] ?? ""} {e.flow_impact?.replace(/_/g, " ")}
                  </span>
                )}
                <p className="text-[8px] font-mono text-muted-foreground/60 mt-0.5">{e.source}</p>
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-[10px] font-mono text-muted-foreground py-6 text-center">
                No temporal events for this corridor
              </p>
            )}
          </>
        )}

        {!loading && tab === "crossings" && (
          <>
            {crossings.map((xp) => (
              <div key={xp.id} className="p-2 rounded border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-medium text-foreground">{xp.name}</span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                      xp.status === "active"
                        ? "bg-primary/15 text-phantom-teal"
                        : xp.status === "partially_restricted"
                        ? "bg-accent/15 text-phantom-amber"
                        : "bg-destructive/15 text-phantom-red"
                    }`}
                  >
                    {xp.status?.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-muted-foreground mb-1">
                  {xp.country_a} ↔ {xp.country_b}
                  {xp.iom_fmp_active && (
                    <span className="ml-2 text-phantom-blue">● IOM FMP</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                  <div>
                    <span className="text-muted-foreground">Avg/mo: </span>
                    <span className="text-foreground tabular-nums">
                      {(xp.monthly_avg_flow / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Peak/day: </span>
                    <span className="text-phantom-amber tabular-nums">
                      {xp.peak_daily_flow?.toLocaleString()}
                    </span>
                  </div>
                </div>
                {xp.closure_periods && (
                  <p className="text-[8px] font-mono text-phantom-red/80 mt-1">
                    Closures: {xp.closure_periods}
                  </p>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
