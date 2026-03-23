import { useRef, useEffect, useCallback, useState } from "react";
import * as Cesium from "cesium";
import type { MapParams, CesiumCameraTarget, CorridorTrack, RadarPulse, CorridorAnalysisResult } from "@/types/phantom";
import { supabase } from "@/integrations/supabase/client";
import type { CesiumDrawContext } from "./cesium/types";
import { T } from "./cesium/types";
import { drawCorridor } from "./cesium/drawCorridor";
import { drawRadar } from "./cesium/drawRadar";
import { drawAnalysis } from "./cesium/drawAnalysis";
import { drawOfficialPOEs } from "./cesium/drawOfficialPOEs";
import { drawGapZones } from "./cesium/drawGapZones";
import { drawAllCorridors, type CorridorMeta } from "./cesium/drawAllCorridors";
import { drawEvidenceLayer, toggleEvidenceEntities } from "./cesium/drawEvidenceLayer";
import { drawBorders } from "./cesium/drawBorders";
import { drawGeoLabels } from "./cesium/drawGeoLabels";
import { createCascadeEngine, type CascadeState } from "./cesium/cascadeEngine";
import type { EvidenceSignal } from "./cesium/drawEvidenceLayer";

export function useCesiumMap(containerRef: React.RefObject<HTMLDivElement | null>) {
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const entityIdsRef = useRef<string[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [radarActive, setRadarActive] = useState(false);
  const [monitoredId, setMonitoredId] = useState<string | null>(null);
  const [officialPOEsVisible, setOfficialPOEsVisible] = useState(true);
  const poesLoadedRef = useRef(false);

  const [corridorsMeta, setCorridorsMeta] = useState<CorridorMeta[]>([]);
  const [corridorsLoaded, setCorridorsLoaded] = useState(false);
  const [evidenceVisible, setEvidenceVisible] = useState(false);
  const [cascadeState, setCascadeState] = useState<CascadeState | null>(null);
  const [selectedCorridorId, setSelectedCorridorId] = useState<string | null>(null);
  const evidenceIdsRef = useRef<string[]>([]);
  const evidenceDataRef = useRef<EvidenceSignal[]>([]);
  const cascadeEngineRef = useRef<ReturnType<typeof createCascadeEngine> | null>(null);

  const addEntity = useCallback((id: string, options: Cesium.Entity.ConstructorOptions) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.entities.add({ id, ...options });
    entityIdsRef.current.push(id);
  }, []);

  const getDrawContext = useCallback((): CesiumDrawContext | null => {
    const viewer = viewerRef.current;
    if (!viewer) return null;
    return { viewer, entityIds: entityIdsRef.current, addEntity };
  }, [addEntity]);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;
    let destroyed = false;

    const init = async () => {
      let maptilerKey = "";
      try {
        const { data } = await supabase.functions.invoke("get-maptiler-key");
        maptilerKey = data?.key ?? "";
      } catch {
        console.warn("[Cesium] Could not fetch MapTiler key");
      }
      if (destroyed || !containerRef.current) return;

      const creditDiv = document.createElement("div");
      creditDiv.style.display = "none";
      document.body.appendChild(creditDiv);

      const viewer = new Cesium.Viewer(containerRef.current, {
        animation: false, baseLayerPicker: false, fullscreenButton: false,
        geocoder: false, homeButton: false, infoBox: true,
        sceneModePicker: false, selectionIndicator: true,
        timeline: false, navigationHelpButton: false,
        scene3DOnly: true, creditContainer: creditDiv,
        requestRenderMode: false, msaaSamples: 4,
      });

      viewer.imageryLayers.removeAll();

      if (maptilerKey) {
        viewer.imageryLayers.addImageryProvider(
          new Cesium.UrlTemplateImageryProvider({
            url: `https://api.maptiler.com/maps/satellite/{z}/{x}/{y}@2x.jpg?key=${maptilerKey}`,
            maximumLevel: 18,
            credit: new Cesium.Credit("© MapTiler · © OpenStreetMap"),
          })
        );
        Cesium.CesiumTerrainProvider.fromUrl(
          new Cesium.Resource({
            url: "https://api.maptiler.com/tiles/terrain-quantized-mesh-v2/",
            queryParameters: { key: maptilerKey },
          }),
          { requestVertexNormals: true }
        ).then((tp) => {
          if (viewer && !viewer.isDestroyed()) viewer.terrainProvider = tp;
        }).catch(() => {});
      }

      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString(T.bg);
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString(T.bg);
      viewer.scene.globe.enableLighting = false;
      viewer.scene.globe.showGroundAtmosphere = false;
      if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = false;
      if (viewer.scene.skyBox) viewer.scene.skyBox.show = false;
      if (viewer.scene.sun) viewer.scene.sun.show = false;
      if (viewer.scene.moon) viewer.scene.moon.show = false;

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(34.0, -1.5, 3_000_000),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-60), roll: 0 },
      });

      viewerRef.current = viewer;
      setMapReady(true);
    };

    init();

    return () => {
      destroyed = true;
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
      viewerRef.current = null;
    };
  }, [containerRef]);

  const clearEntities = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    for (const id of entityIdsRef.current) viewer.entities.removeById(id);
    entityIdsRef.current = [];
    setRadarActive(false);
    poesLoadedRef.current = false;
    setCorridorsLoaded(false);
    evidenceIdsRef.current = [];
    evidenceDataRef.current = [];
    cascadeEngineRef.current = null;
    setCascadeState(null);
    setEvidenceVisible(false);
  }, []);

  const flyTo = useCallback((target: CesiumCameraTarget) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(target.lng, target.lat, target.alt),
      orientation: {
        heading: Cesium.Math.toRadians(target.heading),
        pitch: Cesium.Math.toRadians(target.pitch),
        roll: 0,
      },
      duration: 1.8,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, []);

  const loadOfficialPOEs = useCallback(async () => {
    if (poesLoadedRef.current) return;
    const ctx = getDrawContext();
    if (!ctx) return;
    poesLoadedRef.current = true;
    await drawOfficialPOEs(ctx);
  }, [getDrawContext]);

  const loadGapZones = useCallback(async (corridorDefId: string) => {
    const ctx = getDrawContext();
    if (!ctx) return;
    await drawGapZones(ctx, corridorDefId);
  }, [getDrawContext]);

  // Unified load: corridors_paired.geojson renders PHANTOM + FORMAL + NODEs + GATES + FMPs + PHANTOM_POEs
  const loadAllCorridors = useCallback(async () => {
    if (corridorsLoaded) return;
    const ctx = getDrawContext();
    if (!ctx) return;

    try {
      const [meta] = await Promise.all([
        drawAllCorridors(ctx),
        drawBorders(ctx),
      ]);
      setCorridorsMeta(meta);

      const { data, entityIds } = await drawEvidenceLayer(ctx);
      evidenceIdsRef.current = entityIds;
      evidenceDataRef.current = data;

      const viewer = viewerRef.current;
      if (viewer) {
        cascadeEngineRef.current = createCascadeEngine(viewer, data, entityIds);
      }

      setCorridorsLoaded(true);
    } catch (err) {
      console.warn("[Cesium] Failed to load corridor data:", err);
    }
  }, [corridorsLoaded, getDrawContext]);

  const toggleEvidence = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const newVisible = !evidenceVisible;
    toggleEvidenceEntities(viewer, evidenceIdsRef.current, newVisible);
    setEvidenceVisible(newVisible);
  }, [evidenceVisible]);

  const startCascade = useCallback((corridorId: string) => {
    cascadeEngineRef.current?.start(corridorId, (s) => {
      setCascadeState({ ...s });
    });
  }, []);

  const stopCascade = useCallback(() => {
    cascadeEngineRef.current?.stop();
    cascadeEngineRef.current?.hideAll();
    setCascadeState(null);
  }, []);

  const handleMapQuery = useCallback((params: MapParams) => {
    const ctx = getDrawContext();
    if (!ctx) return;

    if (params.camera) flyTo(params.camera);

    if (params.corridor) {
      setMonitoredId(params.corridor.id);
      setRadarActive(true);
      drawCorridor(ctx, params.corridor);
    }

    if (params.radar) {
      setMonitoredId(params.radar.corridorId);
      setRadarActive(true);
      drawRadar(ctx, params.radar);
    }

    if (params.corridorAnalysis) {
      drawAnalysis(ctx, params.corridorAnalysis);
    }
  }, [flyTo, getDrawContext]);

  useEffect(() => {
    if (mapReady && officialPOEsVisible) {
      loadOfficialPOEs();
    }
  }, [mapReady, officialPOEsVisible, loadOfficialPOEs]);

  useEffect(() => {
    if (mapReady) {
      loadAllCorridors();
    }
  }, [mapReady, loadAllCorridors]);

  return {
    viewer: viewerRef,
    mapReady,
    radarActive,
    monitoredId,
    officialPOEsVisible,
    setOfficialPOEsVisible,
    clearEntities,
    handleMapQuery,
    loadGapZones,
    corridorsMeta,
    corridorsLoaded,
    evidenceVisible,
    toggleEvidence,
    cascadeState,
    startCascade,
    stopCascade,
    selectedCorridorId,
    setSelectedCorridorId,
  };
}
