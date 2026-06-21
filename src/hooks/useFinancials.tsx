import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface FinancialRow {
  id: string;
  store_id: string;
  type: string;
  revenue: number | null;
  cogs: number | null;
  gross_profit: number | null;
  period_day: string | null;
  period_week: string | null;
  period_month: string | null;
  created_at: string;
}

export function useFinancials(periodMonth?: string) {
  const { store } = useAuth();

  return useQuery<FinancialRow[]>({
    queryKey: ["financials", store?.id, periodMonth],
    queryFn: async () => {
      if (!store?.id) return [];

      let query = supabase
        .from("financials")
        .select("*")
        .eq("store_id", store.id)
        .order("period_day", { ascending: false });

      if (periodMonth) query = query.eq("period_month", periodMonth);

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return (data ?? []) as FinancialRow[];
    },
    enabled: !!store?.id,
    staleTime: 60_000,
  });
}
