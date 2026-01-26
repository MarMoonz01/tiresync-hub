import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface ProductStore {
  id: string;
  store_id: string;
  network_price: number | null;
  store: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  tire_dots: {
    id: string;
    dot_code: string;
    quantity: number;
    promotion: string | null;
  }[];
}

export interface MarketplaceProduct {
  // Unique key for the product
  productKey: string;
  brand: string;
  model: string | null;
  size: string;
  load_index: string | null;
  speed_rating: string | null;
  // Aggregated data
  totalQuantity: number;
  minPrice: number | null;
  maxPrice: number | null;
  storeCount: number;
  // All stores that have this product
  stores: ProductStore[];
}

const PAGE_SIZE = 20;

export function useMarketplaceProducts() {
  const { store } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<string>("");
  const [brands, setBrands] = useState<string[]>([]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all shared tires with filters
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
        .order("brand", { ascending: true })
        .order("model", { ascending: true });

      if (tiresError) throw tiresError;

      if (!tiresData || tiresData.length === 0) {
        setProducts([]);
        setTotalCount(0);
        return;
      }

      // Fetch store info
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

      // Group tires by product (brand + model + size + load_index + speed_rating)
      const productMap = new Map<string, MarketplaceProduct>();

      tiresData.forEach((tire) => {
        const productKey = `${tire.brand}|${tire.model || ""}|${tire.size}|${tire.load_index || ""}|${tire.speed_rating || ""}`;
        
        const tireStore = storesData?.find((s) => s.id === tire.store_id);
        const tireDots = dotsData?.filter((d) => d.tire_id === tire.id) || [];
        const tireQuantity = tireDots.reduce((sum, d) => sum + d.quantity, 0);

        const storeEntry: ProductStore = {
          id: tire.id,
          store_id: tire.store_id,
          network_price: tire.network_price,
          store: tireStore || { id: tire.store_id, name: "Unknown Store", logo_url: null },
          tire_dots: tireDots,
        };

        if (productMap.has(productKey)) {
          const existing = productMap.get(productKey)!;
          existing.stores.push(storeEntry);
          existing.totalQuantity += tireQuantity;
          existing.storeCount += 1;
          
          if (tire.network_price !== null) {
            if (existing.minPrice === null || tire.network_price < existing.minPrice) {
              existing.minPrice = tire.network_price;
            }
            if (existing.maxPrice === null || tire.network_price > existing.maxPrice) {
              existing.maxPrice = tire.network_price;
            }
          }
        } else {
          productMap.set(productKey, {
            productKey,
            brand: tire.brand,
            model: tire.model,
            size: tire.size,
            load_index: tire.load_index,
            speed_rating: tire.speed_rating,
            totalQuantity: tireQuantity,
            minPrice: tire.network_price,
            maxPrice: tire.network_price,
            storeCount: 1,
            stores: [storeEntry],
          });
        }
      });

      const allProducts = Array.from(productMap.values());
      setTotalCount(allProducts.length);

      // Paginate
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE;
      setProducts(allProducts.slice(from, to));

    } catch (err) {
      console.error("Error fetching marketplace products:", err);
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

  // Fetch unique brands
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
    fetchProducts();
  }, [fetchProducts]);

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
    products,
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
    refetch: fetchProducts,
  };
}
