import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export interface BuyerInterest {
  id: string;
  status: OrderStatus;
  quantity: number;
  unit_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  seller_store: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  tire: {
    id: string;
    brand: string;
    model: string | null;
    size: string;
    network_price: number | null;
  };
  tire_dot: {
    id: string;
    dot_code: string;
    quantity: number;
  } | null;
}

export function useBuyerInterests() {
  const { store } = useAuth();
  const { toast } = useToast();
  const [interests, setInterests] = useState<BuyerInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const fetchInterests = useCallback(async () => {
    if (!store) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      let query = supabase
        .from("orders")
        .select(`
          id,
          status,
          quantity,
          unit_price,
          notes,
          created_at,
          updated_at,
          seller_store:stores!orders_seller_store_id_fkey(id, name, logo_url),
          tire:tires(id, brand, model, size, network_price),
          tire_dot:tire_dots(id, dot_code, quantity)
        `)
        .eq("buyer_store_id", store.id)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped = (data || []).map((order) => ({
        ...order,
        seller_store: order.seller_store as unknown as BuyerInterest["seller_store"],
        tire: order.tire as unknown as BuyerInterest["tire"],
        tire_dot: order.tire_dot as BuyerInterest["tire_dot"],
      }));

      setInterests(mapped);
    } catch (err) {
      console.error("Error fetching buyer interests:", err);
      toast({
        title: "Error",
        description: "Failed to load your interests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [store, statusFilter, toast]);

  const cancelInterest = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Interest Cancelled",
        description: "Your interest has been cancelled.",
      });

      fetchInterests();
    } catch (err) {
      console.error("Error cancelling interest:", err);
      toast({
        title: "Error",
        description: "Failed to cancel interest",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchInterests();
  }, [fetchInterests]);

  // Realtime subscription
  useEffect(() => {
    if (!store) return;

    const channel = supabase
      .channel("buyer-interests-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `buyer_store_id=eq.${store.id}`,
        },
        () => {
          fetchInterests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store, fetchInterests]);

  return {
    interests,
    loading,
    statusFilter,
    setStatusFilter,
    cancelInterest,
    refetch: fetchInterests,
  };
}
