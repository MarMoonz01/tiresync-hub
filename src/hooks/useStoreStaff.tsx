import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface StoreMember {
  id: string;
  store_id: string;
  user_id: string;
  role: string;
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

export function useStoreStaff(searchQuery: string = "") {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { store } = useAuth();

  const { data: storeMembers = [], isLoading, error } = useQuery({
    queryKey: ["store-staff", store?.id, searchQuery],
    queryFn: async () => {
      if (!store?.id) return [];

      // Fetch store members with their profiles
      const { data: members, error: membersError } = await supabase
        .from("store_members")
        .select("*")
        .eq("store_id", store.id);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      // Get user IDs to fetch profiles
      const userIds = members.map((m) => m.user_id);

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Combine members with profiles
      let result: StoreMember[] = members.map((member) => ({
        ...member,
        profile: profiles?.find((p) => p.user_id === member.user_id) || null,
      }));

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        result = result.filter(
          (m) =>
            m.profile?.full_name?.toLowerCase().includes(query) ||
            m.profile?.email?.toLowerCase().includes(query)
        );
      }

      return result;
    },
    enabled: !!store?.id,
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      if (!store?.id) throw new Error("No store found");

      // First, find the user by email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) throw new Error("User not found with this email");

      // Add them as a store member
      const { error } = await supabase.from("store_members").insert({
        store_id: store.id,
        user_id: profile.user_id,
        role,
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("This user is already a member of your store");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-staff"] });
      toast({
        title: "Member added",
        description: "Staff member has been added to your store.",
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

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { error } = await supabase
        .from("store_members")
        .update({ role })
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-staff"] });
      toast({
        title: "Role updated",
        description: "Staff member role has been updated.",
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

  const removeMemberMutation = useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      const { error } = await supabase
        .from("store_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-staff"] });
      toast({
        title: "Member removed",
        description: "Staff member has been removed from your store.",
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
