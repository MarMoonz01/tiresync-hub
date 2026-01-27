import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  format, 
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  startOfWeek,
  endOfWeek,
  startOfYear,
  subDays
} from "date-fns";

export type DateRange = "7d" | "30d" | "90d" | "12m" | "all";

interface SaleRecord {
  id: string;
  quantity_change: number;
  created_at: string;
  tire_dot_id: string;
  notes: string | null;
}

interface DailySale {
  date: string;
  quantity: number;
  revenue: number;
}

interface TopProduct {
  tireId: string;
  brand: string;
  model: string | null;
  size: string;
  totalSold: number;
  revenue: number;
}

interface SalesOverview {
  totalSales: number;
  totalRevenue: number;
  averageOrderSize: number;
  uniqueProducts: number;
}

interface MonthlyComparison {
  month: string;
  sales: number;
  revenue: number;
}

export function useSalesReport(dateRange: DateRange = "30d") {
  const { store } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<DailySale[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [overview, setOverview] = useState<SalesOverview>({
    totalSales: 0,
    totalRevenue: 0,
    averageOrderSize: 0,
    uniqueProducts: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyComparison[]>([]);
  const [previousPeriod, setPreviousPeriod] = useState<SalesOverview>({
    totalSales: 0,
    totalRevenue: 0,
    averageOrderSize: 0,
    uniqueProducts: 0,
  });

  const getDateRange = useCallback((range: DateRange) => {
    const now = new Date();
    switch (range) {
      case "7d":
        return { start: subDays(now, 7), end: now };
      case "30d":
        return { start: subDays(now, 30), end: now };
      case "90d":
        return { start: subDays(now, 90), end: now };
      case "12m":
        return { start: subMonths(now, 12), end: now };
      case "all":
        return { start: new Date(2020, 0, 1), end: now };
      default:
        return { start: subDays(now, 30), end: now };
    }
  }, []);

  const fetchSalesReport = useCallback(async () => {
    if (!store) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get tire IDs for the store
      const { data: tiresData, error: tiresError } = await supabase
        .from("tires")
        .select("id, brand, model, size, price, network_price")
        .eq("store_id", store.id);

      if (tiresError) throw tiresError;

      const tireIds = tiresData?.map((t) => t.id) || [];
      const tireMap = new Map(tiresData?.map((t) => [t.id, t]) || []);

      // Get tire dots for these tires
      const { data: dotsData, error: dotsError } = await supabase
        .from("tire_dots")
        .select("id, tire_id")
        .in("tire_id", tireIds.length > 0 ? tireIds : ["none"]);

      if (dotsError) throw dotsError;

      const dotToTireMap = new Map(dotsData?.map((d) => [d.id, d.tire_id]) || []);
      const dotIds = dotsData?.map((d) => d.id) || [];

      if (dotIds.length === 0) {
        setSalesData([]);
        setTopProducts([]);
        setOverview({ totalSales: 0, totalRevenue: 0, averageOrderSize: 0, uniqueProducts: 0 });
        setMonthlyData([]);
        setPreviousPeriod({ totalSales: 0, totalRevenue: 0, averageOrderSize: 0, uniqueProducts: 0 });
        setLoading(false);
        return;
      }

      const { start, end } = getDateRange(dateRange);

      // Fetch sales logs (remove actions)
      const { data: salesLogs, error: salesError } = await supabase
        .from("stock_logs")
        .select("*")
        .in("tire_dot_id", dotIds)
        .eq("action", "remove")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: true });

      if (salesError) throw salesError;

      // Calculate daily sales
      const dailySalesMap = new Map<string, { quantity: number; revenue: number }>();
      const productSalesMap = new Map<string, { totalSold: number; revenue: number }>();
      const uniqueProducts = new Set<string>();

      (salesLogs || []).forEach((log) => {
        const dateKey = format(new Date(log.created_at), "yyyy-MM-dd");
        const tireId = dotToTireMap.get(log.tire_dot_id);
        const tire = tireId ? tireMap.get(tireId) : null;
        const price = tire?.network_price || tire?.price || 0;
        const quantity = Math.abs(log.quantity_change);
        const revenue = quantity * Number(price);

        // Daily aggregation
        const existing = dailySalesMap.get(dateKey) || { quantity: 0, revenue: 0 };
        dailySalesMap.set(dateKey, {
          quantity: existing.quantity + quantity,
          revenue: existing.revenue + revenue,
        });

        // Product aggregation
        if (tireId) {
          uniqueProducts.add(tireId);
          const productExisting = productSalesMap.get(tireId) || { totalSold: 0, revenue: 0 };
          productSalesMap.set(tireId, {
            totalSold: productExisting.totalSold + quantity,
            revenue: productExisting.revenue + revenue,
          });
        }
      });

      // Build daily sales array
      const days = eachDayOfInterval({ start, end });
      const dailySales: DailySale[] = days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const data = dailySalesMap.get(key) || { quantity: 0, revenue: 0 };
        return {
          date: format(day, "MMM d"),
          quantity: data.quantity,
          revenue: data.revenue,
        };
      });

      setSalesData(dailySales);

      // Build top products
      const topProductsList: TopProduct[] = Array.from(productSalesMap.entries())
        .map(([tireId, stats]) => {
          const tire = tireMap.get(tireId);
          return {
            tireId,
            brand: tire?.brand || "Unknown",
            model: tire?.model || null,
            size: tire?.size || "Unknown",
            totalSold: stats.totalSold,
            revenue: stats.revenue,
          };
        })
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 10);

      setTopProducts(topProductsList);

      // Calculate overview
      const totalSales = dailySales.reduce((sum, d) => sum + d.quantity, 0);
      const totalRevenue = dailySales.reduce((sum, d) => sum + d.revenue, 0);

      setOverview({
        totalSales,
        totalRevenue,
        averageOrderSize: totalSales > 0 ? totalRevenue / totalSales : 0,
        uniqueProducts: uniqueProducts.size,
      });

      // Monthly comparison (last 6 months)
      const monthlyComparison: MonthlyComparison[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = endOfMonth(subMonths(new Date(), i));
        const monthKey = format(monthStart, "MMM yyyy");

        const { data: monthLogs } = await supabase
          .from("stock_logs")
          .select("quantity_change, tire_dot_id")
          .in("tire_dot_id", dotIds)
          .eq("action", "remove")
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());

        let monthSales = 0;
        let monthRevenue = 0;

        (monthLogs || []).forEach((log) => {
          const tireId = dotToTireMap.get(log.tire_dot_id);
          const tire = tireId ? tireMap.get(tireId) : null;
          const price = tire?.network_price || tire?.price || 0;
          const qty = Math.abs(log.quantity_change);
          monthSales += qty;
          monthRevenue += qty * Number(price);
        });

        monthlyComparison.push({
          month: monthKey,
          sales: monthSales,
          revenue: monthRevenue,
        });
      }

      setMonthlyData(monthlyComparison);

      // Calculate previous period for comparison
      const periodDuration = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - periodDuration);
      const prevEnd = new Date(start.getTime() - 1);

      const { data: prevLogs } = await supabase
        .from("stock_logs")
        .select("quantity_change, tire_dot_id")
        .in("tire_dot_id", dotIds)
        .eq("action", "remove")
        .gte("created_at", prevStart.toISOString())
        .lte("created_at", prevEnd.toISOString());

      let prevTotalSales = 0;
      let prevTotalRevenue = 0;
      const prevUniqueProducts = new Set<string>();

      (prevLogs || []).forEach((log) => {
        const tireId = dotToTireMap.get(log.tire_dot_id);
        const tire = tireId ? tireMap.get(tireId) : null;
        const price = tire?.network_price || tire?.price || 0;
        const qty = Math.abs(log.quantity_change);
        prevTotalSales += qty;
        prevTotalRevenue += qty * Number(price);
        if (tireId) prevUniqueProducts.add(tireId);
      });

      setPreviousPeriod({
        totalSales: prevTotalSales,
        totalRevenue: prevTotalRevenue,
        averageOrderSize: prevTotalSales > 0 ? prevTotalRevenue / prevTotalSales : 0,
        uniqueProducts: prevUniqueProducts.size,
      });

    } catch (err) {
      console.error("Error fetching sales report:", err);
    } finally {
      setLoading(false);
    }
  }, [store, dateRange, getDateRange]);

  useEffect(() => {
    fetchSalesReport();
  }, [fetchSalesReport]);

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    loading,
    salesData,
    topProducts,
    overview,
    monthlyData,
    previousPeriod,
    calculateChange,
    refetch: fetchSalesReport,
  };
}
