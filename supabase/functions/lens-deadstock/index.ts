import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DEADSTOCK_DAYS = 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const threshold = new Date(Date.now() - DEADSTOCK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: stores } = await db.from("stores").select("id").eq("is_active", true);
  if (!stores?.length) return new Response(JSON.stringify({ flagged: 0 }), { headers: corsHeaders });

  let flagged = 0;

  for (const store of stores) {
    const { data: deadstock } = await db
      .from("tires")
      .select("id, brand, model, size, quantity, sell_price, last_sold_at")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .gt("quantity", 0)
      .or(`last_sold_at.lt.${threshold},last_sold_at.is.null`);

    if (!deadstock?.length) continue;

    const { data: owner } = await db
      .from("profiles")
      .select("user_id")
      .eq("store_id", store.id)
      .eq("role", "owner")
      .maybeSingle();

    if (!owner) continue;

    const names = deadstock.slice(0, 5).map((t) => `${t.brand} ${t.model} ${t.size}`).join(", ");

    await db.from("notifications").insert({
      store_id: store.id,
      user_id: owner.user_id,
      type: "deadstock",
      title: `LENS: สต็อกค้าง ${deadstock.length} รายการ`,
      body: `ยางที่ไม่ขายเกิน ${DEADSTOCK_DAYS} วัน: ${names}${deadstock.length > 5 ? ` และอีก ${deadstock.length - 5} รายการ` : ""}`,
      is_read: false,
      send_line: false,
    });

    await db.from("agent_runs").insert({
      store_id: store.id,
      agent: "LENS",
      trigger: "cron",
      status: "success",
      summary: `Flagged ${deadstock.length} deadstock items`,
      metadata: { deadstock_count: deadstock.length },
    });

    flagged += deadstock.length;
  }

  return new Response(
    JSON.stringify({ success: true, items_flagged: flagged }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
