import { useState } from "react";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface SaleFormValues {
  tire_id: string;
  quantity_sold: number;
  sell_price: number;
  services: string[];
  service_total: number;
  plate_number: string;
  car_model: string;
  customer_name: string;
  phone: string;
  promotion_id?: string;
}

export interface SaleResult {
  success: boolean;
  sale_id: string | null;
  receipt_url: string | null;
  low_stock: boolean;
}

export function useSaleForm() {
  const { session, user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const submitSale = async (values: SaleFormValues): Promise<SaleResult | null> => {
    // Fix #8: guard against missing session
    if (!session) {
      toast({ title: "Session expired. Please sign in again.", variant: "destructive" });
      return null;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("record-sale", {
        body: { ...values, staff_id: user!.id },
      });

      if (error) throw error;

      const result = data as SaleResult;

      if (result.low_stock) {
        toast({
          title: "Sale recorded — stock running low",
          description: "The owner has been notified.",
          variant: "default",
        });
      } else {
        toast({ title: "Sale recorded successfully" });
      }

      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      if (msg.includes("insufficient_stock")) {
        toast({ title: "Insufficient stock", description: "Not enough units available.", variant: "destructive" });
      } else {
        toast({ title: "Failed to record sale", description: msg, variant: "destructive" });
      }
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  return { submitSale, submitting };
}
