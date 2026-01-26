import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface FavoriteProduct {
  id: string;
  tire_id: string;
  created_at: string;
  tire: {
    id: string;
    brand: string;
    model: string | null;
    size: string;
    load_index: string | null;
    speed_rating: string | null;
    network_price: number | null;
  } | null;
}

export function useFavorites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          id,
          tire_id,
          created_at,
          tire:tires(id, brand, model, size, load_index, speed_rating, network_price)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((fav) => ({
        ...fav,
        tire: fav.tire as FavoriteProduct["tire"],
      }));

      setFavorites(mapped);
      setFavoriteIds(new Set(mapped.map((f) => f.tire_id)));
    } catch (err) {
      console.error("Error fetching favorites:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const isFavorite = useCallback(
    (tireId: string) => favoriteIds.has(tireId),
    [favoriteIds]
  );

  const toggleFavorite = async (tireId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save favorites.",
        variant: "destructive",
      });
      return;
    }

    const isCurrentlyFavorite = favoriteIds.has(tireId);

    try {
      if (isCurrentlyFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("tire_id", tireId);

        if (error) throw error;

        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(tireId);
          return next;
        });
        setFavorites((prev) => prev.filter((f) => f.tire_id !== tireId));

        toast({
          title: "Removed from favorites",
          description: "Product removed from your wishlist.",
        });
      } else {
        // Add to favorites
        const { data, error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, tire_id: tireId })
          .select()
          .single();

        if (error) throw error;

        setFavoriteIds((prev) => new Set(prev).add(tireId));
        
        toast({
          title: "Added to favorites ❤️",
          description: "Product saved to your wishlist.",
        });

        // Refetch to get full tire data
        fetchFavorites();
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
      toast({
        title: "Error",
        description: "Failed to update favorites.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return {
    favorites,
    favoriteIds,
    loading,
    isFavorite,
    toggleFavorite,
    refetch: fetchFavorites,
  };
}
