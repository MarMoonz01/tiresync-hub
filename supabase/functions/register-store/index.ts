import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = await req.json().catch(() => null);
  if (!body) return respond({ error: "Invalid request body" }, 400);

  const { email, password, fullName, storeName, storePhone, storeAddress, inviteCode } = body;

  if (!email || !password || !fullName || !storeName) {
    return respond({ error: "Missing required fields: email, password, fullName, storeName" }, 400);
  }
  if (password.length < 6) {
    return respond({ error: "Password must be at least 6 characters" }, 400);
  }
  if (!inviteCode || typeof inviteCode !== "string") {
    return respond({ error: "ต้องใช้รหัสเชิญเพื่อสร้างร้านค้า" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 0. Validate the invite code BEFORE creating anything.
  const normalizedCode = inviteCode.trim().toUpperCase();
  const { data: invite } = await admin
    .from("store_invite_codes")
    .select("id, used_at, expires_at")
    .eq("code", normalizedCode)
    .maybeSingle();

  if (!invite) return respond({ error: "รหัสเชิญไม่ถูกต้อง" }, 400);
  if (invite.used_at) return respond({ error: "รหัสเชิญนี้ถูกใช้ไปแล้ว" }, 400);
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return respond({ error: "รหัสเชิญหมดอายุแล้ว" }, 400);
  }

  // 1. Create auth user — email pre-confirmed, not signed in
  const { data: { user }, error: authError } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    user_metadata: { full_name: fullName.trim(), user_type: "owner" },
    email_confirm: true,
  });

  if (authError) return respond({ error: authError.message }, 400);

  // 2. Create store — ACTIVE immediately (a valid invite code is the approval).
  const { data: store, error: storeError } = await admin
    .from("stores")
    .insert({
      name: storeName.trim(),
      phone: storePhone?.trim() || null,
      address: storeAddress?.trim() || null,
      owner_id: user!.id,
      is_active: true,
    })
    .select("id, join_code")
    .single();

  if (storeError) {
    await admin.auth.admin.deleteUser(user!.id);
    return respond({ error: `Store creation failed: ${storeError.message}` }, 500);
  }

  // 3. Consume the invite code atomically-ish (guard against double use via used_at filter).
  const { data: claimed } = await admin
    .from("store_invite_codes")
    .update({ used_at: new Date().toISOString(), used_by: user!.id, store_id: store.id })
    .eq("id", invite.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();

  if (!claimed) {
    // Lost a race — someone consumed it first. Roll back.
    await admin.from("stores").delete().eq("id", store.id);
    await admin.auth.admin.deleteUser(user!.id);
    return respond({ error: "รหัสเชิญนี้ถูกใช้ไปแล้ว" }, 409);
  }

  // 4. Update profile created by handle_new_user trigger -> owner, approved.
  let updated = false;
  for (let i = 0; i < 5; i++) {
    const { error } = await admin
      .from("profiles")
      .update({ role: "owner", store_id: store.id, full_name: fullName.trim(), status: "approved" })
      .eq("user_id", user!.id);

    if (!error) { updated = true; break; }
    await new Promise((r) => setTimeout(r, 400));
  }

  if (!updated) {
    await admin.from("profiles").upsert(
      { user_id: user!.id, role: "owner", store_id: store.id, full_name: fullName.trim(), status: "approved" },
      { onConflict: "user_id" }
    );
  }

  return respond({ ok: true });
});

function respond(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
