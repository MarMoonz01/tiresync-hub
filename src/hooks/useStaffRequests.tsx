import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface StaffJoinRequest {
  id: string;
  user_id: string;
  store_id: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  responded_at: string | null;
  responded_by: string | null;
  created_at: string;
  profile: {
    id: string;
    user_id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
}

export function useStaffRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { store, user } = useAuth();

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ["staff-requests", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];

      // Fetch pending requests for this store
      const { data: joinRequests, error: requestsError } = await supabase
        .from("staff_join_requests")
        .select("*")
        .eq("store_id", store.id)
        .eq("status", "pending")
        .order("requested_at", { ascending: false });

      if (requestsError) throw requestsError;
      if (!joinRequests || joinRequests.length === 0) return [];

      // Get user IDs to fetch profiles
      const userIds = joinRequests.map((r) => r.user_id);

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Combine requests with profiles
      const result: StaffJoinRequest[] = joinRequests.map((request) => ({
        ...request,
        status: request.status as "pending" | "approved" | "rejected",
        profile: profiles?.find((p) => p.user_id === request.user_id) || null,
      }));

      return result;
    },
    enabled: !!store?.id,
  });

  const approveRequestMutation = useMutation({
    mutationFn: async ({ requestId, permissions }: { requestId: string; permissions?: object }) => {
      if (!store?.id || !user?.id) throw new Error("No store or user found");

      // Get the request to find the user_id
      const { data: request, error: requestError } = await supabase
        .from("staff_join_requests")
        .select("user_id")
        .eq("id", requestId)
        .single();

      if (requestError) throw requestError;

      // Update request status
      const { error: updateError } = await supabase
        .from("staff_join_requests")
        .update({
          status: "approved",
          responded_at: new Date().toISOString(),
          responded_by: user.id,
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Add user as store member with permissions
      const defaultPermissions = {
        web: { view: true, add: false, edit: false, delete: false },
        line: { view: true, adjust: false },
      };

      const memberPermissions = permissions || defaultPermissions;

      const { error: memberError } = await supabase
        .from("store_members")
        .insert({
          store_id: store.id,
          user_id: request.user_id,
          role: "staff",
          permissions: memberPermissions as unknown as null,
          is_approved: true,
        });

      if (memberError) {
        // If already a member, just update approval status
        if (memberError.code === "23505") {
          await supabase
            .from("store_members")
            .update({ is_approved: true, permissions: memberPermissions as unknown as null })
            .eq("store_id", store.id)
            .eq("user_id", request.user_id);
        } else {
          throw memberError;
        }
      }

      // Update user's profile status to approved
      await supabase
        .from("profiles")
        .update({ status: "approved" })
        .eq("user_id", request.user_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-requests"] });
      queryClient.invalidateQueries({ queryKey: ["store-staff"] });
      toast({
        title: "Request approved",
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

  const rejectRequestMutation = useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      if (!user?.id) throw new Error("No user found");

      const { error } = await supabase
        .from("staff_join_requests")
        .update({
          status: "rejected",
          responded_at: new Date().toISOString(),
          responded_by: user.id,
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-requests"] });
      toast({
        title: "Request rejected",
        description: "The join request has been rejected.",
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

  const createJoinRequestMutation = useMutation({
    mutationFn: async ({ storeId }: { storeId: string }) => {
      if (!user?.id) throw new Error("No user found");

      const { error } = await supabase
        .from("staff_join_requests")
        .insert({
          user_id: user.id,
          store_id: storeId,
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error("You already have a pending request for this store");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Request sent",
        description: "Your request to join this store has been sent to the owner.",
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
    requests,
    isLoading,
    error,
    approveRequest: approveRequestMutation.mutate,
    rejectRequest: rejectRequestMutation.mutate,
    createJoinRequest: createJoinRequestMutation.mutate,
    isApproving: approveRequestMutation.isPending,
    isRejecting: rejectRequestMutation.isPending,
    isCreatingRequest: createJoinRequestMutation.isPending,
  };
}

export type { StaffJoinRequest };
