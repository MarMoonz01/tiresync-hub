import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = await req.json().catch(() => null);
  if (!body) return respond({ error: "Invalid request body" }, 400);

  const { email, password, fullName, pin } = body;

  if (!email || !password || !fullName) {
    return respond({ error: "Missing required fields: email, password, fullName" }, 400);
  }
  if (password.length < 6) {
    return respond({ error: "Password must be at least 6 characters" }, 400);
  }
  if (!pin || typeof pin !== "string") {
    return respond({ error: "ต้องใช้รหัสร้าน (PIN) เพื่อเข้าร่วม" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 0. Resolve the store PIN BEFORE creating anything.
  const normalizedPin = pin.trim().toUpperCase();
  const { data: store } = await admin
    .from("stores")
    .select("id, name, is_active")
    .eq("join_code", normalizedPin)
    .maybeSingle();

  if (!store) return respond({ error: "รหัสร้านไม่ถูกต้อง" }, 400);
  if (!store.is_active) return respond({ error: "ร้านนี้ยังไม่เปิดใช้งาน" }, 400);

  // 1. Create auth user — email pre-confirmed, not signed in.
  const { data: { user }, error: authError } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    user_metadata: { full_name: fullName.trim(), user_type: "staff" },
    email_confirm: true,
  });

  if (authError) return respond({ error: authError.message }, 400);

  // 2. Update profile created by handle_new_user trigger -> staff, approved, linked.
  const defaultPermissions = {
    web: { view: true, add: true, edit: true, delete: false },
    line: { view: true, adjust: true },
  };

  let updated = false;
  for (let i = 0; i < 5; i++) {
    const { error } = await admin
      .from("profiles")
      .update({
        role: "staff",
        store_id: store.id,
        status: "approved",
        full_name: fullName.trim(),
        staff_position: "staff",
        permissions: defaultPermissions,
      })
      .eq("user_id", user!.id);

    if (!error) { updated = true; break; }
    await new Promise((r) => setTimeout(r, 400));
  }

  if (!updated) {
    await admin.from("profiles").upsert(
      {
        user_id: user!.id, role: "staff", store_id: store.id, status: "approved",
        full_name: fullName.trim(), staff_position: "staff", permissions: defaultPermissions,
      },
      { onConflict: "user_id" }
    );
  }

  return respond({ ok: true, store_name: store.name });
});

function respond(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
