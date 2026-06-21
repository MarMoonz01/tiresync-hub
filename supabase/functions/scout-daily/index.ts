import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Find all active stores
  const { data: stores } = await db.from("stores").select("id, name").eq("is_active", true);
  if (!stores?.length) return new Response(JSON.stringify({ processed: 0 }), { headers: corsHeaders });

  let processed = 0;

  for (const store of stores) {
    // Find low-stock tires for this store
    const { data: lowTires } = await db
      .from("tires")
      .select("id, brand, model, size, quantity, min_threshold")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .filter("quantity", "lte", "min_threshold");

    if (!lowTires?.length) continue;

    // Find owner
    const { data: owner } = await db
      .from("profiles")
      .select("user_id, line_user_id")
      .eq("store_id", store.id)
      .eq("role", "owner")
      .maybeSingle();

    if (!owner) continue;

    const summaryLines = lowTires.map(
      (t) => `• ${t.brand} ${t.model} ${t.size}: ${t.quantity} เส้น (ต่ำกว่า ${t.min_threshold})`
    );

    const message = `📊 SCOUT รายงานสต็อกต่ำ\n${store.name}\n\n${summaryLines.join("\n")}`;

    // Insert notification
    await db.from("notifications").insert({
      store_id: store.id,
      user_id: owner.user_id,
      type: "scout_daily",
      title: `SCOUT: สต็อกต่ำ ${lowTires.length} รายการ`,
      body: message,
      is_read: false,
      send_line: true,
    });

    // Log agent run
    await db.from("agent_runs").insert({
      store_id: store.id,
      agent: "SCOUT",
      trigger: "cron",
      status: "success",
      summary: `Found ${lowTires.length} low-stock items`,
      metadata: { low_tire_count: lowTires.length },
    });

    processed++;
  }

  return new Response(
    JSON.stringify({ success: true, stores_processed: processed }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
