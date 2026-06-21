import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Search, Package, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { StockUploadDialog } from "@/components/inventory/StockUploadDialog";

interface OwnerTireView {
  id: string;
  brand: string;
  model: string;
  size: string;
  quantity: number;
  sell_price: number;
  avg_cost: number | null;
  min_threshold: number;
  supplier: string | null;
  last_sold_at: string | null;
  is_active: boolean;
}

function marginPct(sell: number, cost: number | null) {
  if (!cost || cost === 0) return null;
  return (((sell - cost) / sell) * 100).toFixed(1);
}

export default function StockManagement() {
  const { store } = useAuth();
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: tires = [], isLoading } = useQuery<OwnerTireView[]>({
    queryKey: ["owner-stock", store?.id, debouncedSearch],
    queryFn: async () => {
      if (!store?.id) return [];

      let query = supabase
        .from("tires_owner_view")
        .select("id, brand, model, size, quantity, sell_price, avg_cost, min_threshold, supplier, last_sold_at, is_active")
        .eq("store_id", store.id)
        .order("brand");

      if (debouncedSearch.trim()) {
        const term = `%${debouncedSearch.trim()}%`;
        query = query.or(`brand.ilike.${term},model.ilike.${term},size.ilike.${term}`);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return (data ?? []) as OwnerTireView[];
    },
    enabled: !!store?.id,
    staleTime: 30_000,
  });

  const lowCount = tires.filter((t) => t.quantity <= t.min_threshold).length;

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 md:px-6 py-4 flex items-center gap-3">
        <Package className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">จัดการสต็อก</h1>
        <div className="flex items-center gap-3 ml-auto">
          {lowCount > 0 && (
            <div className="flex items-center gap-1 text-amber-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {lowCount} รายการสต็อกต่ำ
            </div>
          )}
          <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5">
            <FileSpreadsheet className="w-4 h-4" />
            อัปโหลด Excel
          </Button>
        </div>
      </header>

      <StockUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="ค้นหายาง"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">ยาง</th>
                <th className="text-right px-4 py-3 font-medium">ต้นทุน</th>
                <th className="text-right px-4 py-3 font-medium">ราคาขาย</th>
                <th className="text-right px-4 py-3 font-medium">กำไร%</th>
                <th className="text-right px-4 py-3 font-medium">คงเหลือ</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">ซัพพลายเออร์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">กำลังโหลด...</td></tr>
              )}
              {tires.map((tire) => {
                const isLow = tire.quantity <= tire.min_threshold;
                const mp = marginPct(tire.sell_price, tire.avg_cost);
                return (
                  <tr key={tire.id} className={isLow ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{tire.brand} {tire.model}</p>
                      <p className="text-xs text-muted-foreground">{tire.size}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {tire.avg_cost ? `฿${tire.avg_cost.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">
                      ฿{tire.sell_price.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {mp !== null ? (
                        <Badge variant="outline" className={parseFloat(mp) >= 20 ? "text-emerald-600 border-emerald-200" : "text-amber-600 border-amber-200"}>
                          {mp}%
                        </Badge>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                        <Badge variant={tire.quantity > 0 ? "outline" : "destructive"}>{tire.quantity}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-sm">
                      {tire.supplier ?? "—"}
                    </td>
                  </tr>
                );
              })}
              {!isLoading && tires.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">ไม่พบยาง</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
