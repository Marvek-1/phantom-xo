import { useRef, useState, useEffect } from "react";
import { Activity, Globe } from "lucide-react";
import * as Cesium from "cesium";
import { useCesiumMap } from "@/hooks/useCesiumMap";
import { MapLegend } from "./MapLegend";

interface MapAreaProps {
  onMapReady?: (handlers: ReturnType<typeof useCesiumMap>) => void;
}

const MapArea = ({ onMapReady }: MapAreaProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cesium = useCesiumMap(containerRef);
  const [coords, setCoords] = useState({ lat: -1.5, lng: 34.0, alt: 3000 });

  // Notify parent when map is ready
  useEffect(() => {
    if (cesium.mapReady && onMapReady) {
      onMapReady(cesium);
    }
  }, [cesium.mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click handler for corridor entities
  useEffect(() => {
    const viewer = cesium.viewer.current;
    if (!viewer || viewer.isDestroyed()) return;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
      const picked = viewer.scene.pick(click.position);
      if (!Cesium.defined(picked) || !picked.id) return;

      const entityId = typeof picked.id === "string" ? picked.id : picked.id.id;
      if (typeof entityId !== "string") return;

      // Match corridor spine entities: corr-{ID}-spine
      const spineMatch = entityId.match(/^corr-(.+)-(?:spine|dash|glow)$/);
      if (spineMatch) {
        cesium.setSelectedCorridorId(spineMatch[1]);
        return;
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => handler.destroy();
  }, [cesium.mapReady, cesium.viewer, cesium.setSelectedCorridorId]);

  // Live coordinate readout from camera
  useEffect(() => {
    const viewer = cesium.viewer.current;
    if (!viewer || viewer.isDestroyed()) return;

    const updateCoords = () => {
      if (viewer.isDestroyed()) return;
      const carto = viewer.camera.positionCartographic;
      setCoords({
        lat: Cesium.Math.toDegrees(carto.latitude),
        lng: Cesium.Math.toDegrees(carto.longitude),
        alt: carto.height,
      });
    };

    const removeListener = viewer.camera.changed.addEventListener(updateCoords);
    viewer.camera.percentageChanged = 0.01;
    updateCoords();

    return () => {
      if (!viewer.isDestroyed()) removeListener();
    };
  }, [cesium.mapReady, cesium.viewer]);

  const formatAlt = (alt: number) => {
    if (alt >= 1000) return `${(alt / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} km`;
    return `${alt.toFixed(0)} m`;
  };

  return (
    <div className="absolute inset-0">
      {/* Cesium mounts here */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading overlay */}
      {!cesium.mapReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(hsl(var(--phantom-green) / 0.3) 1px, transparent 1px),
                linear-gradient(90deg, hsl(var(--phantom-green) / 0.3) 1px, transparent 1px)
              `,
              backgroundSize: "60px 60px",
            }}
          />
          <div className="relative z-10 flex flex-col items-center gap-4 animate-fade-in-up">
            <div className="relative">
              <Globe className="w-16 h-16 text-phantom-green/20" strokeWidth={0.8} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity className="w-6 h-6 text-phantom-green/50" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-mono text-phantom-green/60 tracking-[0.3em] uppercase">
                Initializing 3D Globe
              </p>
              <p className="text-[10px] font-mono text-muted-foreground mt-1 tracking-wider">
                CesiumJS · MapTiler · East Africa
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Legend overlay */}
      {cesium.mapReady && (
        <MapLegend
          officialPOEsVisible={cesium.officialPOEsVisible}
          onTogglePOEs={cesium.setOfficialPOEsVisible}
          corridorsMeta={cesium.corridorsMeta}
          corridorsLoaded={cesium.corridorsLoaded}
          evidenceVisible={cesium.evidenceVisible}
          onToggleEvidence={cesium.toggleEvidence}
          cascadeActive={cesium.cascadeState?.active ?? false}
          onStartCascade={cesium.startCascade}
          onStopCascade={cesium.stopCascade}
          crossingPointCount={cesium.crossingPoints.length}
        />
      )}

      {/* Cascade HUD */}
      {cesium.cascadeState?.active && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 animate-fade-in-up">
          <div className="bg-card/90 border border-phantom-green/30 rounded-lg backdrop-blur-sm px-5 py-3 flex items-center gap-6">
            <div className="text-center">
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Day</p>
              <p className="text-lg font-mono text-phantom-green tabular-nums">
                {cesium.cascadeState.day}
              </p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Signals</p>
              <p className="text-lg font-mono text-foreground tabular-nums">
                {cesium.cascadeState.signalsRevealed}
              </p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Score</p>
              <p className="text-lg font-mono text-phantom-amber tabular-nums">
                {cesium.cascadeState.cumulativeScore.toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Live coordinate readout */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 text-[10px] font-mono text-muted-foreground/60 tabular-nums">
        <span>LAT {coords.lat.toFixed(4)}</span>
        <span>LNG {coords.lng.toFixed(4)}</span>
        <span>ALT {formatAlt(coords.alt)}</span>
      </div>
    </div>
  );
};

export { MapArea };
