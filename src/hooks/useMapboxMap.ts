import { useRef, useEffect, useCallback, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { MapParams, CameraTarget } from "@/types/phantom";
import { MAPBOX_TOKEN } from "./mapbox/types";
import type { CorridorMeta, MapboxDrawContext } from "./mapbox/types";
import { drawCorridors, CORRIDOR_LAYER_IDS, BORDER_LAYER_IDS, LABEL_LAYER_IDS, type CoverageStats } from "./mapbox/drawCorridors";
import { drawBorders } from "./mapbox/drawBorders";
import { drawGeoLabels } from "./mapbox/drawGeoLabels";
import { drawEvidenceLayer, toggleEvidenceLayer } from "./mapbox/drawEvidenceLayer";
import { drawOfficialPOEs, POE_LAYER_IDS } from "./mapbox/drawOfficialPOEs";
import { createCascadeEngine, type CascadeState } from "./mapbox/cascadeEngine";
import { createCorridorAnimator, type CorridorAnimState, type CorridorAnimator } from "./mapbox/corridorAnimator";
import { getTemporalRange, type EvidenceSignal, type TemporalRange } from "@/lib/temporalAdapter";
import { computeDrift, type DriftResult } from "./mapbox/driftEngine";
import { addDriftSources, addDriftLayers, updateDriftData, setDriftVisibility, DRIFT_LAYER_IDS } from "./mapbox/drawDriftLayers";
import type { Vec2 } from "./mapbox/driftMath";
import { getComputeScoresApiUrl, getPublicApiHeaders, isSupabaseFunctionUrl } from "@/lib/backendEndpoints";
import { supabase } from "@/integrations/supabase/client";

type BasemapMode = "custom" | "standard" | "standard-satellite";
type LightPreset = "day" | "dawn" | "dusk" | "night";
const PHANTOM_POE_PULSE_HZ = 0.9;
const PHANTOM_POE_BASE_RADIUS = 7;
const PHANTOM_POE_PULSE_RADIUS = 3;

function parseBasemapMode(value: string | undefined): BasemapMode {
  if (value === "standard" || value === "standard-satellite") return value;
  return "custom";
}

function parseLightPreset(value: string | undefined): LightPreset {
  if (value === "dawn" || value === "dusk" || value === "night") return value;
  return "day";
}

function parseOptionalBool(value: string | undefined): boolean | undefined {
  if (value == null || value === "") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function getBaseStyle(mode: BasemapMode): string | mapboxgl.StyleSpecification {
  if (mode === "standard") return "mapbox://styles/mapbox/standard";
  if (mode === "standard-satellite") return "mapbox://styles/mapbox/standard-satellite";

  return {
    version: 8 as const,
    name: "qgis2web export",
    pitch: 0,
    light: { intensity: 0.2 },
    sources: {
      GoogleSatelliteHybrid_0: {
        type: "raster" as const,
        tiles: ["https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"],
        tileSize: 256,
      },
      "mapbox-dem": {
        type: "raster-dem" as const,
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      },
      openmaptiles: {
        type: "vector" as const,
        url: "mapbox://mapbox.mapbox-streets-v8",
      },
    },
    terrain: {
      source: "mapbox-dem",
      exaggeration: 2,
    },
    sprite: "",
    glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
    layers: [
      {
        id: "background",
        type: "background" as const,
        layout: {},
        paint: { "background-color": "#ffffff" },
      },
      {
        id: "lyr_GoogleSatelliteHybrid_0_0",
        type: "raster" as const,
        source: "GoogleSatelliteHybrid_0",
      },
    ],
  };
}

async function getComputeScoresHeaders(url: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getPublicApiHeaders(),
  };

  if (isSupabaseFunctionUrl(url)) {
    const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
    if (apikey) headers.apikey = apikey;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  }

  return headers;
}

export function useMapboxMap(containerRef: React.RefObject<HTMLDivElement | null>) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [officialPOEsVisible, setOfficialPOEsVisible] = useState(true);
  const poesLoadedRef = useRef(false);

  const [corridorsMeta, setCorridorsMeta] = useState<CorridorMeta[]>([]);
  const [corridorsLoaded, setCorridorsLoaded] = useState(false);
  const [coverageStats, setCoverageStats] = useState<CoverageStats | null>(null);
  const [evidenceVisible, setEvidenceVisible] = useState(false);
  const [cascadeState, setCascadeState] = useState<CascadeState | null>(null);
  const [temporalRange, setTemporalRange] = useState<TemporalRange | null>(null);
  const [selectedCorridorId, setSelectedCorridorId] = useState<string | null>(null);
  const evidenceDataRef = useRef<EvidenceSignal[]>([]);
  const featureIdsRef = useRef<string[]>([]);
  const cascadeEngineRef = useRef<ReturnType<typeof createCascadeEngine> | null>(null);
  const corridorAnimRef = useRef<CorridorAnimator | null>(null);
  const [corridorAnimState, setCorridorAnimState] = useState<CorridorAnimState | null>(null);
  const phantomLayerIdsRef = useRef<string[]>([]);
  const [driftResult, setDriftResult] = useState<DriftResult | null>(null);
  const corridorGeoRef = useRef<Map<string, Vec2[]>>(new Map());
  const formalGeoRef = useRef<Vec2[][]>([]);

  // Layer visibility
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({
    corridors: true,
    borders: true,
    labels: true,
    officialPOEs: true,
    evidence: false,
  });

  // ── Initialize map ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let destroyed = false;
    const basemapMode = parseBasemapMode(import.meta.env.VITE_MAPBOX_BASEMAP);
    const isStandardBasemap = basemapMode !== "custom";

    if (!mapboxgl.supported({ failIfMajorPerformanceCaveat: false })) {
      console.error("[Mapbox] WebGL is not supported in this browser. Mapbox GL JS v3 requires WebGL2.");
      return;
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      accessToken: MAPBOX_TOKEN,
      style: getBaseStyle(basemapMode),
      center: [34.0, -1.5],
      zoom: 4,
      pitch: 45,
      bearing: 0,
      antialias: true,
      attributionControl: false,
      logoPosition: "bottom-left",
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");

    map.on("style.load", () => {
      if (!isStandardBasemap) return;

      const setBasemapConfig = (prop: string, value: string | boolean) => {
        try {
          map.setConfigProperty("basemap", prop, value);
        } catch {
          // Ignore unsupported keys for the active basemap style.
        }
      };

      const lightPreset = parseLightPreset(import.meta.env.VITE_MAPBOX_LIGHT_PRESET);
      setBasemapConfig("lightPreset", lightPreset);

      const theme = import.meta.env.VITE_MAPBOX_STANDARD_THEME;
      if (theme) {
        setBasemapConfig("theme", theme);
      }

      const font = import.meta.env.VITE_MAPBOX_STANDARD_FONT;
      if (font) {
        setBasemapConfig("font", font);
      }

      const showPoi = parseOptionalBool(import.meta.env.VITE_MAPBOX_SHOW_POI_LABELS);
      if (showPoi != null) {
        setBasemapConfig("showPointOfInterestLabels", showPoi);
      }

      const showRoad = parseOptionalBool(import.meta.env.VITE_MAPBOX_SHOW_ROAD_LABELS);
      if (showRoad != null) {
        setBasemapConfig("showRoadLabels", showRoad);
      }

      const showPlace = parseOptionalBool(import.meta.env.VITE_MAPBOX_SHOW_PLACE_LABELS);
      if (showPlace != null) {
        setBasemapConfig("showPlaceLabels", showPlace);
      }

      const showTransit = parseOptionalBool(import.meta.env.VITE_MAPBOX_SHOW_TRANSIT_LABELS);
      if (showTransit != null) {
        setBasemapConfig("showTransitLabels", showTransit);
      }

      const show3D = parseOptionalBool(import.meta.env.VITE_MAPBOX_SHOW_3D_OBJECTS);
      if (show3D != null) {
        setBasemapConfig("show3dObjects", show3D);
      }

      const showRoadsAndTransit = parseOptionalBool(import.meta.env.VITE_MAPBOX_SHOW_ROADS_AND_TRANSIT);
      if (showRoadsAndTransit != null) {
        setBasemapConfig("showRoadsAndTransit", showRoadsAndTransit);
      }

      const showPedestrianRoads = parseOptionalBool(import.meta.env.VITE_MAPBOX_SHOW_PEDESTRIAN_ROADS);
      if (showPedestrianRoads != null) {
        setBasemapConfig("showPedestrianRoads", showPedestrianRoads);
      }
    });

    map.on("load", () => {
      if (destroyed) return;

      if (!isStandardBasemap) {
        // 3D Buildings
        map.addLayer({
          id: "3d-buildings",
          source: "openmaptiles",
          "source-layer": "building",
          type: "fill-extrusion",
          minzoom: 15,
          filter: [
            "all",
            ["!=", ["get", "type"], "building:part"],
            ["==", ["get", "underground"], "false"],
          ],
          layout: { "fill-extrusion-edge-radius": 0.1 },
          paint: {
            "fill-extrusion-color": [
              "interpolate",
              ["linear"],
              ["get", "height"],
              0, "hsl(72, 89%, 67%)",
              2.5, "hsl(0, 92%, 54%)",
              3.3, "hsl(227, 90%, 59%)",
            ],
            "fill-extrusion-height": 3,
            "fill-extrusion-opacity": 0.75,
            "fill-extrusion-ambient-occlusion-intensity": 1,
            "fill-extrusion-ambient-occlusion-radius": 5,
          },
        });

        // Daylight sky
        map.addLayer({
          id: "sky",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun": [0, 0],
            "sky-atmosphere-sun-intensity": 15,
          },
        });
      }

      mapRef.current = map;
      setMapReady(true);
      console.log(`[Mapbox] Map loaded (${basemapMode})`);
    });

    return () => {
      destroyed = true;
      map.remove();
      mapRef.current = null;
    };
  }, [containerRef]);

  const getDrawContext = useCallback((): MapboxDrawContext | null => {
    const map = mapRef.current;
    if (!map) return null;
    return { map };
  }, []);

  // ── Load all data layers ──
  const loadAllLayers = useCallback(async () => {
    if (corridorsLoaded) return;
    const ctx = getDrawContext();
    if (!ctx) return;

    try {
      await drawBorders(ctx);
      await drawGeoLabels(ctx);
      const { meta, phantomLayerIds, coverageStats: stats } = await drawCorridors(ctx);
      setCorridorsMeta(meta);
      setCoverageStats(stats);

      phantomLayerIdsRef.current = phantomLayerIds;
      corridorAnimRef.current = createCorridorAnimator(ctx.map, phantomLayerIds, meta.map(m => ({ id: m.id, km: m.km, risk: m.risk })));

      const { data, featureIds } = await drawEvidenceLayer(ctx);
      evidenceDataRef.current = data;
      featureIdsRef.current = featureIds;
      setTemporalRange(getTemporalRange(data));

      cascadeEngineRef.current = createCascadeEngine(ctx.map, data, featureIds);

      // Cache corridor geometry for drift engine
      try {
        const pairedGeo = await (await fetch("/data/corridors_paired.geojson")).json();
        for (const f of pairedGeo.features) {
          const rt = f.properties?.route_type;
          const gt = f.geometry?.type;
          if (gt === "LineString" && rt === "PHANTOM") {
            const cid = f.properties?.id ?? "";
            corridorGeoRef.current.set(cid, f.geometry.coordinates as Vec2[]);
          } else if (gt === "LineString" && rt === "FORMAL") {
            formalGeoRef.current.push(f.geometry.coordinates as Vec2[]);
          }
        }
      } catch { /* geometry cache is best-effort */ }

      // Add drift sources + layers
      addDriftSources(ctx.map);
      addDriftLayers(ctx.map);
      setDriftVisibility(ctx.map, false);

      setCorridorsLoaded(true);
      console.log("[Mapbox] All layers loaded");
    } catch (err) {
      console.warn("[Mapbox] Failed to load layers:", err);
    }
  }, [corridorsLoaded, getDrawContext]);

  const loadOfficialPOEs = useCallback(async () => {
    if (poesLoadedRef.current) return;
    const ctx = getDrawContext();
    if (!ctx) return;
    poesLoadedRef.current = true;
    await drawOfficialPOEs(ctx);
  }, [getDrawContext]);

  // ── Camera ──
  const flyTo = useCallback((target: CameraTarget) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [target.lng, target.lat],
      zoom: Math.max(4, 16 - Math.log2(Math.max(1, target.alt / 1000))),
      bearing: target.heading,
      pitch: Math.abs(target.pitch),
      duration: 1800,
    });
  }, []);

  // ── Layer toggles ──
  const setLayerGroupVisibility = useCallback((layerIds: string[], visible: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    const vis = visible ? "visible" : "none";
    for (const id of layerIds) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", vis);
      }
    }
  }, []);

  const toggleEvidence = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const newVisible = !evidenceVisible;
    toggleEvidenceLayer(map, newVisible);
    setEvidenceVisible(newVisible);
    setLayerVisibility((prev) => ({ ...prev, evidence: newVisible }));
  }, [evidenceVisible]);

  const toggleLayer = useCallback((layerName: string) => {
    const newVisible = !layerVisibility[layerName];

    switch (layerName) {
      case "corridors":
        setLayerGroupVisibility(CORRIDOR_LAYER_IDS, newVisible);
        break;
      case "borders":
        setLayerGroupVisibility(BORDER_LAYER_IDS, newVisible);
        break;
      case "labels":
        setLayerGroupVisibility(LABEL_LAYER_IDS, newVisible);
        break;
      case "officialPOEs":
        setLayerGroupVisibility(POE_LAYER_IDS, newVisible);
        setOfficialPOEsVisible(newVisible);
        break;
      case "evidence":
        toggleEvidence();
        return;
      default:
        return;
    }

    setLayerVisibility((prev) => ({ ...prev, [layerName]: newVisible }));
  }, [layerVisibility, setLayerGroupVisibility, toggleEvidence]);

  // ── Cascade controls ──
  const startCascade = useCallback((corridorId: string) => {
    cascadeEngineRef.current?.start(corridorId, (s) => {
      setCascadeState({ ...s });
    });
  }, []);

  const scrubCascade = useCallback((corridorId: string, position: number) => {
    if (!corridorId) return;
    cascadeEngineRef.current?.seek(corridorId, position, (s) => {
      setCascadeState({ ...s });
    });
  }, []);

  const stopCascade = useCallback(() => {
    cascadeEngineRef.current?.stop();
    cascadeEngineRef.current?.hideAll();
    setCascadeState(null);
  }, []);

  // ── Map query (from chat/MCP) ──
  const handleMapQuery = useCallback((params: MapParams) => {
    if (params.camera) flyTo(params.camera);
  }, [flyTo]);

  // ── Drift engine controls ──
  const computeDriftForCorridor = useCallback(async (corridorId: string) => {
    const map = mapRef.current;
    if (!map) return;
    const coords = corridorGeoRef.current.get(corridorId);
    if (!coords || coords.length < 2) return;
    const meta = corridorsMeta.find((m) => m.id === corridorId);
    const risk = meta?.risk ?? "MODERATE";

    // Backend-first: compute and persist canonical drift from live DB signals.
    try {
      const url = getComputeScoresApiUrl();
      const response = await fetch(url, {
        method: "POST",
        headers: await getComputeScoresHeaders(url),
        body: JSON.stringify({
          corridorId,
          corridorCoords: coords,
          riskClass: risk,
          windowDays: 30,
        }),
      });
      const data = await response.json().catch(() => ({}));
      const error = response.ok ? null : { message: data?.error ?? `HTTP ${response.status}` };

      if (!error && data?.result?.driftField && data?.result?.futureCorridor) {
        const result = data.result as DriftResult;
        updateDriftData(map, result);
        setDriftVisibility(map, true);
        setDriftResult(result);
        return;
      }

      if (error) {
        console.warn("[Mapbox] compute-scores fallback:", error.message);
      }
    } catch (err) {
      console.warn("[Mapbox] compute-scores fallback:", err);
    }

    // Local fallback keeps UI usable before backend function is deployed.
    const result = computeDrift(corridorId, coords, evidenceDataRef.current, formalGeoRef.current, risk);

    updateDriftData(map, result);
    setDriftVisibility(map, true);
    setDriftResult(result);
  }, [corridorsMeta]);

  const clearDrift = useCallback(() => {
    const map = mapRef.current;
    if (map) {
      updateDriftData(map, null);
      setDriftVisibility(map, false);
    }
    setDriftResult(null);
  }, []);

  // ── Corridor animation controls ──
  const startCorridorAnim = useCallback(() => {
    corridorAnimRef.current?.start((s) => setCorridorAnimState({ ...s }));
  }, []);

  const stopCorridorAnim = useCallback(() => {
    corridorAnimRef.current?.stop();
    setCorridorAnimState(null);
  }, []);

  const seekCorridorAnim = useCallback((position: number) => {
    corridorAnimRef.current?.seek(position);
  }, []);

  // ── Click handler for corridor features ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      const queryLayers = [...phantomLayerIdsRef.current, "formal-routes-line"].filter(id => map.getLayer(id));
      if (queryLayers.length === 0) return;
      const features = map.queryRenderedFeatures(e.point, {
        layers: queryLayers,
      });
      if (features.length > 0) {
        const props = features[0].properties;
        const cid = props?.id ?? props?.corridor_id ?? null;
        if (cid) setSelectedCorridorId(cid);
      }
    };

    map.on("click", onClick);
    return () => { map.off("click", onClick); };
  }, [mapReady]);

  // ── Tooltip on hover ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: "320px",
      className: "corridor-tooltip",
    });

    const pointLayers = [
      "corridor-nodes-circle",
      "formal-gates-circle",
      "iom-fmps-circle",
      "phantom-poes-circle",
      "official-poes-circle",
    ];

    function buildTooltipHTML(props: Record<string, unknown>): string {
      const rt = props.route_type ?? props.type ?? "";
      const rows: string[] = [];

      if (props.name) rows.push(`<strong style="font-size:13px">${props.name}</strong>`);
      if (rt) rows.push(`<span style="color:#9CA3AF;font-size:10px;text-transform:uppercase;letter-spacing:0.05em">${rt}</span>`);
      if (props.risk_class) rows.push(`<span style="font-size:11px">Risk: <b>${props.risk_class}</b></span>`);
      if (props.composite_score != null) rows.push(`<span style="font-size:11px">Score: <b>${Number(props.composite_score).toFixed(1)}</b></span>`);
      if (props.distance_km != null) rows.push(`<span style="font-size:11px">Distance: <b>${Number(props.distance_km).toFixed(0)} km</b></span>`);
      if (props.mode) rows.push(`<span style="font-size:11px">Mode: ${props.mode}</span>`);
      if (props.description) rows.push(`<span style="font-size:10px;color:#9CA3AF;max-width:280px;display:block">${String(props.description).slice(0, 200)}</span>`);
      if (props.poe_type) rows.push(`<span style="font-size:11px">POE Type: ${props.poe_type}</span>`);
      if (props.country) rows.push(`<span style="font-size:11px">Country: ${props.country}</span>`);

      return `<div style="display:flex;flex-direction:column;gap:2px;padding:2px;font-family:monospace">${rows.join("")}</div>`;
    }

    const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
      const allLayers = [
        ...phantomLayerIdsRef.current,
        "formal-routes-line",
        ...pointLayers,
      ].filter(id => map.getLayer(id));

      if (allLayers.length === 0) return;

      const features = map.queryRenderedFeatures(e.point, { layers: allLayers });
      if (features.length > 0) {
        map.getCanvas().style.cursor = "pointer";
        const props = features[0].properties ?? {};
        popup.setLngLat(e.lngLat).setHTML(buildTooltipHTML(props)).addTo(map);
      } else {
        map.getCanvas().style.cursor = "";
        popup.remove();
      }
    };

    const onMouseLeave = () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    };

    map.on("mousemove", onMouseMove);
    map.on("mouseout", onMouseLeave);

    return () => {
      map.off("mousemove", onMouseMove);
      map.off("mouseout", onMouseLeave);
      popup.remove();
    };
  }, [mapReady]);

  // ── Auto-load layers ──
  useEffect(() => {
    if (mapReady && officialPOEsVisible) loadOfficialPOEs();
  }, [mapReady, officialPOEsVisible, loadOfficialPOEs]);

  useEffect(() => {
    if (mapReady) loadAllLayers();
  }, [mapReady, loadAllLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    let rafId = 0;
    const startedAt = performance.now();

    const animate = (now: number) => {
      const elapsedSec = (now - startedAt) / 1000;
      const pulse = (Math.sin(elapsedSec * PHANTOM_POE_PULSE_HZ * Math.PI * 2) + 1) / 2;
      const radius = PHANTOM_POE_BASE_RADIUS + pulse * PHANTOM_POE_PULSE_RADIUS;
      const strokeOpacity = 0.2 + pulse * 0.5;

      if (map.getLayer("phantom-poes-circle")) {
        map.setPaintProperty("phantom-poes-circle", "circle-radius", radius);
        map.setPaintProperty("phantom-poes-circle", "circle-stroke-opacity", strokeOpacity);
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [mapReady]);

  return {
    map: mapRef,
    mapReady,
    radarActive: false,
    monitoredId: null as string | null,
    officialPOEsVisible,
    setOfficialPOEsVisible,
    handleMapQuery,
    corridorsMeta,
    corridorsLoaded,
    coverageStats,
    evidenceVisible,
    toggleEvidence,
    cascadeState,
    temporalRange,
    scrubberPosition: cascadeState?.progress ?? 0,
    currentCascadeDate: cascadeState?.currentDate ?? temporalRange?.min ?? null,
    startCascade,
    scrubCascade,
    stopCascade,
    selectedCorridorId,
    setSelectedCorridorId,
    layerVisibility,
    toggleLayer,
    corridorAnimState,
    startCorridorAnim,
    stopCorridorAnim,
    seekCorridorAnim,
    driftResult,
    computeDriftForCorridor,
    clearDrift,
  };
}
