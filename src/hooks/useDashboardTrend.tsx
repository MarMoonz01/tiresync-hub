import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface DashboardTrend {
  revenue: number[];
  profit: number[];
  sales: number[];
  margin: number[];
  delta: { revenue: number; profit: number; sales: number; margin: number };
}

const DAYS = 14;

const empty: DashboardTrend = {
  revenue: [], profit: [], sales: [], margin: [],
  delta: { revenue: 0, profit: 0, sales: 0, margin: 0 },
};

export function useDashboardTrend() {
  const { store } = useAuth();

  return useQuery<DashboardTrend>({
    queryKey: ["dashboard-trend", store?.id],
    queryFn: async () => {
      if (!store?.id) return empty;

      const start = new Date();
      start.setDate(start.getDate() - (DAYS - 1));
      const startStr = start.toISOString().slice(0, 10);

      const { data } = await supabase
        .from("financials")
        .select("period_day, revenue, gross_profit")
        .eq("store_id", store.id)
        .eq("type", "sale")
        .gte("period_day", startStr)
        .order("period_day");

      const days: string[] = [];
      for (let i = 0; i < DAYS; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d.toISOString().slice(0, 10));
      }

      const revB: Record<string, number> = {};
      const proB: Record<string, number> = {};
      const cntB: Record<string, number> = {};
      (data ?? []).forEach((r: { period_day: string | null; revenue: number | null; gross_profit: number | null }) => {
        const k = r.period_day?.slice(0, 10);
        if (!k) return;
        revB[k] = (revB[k] ?? 0) + (r.revenue ?? 0);
        proB[k] = (proB[k] ?? 0) + (r.gross_profit ?? 0);
        cntB[k] = (cntB[k] ?? 0) + 1;
      });

      const revenue = days.map((d) => revB[d] ?? 0);
      const profit = days.map((d) => proB[d] ?? 0);
      const sales = days.map((d) => cntB[d] ?? 0);
      const margin = days.map((_, i) => (revenue[i] > 0 ? (profit[i] / revenue[i]) * 100 : 0));

      const half = Math.floor(DAYS / 2);
      const sum = (a: number[], s: number, e: number) => a.slice(s, e).reduce((x, y) => x + y, 0);
      const avg = (a: number[], s: number, e: number) => {
        const sl = a.slice(s, e).filter((v) => v > 0);
        return sl.length ? sl.reduce((x, y) => x + y, 0) / sl.length : 0;
      };
      const pct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : 0);

      return {
        revenue, profit, sales, margin,
        delta: {
          revenue: pct(sum(revenue, half, DAYS), sum(revenue, 0, half)),
          profit: pct(sum(profit, half, DAYS), sum(profit, 0, half)),
          sales: pct(sum(sales, half, DAYS), sum(sales, 0, half)),
          margin: pct(avg(margin, half, DAYS), avg(margin, 0, half)),
        },
      };
    },
    enabled: !!store?.id,
    staleTime: 5 * 60_000,
  });
}
