import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useDebouncedValue } from "./useDebouncedValue";

export interface StockItem {
  id: string;
  brand: string;
  model: string;
  size: string;
  quantity: number;
  sell_price: number;
  min_threshold: number;
  last_sold_at: string | null;
}

export function useStockLookup(search: string = "") {
  const { store } = useAuth();
  const debouncedSearch = useDebouncedValue(search, 300);

  return useQuery<StockItem[]>({
    queryKey: ["stock-lookup", store?.id, debouncedSearch],
    queryFn: async () => {
      if (!store?.id) return [];

      let query = supabase
        .from("tires_staff_view")
        .select("id, brand, model, size, quantity, sell_price, min_threshold, last_sold_at")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .order("brand", { ascending: true });

      if (debouncedSearch.trim()) {
        const term = `%${debouncedSearch.trim()}%`;
        query = query.or(`brand.ilike.${term},model.ilike.${term},size.ilike.${term}`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return (data ?? []) as StockItem[];
    },
    enabled: !!store?.id,
    staleTime: 30_000,
  });
}
