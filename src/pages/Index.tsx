import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MapArea } from "@/components/dashboard/MapArea";
import { ChatPanel } from "@/components/dashboard/ChatPanel";
import { CorridorOverlay } from "@/components/dashboard/CorridorOverlay";
import { RadarIndicator } from "@/components/dashboard/RadarIndicator";
import { SignalBadge } from "@/components/dashboard/SignalBadge";

const Index = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [radarActive] = useState(false);
  const [monitoredId] = useState<string | null>(null);
  const [corridorAnalysis] = useState<any>(null);
  const [signalData] = useState<any>(null);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Map + overlays area */}
      <div className="relative flex-1 flex flex-col min-w-0">
        <DashboardHeader />

        <div className="relative flex-1">
          <MapArea />

          {radarActive && (
            <RadarIndicator monitoredId={monitoredId} />
          )}

          {corridorAnalysis && (
            <CorridorOverlay analysis={corridorAnalysis} />
          )}

          {signalData && (
            <SignalBadge data={signalData} />
          )}
        </div>
      </div>

      {/* Chat sidebar */}
      <ChatPanel
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
    </div>
  );
};

export default Index;
