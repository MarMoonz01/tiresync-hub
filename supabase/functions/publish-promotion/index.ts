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

  const { store_id, promotion_id } = await req.json();

  const { data: promo } = await db.from("promotions").select("*").eq("id", promotion_id).eq("store_id", store_id).single();
  if (!promo) return new Response(JSON.stringify({ error: "Promotion not found" }), { status: 404, headers: corsHeaders });
  if (promo.status !== "approved") {
    return new Response(JSON.stringify({ error: "Promotion must be approved before publishing" }), { status: 400, headers: corsHeaders });
  }

  const { data: store } = await db
    .from("stores")
    .select("vault_line_token_ref, vault_line_oa_ref, vault_fb_token_ref, facebook_page_id")
    .eq("id", store_id)
    .single();

  const results: Record<string, unknown> = {};

  // LINE OA broadcast (if configured)
  if (store?.vault_line_token_ref && promo.line_copy) {
    try {
      const { data: secretRow } = await db
        .rpc("vault.decrypted_secrets")
        .select("decrypted_secret")
        .eq("id", store.vault_line_token_ref)
        .single() as { data: { decrypted_secret: string } | null };

      if (secretRow?.decrypted_secret) {
        const lineRes = await fetch("https://api.line.me/v2/bot/message/broadcast", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${secretRow.decrypted_secret}`,
          },
          body: JSON.stringify({
            messages: [{ type: "text", text: promo.line_copy }],
          }),
        });
        results.line = { status: lineRes.status, ok: lineRes.ok };
      }
    } catch (e) {
      results.line = { error: String(e) };
    }
  }

  // Mark as published
  await db.from("promotions").update({
    status: "published",
    published_at: new Date().toISOString(),
  }).eq("id", promotion_id);

  await db.from("agent_runs").insert({
    store_id,
    agent: "PIXEL",
    trigger: "manual",
    status: "success",
    summary: `Published promotion: ${promo.title}`,
    metadata: results,
  });

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
