import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface CreateOrderParams {
  sellerStoreId: string;
  tireId: string;
  tireDotId?: string;
  quantity: number;
  unitPrice?: number;
  notes?: string;
}

export function useOrders() {
  const { store } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const createOrder = async (params: CreateOrderParams) => {
    if (!store) {
      return { success: false, error: "no_store" as const };
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("orders")
        .insert({
          buyer_store_id: store.id,
          seller_store_id: params.sellerStoreId,
          tire_id: params.tireId,
          tire_dot_id: params.tireDotId || null,
          quantity: params.quantity,
          unit_price: params.unitPrice || null,
          notes: params.notes || null,
          status: "interested",
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Interest Sent! 🎉",
        description: "The seller has been notified of your interest.",
      });

      return { success: true, data };
    } catch (err) {
      console.error("Error creating order:", err);
      toast({
        title: "Error",
        description: "Failed to express interest. Please try again.",
        variant: "destructive",
      });
      return { success: false, error: "failed" as const };
    } finally {
      setLoading(false);
    }
  };

  return {
    createOrder,
    loading,
    hasStore: !!store,
  };
}
