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

export function useTires() {
  const { store } = useAuth();
  const { toast } = useToast();
  const [tires, setTires] = useState<Tire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTires = useCallback(async () => {
    if (!store) {
      setTires([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: tiresData, error: tiresError } = await supabase
        .from("tires")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      if (tiresError) throw tiresError;

      // Fetch tire_dots for all tires
      if (tiresData && tiresData.length > 0) {
        const tireIds = tiresData.map((t) => t.id);
        const { data: dotsData, error: dotsError } = await supabase
          .from("tire_dots")
          .select("*")
          .in("tire_id", tireIds)
          .order("position", { ascending: true });

        if (dotsError) throw dotsError;

        // Combine tires with their dots
        const tiresWithDots = tiresData.map((tire) => ({
          ...tire,
          tire_dots: dotsData?.filter((dot) => dot.tire_id === tire.id) || [],
        }));

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
  }, [store, toast]);

  const createTire = async (formData: TireFormData) => {
    if (!store) {
      throw new Error("No store found");
    }

    // Insert tire
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

    // Insert tire_dots
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
    // Update tire
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

    // Delete existing dots and re-insert
    await supabase.from("tire_dots").delete().eq("tire_id", tireId);

    // Insert new dots
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

  const updateDotQuantity = async (
    dotId: string,
    change: number,
    notes?: string
  ) => {
    // Get current dot data
    const { data: dotData, error: fetchError } = await supabase
      .from("tire_dots")
      .select("*")
      .eq("id", dotId)
      .single();

    if (fetchError) throw fetchError;

    const quantityBefore = dotData.quantity;
    const quantityAfter = Math.max(0, quantityBefore + change);

    // Update quantity
    const { error: updateError } = await supabase
      .from("tire_dots")
      .update({ quantity: quantityAfter })
      .eq("id", dotId);

    if (updateError) throw updateError;

    // Log the change
    const { error: logError } = await supabase.from("stock_logs").insert({
      tire_dot_id: dotId,
      action: change > 0 ? "add" : "remove",
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      quantity_change: change,
      notes: notes || null,
    });

    if (logError) console.error("Failed to log stock change:", logError);

    await fetchTires();
  };

  useEffect(() => {
    fetchTires();
  }, [fetchTires]);

  return {
    tires,
    loading,
    error,
    fetchTires,
    createTire,
    updateTire,
    deleteTire,
    updateDotQuantity,
  };
}
