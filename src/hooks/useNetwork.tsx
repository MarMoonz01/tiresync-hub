import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// store_network_links / store_directory / tires_interbranch_view aren't in the
// generated Database types — reach them through an untyped client view.
const sb = supabase as unknown as SupabaseClient;

export interface NetworkLink {
  id: string;
  requesting_store_id: string;
  target_store_id: string;
  status: "pending" | "accepted" | "revoked";
  created_at: string;
}

export interface DirectoryStore {
  id: string;
  name: string;
}

export interface LinkedTire {
  store_id: string;
  store_name: string;
  brand: string;
  model: string;
  size: string;
  quantity: number;
}

export function useNetwork() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { store } = useAuth();
  const myStoreId = store?.id ?? null;

  const links = useQuery({
    queryKey: ["network", "links"],
    queryFn: async (): Promise<NetworkLink[]> => {
      const { data, error } = await sb
        .from("store_network_links")
        .select("id, requesting_store_id, target_store_id, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NetworkLink[];
    },
  });

  const directory = useQuery({
    queryKey: ["network", "directory"],
    queryFn: async (): Promise<DirectoryStore[]> => {
      const { data, error } = await sb
        .from("store_directory")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data ?? []) as DirectoryStore[];
    },
  });

  const linkedStock = useQuery({
    queryKey: ["network", "linked-stock"],
    queryFn: async (): Promise<LinkedTire[]> => {
      const { data, error } = await sb
        .from("tires_interbranch_view")
        .select("store_id, store_name, brand, model, size, quantity")
        .order("brand")
        .limit(300);
      if (error) throw error;
      return (data ?? []) as LinkedTire[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["network"] });
  };

  const requestLink = useMutation({
    mutationFn: async (targetStoreId: string) => {
      const { error } = await sb.rpc("request_network_link", { p_target_store_id: targetStoreId });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Link requested" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const acceptLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await sb.rpc("accept_network_link", { p_link_id: linkId });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Link accepted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const revokeLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await sb.rpc("revoke_network_link", { p_link_id: linkId });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Link revoked" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Derived views ──────────────────────────────────────────────────────────
  const nameOf = (id: string) => directory.data?.find((s) => s.id === id)?.name ?? id.slice(0, 8);

  const all = links.data ?? [];
  const incoming = all.filter((l) => l.status === "pending" && l.target_store_id === myStoreId);
  const outgoing = all.filter((l) => l.status === "pending" && l.requesting_store_id === myStoreId);
  const partners = all
    .filter((l) => l.status === "accepted")
    .map((l) => ({
      link: l,
      storeId: l.requesting_store_id === myStoreId ? l.target_store_id : l.requesting_store_id,
    }));

  // Stores not yet linked / pending with us — candidates to request.
  const involvedIds = new Set(
    all.filter((l) => l.status !== "revoked").flatMap((l) => [l.requesting_store_id, l.target_store_id]),
  );
  const candidates = (directory.data ?? []).filter(
    (s) => s.id !== myStoreId && !involvedIds.has(s.id),
  );

  return {
    myStoreId, nameOf,
    links, directory, linkedStock,
    incoming, outgoing, partners, candidates,
    requestLink, acceptLink, revokeLink,
    isLoading: links.isLoading || directory.isLoading,
  };
}
