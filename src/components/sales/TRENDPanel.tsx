import { useTrend } from "@/hooks/useTrend";
import { TrendingUp } from "lucide-react";

interface TRENDPanelProps {
  onSuggest: (tireId: string) => void;
}

export function TRENDPanel({ onSuggest }: TRENDPanelProps) {
  const { data: items = [] } = useTrend(30);

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-border p-3 bg-accent/20">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-4 h-4 text-emerald-500" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">TREND — ขายดี 30 วัน</p>
      </div>
      <div className="space-y-1">
        {items.slice(0, 5).map((item) => (
          <button
            key={item.tire_id}
            onClick={() => onSuggest(item.tire_id)}
            className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-accent transition-colors text-sm"
          >
            <span>{item.tire_name}</span>
            <span className="text-xs text-muted-foreground">{item.units_sold} เส้น</span>
          </button>
        ))}
      </div>
    </div>
  );
}
