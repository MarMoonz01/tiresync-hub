import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface TireDot {
  id?: string;
  tire_id?: string;
  dot_code: string;
  quantity: number;
  promotion: string | null;
  position: number;
}

export interface Tire {
  id: string;
  store_id: string;
  size: string;
  brand: string;
  model: string | null;
  load_index: string | null;
  speed_rating: string | null;
  price: number | null;
  network_price: number | null;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  tire_dots?: TireDot[];
}

export interface TireFormData {
  size: string;
  brand: string;
  model: string;
  load_index: string;
  speed_rating: string;
  price: string;
  network_price: string;
  is_shared: boolean;
  dots: {
    dot_code: string;
    quantity: string;
    promotion: string;
  }[];
}

const PAGE_SIZE = 20;

export function useTires() {
  const { store } = useAuth();
  const { toast } = useToast();
  const [tires, setTires] = useState<Tire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const fetchTires = useCallback(async () => {
    if (!store) {
      setTires([]);
      setLoading(false);
      setTotalCount(0);
      return;
    }

    try {
      setLoading(true);
      
      let query = supabase
        .from("tires")
        .select("*", { count: "exact" })
        .eq("store_id", store.id);

      if (searchQuery) {
        query = query.or(`brand.ilike.%${searchQuery}%,size.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%`);
      }

      if (brandFilter !== "all") {
        query = query.eq("brand", brandFilter);
      }

      const { count } = await query;
      setTotalCount(count || 0);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let tiresQuery = supabase
        .from("tires")
        .select("*")
        .eq("store_id", store.id);

      if (searchQuery) {
        tiresQuery = tiresQuery.or(`brand.ilike.%${searchQuery}%,size.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%`);
      }

      if (brandFilter !== "all") {
        tiresQuery = tiresQuery.eq("brand", brandFilter);
      }

      const { data: tiresData, error: tiresError } = await tiresQuery
        .order("created_at", { ascending: false })
        .range(from, to);

      if (tiresError) throw tiresError;

      if (tiresData && tiresData.length > 0) {
        const tireIds = tiresData.map((t) => t.id);
        const { data: dotsData, error: dotsError } = await supabase
          .from("tire_dots")
          .select("*")
          .in("tire_id", tireIds)
          .order("position", { ascending: true });

        if (dotsError) throw dotsError;

        let tiresWithDots = tiresData.map((tire) => ({
          ...tire,
          tire_dots: dotsData?.filter((dot) => dot.tire_id === tire.id) || [],
        }));

        if (stockFilter !== "all") {
          tiresWithDots = tiresWithDots.filter((tire) => {
            const totalQty = tire.tire_dots.reduce((sum, d) => sum + d.quantity, 0);
            if (stockFilter === "out") return totalQty === 0;
            if (stockFilter === "low") return totalQty > 0 && totalQty <= 4;
            if (stockFilter === "in") return totalQty > 4;
            return true;
          });
        }

        setTires(tiresWithDots);
      } else {
        setTires([]);
      }
    } catch (err) {
      console.error("Error fetching tires:", err);
      setError("Failed to load inventory");
      toast({
        title: "Error",
        description: "Failed to load inventory",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [store, toast, page, searchQuery, brandFilter, stockFilter]);

  const createTire = async (formData: TireFormData) => {
    if (!store) throw new Error("No store found");

    const { data: tireData, error: tireError } = await supabase
      .from("tires")
      .insert({
        store_id: store.id,
        size: formData.size,
        brand: formData.brand,
        model: formData.model || null,
        load_index: formData.load_index || null,
        speed_rating: formData.speed_rating || null,
        price: formData.price ? parseFloat(formData.price) : null,
        network_price: formData.network_price ? parseFloat(formData.network_price) : null,
        is_shared: formData.is_shared,
      })
      .select()
      .single();

    if (tireError) throw tireError;

    const validDots = formData.dots.filter((d) => d.dot_code.trim() !== "");
    if (validDots.length > 0) {
      const dotsToInsert = validDots.map((dot, index) => ({
        tire_id: tireData.id,
        dot_code: dot.dot_code,
        quantity: parseInt(dot.quantity) || 0,
        promotion: dot.promotion || null,
        position: index + 1,
      }));

      const { error: dotsError } = await supabase
        .from("tire_dots")
        .insert(dotsToInsert);

      if (dotsError) throw dotsError;
    }

    await fetchTires();
    return tireData;
  };

  const updateTire = async (tireId: string, formData: TireFormData) => {
    const { error: tireError } = await supabase
      .from("tires")
      .update({
        size: formData.size,
        brand: formData.brand,
        model: formData.model || null,
        load_index: formData.load_index || null,
        speed_rating: formData.speed_rating || null,
        price: formData.price ? parseFloat(formData.price) : null,
        network_price: formData.network_price ? parseFloat(formData.network_price) : null,
        is_shared: formData.is_shared,
      })
      .eq("id", tireId);

    if (tireError) throw tireError;

    await supabase.from("tire_dots").delete().eq("tire_id", tireId);

    const validDots = formData.dots.filter((d) => d.dot_code.trim() !== "");
    if (validDots.length > 0) {
      const dotsToInsert = validDots.map((dot, index) => ({
        tire_id: tireId,
        dot_code: dot.dot_code,
        quantity: parseInt(dot.quantity) || 0,
        promotion: dot.promotion || null,
        position: index + 1,
      }));

      const { error: dotsError } = await supabase
        .from("tire_dots")
        .insert(dotsToInsert);

      if (dotsError) throw dotsError;
    }

    await fetchTires();
  };

  const deleteTire = async (tireId: string) => {
    const { error } = await supabase.from("tires").delete().eq("id", tireId);
    if (error) throw error;
    await fetchTires();
  };

  // --- จุดที่แก้ไขหลัก: เพิ่มการส่ง user_id ---
  const updateDotQuantity = async (
    dotId: string,
    change: number,
    notes?: string
  ) => {
    // 1. ดึงข้อมูล User ปัจจุบัน
    const { data: { user } } = await supabase.auth.getUser();

    const { data: dotData, error: fetchError } = await supabase
      .from("tire_dots")
      .select("*")
      .eq("id", dotId)
      .single();

    if (fetchError) throw fetchError;

    const quantityBefore = dotData.quantity;
    const quantityAfter = Math.max(0, quantityBefore + change);

    const { error: updateError } = await supabase
      .from("tire_dots")
      .update({ quantity: quantityAfter })
      .eq("id", dotId);

    if (updateError) throw updateError;

    // 2. บันทึก Log พร้อม user_id
    const { error: logError } = await supabase.from("stock_logs").insert({
      tire_dot_id: dotId,
      action: change > 0 ? "add" : "remove", // ใช้ "add" หรือ "remove" (Audit Log กรองด้วยคำนี้)
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      quantity_change: change,
      notes: notes || null,
      user_id: user?.id || null, // <--- ส่งค่า user_id ไปด้วย
    });

    if (logError) {
      console.error("Failed to log stock change:", logError);
      // Optional: แจ้งเตือนถ้า Log พัง (แต่ปกติไม่ควรพังถ้าผ่าน RLS แล้ว)
    }

    await fetchTires();
  };

  useEffect(() => {
    fetchTires();
  }, [fetchTires]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, brandFilter, stockFilter]);

  const toggleShare = async (tireId: string, isShared: boolean) => {
    const { error } = await supabase
      .from("tires")
      .update({ is_shared: isShared })
      .eq("id", tireId);

    if (error) throw error;
    await fetchTires();
  };

  return {
    tires,
    loading,
    error,
    page,
    setPage,
    totalPages,
    totalCount,
    searchQuery,
    setSearchQuery,
    brandFilter,
    setBrandFilter,
    stockFilter,
    setStockFilter,
    fetchTires,
    createTire,
    updateTire,
    deleteTire,
    updateDotQuantity,
    toggleShare,
  };
}