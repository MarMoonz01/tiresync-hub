import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

// tire_dots isn't in the generated types — reach it via an untyped client.
const sb = supabase as unknown as SupabaseClient;

export interface DotBatch {
  id: string;
  tire_id: string;
  dot_code: string;
  quantity: number;
  position: number;
}

export interface SheetTire {
  id: string;
  brand: string;
  model: string | null;
  size: string;
  load_index: string | null;
  sell_price: number | null;
  quantity: number;
  dots: DotBatch[];
}

export function useStockSheet(search = "") {
  const { store } = useAuth();

  const query = useQuery<SheetTire[]>({
    queryKey: ["stock-sheet", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];

      const { data: tires, error: tErr } = await supabase
        .from("tires_owner_view")
        .select("id, brand, model, size, load_index, sell_price, quantity, is_active")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .order("brand");
      if (tErr) throw tErr;

      const tyres = (tires ?? []) as Omit<SheetTire, "dots">[];
      const ids = tyres.map((t) => t.id);
      let dots: DotBatch[] = [];
      if (ids.length) {
        const { data: dotRows } = await sb
          .from("tire_dots")
          .select("id, tire_id, dot_code, quantity, position")
          .in("tire_id", ids)
          .order("position");
        dots = (dotRows as DotBatch[]) ?? [];
      }

      const byTire: Record<string, DotBatch[]> = {};
      dots.forEach((d) => { (byTire[d.tire_id] ??= []).push(d); });

      return tyres.map((t) => ({ ...t, dots: (byTire[t.id] ?? []).sort((a, b) => a.position - b.position) }));
    },
    enabled: !!store?.id,
    staleTime: 30_000,
  });

  const filtered = !search.trim()
    ? query.data ?? []
    : (query.data ?? []).filter((t) =>
        `${t.brand} ${t.model ?? ""} ${t.size} ${t.load_index ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  return { ...query, tyres: filtered };
}

export function useStockSheetMutations() {
  const { store } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["stock-sheet"] });
    qc.invalidateQueries({ queryKey: ["owner-stock"] });
    qc.invalidateQueries({ queryKey: ["stock-lookup"] });
  };

  const addTire = useMutation({
    mutationFn: async (t: { brand: string; model: string; size: string; load_index: string; sell_price: number }) => {
      const { error } = await sb.from("tires").insert({
        store_id: store?.id, brand: t.brand, model: t.model || null, size: t.size,
        load_index: t.load_index || null, sell_price: t.sell_price, quantity: 0, is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "เพิ่มยางแล้ว" }); },
    onError: (e: Error) => toast({ title: "ผิดพลาด", description: e.message, variant: "destructive" }),
  });

  const updateTire = useMutation({
    mutationFn: async (t: { id: string; sell_price?: number; load_index?: string; brand?: string; model?: string; size?: string }) => {
      const patch: Record<string, unknown> = {};
      ["sell_price", "load_index", "brand", "model", "size"].forEach((k) => {
        if ((t as Record<string, unknown>)[k] !== undefined) patch[k] = (t as Record<string, unknown>)[k];
      });
      const { error } = await sb.from("tires").update(patch).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast({ title: "ผิดพลาด", description: e.message, variant: "destructive" }),
  });

  const upsertDot = useMutation({
    mutationFn: async (d: { id?: string; tire_id: string; position: number; dot_code: string; quantity: number }) => {
      if (d.id) {
        const { error } = await sb.from("tire_dots").update({ dot_code: d.dot_code, quantity: d.quantity }).eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("tire_dots").insert({
          tire_id: d.tire_id, position: d.position, dot_code: d.dot_code, quantity: d.quantity,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidate(); toast({ title: "บันทึก DOT แล้ว" }); },
    onError: (e: Error) => toast({ title: "ผิดพลาด", description: e.message, variant: "destructive" }),
  });

  const deleteDot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("tire_dots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "ลบ DOT แล้ว" }); },
    onError: (e: Error) => toast({ title: "ผิดพลาด", description: e.message, variant: "destructive" }),
  });

  return { addTire, updateTire, upsertDot, deleteDot };
}
