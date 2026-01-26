import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface NetworkTire {
  id: string;
  store_id: string;
  size: string;
  brand: string;
  model: string | null;
  load_index: string | null;
  speed_rating: string | null;
  network_price: number | null;
  is_shared: boolean;
  created_at: string;
  store?: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  tire_dots?: {
    id: string;
    dot_code: string;
    quantity: number;
    promotion: string | null;
  }[];
}

const PAGE_SIZE = 20;

export function useNetworkTires() {
  const { store } = useAuth();
  const { toast } = useToast();
  const [tires, setTires] = useState<NetworkTire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<string>("");

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const fetchNetworkTires = useCallback(async () => {
    try {
      setLoading(true);

      // Build count query
      let countQuery = supabase
        .from("tires")
        .select("*", { count: "exact", head: true })
        .eq("is_shared", true);

      // Exclude own store's tires
      if (store) {
        countQuery = countQuery.neq("store_id", store.id);
      }

      // Apply search filter
      if (searchQuery) {
        countQuery = countQuery.or(
          `brand.ilike.%${searchQuery}%,size.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%`
        );
      }

      // Apply brand filter
      if (brandFilter !== "all") {
        countQuery = countQuery.eq("brand", brandFilter);
      }

      // Apply size filter
      if (sizeFilter) {
        countQuery = countQuery.ilike("size", `%${sizeFilter}%`);
      }

      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Fetch paginated data
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let tiresQuery = supabase
        .from("tires")
        .select("*")
        .eq("is_shared", true);

      if (store) {
        tiresQuery = tiresQuery.neq("store_id", store.id);
      }

      if (searchQuery) {
        tiresQuery = tiresQuery.or(
          `brand.ilike.%${searchQuery}%,size.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%`
        );
      }

      if (brandFilter !== "all") {
        tiresQuery = tiresQuery.eq("brand", brandFilter);
      }

      if (sizeFilter) {
        tiresQuery = tiresQuery.ilike("size", `%${sizeFilter}%`);
      }

      const { data: tiresData, error: tiresError } = await tiresQuery
        .order("created_at", { ascending: false })
        .range(from, to);

      if (tiresError) throw tiresError;

      if (tiresData && tiresData.length > 0) {
        // Fetch store info for each tire
        const storeIds = [...new Set(tiresData.map((t) => t.store_id))];
        const { data: storesData } = await supabase
          .from("stores_public")
          .select("id, name, logo_url")
          .in("id", storeIds);

        // Fetch tire_dots
        const tireIds = tiresData.map((t) => t.id);
        const { data: dotsData } = await supabase
          .from("tire_dots")
          .select("id, tire_id, dot_code, quantity, promotion")
          .in("tire_id", tireIds)
          .order("position", { ascending: true });

        // Combine data
        const tiresWithDetails = tiresData.map((tire) => ({
          ...tire,
          store: storesData?.find((s) => s.id === tire.store_id) || undefined,
          tire_dots: dotsData?.filter((d) => d.tire_id === tire.id) || [],
        }));

        setTires(tiresWithDetails);
      } else {
        setTires([]);
      }
    } catch (err) {
      console.error("Error fetching network tires:", err);
      setError("Failed to load marketplace");
      toast({
        title: "Error",
        description: "Failed to load marketplace",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [store, toast, page, searchQuery, brandFilter, sizeFilter]);

  // Fetch unique brands for filter
  const [brands, setBrands] = useState<string[]>([]);
  
  const fetchBrands = useCallback(async () => {
    const { data } = await supabase
      .from("tires")
      .select("brand")
      .eq("is_shared", true);
    
    if (data) {
      const uniqueBrands = [...new Set(data.map((t) => t.brand))].sort();
      setBrands(uniqueBrands);
    }
  }, []);

  useEffect(() => {
    fetchNetworkTires();
  }, [fetchNetworkTires]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, brandFilter, sizeFilter]);

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return {
    tires,
    loading,
    error,
    page,
    totalPages,
    totalCount,
    searchQuery,
    setSearchQuery,
    brandFilter,
    setBrandFilter,
    sizeFilter,
    setSizeFilter,
    brands,
    goToPage,
    refetch: fetchNetworkTires,
  };
}
