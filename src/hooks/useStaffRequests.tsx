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
      // Approval runs through a SECURITY DEFINER RPC: the target staff profile
      // has no store_id yet, so an owner can't reach it via RLS. The RPC verifies
      // the caller owns the request's store, then sets profiles.status/role/
      // store_id/permissions atomically (single source of truth = profiles).
      const defaultPermissions = {
        web: { view: true, add: false, edit: false, delete: false },
        line: { view: true, adjust: false },
      };
      const { data, error } = await supabase.rpc("approve_staff_request", {
        p_request_id: requestId,
        p_position: "staff",
        p_permissions: (permissions ?? defaultPermissions) as never,
      });
      if (error) throw error;
      if (data && !(data as { success: boolean }).success) {
        throw new Error((data as { error: string }).error ?? "approve_failed");
      }
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
      const { data, error } = await supabase.rpc("reject_staff_request", {
        p_request_id: requestId,
      });
      if (error) throw error;
      if (data && !(data as { success: boolean }).success) {
        throw new Error((data as { error: string }).error ?? "reject_failed");
      }
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

      // Send LINE push notification to store owner
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v1/line-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "staff_request",
            store_id: storeId,
            requester_user_id: user.id,
          }),
        });
      } catch {
        // Don't throw - notification failure shouldn't block the request
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
