import { supabase } from "@/integrations/supabase/client";
import { getPublicApiHeaders, getTemporalApiUrl, isSupabaseFunctionUrl } from "@/lib/backendEndpoints";

const DAY_MS = 24 * 60 * 60 * 1000;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface TemporalFlowsResponse {
  flows?: TemporalFlowRow[];
}

interface TemporalEventsResponse {
  events?: TemporalEventRow[];
}

interface CrossingPointsResponse {
  crossing_points?: CrossingPointRow[];
}

interface TemporalFlowRow {
  id: string;
  corridor_id: string;
  period_start: string;
  period_end: string;
  flow_count: number;
  flow_direction: string;
  source_report: string;
  source_url?: string | null;
  notes?: string | null;
  provenance?: string | null;
}

interface TemporalEventRow {
  id: string;
  corridor_id: string | null;
  crossing_point_id: string | null;
  event_date: string;
  event_type: string;
  description: string;
  flow_impact?: string | null;
  source: string;
}

interface CrossingPointRow {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country_a: string;
  country_b: string;
  monthly_avg_flow?: number | null;
  source?: string | null;
}

interface GeoJsonFeature {
  properties?: Record<string, unknown>;
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
}

interface CorridorAnchor {
  lat: number;
  lng: number;
  label: string;
}

export interface EvidenceSignal {
  id: string;
  cid: string;
  day: number;
  timestamp: Date;
  lat: number;
  lng: number;
  src: string;
  score: number;
  desc: string;
  label: string;
  signalType: string;
  flowVolume: number;
  intensity: number;
  source: string;
}

export interface TemporalRange {
  min: Date;
  max: Date;
}

const EVENT_INTENSITY: Record<string, number> = {
  CONFLICT_ONSET: 1.0,
  MASSIVE_SURGE: 1.0,
  CROSSING_SURGE: 0.85,
  HEALTH_CRISIS: 0.8,
  CROSSING_CLOSURE: 0.7,
  BORDER_CLOSURE: 0.7,
  BORDER_REOPENING: 0.55,
  RETURN_FLOW: 0.4,
  MILESTONE: 0.5,
};

let corridorAnchorsPromise: Promise<Map<string, CorridorAnchor>> | null = null;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function parseDate(value: string): Date {
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const normalized = new Date(`${value}T00:00:00Z`);
  if (!Number.isNaN(normalized.getTime())) return normalized;

  return new Date("2023-04-01T00:00:00Z");
}

function normalizeSource(source: string | null | undefined, signalType: string): string {
  const upper = (source ?? "").toUpperCase();

  if (signalType === "FLOW") return "IOM-DTM";
  if (upper.includes("ACLED") || signalType.includes("CONFLICT")) return "ACLED";
  if (upper.includes("WHO") || upper.includes("HEALTH")) return "DHIS2";
  if (upper.includes("UNHCR") || upper.includes("IOM")) return "IOM-DTM";

  return "AFRO-SENTINEL";
}

function getLineAnchor(coordinates: [number, number][]): CorridorAnchor | null {
  if (coordinates.length === 0) return null;
  const midpoint = coordinates[Math.floor(coordinates.length / 2)] ?? coordinates[0];
  return {
    lng: midpoint[0],
    lat: midpoint[1],
    label: "Corridor midpoint",
  };
}

async function getFunctionHeaders(url: string) {
  const headers: Record<string, string> = {
    ...getPublicApiHeaders(),
  };

  if (isSupabaseFunctionUrl(url)) {
    if (SUPABASE_PUBLISHABLE_KEY) {
      headers.apikey = SUPABASE_PUBLISHABLE_KEY;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  }

  return headers;
}

async function fetchTemporalJson<T>(query = ""): Promise<T> {
  const url = `${getTemporalApiUrl()}${query}`;
  const response = await fetch(url, {
    headers: await getFunctionHeaders(url),
  });

  if (!response.ok) {
    throw new Error(`api-temporal ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

async function loadCorridorAnchors() {
  if (!corridorAnchorsPromise) {
    corridorAnchorsPromise = (async () => {
      const response = await fetch("/data/corridors_paired.geojson");
      const geo = (await response.json()) as { features?: GeoJsonFeature[] };
      const anchors = new Map<string, CorridorAnchor>();
      const lineAnchors = new Map<string, CorridorAnchor>();

      for (const feature of geo.features ?? []) {
        const props = feature.properties ?? {};
        const routeType = typeof props.route_type === "string" ? props.route_type : "";
        const corridorId =
          typeof props.corridor_id === "string"
            ? props.corridor_id
            : typeof props.id === "string"
            ? props.id
            : "";
        const label = typeof props.name === "string" ? props.name : corridorId;

        if (!corridorId || !feature.geometry?.type) continue;

        if (
          routeType === "PHANTOM" &&
          feature.geometry.type === "LineString" &&
          Array.isArray(feature.geometry.coordinates)
        ) {
          const anchor = getLineAnchor(feature.geometry.coordinates as [number, number][]);
          if (anchor) {
            lineAnchors.set(corridorId, { ...anchor, label });
          }
          continue;
        }

        if (
          !Array.isArray(feature.geometry.coordinates) ||
          feature.geometry.type !== "Point" ||
          feature.geometry.coordinates.length < 2
        ) {
          continue;
        }

        const [lng, lat] = feature.geometry.coordinates as [number, number];
        const anchor = { lat, lng, label };

        if (routeType === "PHANTOM_POE") {
          anchors.set(corridorId, anchor);
        } else if (!anchors.has(corridorId) && !lineAnchors.has(corridorId)) {
          lineAnchors.set(corridorId, anchor);
        }
      }

      for (const [corridorId, anchor] of lineAnchors) {
        if (!anchors.has(corridorId)) anchors.set(corridorId, anchor);
      }

      return anchors;
    })();
  }

  return corridorAnchorsPromise;
}

function buildFlowSignal(flow: TemporalFlowRow, anchor: CorridorAnchor | undefined): EvidenceSignal {
  const intensity = clamp01((flow.flow_count ?? 0) / 50000);

  return {
    id: `flow-${flow.id}`,
    cid: flow.corridor_id,
    day: 0,
    timestamp: parseDate(flow.period_start),
    lat: anchor?.lat ?? 0,
    lng: anchor?.lng ?? 0,
    src: normalizeSource(flow.source_report, "FLOW"),
    score: Math.round(intensity * 100),
    desc: flow.notes?.trim() || `${flow.flow_direction}: ${flow.flow_count.toLocaleString()} movements`,
    label: `${(flow.flow_count / 1000).toFixed(1)}k movements`,
    signalType: "FLOW",
    flowVolume: flow.flow_count ?? 0,
    intensity,
    source: flow.source_report ?? "IOM DTM",
  };
}

function buildEventSignal(
  event: TemporalEventRow,
  crossing: CrossingPointRow | undefined,
  anchor: CorridorAnchor | undefined
): EvidenceSignal {
  const intensity = EVENT_INTENSITY[event.event_type] ?? 0.5;
  const lat = crossing?.lat ?? anchor?.lat ?? 0;
  const lng = crossing?.lng ?? anchor?.lng ?? 0;
  const label = event.description?.trim() || event.event_type.replace(/_/g, " ");

  return {
    id: `evt-${event.id}`,
    cid: event.corridor_id ?? "MULTI",
    day: 0,
    timestamp: parseDate(event.event_date),
    lat,
    lng,
    src: normalizeSource(event.source, event.event_type),
    score: Math.round(intensity * 100),
    desc: label,
    label: label.slice(0, 60),
    signalType: event.event_type ?? "EVENT",
    flowVolume: 0,
    intensity,
    source: event.source ?? "IOM/UNHCR",
  };
}

function applyPerCorridorDayOffsets(signals: EvidenceSignal[]) {
  const grouped = new Map<string, EvidenceSignal[]>();

  for (const signal of signals) {
    const bucket = grouped.get(signal.cid) ?? [];
    bucket.push(signal);
    grouped.set(signal.cid, bucket);
  }

  for (const corridorSignals of grouped.values()) {
    corridorSignals.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const start = corridorSignals[0]?.timestamp.getTime() ?? 0;

    for (const signal of corridorSignals) {
      signal.day = Math.max(0, Math.floor((signal.timestamp.getTime() - start) / DAY_MS));
    }
  }
}

export async function fetchTemporalSignals(): Promise<EvidenceSignal[]> {
  try {
    const [flowsData, eventsData, crossingsData, corridorAnchors] = await Promise.all([
      fetchTemporalJson<TemporalFlowsResponse>(),
      fetchTemporalJson<TemporalEventsResponse>("?events=1"),
      fetchTemporalJson<CrossingPointsResponse>("?crossing_points=1"),
      loadCorridorAnchors(),
    ]);

    const crossingsById = new Map(
      (crossingsData.crossing_points ?? []).map((crossing) => [crossing.id, crossing] as const)
    );

    const signals = [
      ...(flowsData.flows ?? []).map((flow) => buildFlowSignal(flow, corridorAnchors.get(flow.corridor_id))),
      ...(eventsData.events ?? []).map((event) =>
        buildEventSignal(
          event,
          event.crossing_point_id ? crossingsById.get(event.crossing_point_id) : undefined,
          event.corridor_id ? corridorAnchors.get(event.corridor_id) : undefined
        )
      ),
    ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    applyPerCorridorDayOffsets(signals);
    return signals;
  } catch (error) {
    console.error("[Temporal] Failed to fetch temporal signals:", error);
    return [];
  }
}

export function getTemporalRange(signals: EvidenceSignal[]): TemporalRange {
  if (signals.length === 0) {
    return {
      min: new Date("2023-04-01T00:00:00Z"),
      max: new Date("2025-01-31T00:00:00Z"),
    };
  }

  const sorted = [...signals].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return {
    min: sorted[0].timestamp,
    max: sorted[sorted.length - 1].timestamp,
  };
}
