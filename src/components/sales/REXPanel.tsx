import { useREX } from "@/hooks/useREX";
import { Badge } from "@/components/ui/badge";
import { Car } from "lucide-react";

interface REXPanelProps {
  carModel: string;
  onSuggest: (tireId: string) => void;
}

export function REXPanel({ carModel, onSuggest }: REXPanelProps) {
  const { data: suggestions = [] } = useREX(carModel);

  if (!carModel.trim() || suggestions.length === 0) return null;

  return (
    <div className="rounded-lg border border-border p-3 bg-accent/30">
      <div className="flex items-center gap-2 mb-2">
        <Car className="w-4 h-4 text-primary" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">REX — ยางที่เคยติด {carModel}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s.tire_id}
            onClick={() => onSuggest(s.tire_id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background border border-border hover:border-primary transition-colors text-sm"
          >
            {s.tire_name}
            <Badge variant="secondary" className="text-[10px]">{s.sale_count}x</Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
