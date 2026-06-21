import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const token = authHeader.replace("Bearer ", "");
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const anonClient = createClient(SUPABASE_URL, token);
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const { po_id, action, qty_received, actual_cost } = await req.json();
  if (!po_id || !action) return new Response(JSON.stringify({ error: "po_id and action required" }), { status: 400, headers: corsHeaders });

  const { data: po } = await db.from("purchase_orders").select("*").eq("id", po_id).single();
  if (!po) return new Response(JSON.stringify({ error: "PO not found" }), { status: 404, headers: corsHeaders });

  if (action === "receive" && po.status === "approved" && po.tire_id) {
    const receivedQty = qty_received ?? po.qty_requested;
    const cost = actual_cost ?? po.unit_cost ?? 0;

    // Recalculate average cost and add stock
    await db.rpc("recalc_avg_cost_on_purchase", {
      p_tire_id: po.tire_id,
      p_new_qty: receivedQty,
      p_new_cost: cost,
    });

    // Log stock change
    const { data: tire } = await db.from("tires").select("quantity").eq("id", po.tire_id).single();
    const qtyBefore = tire?.quantity ?? 0;

    await db.from("stock_logs").insert({
      store_id: po.store_id,
      tire_id: po.tire_id,
      user_id: user.id,
      action: "purchase",
      qty_before: qtyBefore,
      qty_change: receivedQty,
      qty_after: qtyBefore + receivedQty,
      note: `PO received: ${po.tire_name}`,
    });

    // Log financial entry
    await db.from("financials").insert({
      store_id: po.store_id,
      type: "purchase",
      reference_id: po_id,
      revenue: 0,
      cogs: cost * receivedQty,
      gross_profit: -(cost * receivedQty),
      period_day: new Date().toISOString().split("T")[0],
      period_week: getISOWeek(),
      period_month: new Date().toISOString().slice(0, 7),
    });

    await db.from("purchase_orders").update({ status: "received", approved_at: new Date().toISOString() }).eq("id", po_id);
  } else {
    const status = action === "approve" ? "approved" : "rejected";
    await db.from("purchase_orders").update({
      status,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    }).eq("id", po_id);
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function getISOWeek(): string {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}
