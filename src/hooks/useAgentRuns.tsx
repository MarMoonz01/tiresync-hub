import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AgentRun {
  id: string;
  store_id: string;
  agent: string;
  trigger: string;
  status: "success" | "error" | "running";
  summary: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useAgentRuns(limit = 20) {
  const { store } = useAuth();

  return useQuery<AgentRun[]>({
    queryKey: ["agent-runs", store?.id, limit],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from("agent_runs")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AgentRun[];
    },
    enabled: !!store?.id,
    staleTime: 60_000,
  });
}
