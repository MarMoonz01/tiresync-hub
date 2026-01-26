import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];
type UserStatus = Database["public"]["Enums"]["user_status"];
type AppRole = Database["public"]["Enums"]["app_role"];

export interface StaffMember extends Profile {
  roles: UserRole[];
}

export function useStaff(searchQuery: string = "") {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: staffMembers = [], isLoading, error } = useQuery({
    queryKey: ["staff", searchQuery],
    queryFn: async () => {
      // Fetch all profiles
      let query = supabase.from("profiles").select("*");
      
      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }
      
      const { data: profiles, error: profilesError } = await query.order("created_at", { ascending: false });
      
      if (profilesError) throw profilesError;
      if (!profiles) return [];

      // Fetch all roles
      const { data: allRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");
      
      if (rolesError) throw rolesError;

      // Map roles to profiles
      const staffWithRoles: StaffMember[] = profiles.map((profile) => ({
        ...profile,
        roles: allRoles?.filter((role) => role.user_id === profile.user_id) || [],
      }));

      return staffWithRoles;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: UserStatus }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status })
        .eq("user_id", userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({
        title: "Status updated",
        description: "User status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({
        title: "Role added",
        description: "User role has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ roleId }: { roleId: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({
        title: "Role removed",
        description: "User role has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    staffMembers,
    isLoading,
    error,
    updateStatus: updateStatusMutation.mutate,
    addRole: addRoleMutation.mutate,
    removeRole: removeRoleMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    isUpdatingRoles: addRoleMutation.isPending || removeRoleMutation.isPending,
  };
}
