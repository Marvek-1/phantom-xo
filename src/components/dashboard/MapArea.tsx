import { useRef, useState, useEffect } from "react";
import { Activity, Globe, Play, Square } from "lucide-react";
import { useMapboxMap } from "@/hooks/useMapboxMap";
import { MapLegend } from "./MapLegend";

interface MapAreaProps {
  onMapReady?: (handlers: ReturnType<typeof useMapboxMap>) => void;
}

const MapArea = ({ onMapReady }: MapAreaProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mb = useMapboxMap(containerRef);
  const [coords, setCoords] = useState({ lat: -1.5, lng: 34, zoom: 4 });

  // Notify parent when map is ready
  useEffect(() => {
    if (mb.mapReady && onMapReady) {
      onMapReady(mb);
    }
  }, [mb.mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live coordinate readout from camera
  useEffect(() => {
    const map = mb.map.current;
    if (!map || !mb.mapReady) return;

    const updateCoords = () => {
      const center = map.getCenter();
      setCoords({
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom(),
      });
    };

    map.on("moveend", updateCoords);
    updateCoords();

    return () => {
      map.off("moveend", updateCoords);
    };
  }, [mb.mapReady, mb.map]);

  return (
    <div className="absolute inset-0">
      {/* Mapbox mounts here */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading overlay */}
      {!mb.mapReady && (
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
                Initializing Map
              </p>
              <p className="text-[10px] font-mono text-muted-foreground mt-1 tracking-wider">
                Mapbox GL · Satellite · East Africa
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Legend overlay */}
      {mb.mapReady && (
        <MapLegend
          officialPOEsVisible={mb.officialPOEsVisible}
          onTogglePOEs={mb.setOfficialPOEsVisible}
          corridorsMeta={mb.corridorsMeta}
          corridorsLoaded={mb.corridorsLoaded}
          coverageStats={mb.coverageStats}
          evidenceVisible={mb.evidenceVisible}
          onToggleEvidence={mb.toggleEvidence}
          cascadeActive={mb.cascadeState?.active ?? false}
          onStartCascade={mb.startCascade}
          onScrub={mb.scrubCascade}
          onStopCascade={mb.stopCascade}
          scrubberPosition={mb.scrubberPosition}
          currentDate={mb.currentCascadeDate}
          temporalRange={mb.temporalRange}
          layerVisibility={mb.layerVisibility}
          onToggleLayer={mb.toggleLayer}
          selectedCorridorId={mb.selectedCorridorId}
          driftResult={mb.driftResult}
          onComputeDrift={mb.computeDriftForCorridor}
          onClearDrift={mb.clearDrift}
        />
      )}

      {/* Cascade HUD */}
      {mb.cascadeState?.active && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 animate-fade-in-up">
          <div className="bg-card/90 border border-phantom-green/30 rounded-lg backdrop-blur-sm px-5 py-3 flex items-center gap-6">
            <div className="text-center">
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Day</p>
              <p className="text-lg font-mono text-phantom-green tabular-nums">
                {mb.cascadeState.day}
              </p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Signals</p>
              <p className="text-lg font-mono text-foreground tabular-nums">
                {mb.cascadeState.signalsRevealed}
              </p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Score</p>
              <p className="text-lg font-mono text-phantom-amber tabular-nums">
                {mb.cascadeState.cumulativeScore.toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Corridor animation time display */}
      {mb.mapReady && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10">
          {mb.corridorAnimState?.active ? (
            <div className="bg-card/90 border border-phantom-green/30 rounded-lg backdrop-blur-sm px-5 py-3 flex flex-col gap-2 animate-fade-in-up min-w-[360px]">
              <div className="flex items-center gap-3">
                <button
                  title="Stop animation"
                  onClick={mb.stopCorridorAnim}
                  className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center hover:bg-red-500/30 transition-colors shrink-0"
                >
                  <Square className="w-2.5 h-2.5 text-red-400" />
                </button>
                <p className="text-sm font-mono text-phantom-green tabular-nums flex-1">
                  {mb.corridorAnimState.dateLabel}
                </p>
                <p className="text-sm font-mono text-phantom-green/70 tabular-nums">
                  {Math.round(mb.corridorAnimState.progress * 100)}%
                </p>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 via-lime-400 via-yellow-400 to-red-500 rounded-full transition-all duration-100"
                  style={{ width: `${(mb.corridorAnimState.progress * 100).toFixed(1)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                <span className="tabular-nums">{mb.corridorAnimState.dayLabel}</span>
                <span className="text-phantom-green/50">·</span>
                <span className="tabular-nums">{mb.corridorAnimState.weekLabel}</span>
                <span className="text-phantom-green/50">·</span>
                <span className="tabular-nums">{mb.corridorAnimState.monthLabel}</span>
                <span className="text-phantom-green/50">·</span>
                <span className="tabular-nums">{mb.corridorAnimState.year}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={mb.startCorridorAnim}
              className="bg-card/80 border border-phantom-green/20 rounded-lg backdrop-blur-sm px-4 py-2 flex items-center gap-2 hover:border-phantom-green/50 hover:bg-card/95 transition-all group"
            >
              <Play className="w-3.5 h-3.5 text-phantom-green/60 group-hover:text-phantom-green transition-colors" />
              <span className="text-[10px] font-mono text-phantom-green/60 group-hover:text-phantom-green/90 uppercase tracking-wider transition-colors">
                Animate Corridors
              </span>
            </button>
          )}
        </div>
      )}

      {/* Live coordinate readout */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 text-[10px] font-mono text-muted-foreground/60 tabular-nums">
        <span>LAT {coords.lat.toFixed(4)}</span>
        <span>LNG {coords.lng.toFixed(4)}</span>
        <span>Z {coords.zoom.toFixed(1)}</span>
      </div>
    </div>
  );
};

export { MapArea };
