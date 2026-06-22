import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useStockLookup, StockItem } from "@/hooks/useStockLookup";
import { Search, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockTableProps {
  onSelect: (item: StockItem) => void;
  selectedId?: string;
}

const baht = (n: number) => "฿" + (n ?? 0).toLocaleString("en-US");

export function StockTable({ onSelect, selectedId }: StockTableProps) {
  const [search, setSearch] = useState("");
  const { data: items = [], isLoading } = useStockLookup(search);

  return (
    <div className="flex flex-col h-full rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 rounded-xl bg-secondary/60"
            placeholder="ค้นหายาง เช่น Bridgestone, 195/65R15"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {isLoading && <div className="p-5 text-center text-sm text-muted-foreground">กำลังโหลด...</div>}
        {!isLoading && items.length === 0 && <div className="p-5 text-center text-sm text-muted-foreground">ไม่พบยาง</div>}
        {items.map((item) => {
          const isLow = item.quantity <= item.min_threshold;
          const isSelected = item.id === selectedId;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className={cn(
                "w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-l-[3px]",
                isSelected ? "bg-primary/5 border-primary" : "border-transparent hover:bg-secondary/50"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{item.brand} {item.model}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{item.size} · {item.quantity} เส้น</p>
              </div>
              {isLow && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" /> ใกล้หมด
                </span>
              )}
              <span className="text-sm font-bold tabular-nums shrink-0">{baht(item.sell_price)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
