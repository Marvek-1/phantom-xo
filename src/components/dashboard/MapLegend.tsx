import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface LegendItem {
  color: string;
  shape: "circle" | "diamond" | "line" | "dash" | "zone";
  label: string;
  pulse?: boolean;
}

const items: LegendItem[] = [
  { color: "hsl(var(--phantom-blue))", shape: "diamond", label: "Official POE" },
  { color: "hsl(var(--phantom-green))", shape: "line", label: "Phantom Corridor" },
  { color: "hsl(var(--phantom-amber))", shape: "dash", label: "Inferred Path" },
  { color: "hsl(var(--phantom-amber))", shape: "circle", label: "Phantom POE", pulse: true },
  { color: "hsl(var(--phantom-teal))", shape: "circle", label: "Settlement" },
  { color: "hsl(var(--phantom-red))", shape: "zone", label: "Gap Zone" },
  { color: "hsl(48 100% 50%)", shape: "circle", label: "Belief Circle" },
];

function ShapeIcon({ item }: { item: LegendItem }) {
  const base = "inline-block flex-shrink-0";

  switch (item.shape) {
    case "diamond":
      return (
        <span
          className={`${base} w-2.5 h-2.5 rotate-45`}
          style={{ backgroundColor: item.color }}
        />
      );
    case "circle":
      return (
        <span
          className={`${base} w-2.5 h-2.5 rounded-full ${item.pulse ? "animate-pulse" : ""}`}
          style={{ backgroundColor: item.color }}
        />
      );
    case "line":
      return (
        <span
          className={`${base} w-5 h-0.5 rounded-full`}
          style={{ backgroundColor: item.color }}
        />
      );
    case "dash":
      return (
        <span className={`${base} flex items-center gap-0.5`}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1 h-0.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
          ))}
        </span>
      );
    case "zone":
      return (
        <span
          className={`${base} w-5 h-2.5 rounded-sm`}
          style={{ backgroundColor: item.color, opacity: 0.25 }}
        />
      );
  }
}

interface MapLegendProps {
  officialPOEsVisible: boolean;
  onTogglePOEs: (visible: boolean) => void;
}

const MapLegend = ({ officialPOEsVisible, onTogglePOEs }: MapLegendProps) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="absolute bottom-4 right-4 z-10 animate-fade-in-up">
      <div className="bg-card/90 border border-border rounded-lg backdrop-blur-sm overflow-hidden min-w-[160px]">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        >
          <span>Legend</span>
          {expanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronUp className="w-3 h-3" />
          )}
        </button>

        {expanded && (
          <div className="px-3 pb-2.5 space-y-1.5 border-t border-border pt-2">
            {items.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-[10px] font-mono text-foreground/80"
              >
                <ShapeIcon item={item} />
                <span>{item.label}</span>
              </div>
            ))}

            {/* POE layer toggle */}
            <div className="pt-1.5 mt-1.5 border-t border-border">
              <label className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={officialPOEsVisible}
                  onChange={(e) => onTogglePOEs(e.target.checked)}
                  className="w-3 h-3 rounded border-border accent-[hsl(var(--phantom-blue))]"
                />
                <span>Show Official POEs</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { MapLegend };
