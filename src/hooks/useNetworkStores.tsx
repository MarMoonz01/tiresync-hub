import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface NetworkStore {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export function useNetworkStores() {
  const { store: myStore } = useAuth();
  const [stores, setStores] = useState<NetworkStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("stores_public")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      // Exclude own store
      if (myStore) {
        query = query.neq("id", myStore.id);
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setStores((data as NetworkStore[]) || []);
    } catch (err) {
      console.error("Error fetching stores:", err);
      setError("Failed to load partner stores");
    } finally {
      setLoading(false);
    }
  }, [myStore, searchQuery]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  return {
    stores,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    refetch: fetchStores,
  };
}
