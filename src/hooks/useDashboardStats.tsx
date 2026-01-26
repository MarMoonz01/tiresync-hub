import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfMonth, endOfMonth, subMonths, format, subDays, startOfDay } from "date-fns";

interface StockLog {
  id: string;
  action: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  created_at: string;
  notes: string | null;
  tire_dot_id: string;
}

interface DailyMovement {
  date: string;
  sales: number;
  additions: number;
}

interface TireStats {
  totalTires: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface SalesStats {
  thisMonth: number;
  lastMonth: number;
  thisMonthValue: number;
  lastMonthValue: number;
  percentChange: number;
}

export function useDashboardStats() {
  const { store } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tireStats, setTireStats] = useState<TireStats>({
    totalTires: 0,
    totalStock: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [salesStats, setSalesStats] = useState<SalesStats>({
    thisMonth: 0,
    lastMonth: 0,
    thisMonthValue: 0,
    lastMonthValue: 0,
    percentChange: 0,
  });
  const [dailyMovements, setDailyMovements] = useState<DailyMovement[]>([]);
  const [recentLogs, setRecentLogs] = useState<StockLog[]>([]);

  const fetchStats = useCallback(async () => {
    if (!store) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch tires with dots for the store
      const { data: tiresData, error: tiresError } = await supabase
        .from("tires")
        .select("id, price, network_price")
        .eq("store_id", store.id);

      if (tiresError) throw tiresError;

      const tireIds = tiresData?.map((t) => t.id) || [];

      // Fetch all tire dots for quantity calculations
      const { data: dotsData, error: dotsError } = await supabase
        .from("tire_dots")
        .select("id, tire_id, quantity")
        .in("tire_id", tireIds.length > 0 ? tireIds : ["none"]);

      if (dotsError) throw dotsError;

      // Calculate tire stats
      const tireQuantities = new Map<string, number>();
      dotsData?.forEach((dot) => {
        const current = tireQuantities.get(dot.tire_id) || 0;
        tireQuantities.set(dot.tire_id, current + dot.quantity);
      });

      let totalStock = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;

      tireQuantities.forEach((qty) => {
        totalStock += qty;
        if (qty === 0) outOfStockCount++;
        else if (qty <= 4) lowStockCount++;
      });

      setTireStats({
        totalTires: tiresData?.length || 0,
        totalStock,
        lowStockCount,
        outOfStockCount,
      });

      // Fetch stock logs for the store's tire dots
      const dotIds = dotsData?.map((d) => d.id) || [];
      
      const now = new Date();
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

      if (dotIds.length > 0) {
        // Fetch this month's logs
        const { data: thisMonthLogs, error: thisMonthError } = await supabase
          .from("stock_logs")
          .select("*")
          .in("tire_dot_id", dotIds)
          .gte("created_at", thisMonthStart.toISOString())
          .lte("created_at", thisMonthEnd.toISOString())
          .order("created_at", { ascending: false });

        if (thisMonthError) throw thisMonthError;

        // Fetch last month's logs
        const { data: lastMonthLogs, error: lastMonthError } = await supabase
          .from("stock_logs")
          .select("*")
          .in("tire_dot_id", dotIds)
          .gte("created_at", lastMonthStart.toISOString())
          .lte("created_at", lastMonthEnd.toISOString());

        if (lastMonthError) throw lastMonthError;

        // Calculate sales (removed items)
        const thisMonthSales = thisMonthLogs?.filter((l) => l.action === "remove") || [];
        const lastMonthSales = lastMonthLogs?.filter((l) => l.action === "remove") || [];

        const thisMonthSalesQty = thisMonthSales.reduce(
          (sum, l) => sum + Math.abs(l.quantity_change),
          0
        );
        const lastMonthSalesQty = lastMonthSales.reduce(
          (sum, l) => sum + Math.abs(l.quantity_change),
          0
        );

        // Calculate percent change
        const percentChange =
          lastMonthSalesQty > 0
            ? ((thisMonthSalesQty - lastMonthSalesQty) / lastMonthSalesQty) * 100
            : thisMonthSalesQty > 0
            ? 100
            : 0;

        setSalesStats({
          thisMonth: thisMonthSalesQty,
          lastMonth: lastMonthSalesQty,
          thisMonthValue: thisMonthSalesQty, // Could multiply by avg price
          lastMonthValue: lastMonthSalesQty,
          percentChange: Math.round(percentChange),
        });

        // Set recent logs
        setRecentLogs(thisMonthLogs?.slice(0, 10) || []);

        // Calculate daily movements for last 14 days
        const last14Days: DailyMovement[] = [];
        for (let i = 13; i >= 0; i--) {
          const date = subDays(now, i);
          const dateStr = format(date, "yyyy-MM-dd");
          const dayStart = startOfDay(date);
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayEnd.getDate() + 1);

          const dayLogs = [...(thisMonthLogs || []), ...(lastMonthLogs || [])].filter(
            (log) => {
              const logDate = format(new Date(log.created_at), "yyyy-MM-dd");
              return logDate === dateStr;
            }
          );

          const sales = dayLogs
            .filter((l) => l.action === "remove")
            .reduce((sum, l) => sum + Math.abs(l.quantity_change), 0);
          const additions = dayLogs
            .filter((l) => l.action === "add")
            .reduce((sum, l) => sum + l.quantity_change, 0);

          last14Days.push({
            date: format(date, "MMM d"),
            sales,
            additions,
          });
        }

        setDailyMovements(last14Days);
      } else {
        setSalesStats({
          thisMonth: 0,
          lastMonth: 0,
          thisMonthValue: 0,
          lastMonthValue: 0,
          percentChange: 0,
        });
        setRecentLogs([]);
        setDailyMovements([]);
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    loading,
    tireStats,
    salesStats,
    dailyMovements,
    recentLogs,
    refetch: fetchStats,
  };
}
