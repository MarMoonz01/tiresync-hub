import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStockLookup } from "@/hooks/useStockLookup";
import { Search, AlertTriangle } from "lucide-react";

export default function Stock() {
  const [search, setSearch] = useState("");
  const { data: items = [], isLoading } = useStockLookup(search);

  const lowCount = items.filter((i) => i.quantity <= i.min_threshold).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 md:px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">สต็อกยาง</h1>
        {lowCount > 0 && (
          <div className="flex items-center gap-1 text-amber-600 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {lowCount} รายการสต็อกต่ำ
          </div>
        )}
      </header>

      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="ค้นหา เช่น Bridgestone, 195/65R15"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading && <p className="text-center text-muted-foreground py-8">กำลังโหลด...</p>}

        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">ยาง</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">ขนาด</th>
                <th className="text-right px-4 py-3 font-medium">ราคาขาย</th>
                <th className="text-right px-4 py-3 font-medium">คงเหลือ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => {
                const isLow = item.quantity <= item.min_threshold;
                return (
                  <tr key={item.id} className={isLow ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.brand} {item.model}</p>
                      <p className="text-xs text-muted-foreground md:hidden">{item.size}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{item.size}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">
                      ฿{item.sell_price.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                        <Badge variant={item.quantity > 0 ? "outline" : "destructive"}>
                          {item.quantity}
                        </Badge>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    ไม่พบยาง
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
