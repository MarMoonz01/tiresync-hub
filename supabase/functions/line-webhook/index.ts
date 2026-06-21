import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const LINE_API_URL   = "https://api.line.me/v2/bot/message/reply";
const LINE_PUSH_URL  = "https://api.line.me/v2/bot/message/push";
const ITEMS_PER_PAGE = 9;

// ─── Types ───────────────────────────────────────────────────────────────────

interface LineEvent {
  type: string;
  replyToken: string;
  source: { userId: string };
  message?: { type: string; text: string };
  postback?: { data: string };
}

interface TireRow {
  id: string;
  brand: string;
  model: string | null;
  size: string;
  quantity: number;
  sell_price: number | null;
  min_threshold: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifySignature(body: string, sig: string, secret: string): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const buf = await crypto.subtle.sign("HMAC", key, enc.encode(body));
    return sig === btoa(String.fromCharCode(...new Uint8Array(buf)));
  } catch { return false; }
}

async function sendReply(token: string, replyToken: string, messages: object[]) {
  if (!token) return;
  await fetch(LINE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ replyToken, messages }),
  });
}

async function pushMessage(token: string, userId: string, messages: object[]) {
  if (!token) return;
  await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ to: userId, messages }),
  });
}

// Resolve LINE access token from Vault if vault ref is set, else fall back to DB column
async function resolveLineToken(db: ReturnType<typeof createClient>, store: { line_channel_access_token: string | null; vault_line_token_ref: string | null }): Promise<string> {
  if (store.vault_line_token_ref) {
    try {
      const { data } = await db.rpc("vault.decrypted_secrets" as never, { id: store.vault_line_token_ref } as never);
      if (data) return data;
    } catch { /* fall through to DB column */ }
  }
  return store.line_channel_access_token ?? Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") ?? "";
}

// Find which store this webhook belongs to by HMAC signature
async function verifyAndFindStore(db: ReturnType<typeof createClient>, body: string, sig: string) {
  const { data: stores } = await db
    .from("stores")
    .select("id, name, line_channel_secret, line_channel_access_token, vault_line_token_ref")
    .not("line_channel_secret", "is", null);

  if (!stores) return null;
  for (const store of stores) {
    if (store.line_channel_secret && await verifySignature(body, sig, store.line_channel_secret)) {
      const accessToken = await resolveLineToken(db, store);
      return { storeId: store.id as string, storeName: store.name as string, accessToken };
    }
  }
  return null;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

async function getProfile(db: ReturnType<typeof createClient>, lineUserId: string, storeId: string) {
  const { data } = await db
    .from("profiles")
    .select("user_id, role, store_id")
    .eq("line_user_id", lineUserId)
    .eq("store_id", storeId)
    .maybeSingle();
  return data as { user_id: string; role: string; store_id: string } | null;
}

// ─── Tire Search ─────────────────────────────────────────────────────────────

async function searchTires(db: ReturnType<typeof createClient>, keyword: string, storeId: string, page: number) {
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE;

  // Sanitize keyword for size pattern (strip separators)
  const sanitized = keyword.replace(/[/\-\s]/g, "").toLowerCase();
  const fuzzy = "%" + sanitized.split("").join("%") + "%";

  const { data: tires } = await db
    .from("tires")
    .select("id, brand, model, size, quantity, sell_price, min_threshold")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .or(`size.ilike.${fuzzy},brand.ilike.%${keyword}%,model.ilike.%${keyword}%`)
    .range(from, to);

  if (!tires) return { tires: [], hasNextPage: false };
  const hasNextPage = tires.length > ITEMS_PER_PAGE;
  return { tires: (tires as TireRow[]).slice(0, ITEMS_PER_PAGE), hasNextPage };
}

// ─── Flex Messages ───────────────────────────────────────────────────────────

function buildTireCarousel(tires: TireRow[], canAdjust: boolean, page: number, keyword: string, hasNextPage: boolean): object {
  if (tires.length === 0) {
    return {
      type: "flex", altText: "ไม่พบยางที่ค้นหา",
      contents: {
        type: "bubble",
        body: { type: "box", layout: "vertical", contents: [
          { type: "text", text: "🔍 ไม่พบยางที่ค้นหา", weight: "bold", size: "lg", color: "#2563EB" },
          { type: "text", text: `คำค้นหา: "${keyword}"`, size: "sm", color: "#666666", margin: "md", wrap: true },
        ]},
      },
    };
  }

  const bubbles = tires.map((t) => {
    const stockOk    = t.quantity > t.min_threshold;
    const stockLow   = t.quantity > 0 && t.quantity <= t.min_threshold;
    const stockEmpty = t.quantity <= 0;
    const stockLabel = stockEmpty ? "❌ หมดสต็อก" : stockLow ? "⚠️ เหลือน้อย" : "✅ มีสินค้า";
    const stockColor = stockEmpty ? "#EF4444"    : stockLow ? "#F59E0B"    : "#22C55E";

    const bodyContents: object[] = [
      {
        type: "box", layout: "horizontal", contents: [
          { type: "text", text: "สต็อก:", size: "md", color: "#555555", flex: 2 },
          { type: "text", text: `${t.quantity} เส้น`, size: "md", weight: "bold", align: "end", color: stockColor, flex: 3 },
        ],
      },
      {
        type: "box", layout: "horizontal", margin: "sm", contents: [
          { type: "text", text: "สถานะ:", size: "sm", color: "#888888", flex: 2 },
          { type: "text", text: stockLabel, size: "sm", align: "end", color: stockColor, flex: 3 },
        ],
      },
      {
        type: "box", layout: "horizontal", margin: "md", contents: [
          { type: "text", text: "ราคา:", size: "md", color: "#111111", weight: "bold" },
          { type: "text", text: t.sell_price ? `฿${t.sell_price.toLocaleString()}` : "สอบถาม", size: "md", color: "#2563EB", weight: "bold", align: "end" },
        ],
      },
    ];

    // Stock adjust buttons for staff/owner
    if (canAdjust && t.quantity > 0) {
      bodyContents.push({
        type: "box", layout: "horizontal", margin: "lg", spacing: "sm", contents: [
          {
            type: "button", style: "secondary", height: "sm", flex: 1,
            action: { type: "postback", label: "− ขาย 1", data: `action=sell&tire_id=${t.id}&qty=1&name=${encodeURIComponent(t.brand + " " + t.size)}` },
          },
          {
            type: "button", style: "primary", color: "#2563EB", height: "sm", flex: 1,
            action: { type: "postback", label: "+ รับ 1",  data: `action=receive&tire_id=${t.id}&qty=1&name=${encodeURIComponent(t.brand + " " + t.size)}` },
          },
        ],
      });
    }

    return {
      type: "bubble",
      header: {
        type: "box", layout: "vertical", backgroundColor: "#2563EB", paddingAll: "lg",
        contents: [
          { type: "text", text: t.brand.toUpperCase(), weight: "bold", size: "lg", color: "#FFFFFF" },
          { type: "text", text: `${t.model ?? ""} ${t.size}`.trim(), size: "sm", color: "#E0E7FF", margin: "xs" },
        ],
      },
      body: { type: "box", layout: "vertical", paddingAll: "lg", contents: bodyContents },
    };
  });

  if (hasNextPage) {
    bubbles.push({
      type: "bubble",
      body: {
        type: "box", layout: "vertical", justifyContent: "center", alignItems: "center",
        contents: [
          { type: "text", text: "ยังมีสินค้าอีก...", weight: "bold", color: "#666666", margin: "md" },
          {
            type: "button", style: "primary", color: "#2563EB", margin: "md",
            action: { type: "postback", label: `หน้า ${page + 1} ➡️`, data: `action=search&keyword=${encodeURIComponent(keyword)}&page=${page + 1}` },
          },
        ],
      },
    });
  }

  return { type: "flex", altText: `ค้นหา "${keyword}" หน้า ${page}`, contents: { type: "carousel", contents: bubbles } };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body      = await req.text();
    const signature = req.headers.get("x-line-signature");
    if (!signature) return new Response("Missing signature", { status: 401 });

    const matched = await verifyAndFindStore(db, body, signature);
    if (!matched) return new Response("Invalid signature", { status: 401 });

    const { storeId, storeName, accessToken } = matched;
    const { events } = JSON.parse(body) as { events: LineEvent[] };

    // Verification ping from LINE
    if (events.length === 0) {
      await db.from("stores").update({ line_webhook_verified: true, line_webhook_verified_at: new Date().toISOString() }).eq("id", storeId);
      return new Response("OK");
    }

    for (const event of events) {
      const lineUserId = event.source.userId;

      // ── Text message ──────────────────────────────────────────────────────
      if (event.type === "message" && event.message?.type === "text") {
        const text = event.message.text.trim();

        // 6-char code → link LINE account
        if (/^[A-Z0-9]{6}$/i.test(text)) {
          const code = text.toUpperCase();
          const { data: linkCode } = await db.from("line_link_codes").select("user_id, expires_at").eq("code", code).maybeSingle();

          if (!linkCode || new Date(linkCode.expires_at) < new Date()) {
            await sendReply(accessToken, event.replyToken, [{ type: "text", text: "❌ รหัสไม่ถูกต้องหรือหมดอายุ กรุณาสร้างรหัสใหม่ในแอป" }]);
            continue;
          }

          await db.from("profiles").update({ line_user_id: lineUserId }).eq("user_id", linkCode.user_id);
          await db.from("line_link_codes").delete().eq("code", code);
          await sendReply(accessToken, event.replyToken, [{ type: "text", text: `🎉 เชื่อมต่อสำเร็จ! ตอนนี้พิมพ์ค้นหายางได้เลย` }]);
          continue;
        }

        // Search tires
        const profile  = await getProfile(db, lineUserId, storeId);
        const canView  = !!profile;
        const canAdjust = profile?.role === "owner" || profile?.role === "staff";

        if (!canView) {
          await sendReply(accessToken, event.replyToken, [{ type: "text", text: `🔒 กรุณาเชื่อมต่อบัญชีก่อน\nเปิดแอป → Settings → เชื่อมต่อ LINE` }]);
          continue;
        }

        const { tires, hasNextPage } = await searchTires(db, text, storeId, 1);
        await sendReply(accessToken, event.replyToken, [buildTireCarousel(tires, canAdjust, 1, text, hasNextPage)]);
      }

      // ── Postback ──────────────────────────────────────────────────────────
      if (event.type === "postback" && event.postback) {
        const p      = new URLSearchParams(event.postback.data);
        const action = p.get("action");

        // Pagination
        if (action === "search") {
          const page    = parseInt(p.get("page") ?? "1");
          const keyword = p.get("keyword") ?? "";
          const profile = await getProfile(db, lineUserId, storeId);
          if (!profile) { await sendReply(accessToken, event.replyToken, [{ type: "text", text: "ไม่มีสิทธิ์" }]); continue; }

          const canAdjust = profile.role === "owner" || profile.role === "staff";
          const { tires, hasNextPage } = await searchTires(db, keyword, storeId, page);
          await sendReply(accessToken, event.replyToken, [buildTireCarousel(tires, canAdjust, page, keyword, hasNextPage)]);
        }

        // Sell 1 unit (staff/owner only)
        else if (action === "sell" || action === "receive") {
          const profile = await getProfile(db, lineUserId, storeId);
          if (!profile || (profile.role !== "owner" && profile.role !== "staff")) {
            await sendReply(accessToken, event.replyToken, [{ type: "text", text: "⚠️ ไม่มีสิทธิ์ปรับสต็อก" }]);
            continue;
          }

          const tireId = p.get("tire_id")!;
          const qty    = parseInt(p.get("qty") ?? "1");
          const name   = decodeURIComponent(p.get("name") ?? "ยาง");

          if (action === "sell") {
            const { data: ok } = await db.rpc("deduct_stock_atomic", { p_tire_id: tireId, p_qty: qty });
            if (!ok) {
              await sendReply(accessToken, event.replyToken, [{ type: "text", text: `❌ สต็อก ${name} ไม่เพียงพอ` }]);
            } else {
              await db.from("stock_logs").insert({ store_id: storeId, tire_id: tireId, user_id: profile.user_id, action: "line_sell", qty_change: -qty, note: "LINE Bot sale" });
              await sendReply(accessToken, event.replyToken, [{ type: "text", text: `✅ ขาย ${name} −${qty} เส้นแล้ว` }]);
            }
          } else {
            const { data: tire } = await db.from("tires").select("quantity").eq("id", tireId).single();
            if (tire) {
              await db.from("tires").update({ quantity: (tire as { quantity: number }).quantity + qty, updated_at: new Date().toISOString() }).eq("id", tireId);
              await db.from("stock_logs").insert({ store_id: storeId, tire_id: tireId, user_id: profile.user_id, action: "line_receive", qty_change: qty, note: "LINE Bot receive" });
              await sendReply(accessToken, event.replyToken, [{ type: "text", text: `✅ รับ ${name} +${qty} เส้นแล้ว` }]);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[WEBHOOK]", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
