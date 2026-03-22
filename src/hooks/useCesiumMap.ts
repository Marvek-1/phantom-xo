import { useRef, useEffect, useCallback, useState } from "react";
import * as Cesium from "cesium";
import type { MapParams, CesiumCameraTarget, CorridorTrack, RadarPulse, CorridorAnalysisResult } from "@/types/phantom";
import { supabase } from "@/integrations/supabase/client";

const T = {
  bg: "#070A10",
  green: "#00E87A",
  amber: "#F5A623",
  red: "#FF453A",
  blue: "#009ADE",
  teal: "#3DD9C4",
};

export function useCesiumMap(containerRef: React.RefObject<HTMLDivElement | null>) {
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const entityIdsRef = useRef<string[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [radarActive, setRadarActive] = useState(false);
  const [monitoredId, setMonitoredId] = useState<string | null>(null);

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
        geocoder: false, homeButton: false, infoBox: false,
        sceneModePicker: false, selectionIndicator: false,
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
  }, []);

  const addEntity = useCallback((id: string, options: Cesium.Entity.ConstructorOptions) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.entities.add({ id, ...options });
    entityIdsRef.current.push(id);
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

  const drawCorridor = useCallback((corridor: CorridorTrack) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    setMonitoredId(corridor.id);
    setRadarActive(true);

    const positions = corridor.pathCoords
      ? Cesium.Cartesian3.fromDegreesArray(corridor.pathCoords.flatMap((p) => [p.lng, p.lat]))
      : Cesium.Cartesian3.fromDegreesArray([corridor.startLng, corridor.startLat, corridor.endLng, corridor.endLat]);

    addEntity(`${corridor.id}-glow`, {
      polyline: { positions, clampToGround: true, width: 20, material: Cesium.Color.fromCssColorString(T.green).withAlpha(0.1) },
    });
    addEntity(`${corridor.id}-dash`, {
      polyline: {
        positions, clampToGround: true, width: 5,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.fromCssColorString(T.green).withAlpha(0.7), dashLength: 20, dashPattern: 255,
        }),
      },
    });
    addEntity(`${corridor.id}-spine`, {
      polyline: { positions, clampToGround: true, width: 3, material: Cesium.Color.fromCssColorString(T.green) },
    });

    const markers: Array<[number, number, string, string]> = [
      [corridor.startLat, corridor.startLng, "START", T.green],
      [corridor.endLat, corridor.endLng, "END", T.red],
    ];
    for (const [lat, lng, label, color] of markers) {
      addEntity(`${corridor.id}-marker-${label}`, {
        position: Cesium.Cartesian3.fromDegrees(lng, lat),
        point: {
          pixelSize: 10, color: Cesium.Color.fromCssColorString(color),
          outlineColor: Cesium.Color.fromCssColorString(T.bg), outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        label: {
          text: label, font: '11px "IBM Plex Mono",monospace',
          fillColor: Cesium.Color.fromCssColorString(color),
          outlineColor: Cesium.Color.fromCssColorString(T.bg), outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          pixelOffset: new Cesium.Cartesian2(0, -16),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }
  }, [addEntity]);

  const drawRadar = useCallback((radar: RadarPulse) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    setMonitoredId(radar.corridorId);
    setRadarActive(true);

    for (let ring = 0; ring < 3; ring++) {
      const ringId = `${radar.corridorId}-radar-${ring}`;
      const coords = new Cesium.CallbackProperty(() => {
        const t = Date.now() / 1000;
        const radius = ((t + ring * 0.4) % 1.2) * 0.006;
        const segs = 48;
        const pts: Cesium.Cartesian3[] = [];
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          pts.push(Cesium.Cartesian3.fromDegrees(radar.lng + Math.cos(a) * radius, radar.lat + Math.sin(a) * radius));
        }
        return pts;
      }, false);
      addEntity(ringId, {
        polyline: { positions: coords, clampToGround: true, width: 2, material: Cesium.Color.fromCssColorString(T.green).withAlpha(0.7) },
      });
    }
  }, [addEntity]);

  const drawAnalysis = useCallback((analysis: CorridorAnalysisResult) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (analysis.inferredPath?.coordinates) {
      addEntity(`${analysis.id}-inferred-path`, {
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray(analysis.inferredPath.coordinates.flatMap((c) => [c.lng, c.lat])),
          clampToGround: true, width: 5,
          material: Cesium.Color.fromCssColorString(T.amber).withAlpha(0.9),
        },
      });
    }

    for (const node of analysis.nodes ?? []) {
      const nc = node.type === "PHANTOM_POE" ? T.amber : T.blue;
      addEntity(`${analysis.id}-node-${node.id}`, {
        position: Cesium.Cartesian3.fromDegrees(node.lng, node.lat),
        point: {
          pixelSize: node.type === "PHANTOM_POE" ? 13 : 9,
          color: Cesium.Color.fromCssColorString(nc),
          outlineColor: Cesium.Color.fromCssColorString(T.bg), outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        label: {
          text: node.name, font: '11px "IBM Plex Mono",monospace',
          fillColor: Cesium.Color.fromCssColorString(nc),
          outlineColor: Cesium.Color.fromCssColorString(T.bg), outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          pixelOffset: new Cesium.Cartesian2(0, -16),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }

    if (analysis.locationBeliefs) {
      for (const [bId, belief] of Object.entries(analysis.locationBeliefs)) {
        const radius = belief.radiusM / 111320;
        const segs = 32;
        const pts: number[] = [];
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          pts.push(belief.center.lng + Math.cos(a) * radius, belief.center.lat + Math.sin(a) * radius);
        }
        addEntity(`belief-${bId}`, {
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(pts),
            clampToGround: true, width: 2,
            material: Cesium.Color.YELLOW.withAlpha(belief.confidence ?? 0.5),
          },
        });
      }
    }
  }, [addEntity]);

  const handleMapQuery = useCallback((params: MapParams) => {
    if (params.camera) flyTo(params.camera);
    if (params.corridor) drawCorridor(params.corridor);
    if (params.radar) drawRadar(params.radar);
    if (params.corridorAnalysis) drawAnalysis(params.corridorAnalysis);
  }, [flyTo, drawCorridor, drawRadar, drawAnalysis]);

  return { viewer: viewerRef, mapReady, radarActive, monitoredId, clearEntities, handleMapQuery };
}
