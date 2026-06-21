import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callClaude } from "../_shared/anthropic.ts";
import { buildOraclePrompt } from "../_prompts/oracle.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const token = authHeader.replace("Bearer ", "");
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const anonClient = createClient(SUPABASE_URL, token);
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const { store_id } = await req.json();
  if (!store_id) return new Response(JSON.stringify({ error: "store_id required" }), { status: 400, headers: corsHeaders });

  const { data: store } = await db.from("stores").select("name").eq("id", store_id).single();
  if (!store) return new Response(JSON.stringify({ error: "Store not found" }), { status: 404, headers: corsHeaders });

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const [{ data: finData }, trendData, { count: customerCount }, { count: lowStockCount }] = await Promise.all([
    db.from("financials").select("revenue, gross_profit").eq("store_id", store_id).eq("type", "sale").gte("period_day", weekAgo),
    db.rpc("get_trending_tyres", { p_store_id: store_id, p_days: 7 }),
    db.from("customers").select("id", { count: "exact", head: true }).eq("store_id", store_id),
    db.from("tires").select("id", { count: "exact", head: true }).eq("store_id", store_id).eq("is_active", true).filter("quantity", "lte", "min_threshold"),
  ]);

  const weeklyRevenue = (finData ?? []).reduce((s, r) => s + (r.revenue ?? 0), 0);
  const weeklyProfit = (finData ?? []).reduce((s, r) => s + (r.gross_profit ?? 0), 0);

  const prompt = buildOraclePrompt(store.name, {
    weeklyRevenue,
    weeklyProfit,
    topTires: (trendData.data ?? []).slice(0, 5) as { tire_name: string; units_sold: number }[],
    lowStockCount: lowStockCount ?? 0,
    customerCount: customerCount ?? 0,
  });

  const response = await callClaude({
    db, storeId: store_id, agentName: "ORACLE",
    model: "claude-haiku-4-5-20251001", maxTokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const insight = response.content[0].type === "text" ? response.content[0].text : "";
  const tokens = response.usage.input_tokens + response.usage.output_tokens;

  await db.from("intelligence_reports").insert({
    store_id, agent: "ORACLE", report_type: "weekly_insight",
    content: { insight, weeklyRevenue, weeklyProfit },
    tokens_used: tokens,
  });

  await db.from("agent_runs").insert({
    store_id, agent: "ORACLE", trigger: "manual", status: "success",
    summary: "Weekly insight generated", metadata: { tokens_used: tokens },
  });

  return new Response(JSON.stringify({ success: true, insight }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
