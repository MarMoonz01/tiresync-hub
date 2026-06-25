import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { parseExcelFile, type TireImportRow } from "@/lib/excelParser";

// Normalize brand/model/size into one key for catalog matching.
function catalogKey(brand: string, model: string, size: string) {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "").trim();
  return `${norm(brand)}|${norm(model)}|${norm(size)}`;
}

export interface ImportPreview {
  matched: TireImportRow[];
  unmatched: TireImportRow[];
}

export function useStockImport() {
  const { store } = useAuth();
  const queryClient = useQueryClient();
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: parse the file and split rows by whether they match the master catalog.
  const analyze = useCallback(async (file: File) => {
    setError(null);
    setParsing(true);
    setPreview(null);
    try {
      const { parsedData } = await parseExcelFile(file);
      if (parsedData.length === 0) throw new Error("ไม่พบข้อมูลในไฟล์");

      // Pull the catalog and build a lookup set of normalized keys.
      const { data: catalog, error: catErr } = await supabase
        .from("master_tires")
        .select("brand, model, size");
      if (catErr) throw catErr;

      const catalogSet = new Set(
        (catalog ?? []).map((c) => catalogKey(c.brand, c.model, c.size))
      );

      const matched: TireImportRow[] = [];
      const unmatched: TireImportRow[] = [];
      for (const row of parsedData) {
        if (catalogSet.has(catalogKey(row.brand, row.model, row.size))) matched.push(row);
        else unmatched.push(row);
      }

      setPreview({ matched, unmatched });
      return { matched, unmatched };
    } catch (e) {
      setError(e instanceof Error ? e.message : "อ่านไฟล์ไม่สำเร็จ");
      return null;
    } finally {
      setParsing(false);
    }
  }, []);

  // Step 2: write the matched rows into this store's stock (upsert by brand+model+size).
  const confirmImport = useCallback(async () => {
    if (!store?.id || !preview) return { ok: false, count: 0 };
    setImporting(true);
    setError(null);
    try {
      // Existing stock for this store, keyed for fast lookup.
      const { data: existing, error: exErr } = await supabase
        .from("tires_owner_view")
        .select("id, brand, model, size")
        .eq("store_id", store.id);
      if (exErr) throw exErr;

      const byKey = new Map<string, string>();
      for (const t of existing ?? []) byKey.set(catalogKey(t.brand, t.model, t.size), t.id);

      const inserts: Record<string, unknown>[] = [];
      const updates: { id: string; quantity: number; sell_price: number; avg_cost: number }[] = [];

      for (const row of preview.matched) {
        const key = catalogKey(row.brand, row.model, row.size);
        const id = byKey.get(key);
        if (id) {
          updates.push({ id, quantity: row.quantity, sell_price: row.price, avg_cost: row.cost });
        } else {
          inserts.push({
            store_id: store.id,
            brand: row.brand,
            model: row.model,
            size: row.size,
            quantity: row.quantity,
            sell_price: row.price,
            price: row.price,
            avg_cost: row.cost,
            is_active: true,
          });
        }
      }

      if (inserts.length) {
        const { error } = await supabase.from("tires").insert(inserts);
        if (error) throw error;
      }
      // Updates run in parallel (each is a single-row update by id).
      for (let i = 0; i < updates.length; i += 25) {
        const chunk = updates.slice(i, i + 25);
        await Promise.all(
          chunk.map((u) =>
            supabase.from("tires")
              .update({ quantity: u.quantity, sell_price: u.sell_price, avg_cost: u.avg_cost })
              .eq("id", u.id)
          )
        );
      }

      queryClient.invalidateQueries({ queryKey: ["owner-stock"] });
      const count = inserts.length + updates.length;
      setPreview(null);
      return { ok: true, count };
    } catch (e) {
      setError(e instanceof Error ? e.message : "นำเข้าไม่สำเร็จ");
      return { ok: false, count: 0 };
    } finally {
      setImporting(false);
    }
  }, [store?.id, preview, queryClient]);

  const reset = useCallback(() => { setPreview(null); setError(null); }, []);

  return { analyze, confirmImport, reset, parsing, importing, preview, error };
}
