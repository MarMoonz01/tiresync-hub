import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useDebouncedValue } from "./useDebouncedValue";

export interface Customer {
  id: string;
  store_id: string;
  name: string;
  phone: string | null;
  plate_number: string | null;
  car_model: string | null;
  last_visit: string | null;
  visit_count: number;
  total_spend: number;
  preferred_brand: string | null;
  segment: string | null;
  created_at: string;
}

export function useCustomers(search: string = "") {
  const { store } = useAuth();
  const debouncedSearch = useDebouncedValue(search, 300);

  return useQuery<Customer[]>({
    queryKey: ["customers", store?.id, debouncedSearch],
    queryFn: async () => {
      if (!store?.id) return [];

      let query = supabase
        .from("customers")
        .select("*")
        .eq("store_id", store.id)
        .order("total_spend", { ascending: false });

      if (debouncedSearch.trim()) {
        const term = `%${debouncedSearch.trim()}%`;
        query = query.or(`name.ilike.${term},phone.ilike.${term},plate_number.ilike.${term}`);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
    enabled: !!store?.id,
    staleTime: 60_000,
  });
}
