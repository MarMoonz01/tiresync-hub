import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface IntelligenceReport {
  id: string;
  store_id: string;
  agent: string;
  report_type: string;
  content: Record<string, unknown>;
  tokens_used: number | null;
  created_at: string;
}

export function useIntelligenceReports(agent?: string) {
  const { store } = useAuth();

  return useQuery<IntelligenceReport[]>({
    queryKey: ["intelligence-reports", store?.id, agent],
    queryFn: async () => {
      if (!store?.id) return [];

      let query = supabase
        .from("intelligence_reports")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      if (agent) query = query.eq("agent", agent);

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return (data ?? []) as IntelligenceReport[];
    },
    enabled: !!store?.id,
    staleTime: 5 * 60_000,
  });
}

export function useRunOracle() {
  const { store, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Session expired");
      if (!store?.id) throw new Error("No store");

      const { data, error } = await supabase.functions.invoke("intel-oracle", {
        body: { store_id: store.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "ORACLE — insight generated" });
      queryClient.invalidateQueries({ queryKey: ["intelligence-reports"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to run ORACLE", description: err.message, variant: "destructive" });
    },
  });
}

export function useRunSpark() {
  const { store, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Session expired");
      if (!store?.id) throw new Error("No store");

      const { data, error } = await supabase.functions.invoke("intel-spark", {
        body: { store_id: store.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: `SPARK — ${data.proposals_count} โปรโมชันถูกสร้าง` });
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to run SPARK", description: err.message, variant: "destructive" });
    },
  });
}
