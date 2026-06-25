import { useQuery } from "@tanstack/react-query";
import { isLowStock } from "@/lib/saleMath";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface DashboardStats {
  totalRevenue: number;
  totalProfit: number;
  totalSales: number;
  lowStockCount: number;
  pendingPOs: number;
  unreadAlerts: number;
}

export function useDashboardStats() {
  const { store } = useAuth();
  const today = new Date().toISOString().slice(0, 7); // YYYY-MM

  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats", store?.id, today],
    queryFn: async () => {
      if (!store?.id) return { totalRevenue: 0, totalProfit: 0, totalSales: 0, lowStockCount: 0, pendingPOs: 0, unreadAlerts: 0 };

      const [
        { data: finData },
        { data: tireRows },
        { count: pendingPOs },
      ] = await Promise.all([
        supabase
          .from("financials")
          .select("revenue, gross_profit")
          .eq("store_id", store.id)
          .eq("type", "sale")
          .eq("period_month", today),
        // Direct SELECT on `tires` is revoked from authenticated — use the owner view.
        // quantity <= min_threshold is a column-to-column comparison that PostgREST
        // can't express as a filter, so count it client-side.
        supabase
          .from("tires_owner_view")
          .select("quantity, min_threshold")
          .eq("store_id", store.id)
          .eq("is_active", true),
        supabase
          .from("purchase_orders")
          .select("id", { count: "exact", head: true })
          .eq("store_id", store.id)
          .eq("status", "pending"),
      ]);

      const rows = finData ?? [];
      // Same definition as the stock-low alert in record_sale_txn (quantity < threshold).
      const lowStockCount = (tireRows ?? []).filter(
        (t) => isLowStock(t.quantity ?? 0, t.min_threshold ?? 0)
      ).length;
      return {
        totalRevenue: rows.reduce((s, r) => s + (r.revenue ?? 0), 0),
        totalProfit: rows.reduce((s, r) => s + (r.gross_profit ?? 0), 0),
        totalSales: rows.length,
        lowStockCount,
        pendingPOs: pendingPOs ?? 0,
        unreadAlerts: 0,
      };
    },
    enabled: !!store?.id,
    staleTime: 5 * 60_000,
  });
}
