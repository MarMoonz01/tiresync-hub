import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callClaude } from "../_shared/anthropic.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: stores } = await db.from("stores").select("id, name").eq("is_active", true);
  if (!stores?.length) return new Response(JSON.stringify({ processed: 0 }), { headers: corsHeaders });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  for (const store of stores) {
    try {
      // Gather weekly data
      const [{ data: salesData }, { data: trendData }] = await Promise.all([
        db.from("financials")
          .select("revenue, cogs, gross_profit, type")
          .eq("store_id", store.id)
          .eq("type", "sale")
          .gte("period_day", weekAgo.split("T")[0]),
        db.rpc("get_trending_tyres", { p_store_id: store.id, p_days: 7 }),
      ]);

      const totalRevenue = (salesData ?? []).reduce((s, r) => s + (r.revenue ?? 0), 0);
      const totalProfit = (salesData ?? []).reduce((s, r) => s + (r.gross_profit ?? 0), 0);
      const top5 = (trendData ?? []).slice(0, 5);

      const prompt = `You are ATLAS, a weekly business intelligence agent for a Thai tire shop named "${store.name}".

Weekly data:
- Total revenue: ฿${totalRevenue.toFixed(0)}
- Gross profit: ฿${totalProfit.toFixed(0)}
- Top selling tires: ${top5.map((t: {tire_name: string; units_sold: number}) => `${t.tire_name} (${t.units_sold} units)`).join(", ") || "none"}

Write a brief Thai-language weekly summary (3-4 sentences) highlighting performance and 1 actionable recommendation. Keep it concise and practical for a small tire shop owner.`;

      const response = await callClaude({
        db, storeId: store.id, agentName: "ATLAS",
        model: "claude-haiku-4-5-20251001", maxTokens: 300,
        messages: [{ role: "user", content: prompt }],
      });

      const summary = response.content[0].type === "text" ? response.content[0].text : "";

      // Store as weekly_summary financial entry
      await db.from("financials").insert({
        store_id: store.id,
        type: "weekly_summary",
        revenue: totalRevenue,
        gross_profit: totalProfit,
        period_day: new Date().toISOString().split("T")[0],
        period_week: getISOWeek(),
        period_month: new Date().toISOString().slice(0, 7),
      });

      // Store intelligence report
      await db.from("intelligence_reports").insert({
        store_id: store.id,
        agent: "ATLAS",
        report_type: "weekly_summary",
        content: { summary, revenue: totalRevenue, profit: totalProfit, top_tires: top5 },
        tokens_used: response.usage.input_tokens + response.usage.output_tokens,
      });

      await db.from("agent_runs").insert({
        store_id: store.id,
        agent: "ATLAS",
        trigger: "cron",
        status: "success",
        summary: `Weekly summary: ฿${totalRevenue.toFixed(0)} revenue`,
        metadata: { tokens_used: response.usage.input_tokens + response.usage.output_tokens },
      });
    } catch (err) {
      console.error(`ATLAS error for store ${store.id}:`, err);
      await db.from("agent_runs").insert({
        store_id: store.id,
        agent: "ATLAS",
        trigger: "cron",
        status: "error",
        summary: String(err),
      });
    }
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

function getISOWeek(): string {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}
