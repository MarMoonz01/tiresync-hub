import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface Promotion {
  id: string;
  store_id: string;
  title: string;
  body_text: string | null;
  facebook_copy: string | null;
  line_copy: string | null;
  discount_pct: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  agent: string | null;
  created_at: string;
}

export function usePromotions(status?: string) {
  const { store } = useAuth();

  return useQuery<Promotion[]>({
    queryKey: ["promotions", store?.id, status],
    queryFn: async () => {
      if (!store?.id) return [];

      let query = supabase
        .from("promotions")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      if (status) query = query.eq("status", status);

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return (data ?? []) as Promotion[];
    },
    enabled: !!store?.id,
    staleTime: 30_000,
  });
}

export function useApprovePromotion() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approved" | "rejected" }) => {
      const { error } = await supabase.from("promotions").update({
        status: action,
        approved_by: user?.id ?? null,
        approved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { action }) => {
      toast({ title: action === "approved" ? "โปรโมชันอนุมัติแล้ว" : "โปรโมชันปฏิเสธแล้ว" });
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
  });
}

export function usePublishPromotion() {
  const { store, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (promotion_id: string) => {
      if (!session) throw new Error("Session expired");
      const { data, error } = await supabase.functions.invoke("publish-promotion", {
        body: { store_id: store?.id, promotion_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "โปรโมชันถูกเผยแพร่แล้ว" });
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to publish", description: err.message, variant: "destructive" });
    },
  });
}
