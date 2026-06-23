import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Search, Package, AlertTriangle, FileSpreadsheet, Layers, Boxes } from "lucide-react";
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

const baht = (n: number | null | undefined) => "฿" + (n ?? 0).toLocaleString("en-US");
function marginPct(sell: number, cost: number | null) {
  if (!cost || cost === 0) return null;
  return (((sell - cost) / sell) * 100).toFixed(1);
}

function MiniStat({ icon: Icon, label, value, tint }: { icon: typeof Package; label: string; value: string; tint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center gap-3">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tint}`}><Icon className="w-5 h-5" /></span>
      <div>
        <p className="text-xl font-extrabold tabular-nums leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
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
  const totalQty = tires.reduce((s, t) => s + t.quantity, 0);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <StockUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      <div className="flex items-end justify-between gap-4 flex-wrap pt-2">
        <div>
          <h1 className="text-2xl md:text-[26px] font-extrabold tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> จัดการสต็อก
          </h1>
          <p className="text-sm text-muted-foreground mt-1">ต้นทุน · กำไร · ระดับสต็อก</p>
        </div>
        <button onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold hover:opacity-90 transition">
          <FileSpreadsheet className="w-4 h-4" /> อัปโหลด Excel
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        <MiniStat icon={Layers} label="รายการ (SKU)" value={tires.length.toLocaleString()} tint="bg-primary/10 text-primary" />
        <MiniStat icon={Boxes} label="คงเหลือรวม" value={totalQty.toLocaleString()} tint="bg-violet-500/10 text-violet-600" />
        <MiniStat icon={AlertTriangle} label="สต็อกต่ำ" value={lowCount.toLocaleString()} tint="bg-amber-500/10 text-amber-600" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9 rounded-xl bg-secondary/60" placeholder="ค้นหายาง" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {[["ยาง", "left"], ["ต้นทุน", "right"], ["ราคาขาย", "right"], ["กำไร%", "right"], ["คงเหลือ", "right"], ["ซัพพลายเออร์", "left"]].map(([h, a]) => (
                  <th key={h} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-${a} ${h === "ซัพพลายเออร์" ? "hidden lg:table-cell" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">กำลังโหลด...</td></tr>}
              {!isLoading && tires.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">ไม่พบยาง</td></tr>}
              {tires.map((tire) => {
                const isLow = tire.quantity <= tire.min_threshold;
                const mp = marginPct(tire.sell_price, tire.avg_cost);
                return (
                  <tr key={tire.id} className={`hover:bg-secondary/40 transition-colors ${isLow ? "bg-amber-500/5" : ""}`}>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold">{tire.brand} {tire.model}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{tire.size}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right text-muted-foreground tabular-nums">{tire.avg_cost ? baht(tire.avg_cost) : "—"}</td>
                    <td className="px-4 py-3.5 text-right font-bold tabular-nums">{baht(tire.sell_price)}</td>
                    <td className="px-4 py-3.5 text-right">
                      {mp !== null ? (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${parseFloat(mp) >= 20 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{mp}%</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${tire.quantity === 0 ? "bg-rose-500/10 text-rose-600" : isLow ? "bg-amber-500/10 text-amber-600" : "bg-secondary text-foreground"}`}>
                        {isLow && tire.quantity > 0 && <AlertTriangle className="w-3 h-3" />}{tire.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{tire.supplier ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
