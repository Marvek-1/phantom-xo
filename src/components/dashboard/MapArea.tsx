import { useRef } from "react";
import { Activity, Globe } from "lucide-react";
import { useCesiumMap } from "@/hooks/useCesiumMap";

interface MapAreaProps {
  onMapReady?: (handlers: ReturnType<typeof useCesiumMap>) => void;
}

const MapArea = ({ onMapReady }: MapAreaProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cesium = useCesiumMap(containerRef);

  // Notify parent when map is ready
  if (cesium.mapReady && onMapReady) {
    onMapReady(cesium);
  }

  return (
    <div className="absolute inset-0">
      {/* Cesium mounts here */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading overlay — shown until Cesium renders */}
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

      {/* Coordinate readout */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 text-[10px] font-mono text-muted-foreground/60">
        <span>LAT -1.5000</span>
        <span>LNG 34.0000</span>
        <span>ALT 3,000 km</span>
      </div>
    </div>
  );
};

export { MapArea };
