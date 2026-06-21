import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface PurchaseOrder {
  id: string;
  store_id: string;
  tire_id: string | null;
  tire_name: string;
  supplier: string | null;
  qty_requested: number;
  unit_cost: number | null;
  total_cost: number | null;
  status: "pending" | "approved" | "rejected" | "received";
  notes: string | null;
  agent: string | null;
  created_at: string;
}

export function usePurchaseOrders(status?: string) {
  const { store } = useAuth();

  return useQuery<PurchaseOrder[]>({
    queryKey: ["purchase-orders", store?.id, status],
    queryFn: async () => {
      if (!store?.id) return [];
      let query = supabase
        .from("purchase_orders")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      if (status) query = query.eq("status", status);

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return (data ?? []) as PurchaseOrder[];
    },
    enabled: !!store?.id,
    staleTime: 30_000,
  });
}

export function useApprovePO() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("purchase_orders")
        .update({ status: action, approved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { action }) => {
      toast({ title: action === "approved" ? "PO อนุมัติแล้ว" : "PO ปฏิเสธแล้ว" });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (err: Error) => {
      toast({ title: "เกิดข้อผิดพลาด", description: err.message, variant: "destructive" });
    },
  });
}
