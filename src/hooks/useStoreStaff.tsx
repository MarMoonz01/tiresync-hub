import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { permissionsForRole, type StorePermissions } from "@/lib/permissions";

// Shape consumed by the Staff UI components. Sourced from `profiles` (the single
// source of truth) — `id` is the profile PK, `role` is the staff_position.
interface StoreMember {
  id: string;
  store_id: string;
  user_id: string;
  role: string;
  permissions: StorePermissions | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  profile: {
    id: string;
    user_id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    status: "pending" | "approved" | "rejected" | "suspended";
  } | null;
}

// Loose profile row (generated types don't yet include staff_position/permissions).
interface ProfileRow {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  store_id: string | null;
  role: string | null;
  staff_position: string | null;
  permissions: StorePermissions | null;
  created_at: string;
  updated_at: string;
}

export function useStoreStaff(searchQuery: string = "") {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { store } = useAuth();

  const { data: storeMembers = [], isLoading, error } = useQuery({
    queryKey: ["store-staff", store?.id, searchQuery],
    queryFn: async () => {
      if (!store?.id) return [];

      const { data, error: staffError } = await supabase
        .from("profiles")
        .select("*")
        .eq("store_id", store.id)
        .eq("role", "staff");

      if (staffError) throw staffError;
      const rows = (data ?? []) as unknown as ProfileRow[];

      let result: StoreMember[] = rows.map((p) => ({
        id: p.id,
        store_id: p.store_id ?? store.id,
        user_id: p.user_id,
        role: p.staff_position ?? "staff",
        permissions: p.permissions ?? null,
        is_approved: p.status === "approved",
        created_at: p.created_at,
        updated_at: p.updated_at,
        profile: {
          id: p.id,
          user_id: p.user_id,
          email: p.email,
          full_name: p.full_name,
          phone: p.phone,
          avatar_url: p.avatar_url,
          status: p.status,
        },
      }));

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(
          (m) =>
            m.profile?.full_name?.toLowerCase().includes(q) ||
            m.profile?.email?.toLowerCase().includes(q)
        );
      }

      return result;
    },
    enabled: !!store?.id,
  });

  // Add an existing user (by email) as staff — via SECURITY DEFINER RPC.
  const addMemberMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const permissions = permissionsForRole(role);
      const { data, error: rpcError } = await supabase.rpc("add_staff_member", {
        p_email: email,
        p_position: role,
        p_permissions: permissions as never,
      });
      if (rpcError) throw rpcError;
      const res = data as { success: boolean; error?: string } | null;
      if (res && !res.success) {
        if (res.error === "user_not_found") throw new Error("User not found with this email");
        throw new Error(res.error ?? "Failed to add member");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-staff"] });
      toast({ title: "Member added", description: "Staff member has been added to your store." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Change position + permissions. memberId is profiles.id (owner UPDATE RLS allows).
  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const newPermissions = permissionsForRole(role);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ staff_position: role, permissions: newPermissions } as never)
        .eq("id", memberId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-staff"] });
      toast({ title: "Role updated", description: "Staff member role and permissions have been updated." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Remove staff: unlink from the store (keeps the user account).
  const removeMemberMutation = useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      const { error: removeError } = await supabase
        .from("profiles")
        .update({ store_id: null, role: null, status: "suspended" } as never)
        .eq("id", memberId);
      if (removeError) throw removeError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-staff"] });
      toast({ title: "Member removed", description: "Staff member has been removed from your store." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return {
    storeMembers,
    isLoading,
    error,
    addMember: addMemberMutation.mutate,
    updateMemberRole: updateMemberRoleMutation.mutate,
    removeMember: removeMemberMutation.mutate,
    isAddingMember: addMemberMutation.isPending,
    isUpdatingRole: updateMemberRoleMutation.isPending,
    isRemovingMember: removeMemberMutation.isPending,
  };
}

export type { StoreMember };
