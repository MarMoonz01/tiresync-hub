import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callClaude } from "../_shared/anthropic.ts";
import { buildSparkPrompt } from "../_prompts/spark.ts";

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

  const { store_id } = await req.json();
  const { data: store } = await db.from("stores").select("name").eq("id", store_id).single();
  if (!store) return new Response(JSON.stringify({ error: "Store not found" }), { status: 404, headers: corsHeaders });

  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();
  const trendResult = await db.rpc("get_trending_tyres", { p_store_id: store_id, p_days: 30 });

  const { data: deadstock } = await db
    .from("tires")
    .select("id, brand, model, size, quantity, last_sold_at")
    .eq("store_id", store_id)
    .eq("is_active", true)
    .gt("quantity", 0)
    .or(`last_sold_at.lt.${sixtyDaysAgo},last_sold_at.is.null`);

  const deadstockItems = (deadstock ?? []).map((t) => ({
    tire_name: `${t.brand} ${t.model} ${t.size}`,
    qty: t.quantity,
    days_no_sale: t.last_sold_at
      ? Math.floor((Date.now() - new Date(t.last_sold_at).getTime()) / 86400000)
      : 999,
  }));

  const prompt = buildSparkPrompt(store.name, {
    deadstockTires: deadstockItems.slice(0, 10),
    topTires: (trendResult.data ?? []).slice(0, 5) as { tire_name: string; units_sold: number }[],
    currentMonth: new Date().getMonth() + 1,
  });

  const response = await callClaude({
    db, storeId: store_id, agentName: "SPARK",
    model: "claude-haiku-4-5-20251001", maxTokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "[]";
  const tokens = response.usage.input_tokens + response.usage.output_tokens;

  let proposals: unknown[] = [];
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    proposals = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    proposals = [];
  }

  // Insert proposals as draft promotions
  for (const p of proposals as Record<string, unknown>[]) {
    await db.from("promotions").insert({
      store_id,
      title: String(p.title ?? "โปรโมชันใหม่"),
      body_text: String(p.description ?? ""),
      line_copy: String(p.line_message ?? ""),
      discount_pct: Number(p.discount_pct ?? 0),
      status: "draft",
      agent: "SPARK",
    });
  }

  await db.from("agent_runs").insert({
    store_id, agent: "SPARK", trigger: "manual", status: "success",
    summary: `Generated ${proposals.length} promotion proposals`,
    metadata: { tokens_used: tokens, proposals_count: proposals.length },
  });

  return new Response(JSON.stringify({ success: true, proposals_count: proposals.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
