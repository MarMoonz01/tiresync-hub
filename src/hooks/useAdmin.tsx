import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// store_subscriptions / agent_usage_log + their RPCs aren't in the generated
// Database types yet — reach them through an untyped client view.
const sb = supabase as unknown as SupabaseClient;

export interface PlatformMetrics {
  total_stores: number;
  active_stores: number;
  total_users: number;
  total_owners: number;
  total_staff: number;
  total_sales: number;
  total_revenue: number;
  unused_codes: number;
}

export interface InviteCode {
  id: string;
  code: string;
  note: string | null;
  store_id: string | null;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface AdminStore {
  id: string;
  name: string;
  phone: string | null;
  is_active: boolean;
  join_code: string | null;
  owner_id: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  status: string;
  store_id: string | null;
  created_at: string;
}

export interface AdminSubscription {
  id: string;
  store_id: string;
  plan: "trial" | "standard" | "suspended";
  status: "active" | "past_due" | "canceled";
  trial_ends_at: string | null;
}

export function useAdmin() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const metrics = useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: async (): Promise<PlatformMetrics> => {
      const { data, error } = await supabase.rpc("admin_platform_metrics");
      if (error) throw error;
      return data as unknown as PlatformMetrics;
    },
  });

  const codes = useQuery({
    queryKey: ["admin", "codes"],
    queryFn: async (): Promise<InviteCode[]> => {
      const { data, error } = await supabase
        .from("store_invite_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InviteCode[];
    },
  });

  const stores = useQuery({
    queryKey: ["admin", "stores"],
    queryFn: async (): Promise<AdminStore[]> => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, phone, is_active, join_code, owner_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminStore[];
    },
  });

  const users = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, email, full_name, role, status, store_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
  });

  const subscriptions = useQuery({
    queryKey: ["admin", "subscriptions"],
    queryFn: async (): Promise<AdminSubscription[]> => {
      const { data, error } = await sb
        .from("store_subscriptions")
        .select("id, store_id, plan, status, trial_ends_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminSubscription[];
    },
  });

  const setSubscription = useMutation({
    mutationFn: async ({ storeId, active }: { storeId: string; active: boolean }) => {
      const patch = active
        ? { plan: "standard", status: "active" }
        : { plan: "suspended", status: "canceled" };
      const { error } = await sb
        .from("store_subscriptions")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("store_id", storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
      toast({ title: "Subscription updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const generateCode = useMutation({
    mutationFn: async ({ note, expiresDays }: { note: string; expiresDays: number }) => {
      const { data, error } = await supabase.rpc("admin_generate_invite_code", {
        p_note: note || null,
        p_expires_days: expiresDays,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "codes"] });
      qc.invalidateQueries({ queryKey: ["admin", "metrics"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const revokeCode = useMutation({
    mutationFn: async (id: string) => {
      // Expire it now (keeps an audit trail). Only unused codes are revocable.
      const { error } = await supabase
        .from("store_invite_codes")
        .update({ expires_at: new Date().toISOString() })
        .eq("id", id)
        .is("used_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "codes"] });
      toast({ title: "Code revoked" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const setStoreActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("stores").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "stores"] });
      qc.invalidateQueries({ queryKey: ["admin", "metrics"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const setUserStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "User updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    metrics, codes, stores, users, subscriptions,
    generateCode, revokeCode, setStoreActive, setUserStatus, setSubscription,
  };
}
