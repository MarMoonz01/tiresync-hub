import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface TrendItem {
  tire_id: string;
  tire_name: string;
  units_sold: number;
  revenue: number;
}

export function useTrend(days = 30) {
  const { store } = useAuth();

  return useQuery<TrendItem[]>({
    queryKey: ["trend", store?.id, days],
    queryFn: async () => {
      if (!store?.id) return [];

      const { data, error } = await supabase.rpc("get_trending_tyres", {
        p_store_id: store.id,
        p_days: days,
      });

      if (error) throw error;
      return (data ?? []) as TrendItem[];
    },
    enabled: !!store?.id,
    staleTime: 5 * 60_000,
  });
}
