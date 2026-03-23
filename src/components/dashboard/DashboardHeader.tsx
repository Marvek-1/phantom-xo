import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";

const DashboardHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/80 backdrop-blur-sm z-10">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <span className="text-phantom-green font-mono text-lg font-bold tracking-tight glow-green-text select-none">
            ◉⟁⬡
          </span>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-foreground leading-none">
              PHANTOM POE ENGINE
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground tracking-widest mt-0.5">
              Corridor Intelligence · mo-border-phantom-001
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/command-center")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-secondary/50 border border-border text-[10px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          <Shield className="w-3 h-3" />
          Command Center
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-secondary border border-border">
          <span className="w-1.5 h-1.5 rounded-full bg-phantom-green animate-pulse" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            Live
          </span>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground tabular-nums">
          {new Date().toISOString().slice(0, 19).replace("T", " ")} UTC
        </div>
      </div>
    </header>
  );
};

export { DashboardHeader };
