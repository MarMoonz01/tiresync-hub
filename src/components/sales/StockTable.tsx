import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStockLookup, StockItem } from "@/hooks/useStockLookup";
import { Search, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockTableProps {
  onSelect: (item: StockItem) => void;
  selectedId?: string;
}

export function StockTable({ onSelect, selectedId }: StockTableProps) {
  const [search, setSearch] = useState("");
  const { data: items = [], isLoading } = useStockLookup(search);

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="ค้นหายาง เช่น Bridgestone, 195/65R15"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border border-border divide-y divide-border">
        {isLoading && (
          <div className="p-4 text-center text-sm text-muted-foreground">กำลังโหลด...</div>
        )}
        {!isLoading && items.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">ไม่พบยาง</div>
        )}
        {items.map((item) => {
          const isLow = item.quantity <= item.min_threshold;
          const isSelected = item.id === selectedId;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className={cn(
                "w-full text-left px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors",
                isSelected && "bg-primary/5 border-l-2 border-primary"
              )}
            >
              <div>
                <p className="font-medium text-sm">{item.brand} {item.model}</p>
                <p className="text-xs text-muted-foreground">{item.size}</p>
              </div>
              <div className="flex items-center gap-2">
                {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                <Badge variant={item.quantity > 0 ? "outline" : "destructive"} className="text-xs">
                  {item.quantity} เส้น
                </Badge>
                <span className="text-sm font-semibold text-primary">
                  ฿{item.sell_price.toLocaleString()}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
