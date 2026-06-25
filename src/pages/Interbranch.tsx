import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Search, GitBranch } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

// tires_interbranch_view isn't in the generated Database types — reach it via an
// untyped client view. The view is scoped (in SQL) to stores the caller's store
// has an ACCEPTED network link with, and exposes availability only (no prices).
const sb = supabase as unknown as SupabaseClient;

interface InterbranchTire {
  store_id: string;
  store_name: string;
  brand: string;
  model: string;
  size: string;
  quantity: number;
}

export default function Interbranch() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: items = [], isLoading } = useQuery<InterbranchTire[]>({
    queryKey: ["interbranch-stock", debouncedSearch],
    queryFn: async () => {
      let query = sb
        .from("tires_interbranch_view")
        .select("store_id, store_name, brand, model, size, quantity")
        .order("brand");
      if (debouncedSearch.trim()) {
        const term = `%${debouncedSearch.trim()}%`;
        query = query.or(`brand.ilike.${term},model.ilike.${term},size.ilike.${term}`);
      }
      const { data, error } = await query.limit(200);
      if (error) throw error;
      return (data ?? []) as InterbranchTire[];
    },
    staleTime: 60_000,
  });

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div className="pt-2">
        <h1 className="text-2xl md:text-[26px] font-extrabold tracking-tight flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-primary" /> สต็อกเครือข่าย
        </h1>
        <p className="text-sm text-muted-foreground mt-1">ยางคงเหลือจากร้านในเครือข่ายที่เชื่อมต่อ</p>
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
                {[["ร้าน", "left"], ["ยาง", "left"], ["สต็อก", "right"]].map(([h, a]) => (
                  <th key={h} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-${a}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">กำลังโหลด...</td></tr>}
              {!isLoading && items.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">ยังไม่มีสต็อกจากร้านในเครือข่าย</td></tr>}
              {items.map((item, i) => (
                <tr key={i} className="hover:bg-secondary/40 transition-colors">
                  <td className="px-4 py-3.5 text-muted-foreground">{item.store_name}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold">{item.brand} {item.model}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{item.size}</p>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${item.quantity > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>{item.quantity}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
