import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SaleInput {
  tire_id: string;
  quantity_sold: number;
  sell_price: number;
  services?: string[];
  service_total?: number;
  plate_number?: string;
  car_model?: string;
  customer_name?: string;
  phone?: string;
  promotion_id?: string;
}

interface SaleResult {
  success: boolean;
  error?: string;
  sale_id?: string;
  customer_id?: string;
  store_id?: string;
  tire_name?: string;
  qty_after?: number;
  min_threshold?: number;
  low_stock?: boolean;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ── Auth: require a valid session ─────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Missing auth token" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(SUPABASE_URL, token);
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body: SaleInput = await req.json();
    const { tire_id, quantity_sold, sell_price } = body;
    if (!tire_id || !quantity_sold || quantity_sold < 1 || !sell_price) {
      return json({ error: "Invalid input" }, 400);
    }

    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Resolve the staff profile PK from the authenticated user (server-derived,
    // never trusted from the client). sales_log.staff_id -> profiles.id.
    const { data: staffProfile } = await db
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    // ── Atomic sale: one transaction (deduct + log + financials + customer + sales_log) ──
    const { data: result, error: rpcError } = await db.rpc("record_sale_txn", {
      p_tire_id: tire_id,
      p_quantity_sold: quantity_sold,
      p_sell_price: sell_price,
      p_service_total: body.service_total ?? 0,
      p_services: body.services ?? [],
      p_plate_number: body.plate_number ?? null,
      p_car_model: body.car_model ?? null,
      p_customer_name: body.customer_name ?? null,
      p_phone: body.phone ?? null,
      p_promotion_id: body.promotion_id ?? null,
      p_staff_id: staffProfile?.id ?? null,
      p_user_id: user.id,
    });

    if (rpcError) {
      console.error("record_sale_txn error:", rpcError);
      return json({ error: "Internal server error", detail: rpcError.message }, 500);
    }

    const sale = result as SaleResult;

    if (!sale?.success) {
      if (sale?.error === "insufficient_stock") {
        return json({ error: "insufficient_stock", message: "สต็อกไม่เพียงพอ" }, 409);
      }
      if (sale?.error === "tire_not_found") return json({ error: "Tire not found" }, 404);
      return json({ error: sale?.error ?? "sale_failed" }, 400);
    }

    // ── PING: stock-low notification + LINE push (non-transactional, best-effort) ──
    if (sale.low_stock) {
      const { data: owner } = await db
        .from("profiles")
        .select("user_id, line_user_id")
        .eq("store_id", sale.store_id!)
        .eq("role", "owner")
        .maybeSingle();

      if (owner) {
        await db.from("notifications").insert({
          store_id: sale.store_id,
          user_id: owner.user_id,
          type: "stock_low",
          title: `สต็อกต่ำ: ${sale.tire_name}`,
          body: `เหลือ ${sale.qty_after} เส้น (ต่ำกว่า ${sale.min_threshold})`,
          is_read: false,
          send_line: true,
          reference_id: tire_id,
          reference_type: "tire",
        });

        if (owner.line_user_id) {
          await db.functions.invoke("line-push-notification", {
            body: {
              store_id: sale.store_id,
              user_id: owner.user_id,
              message: `⚠️ สต็อกต่ำ\n${sale.tire_name}\nเหลือ ${sale.qty_after} เส้น`,
            },
          });
        }
      }
    }

    return json({
      success: true,
      sale_id: sale.sale_id ?? null,
      receipt_url: null,
      low_stock: sale.low_stock ?? false,
    });
  } catch (err) {
    console.error("record-sale error:", err);
    return json({ error: "Internal server error", detail: String(err) }, 500);
  }
});
