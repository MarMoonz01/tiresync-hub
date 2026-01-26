import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export interface SellerOrder {
  id: string;
  buyer_store_id: string;
  tire_id: string;
  tire_dot_id: string | null;
  quantity: number;
  unit_price: number | null;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  buyer_store: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  tire: {
    id: string;
    brand: string;
    model: string | null;
    size: string;
  };
  tire_dot: {
    id: string;
    dot_code: string;
  } | null;
}

export function useSellerOrders() {
  const { store } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const fetchOrders = useCallback(async () => {
    if (!store) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch orders where current store is the seller
      let query = supabase
        .from("orders")
        .select("*")
        .eq("seller_store_id", store.id)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      // Fetch buyer stores
      const buyerStoreIds = [...new Set(ordersData.map((o) => o.buyer_store_id))];
      const { data: storesData } = await supabase
        .from("stores_public")
        .select("id, name, logo_url")
        .in("id", buyerStoreIds);

      // Fetch tires
      const tireIds = [...new Set(ordersData.map((o) => o.tire_id))];
      const { data: tiresData } = await supabase
        .from("tires")
        .select("id, brand, model, size")
        .in("id", tireIds);

      // Fetch tire dots
      const dotIds = ordersData
        .map((o) => o.tire_dot_id)
        .filter((id): id is string => id !== null);
      
      let dotsData: { id: string; dot_code: string }[] = [];
      if (dotIds.length > 0) {
        const { data } = await supabase
          .from("tire_dots")
          .select("id, dot_code")
          .in("id", dotIds);
        dotsData = data || [];
      }

      // Combine data
      const enrichedOrders: SellerOrder[] = ordersData.map((order) => ({
        ...order,
        buyer_store: storesData?.find((s) => s.id === order.buyer_store_id) || {
          id: order.buyer_store_id,
          name: "Unknown Store",
          logo_url: null,
        },
        tire: tiresData?.find((t) => t.id === order.tire_id) || {
          id: order.tire_id,
          brand: "Unknown",
          model: null,
          size: "Unknown",
        },
        tire_dot: order.tire_dot_id
          ? dotsData.find((d) => d.id === order.tire_dot_id) || null
          : null,
      }));

      setOrders(enrichedOrders);
    } catch (err) {
      console.error("Error fetching seller orders:", err);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [store, toast, statusFilter]);

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      // Update local state
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
      });

      return true;
    } catch (err) {
      console.error("Error updating order status:", err);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!store) return;

    const channel = supabase
      .channel("seller-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `seller_store_id=eq.${store.id}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store, fetchOrders]);

  return {
    orders,
    loading,
    statusFilter,
    setStatusFilter,
    updateOrderStatus,
    refetch: fetchOrders,
  };
}
