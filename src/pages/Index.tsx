import { useState, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MapArea } from "@/components/dashboard/MapArea";
import { ChatPanel } from "@/components/dashboard/ChatPanel";
import { CorridorOverlay } from "@/components/dashboard/CorridorOverlay";
import { RadarIndicator } from "@/components/dashboard/RadarIndicator";
import { SignalBadge } from "@/components/dashboard/SignalBadge";
import { CorridorDetailSidebar } from "@/components/dashboard/CorridorDetailSidebar";
import type { CorridorAnalysisResult, SignalSummary, MapParams } from "@/types/phantom";
import type { useCesiumMap } from "@/hooks/useCesiumMap";

const Index = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [radarActive, setRadarActive] = useState(false);
  const [monitoredId, setMonitoredId] = useState<string | null>(null);
  const [corridorAnalysis, setCorridorAnalysis] = useState<CorridorAnalysisResult | null>(null);
  const [signalData, setSignalData] = useState<SignalSummary | null>(null);
  const [mapHandlers, setMapHandlers] = useState<ReturnType<typeof useCesiumMap> | null>(null);

  const handleMapReady = useCallback((handlers: ReturnType<typeof useCesiumMap>) => {
    setMapHandlers(handlers);
  }, []);

  // Central dispatch for map commands from MCP/chat
  const handleMapQuery = useCallback(
    (params: MapParams) => {
      if (mapHandlers) {
        mapHandlers.handleMapQuery(params);
        if (params.radar || params.corridor) {
          setRadarActive(true);
          setMonitoredId(params.radar?.corridorId ?? params.corridor?.id ?? null);
        }
      }
      if (params.corridorAnalysis) {
        setCorridorAnalysis(params.corridorAnalysis);
        if (mapHandlers) {
          mapHandlers.loadGapZones(params.corridorAnalysis.id);
        }
      }
      if (params.signals) setSignalData(params.signals);
    },
    [mapHandlers]
  );

  const selectedCorridor = mapHandlers?.selectedCorridorId
    ? mapHandlers.corridorsMeta.find((c) => c.id === mapHandlers.selectedCorridorId) ?? null
    : null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Map + overlays */}
      <div className="relative flex-1 flex flex-col min-w-0">
        <DashboardHeader />

        <div className="relative flex-1">
          <MapArea onMapReady={handleMapReady} />

          {/* Corridor detail sidebar */}
          {selectedCorridor && mapHandlers && (
            <CorridorDetailSidebar
              corridor={selectedCorridor}
              onClose={() => mapHandlers.setSelectedCorridorId(null)}
            />
          )}

          {radarActive && <RadarIndicator monitoredId={monitoredId} />}
          {corridorAnalysis && <CorridorOverlay analysis={corridorAnalysis} />}
          {signalData && <SignalBadge data={signalData} />}
        </div>
      </div>

      {/* Chat sidebar */}
      <ChatPanel
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onMapQuery={handleMapQuery}
      />
    </div>
  );
};

export default Index;
