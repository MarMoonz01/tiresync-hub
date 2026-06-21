import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 py-4 flex items-center gap-3">
        <GitBranch className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">สต็อกเครือข่าย</h1>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="ค้นหายาง"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading && <p className="text-center text-muted-foreground py-8">กำลังโหลด...</p>}

        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">ร้าน</th>
                <th className="text-left px-4 py-3 font-medium">ยาง</th>
                <th className="text-right px-4 py-3 font-medium">สต็อก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-muted-foreground">{item.store_name}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.brand} {item.model}</p>
                    <p className="text-xs text-muted-foreground">{item.size}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant={item.quantity > 0 ? "outline" : "destructive"}>
                      {item.quantity}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    ยังไม่มีสต็อกจากร้านในเครือข่าย
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
