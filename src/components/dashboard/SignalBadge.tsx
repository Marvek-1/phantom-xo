interface SignalBadgeProps {
  data: {
    source: string;
    count: number;
    status: string;
  };
}

const SignalBadge = ({ data }: SignalBadgeProps) => {
  return (
    <div className="absolute bottom-4 right-4 z-10 animate-fade-in-up">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-card/90 border border-border backdrop-blur-sm">
        <span className="text-sm font-mono text-phantom-blue font-semibold">{data.source}</span>
        <span className="text-sm font-mono text-muted-foreground tabular-nums">
          {data.count.toLocaleString()} signals
        </span>
        <span className="text-sm font-mono text-phantom-green">{data.status}</span>
      </div>
    </div>
  );
};

export { SignalBadge };
