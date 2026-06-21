import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: stores } = await db.from("stores").select("id").eq("is_active", true);
  if (!stores?.length) return new Response(JSON.stringify({ drafted: 0 }), { headers: corsHeaders });

  let drafted = 0;

  for (const store of stores) {
    const { data: lowTires } = await db
      .from("tires")
      .select("id, brand, model, size, quantity, min_threshold, supplier, avg_cost")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .filter("quantity", "lte", "min_threshold");

    if (!lowTires?.length) continue;

    for (const tire of lowTires) {
      const reorder_qty = Math.max(tire.min_threshold * 2 - tire.quantity, 1);
      const tire_name = `${tire.brand} ${tire.model} ${tire.size}`;

      // Check if there's already a pending PO for this tire
      const { data: existing } = await db
        .from("purchase_orders")
        .select("id")
        .eq("store_id", store.id)
        .eq("tire_id", tire.id)
        .eq("status", "pending")
        .maybeSingle();

      if (existing) continue;

      await db.from("purchase_orders").insert({
        store_id: store.id,
        tire_id: tire.id,
        tire_name,
        supplier: tire.supplier ?? null,
        qty_requested: reorder_qty,
        unit_cost: tire.avg_cost ?? null,
        agent: "HAWK",
      });

      drafted++;
    }

    await db.from("agent_runs").insert({
      store_id: store.id,
      agent: "HAWK",
      trigger: "cron",
      status: "success",
      summary: `Drafted ${lowTires.length} purchase orders`,
    });
  }

  return new Response(
    JSON.stringify({ success: true, pos_drafted: drafted }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
