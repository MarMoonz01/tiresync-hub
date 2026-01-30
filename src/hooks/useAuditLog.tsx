import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";

export type AuditDateRange = "7d" | "30d" | "90d" | "all" | "custom";
export type AuditAction = "all" | "add" | "remove" | "adjust";

interface AuditLogEntry {
  id: string;
  action: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  created_at: string;
  notes: string | null;
  tire_dot_id: string;
  user_id: string | null;
  // Joined data
  dot_code?: string;
  tire_brand?: string;
  tire_model?: string | null;
  tire_size?: string;
  user_email?: string;
  user_name?: string | null;
  user_avatar?: string | null; // เพิ่ม Avatar
}

interface AuditStats {
  totalActions: number;
  totalAdded: number;
  totalRemoved: number;
  totalAdjusted: number;
  uniqueUsers: number;
}

export function useAuditLog(
  dateRange: AuditDateRange = "30d",
  actionFilter: AuditAction = "all",
  searchQuery: string = "",
  customDate?: DateRange
) {
  const { store } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats>({
    totalActions: 0,
    totalAdded: 0,
    totalRemoved: 0,
    totalAdjusted: 0,
    uniqueUsers: 0,
  });

  const getDateRange = useCallback((range: AuditDateRange, custom?: DateRange) => {
    const now = new Date();
    switch (range) {
      case "7d":
        return subDays(now, 7);
      case "30d":
        return subDays(now, 30);
      case "90d":
        return subDays(now, 90);
      case "all":
        return new Date(2020, 0, 1);
      case "custom":
        return custom?.from || subDays(now, 30);
      default:
        return subDays(now, 30);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    if (!store) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get all tires for the store
      const { data: tiresData, error: tiresError } = await supabase
        .from("tires")
        .select("id, brand, model, size")
        .eq("store_id", store.id);

      if (tiresError) throw tiresError;

      const tireIds = tiresData?.map((t) => t.id) || [];
      const tireMap = new Map(tiresData?.map((t) => [t.id, t]) || []);

      // Get tire dots
      const { data: dotsData, error: dotsError } = await supabase
        .from("tire_dots")
        .select("id, tire_id, dot_code")
        .in("tire_id", tireIds.length > 0 ? tireIds : ["none"]);

      if (dotsError) throw dotsError;

      const dotMap = new Map(dotsData?.map((d) => [d.id, { tire_id: d.tire_id, dot_code: d.dot_code }]) || []);
      const dotIds = dotsData?.map((d) => d.id) || [];

      if (dotIds.length === 0) {
        setLogs([]);
        setStats({ totalActions: 0, totalAdded: 0, totalRemoved: 0, totalAdjusted: 0, uniqueUsers: 0 });
        setLoading(false);
        return;
      }

      const startDate = getDateRange(dateRange, customDate);
      let endDate = new Date(); // Default end is now
      
      if (dateRange === "custom" && customDate?.to) {
        endDate = endOfDay(customDate.to);
      }

      // Build query
      let query = supabase
        .from("stock_logs")
        .select("*")
        .in("tire_dot_id", dotIds)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString()) // Filter end date too
        .order("created_at", { ascending: false });

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      const { data: logsData, error: logsError } = await query;

      if (logsError) throw logsError;

      // Get unique user IDs to fetch their profiles
      const userIds = [...new Set((logsData || []).map((l) => l.user_id).filter(Boolean))] as string[];

      // Fetch user profiles (Include avatar_url)
      let userMap = new Map<string, { email: string; full_name: string | null; avatar_url: string | null }>();
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, email, full_name, avatar_url") // เพิ่ม avatar_url
          .in("user_id", userIds);

        userMap = new Map(
          (profilesData || []).map((p) => [p.user_id, { email: p.email, full_name: p.full_name, avatar_url: p.avatar_url }])
        );
      }

      // Combine data
      const enrichedLogs: AuditLogEntry[] = (logsData || []).map((log) => {
        const dotInfo = dotMap.get(log.tire_dot_id);
        const tire = dotInfo ? tireMap.get(dotInfo.tire_id) : null;
        const user = log.user_id ? userMap.get(log.user_id) : null;

        return {
          ...log,
          dot_code: dotInfo?.dot_code || "Unknown",
          tire_brand: tire?.brand || "Unknown",
          tire_model: tire?.model,
          tire_size: tire?.size || "Unknown",
          user_email: user?.email || "System",
          user_name: user?.full_name,
          user_avatar: user?.avatar_url, // ใส่ Avatar
        };
      });

      // Apply search filter
      let filteredLogs = enrichedLogs;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredLogs = enrichedLogs.filter(
          (log) =>
            log.tire_brand?.toLowerCase().includes(query) ||
            log.tire_model?.toLowerCase().includes(query) ||
            log.tire_size?.toLowerCase().includes(query) ||
            log.dot_code?.toLowerCase().includes(query) ||
            log.user_email?.toLowerCase().includes(query) ||
            log.user_name?.toLowerCase().includes(query) ||
            log.notes?.toLowerCase().includes(query)
        );
      }

      setLogs(filteredLogs);

      // Calculate stats (from all logs, not filtered)
      const allLogs = logsData || [];
      const uniqueUsers = new Set(allLogs.map((l) => l.user_id).filter(Boolean));

      setStats({
        totalActions: allLogs.length,
        totalAdded: allLogs.filter((l) => l.action === "add").reduce((sum, l) => sum + l.quantity_change, 0),
        totalRemoved: allLogs.filter((l) => l.action === "remove").reduce((sum, l) => sum + Math.abs(l.quantity_change), 0),
        totalAdjusted: allLogs.filter((l) => l.action === "adjust").length,
        uniqueUsers: uniqueUsers.size,
      });

    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [store, dateRange, customDate, actionFilter, searchQuery, getDateRange]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return {
    loading,
    logs,
    stats,
    refetch: fetchAuditLogs,
  };
}