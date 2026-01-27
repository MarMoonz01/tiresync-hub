import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface StoreAssociation {
  store_id: string;
  store_name: string;
  is_owner: boolean;
  role: string;
  is_approved: boolean;
  permissions: {
    web: { view: boolean; add: boolean; edit: boolean; delete: boolean };
    line: { view: boolean; adjust: boolean };
  } | null;
}

export function useUserStoreAssociations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-store-associations", user?.id],
    queryFn: async (): Promise<StoreAssociation[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .rpc("get_user_store_associations", { _user_id: user.id });

      if (error) {
        console.error("Error fetching store associations:", error);
        throw error;
      }

      return (data || []).map((item: any) => ({
        store_id: item.store_id,
        store_name: item.store_name,
        is_owner: item.is_owner,
        role: item.role,
        is_approved: item.is_approved,
        permissions: item.permissions,
      }));
    },
    enabled: !!user?.id,
  });
}
