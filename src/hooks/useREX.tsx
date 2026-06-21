import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useDebouncedValue } from "./useDebouncedValue";

export interface REXSuggestion {
  tire_id: string;
  tire_name: string;
  sale_count: number;
}

export function useREX(carModel: string) {
  const { store } = useAuth();
  const debouncedModel = useDebouncedValue(carModel.trim().toLowerCase(), 500);

  return useQuery<REXSuggestion[]>({
    queryKey: ["rex", store?.id, debouncedModel],
    queryFn: async () => {
      if (!store?.id || !debouncedModel) return [];

      const { data, error } = await supabase
        .from("rex_mappings")
        .select("tire_id, tire_name, sale_count")
        .eq("store_id", store.id)
        .ilike("car_model", `%${debouncedModel}%`)
        .order("sale_count", { ascending: false })
        .limit(3);

      if (error) throw error;
      return (data ?? []) as REXSuggestion[];
    },
    enabled: !!store?.id && debouncedModel.length >= 2,
    staleTime: 60_000,
  });
}
