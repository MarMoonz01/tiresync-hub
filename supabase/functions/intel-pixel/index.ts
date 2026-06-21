import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callClaude } from "../_shared/anthropic.ts";
import { buildPixelPrompt } from "../_prompts/pixel.ts";

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

  const { store_id, promotion_id } = await req.json();
  const { data: promo } = await db.from("promotions").select("*").eq("id", promotion_id).eq("store_id", store_id).single();
  if (!promo) return new Response(JSON.stringify({ error: "Promotion not found" }), { status: 404, headers: corsHeaders });

  const { data: store } = await db.from("stores").select("name").eq("id", store_id).single();

  const prompt = buildPixelPrompt(store!.name, {
    title: promo.title,
    description: promo.body_text ?? "",
    target_tires: [],
    discount_pct: promo.discount_pct ?? 0,
    duration_days: promo.start_date && promo.end_date
      ? Math.ceil((new Date(promo.end_date).getTime() - new Date(promo.start_date).getTime()) / 86400000)
      : 7,
  });

  const response = await callClaude({
    db, storeId: store_id, agentName: "PIXEL",
    model: "claude-haiku-4-5-20251001", maxTokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  let content: { facebook_copy?: string; line_copy?: string; hashtags?: string[] } = {};
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    content = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch {
    content = {};
  }

  await db.from("promotions").update({
    facebook_copy: content.facebook_copy ?? null,
    line_copy: content.line_copy ?? promo.line_copy ?? null,
    status: "pending_approval",
  }).eq("id", promotion_id);

  await db.from("agent_runs").insert({
    store_id, agent: "PIXEL", trigger: "manual", status: "success",
    summary: `Content generated for promotion: ${promo.title}`,
  });

  return new Response(JSON.stringify({ success: true, content }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
