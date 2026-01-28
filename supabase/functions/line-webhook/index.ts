import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-line-signature",
};

const LOW_STOCK_THRESHOLD = 4;

// LINE API endpoints
const LINE_API_URL = "https://api.line.me/v2/bot/message/reply";

interface LineEvent {
  type: string;
  replyToken: string;
  source: { userId: string; type: string };
  message?: { type: string; text: string; id: string };
  postback?: { data: string };
}

interface LineWebhookBody {
  events: LineEvent[];
}

interface TireDot {
  id: string;
  dot_code: string;
  quantity: number;
  position: number;
  promotion: string | null;
}

interface Store {
  name: string;
}

interface TireWithDots {
  id: string;
  brand: string;
  model: string | null;
  size: string;
  price: number | null;
  store_id: string;
  tire_dots: TireDot[];
  stores: Store | Store[] | null;
}

interface UserPermissions {
  user_id: string;
  store_id: string;
  is_owner: boolean;
  permissions: {
    web: { view: boolean; add: boolean; edit: boolean; delete: boolean };
    line: { view: boolean; adjust: boolean };
  } | null;
  is_approved: boolean;
}

// Helper to get store name from stores field (handles both single object and array)
function getStoreName(stores: Store | Store[] | null | undefined): string {
  if (!stores) return "ร้านค้า";
  if (Array.isArray(stores)) {
    return stores[0]?.name || "ร้านค้า";
  }
  return stores.name || "ร้านค้า";
}

// Signature verification using Web Crypto API
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    
    return signature === expectedSignature;
  } catch (error) {
    console.error("[VERIFY] Signature verification error:", error);
    return false;
  }
}

// Sanitize tire size input for fuzzy matching
function sanitizeSizeInput(input: string): string {
  return input.replace(/[\/Rr\-\s]/g, '').toLowerCase();
}

// Build a flexible search pattern for tire sizes
function buildFuzzyPattern(sanitized: string): string {
  let pattern = '%';
  for (let i = 0; i < sanitized.length; i++) {
    pattern += sanitized[i] + '%';
  }
  return pattern;
}

// Get user permissions from LINE user ID
// deno-lint-ignore no-explicit-any
async function getUserPermissions(supabase: any, lineUserId: string, storeId?: string): Promise<UserPermissions | null> {
  try {
    console.log(`[AUTH] Getting permissions for LINE user: ${lineUserId}, store filter: ${storeId || 'none'}`);
    
    const { data, error } = await supabase
      .rpc("get_line_user_permissions", { 
        _line_user_id: lineUserId,
        _store_id: storeId || null
      });

    if (error) {
      console.error("[AUTH] Error getting user permissions:", error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log("[AUTH] No permissions found for LINE user");
      return null;
    }

    // Return the matching record
    const record = data[0];
    return {
      user_id: record.user_id,
      store_id: record.store_id,
      is_owner: record.is_owner,
      permissions: record.permissions,
      is_approved: record.is_approved,
    };
  } catch (err) {
    console.error("[AUTH] Failed to get user permissions:", err);
    return null;
  }
}

// Check if user can adjust stock
function canAdjustStock(userPerms: UserPermissions | null): boolean {
  if (!userPerms) return false;
  if (!userPerms.is_approved) return false;
  if (userPerms.is_owner) return true;
  return userPerms.permissions?.line?.adjust ?? false;
}

// Check if user can view stock
function canViewStock(userPerms: UserPermissions | null): boolean {
  if (!userPerms) return false;
  if (!userPerms.is_approved) return false;
  if (userPerms.is_owner) return true;
  return userPerms.permissions?.line?.view ?? true;
}

// Generate success Flex Message after linking (for general users)
function generateLinkSuccessFlexMessage(userPerms: UserPermissions | null): object {
  const isOwner = userPerms?.is_owner ?? false;
  const canView = userPerms?.is_owner || userPerms?.permissions?.line?.view;
  const canAdjust = userPerms?.is_owner || userPerms?.permissions?.line?.adjust;

  const capabilities: object[] = [];
  
  if (canView) {
    capabilities.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: "📦", size: "sm", flex: 0 },
        { type: "text", text: "ค้นหาและดูสต็อก", size: "sm", color: "#333333", margin: "sm", flex: 1 }
      ]
    });
  }

  if (canAdjust) {
    capabilities.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: "➕", size: "sm", flex: 0 },
        { type: "text", text: "ปรับจำนวนสต็อก", size: "sm", color: "#333333", margin: "sm", flex: 1 }
      ],
      margin: "sm"
    });
  }

  if (isOwner) {
    capabilities.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: "👑", size: "sm", flex: 0 },
        { type: "text", text: "สิทธิ์ผู้ดูแลร้านค้า", size: "sm", color: "#333333", margin: "sm", flex: 1 }
      ],
      margin: "sm"
    });
  }

  return {
    type: "flex",
    altText: "เชื่อมต่อบัญชีสำเร็จ!",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "✅ เชื่อมต่อบัญชีสำเร็จ!", weight: "bold", size: "lg", color: "#FFFFFF" }
        ],
        backgroundColor: "#22C55E",
        paddingAll: "lg"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "บัญชีเว็บของคุณเชื่อมต่อกับ LINE แล้ว", size: "sm", color: "#666666", wrap: true },
          { type: "separator", margin: "lg" },
          { type: "text", text: "สิทธิ์ของคุณ:", size: "sm", color: "#888888", margin: "lg" },
          { type: "box", layout: "vertical", contents: capabilities, margin: "md" },
          { type: "separator", margin: "lg" },
          { type: "text", text: "💡 ลองค้นหา: \"265/65R17\"", size: "sm", color: "#2563EB", margin: "lg" }
        ],
        paddingAll: "lg"
      }
    }
  };
}

// Generate staff-specific success Flex Message
function generateStaffSuccessFlexMessage(userPerms: UserPermissions | null, storeId?: string): object {
  const canView = userPerms?.permissions?.line?.view ?? true;
  const canAdjust = userPerms?.permissions?.line?.adjust ?? false;
  const isApproved = userPerms?.is_approved ?? false;

  const capabilities: object[] = [];

  if (!isApproved) {
    capabilities.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: "⏳", size: "sm", flex: 0 },
        { type: "text", text: "รอการอนุมัติจากเจ้าของร้าน", size: "sm", color: "#F59E0B", margin: "sm", flex: 1, weight: "bold" }
      ]
    });
  }

  if (canView) {
    capabilities.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: "📦", size: "sm", flex: 0 },
        { type: "text", text: "ค้นหาและดูสต็อก", size: "sm", color: "#333333", margin: "sm", flex: 1 }
      ],
      margin: capabilities.length > 0 ? "sm" : "none"
    });
  }

  if (canAdjust) {
    capabilities.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: "➕", size: "sm", flex: 0 },
        { type: "text", text: "ปรับจำนวนสต็อก", size: "sm", color: "#333333", margin: "sm", flex: 1 }
      ],
      margin: "sm"
    });
  } else {
    capabilities.push({
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: "👀", size: "sm", flex: 0 },
        { type: "text", text: "ดูสต็อกเท่านั้น (ไม่สามารถปรับได้)", size: "sm", color: "#888888", margin: "sm", flex: 1 }
      ],
      margin: "sm"
    });
  }

  return {
    type: "flex",
    altText: "👤 เชื่อมต่อบัญชีพนักงานสำเร็จ!",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "👤 เชื่อมต่อบัญชีพนักงานสำเร็จ!", weight: "bold", size: "lg", color: "#FFFFFF" }
        ],
        backgroundColor: "#4F46E5",
        paddingAll: "lg"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: isApproved ? "บัญชีของคุณเชื่อมต่อและพร้อมใช้งานแล้ว" : "บัญชีของคุณเชื่อมต่อแล้ว รอการอนุมัติ", size: "sm", color: "#666666", wrap: true },
          { type: "separator", margin: "lg" },
          { type: "text", text: "สิทธิ์ของคุณ:", size: "sm", color: "#888888", margin: "lg" },
          { type: "box", layout: "vertical", contents: capabilities, margin: "md" },
          { type: "separator", margin: "lg" },
          { type: "text", text: isApproved ? "💡 ลองค้นหา: \"265/65R17\"" : "💡 ติดต่อเจ้าของร้านเพื่อขอสิทธิ์เพิ่มเติม", size: "sm", color: isApproved ? "#4F46E5" : "#888888", margin: "lg", wrap: true }
        ],
        paddingAll: "lg"
      }
    }
  };
}

// Generate owner-specific success Flex Message
function generateOwnerSuccessFlexMessage(storeName: string): object {
  return {
    type: "flex",
    altText: "👑 ยืนยันตัวตนเจ้าของร้านสำเร็จ!",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "👑 เจ้าของร้านยืนยันแล้ว!", weight: "bold", size: "lg", color: "#FFFFFF" }
        ],
        backgroundColor: "#F59E0B",
        paddingAll: "lg"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: `ร้าน: ${storeName}`, size: "md", color: "#333333", weight: "bold" },
          { type: "separator", margin: "lg" },
          { type: "text", text: "สิทธิ์ผู้ดูแลระบบ:", size: "sm", color: "#888888", margin: "lg" },
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "✅ จัดการสต็อกทั้งหมด", size: "sm", color: "#333333" },
              { type: "text", text: "✅ อนุมัติ/ปฏิเสธพนักงาน", size: "sm", color: "#333333", margin: "xs" },
              { type: "text", text: "✅ รับแจ้งเตือนคำขอเข้าร่วม", size: "sm", color: "#333333", margin: "xs" },
              { type: "text", text: "✅ ดูรายงานและสถิติ", size: "sm", color: "#333333", margin: "xs" }
            ],
            margin: "md"
          }
        ],
        paddingAll: "lg"
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: { type: "message", label: "🔍 เช็คสต็อก", text: "สต็อก" },
            style: "primary",
            color: "#F59E0B"
          }
        ],
        paddingAll: "md"
      }
    }
  };
}

// Handle LINE account linking with Store Context
// deno-lint-ignore no-explicit-any
async function handleLinkCode(supabase: any, lineUserId: string, code: string, storeId?: string): Promise<object | string> {
  console.log(`[LINK] ==========================================`);
  console.log(`[LINK] Attempting to link code: ${code}`);
  console.log(`[LINK] LINE User ID: ${lineUserId}`);
  console.log(`[LINK] Store context: ${storeId || 'none'}`);
  
  // 1. ค้นหารหัส (อ่านอย่างเดียวห้ามลบก่อน)
  const { data: linkCode, error } = await supabase
    .from("line_link_codes")
    .select("user_id, expires_at")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (error || !linkCode) {
    console.error("[LINK] Error or Not Found:", error);
    return "❌ รหัสไม่ถูกต้อง\n\nกรุณาตรวจสอบรหัสและลองใหม่อีกครั้ง";
  }

  if (new Date(linkCode.expires_at) < new Date()) {
    console.log("[LINK] Code expired");
    return "⏰ รหัสหมดอายุแล้ว\n\nกรุณาสร้างรหัสใหม่ในเว็บแอพ";
  }

  // 2. ตรวจสอบความเป็นเจ้าของร้านก่อน (Verified Owner Logic)
  let isOwnerVerified = false;
  let storeName = "";

  if (storeId) {
    const { data: store, error: storeCheckError } = await supabase
      .from("stores")
      .select("id, name, owner_id")
      .eq("id", storeId)
      .eq("owner_id", linkCode.user_id)
      .maybeSingle();

    if (storeCheckError) {
        console.error("[LINK] Error checking store ownership:", storeCheckError);
    }

    if (store) {
      console.log(`[LINK] ✅ User is OWNER of store: ${store.name}`);
      
      // ยืนยันสิทธิ์ในร้านค้านี้
      const { error: verifyError } = await supabase
        .from("stores")
        .update({
          line_webhook_verified: true,
          line_webhook_verified_at: new Date().toISOString(),
          line_enabled: true 
        })
        .eq("id", storeId);

      if (verifyError) {
        console.error(`[LINK] Error verifying store ${storeId}:`, verifyError);
      } else {
        console.log(`[LINK] Store ${store.name} status updated to VERIFIED`);
        storeName = store.name;
        isOwnerVerified = true;
      }
    } else {
        console.log(`[LINK] User is NOT owner of store ${storeId} (or store not found)`);
    }
  }

  // 3. ผูก LINE ID เข้ากับ Profile (ทำหลังจากยืนยันร้านค้าผ่านแล้ว)
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ line_user_id: lineUserId })
    .eq("user_id", linkCode.user_id);

  if (updateError) {
    console.warn("[LINK] Profile link warning (possibly duplicate):", updateError.message);
  }

  // 4. *** ขั้นตอนสุดท้ายค่อยลบรหัสทิ้ง ***
  // เพื่อป้องกันปัญหาหน้าเว็บสั่ง Refresh แล้วรหัสหายระหว่างที่ Webhook กำลังประมวลผล
  await supabase.from("line_link_codes").delete().eq("code", code.toUpperCase());

  if (isOwnerVerified) {
    // ส่ง Text ธรรมดาเพื่อความรวดเร็ว
    return `✅ ยืนยันเจ้าของร้าน ${storeName} สำเร็จ! \n\nกรุณากลับไปที่หน้าเว็บเพื่อตั้งค่าให้เสร็จสิ้นครับ`;
  }

  // 5. If not owner of this specific store (or verified already), return Staff/General permissions
  const userPerms = await getUserPermissions(supabase, lineUserId, storeId);
  console.log(`[LINK] Returning permission view: Owner=${userPerms?.is_owner}`);
  
  if (userPerms?.is_owner) {
     // Fallback for generic owner view
     const { data: ownedStore } = await supabase.from("stores").select("name").eq("owner_id", linkCode.user_id).limit(1).maybeSingle();
     return generateOwnerSuccessFlexMessage(ownedStore?.name || "ร้านค้าของคุณ");
  }
  
  return generateStaffSuccessFlexMessage(userPerms, storeId);
}

// Generate Flex Message for tire search results
function generateTireFlexMessage(tires: TireWithDots[], canAdjust: boolean = false): object {
  if (tires.length === 0) {
    return {
      type: "flex",
      altText: "ไม่พบยางที่ค้นหา",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text: "🔍 ไม่พบยางที่ค้นหา", weight: "bold", size: "lg", color: "#2563EB" },
            { type: "text", text: "กรุณาลองค้นหาด้วยคำอื่น เช่น ขนาดยาง หรือ ยี่ห้อ", size: "sm", color: "#666666", margin: "md", wrap: true }
          ]
        }
      }
    };
  }

  const bubbles = tires.slice(0, 10).map((tire) => {
    // Limit dots to avoid Flex Message size error (max 5)
    const sortedDots = [...tire.tire_dots].sort((a, b) => b.quantity - a.quantity);
    const displayDots = sortedDots.slice(0, 5);
    const remainingDots = sortedDots.length - displayDots.length;

    const dotRows = displayDots.map((dot) => {
      let statusColor = "#22C55E"; 
      let statusText = "มีสินค้า";
      
      if (dot.quantity === 0) {
        statusColor = "#EF4444"; statusText = "หมด";
      } else if (dot.quantity <= LOW_STOCK_THRESHOLD) {
        statusColor = "#F59E0B"; statusText = "เหลือน้อย";
      }

      const rowContents: object[] = [
        { type: "text", text: dot.dot_code || "-", size: "sm", color: "#555555", flex: 2 },
        { type: "text", text: `${dot.quantity}`, size: "sm", color: "#111111", align: "center", flex: 1 }
      ];

      if (canAdjust) {
        rowContents.push({
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "button", action: { type: "postback", label: "-", data: `action=remove_stock&dot_id=${dot.id}` }, style: "secondary", height: "sm", flex: 1 },
            { type: "button", action: { type: "postback", label: "+", data: `action=add_stock&dot_id=${dot.id}` }, style: "primary", height: "sm", flex: 1, color: "#2563EB" }
          ],
          spacing: "xs",
          flex: 2
        });
      } else {
        rowContents.push({
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text: statusText, size: "xs", color: "#FFFFFF", align: "center" }
          ],
          backgroundColor: statusColor,
          cornerRadius: "sm",
          paddingAll: "xs",
          flex: 2
        });
      }

      return { type: "box", layout: "horizontal", contents: rowContents, margin: "sm" };
    });

    if (remainingDots > 0) {
      dotRows.push({
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: `...และอีก ${remainingDots} รายการ`, size: "xs", color: "#888888", align: "center", style: "italic" }
        ],
        margin: "sm"
      });
    }

    return {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: `🏷️ ${tire.brand.toUpperCase()}`, weight: "bold", size: "lg", color: "#FFFFFF" },
          { type: "text", text: `${tire.model || ""} • ${tire.size}`, size: "sm", color: "#E0E7FF", margin: "xs" }
        ],
        backgroundColor: "#2563EB",
        paddingAll: "lg"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "DOT", size: "xs", color: "#888888", weight: "bold", flex: 2 },
              { type: "text", text: "จำนวน", size: "xs", color: "#888888", weight: "bold", align: "center", flex: 1 },
              { type: "text", text: canAdjust ? "ปรับ" : "สถานะ", size: "xs", color: "#888888", weight: "bold", align: "center", flex: 2 }
            ]
          },
          { type: "separator", margin: "sm" },
          ...dotRows,
          { type: "separator", margin: "lg" },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "💰 ราคา:", size: "md", color: "#111111", weight: "bold" },
              { type: "text", text: tire.price ? `฿${tire.price.toLocaleString()}` : "สอบถาม", size: "md", color: "#2563EB", weight: "bold", align: "end" }
            ],
            margin: "lg"
          },
          { type: "text", text: `📍 ${getStoreName(tire.stores)}`, size: "xs", color: "#888888", margin: "md" }
        ],
        paddingAll: "lg"
      },
      footer: {
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "button", action: { type: "postback", label: "สาขาอื่น", data: `action=check_branches&tire_id=${tire.id}` }, style: "secondary", height: "sm", flex: 1 },
          { type: "button", action: { type: "postback", label: "จอง", data: `action=reserve&tire_id=${tire.id}` }, style: "primary", height: "sm", flex: 1, color: "#2563EB" }
        ],
        spacing: "sm",
        paddingAll: "md"
      }
    };
  });

  return {
    type: "flex",
    altText: `พบยาง ${tires.length} รายการ`,
    contents: bubbles.length === 1 ? bubbles[0] : { type: "carousel", contents: bubbles }
  };
}

// Generate welcome message
function generateWelcomeMessage(): object {
  return {
    type: "flex",
    altText: "ยินดีต้อนรับ",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "🛞 BAANAKE Tire", weight: "bold", size: "xl", color: "#2563EB" },
          { type: "text", text: "ยินดีต้อนรับ! พิมพ์ขนาดยางหรือยี่ห้อเพื่อค้นหา", size: "sm", color: "#666666", margin: "lg", wrap: true },
          { type: "separator", margin: "lg" },
          { type: "text", text: "💡 เชื่อมต่อบัญชี: พิมพ์รหัส 6 หลักจากเว็บแอพ", size: "xs", color: "#888888", margin: "lg", wrap: true }
        ],
        paddingAll: "lg"
      }
    }
  };
}

// Generate registration required message
function generateRegistrationMessage(): object {
  return {
    type: "flex",
    altText: "กรุณาเชื่อมต่อบัญชี",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "🔐 กรุณาเชื่อมต่อบัญชี", weight: "bold", size: "lg", color: "#2563EB" },
          { type: "text", text: "เพื่อใช้งานฟีเจอร์เต็มรูปแบบ กรุณาเชื่อมต่อบัญชี LINE กับบัญชีในระบบ", size: "sm", color: "#666666", margin: "lg", wrap: true },
          { type: "text", text: "ส่งรหัส 6 หลักมาที่นี่", size: "sm", color: "#333333", margin: "xs" }
        ],
        paddingAll: "lg"
      }
    }
  };
}

// Generate access denied message
function generateAccessDeniedMessage(): object {
  return { type: "text", text: "⚠️ คุณไม่มีสิทธิ์ดำเนินการนี้\n\nกรุณาติดต่อเจ้าของร้านเพื่อขอสิทธิ์เพิ่มเติม" };
}

// Send reply to LINE - UPDATED: Accepts accessToken explicitly
async function sendReply(accessToken: string, replyToken: string, messages: object[]): Promise<void> {
  if (!accessToken) {
    console.error("[REPLY] No Access Token provided");
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is missing");
  }

  console.log(`[REPLY] Sending ${messages.length} message(s) to LINE`);

  const response = await fetch(LINE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify({ replyToken, messages })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[REPLY] LINE API error:", errorText);
    throw new Error(`LINE API error: ${response.status}`);
  }
  
  console.log("[REPLY] Message sent successfully");
}

// Log LINE interaction
// deno-lint-ignore no-explicit-any
async function logLineInteraction(supabase: any, action: string, notes: string, tireDotId: string, quantityBefore: number, quantityAfter: number, quantityChange: number): Promise<void> {
  try {
    const { error } = await supabase
      .from("stock_logs")
      .insert({
        action, notes, tire_dot_id: tireDotId,
        quantity_before: quantityBefore, quantity_after: quantityAfter, quantity_change: quantityChange,
        user_id: null
      });

    if (error) console.error("[LOG] Error:", error);
  } catch (err) {
    console.error("[LOG] Failed to log:", err);
  }
}

// Log LINE search
// deno-lint-ignore no-explicit-any
async function logLineSearch(supabase: any, lineUserId: string, searchQuery: string, resultsCount: number, storeId?: string): Promise<void> {
  try {
    console.log(`[LOG] LINE search by ${lineUserId}: "${searchQuery}" -> ${resultsCount} results (store: ${storeId || 'public'})`);
  } catch (err) {
    console.error("[LOG] Failed to log search:", err);
  }
}

// Adjust stock quantity
// deno-lint-ignore no-explicit-any
async function adjustStock(supabase: any, dotId: string, change: number, lineUserId: string): Promise<{ success: boolean; newQuantity: number; message: string }> {
  console.log(`[STOCK] Adjusting stock for dot ${dotId} by ${change}`);
  
  const { data: dot, error: fetchError } = await supabase
    .from("tire_dots")
    .select("quantity, dot_code")
    .eq("id", dotId)
    .maybeSingle();

  if (fetchError || !dot) return { success: false, newQuantity: 0, message: "ไม่พบรายการนี้" };

  const newQuantity = Math.max(0, dot.quantity + change);
  const { error: updateError } = await supabase
    .from("tire_dots")
    .update({ quantity: newQuantity })
    .eq("id", dotId);

  if (updateError) return { success: false, newQuantity: dot.quantity, message: "เกิดข้อผิดพลาดในการอัปเดต" };

  await logLineInteraction(supabase, change > 0 ? "line_add" : "line_remove", `LINE adjustment: ${lineUserId}`, dotId, dot.quantity, newQuantity, change);

  return {
    success: true, newQuantity,
    message: `✅ DOT: ${dot.dot_code}\n${change > 0 ? "เพิ่ม" : "ลด"} 1 → สต็อกใหม่: ${newQuantity}`
  };
}

// Verify signature and find matching store - UPDATED: Returns accessToken
async function verifyAndFindStore(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  body: string,
  signature: string
): Promise<{ storeId: string; accessToken: string; valid: boolean } | null> {
  console.log("[VERIFY] Starting signature verification...");
  
  // Fetch secrets AND tokens
  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, name, line_channel_secret, line_channel_access_token")
    .not("line_channel_secret", "is", null);

  if (error) console.error("[VERIFY] Error fetching stores:", error);

  if (stores && stores.length > 0) {
    for (const store of stores) {
      if (store.line_channel_secret) {
        const isValid = await verifySignature(body, signature, store.line_channel_secret);
        if (isValid) {
          console.log(`[VERIFY] ✅ Verified store: ${store.name} (${store.id})`);
          // Use store-specific token, or fallback to env if null in DB
          const token = store.line_channel_access_token || Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") || "";
          return { storeId: store.id, accessToken: token, valid: true };
        }
      }
    }
  }

  // Fallback to global env vars
  const globalSecret = Deno.env.get("LINE_CHANNEL_SECRET");
  if (globalSecret) {
    const isValid = await verifySignature(body, signature, globalSecret);
    if (isValid) {
      console.log("[VERIFY] ✅ Verified using global secret");
      return { 
        storeId: "", 
        accessToken: Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") || "", 
        valid: true 
      };
    }
  }

  console.log("[VERIFY] ❌ No valid signature found");
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Supabase config missing");

    const body = await req.text();
    const signature = req.headers.get("x-line-signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 1. Verify and Get Store Context & Token
    const matchedStore = await verifyAndFindStore(supabase, body, signature);
    
    if (!matchedStore) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { storeId: identifiedStoreId, accessToken: currentAccessToken } = matchedStore;
    console.log(`[WEBHOOK] Identified Store: ${identifiedStoreId || 'Global'}, Token length: ${currentAccessToken?.length}`);

    const webhookBody: LineWebhookBody = JSON.parse(body);

    // 2. Handle Verification Event (Empty events)
    if (webhookBody.events.length === 0) {
      if (identifiedStoreId) {
        await supabase.from("stores").update({
            line_webhook_verified: true,
            line_webhook_verified_at: new Date().toISOString(),
          }).eq("id", identifiedStoreId);
        console.log(`[WEBHOOK] ✅ Store ${identifiedStoreId} verified via webhook event`);
      }
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Process Events
    for (const event of webhookBody.events) {
      const lineUserId = event.source.userId;
      
      if (event.type === "follow") {
        await sendReply(currentAccessToken, event.replyToken, [generateWelcomeMessage()]);
        continue;
      }

      if (event.type === "message" && event.message?.type === "text") {
        const messageText = event.message.text.trim();

        // --- HANDLE LINK CODE ---
        if (/^[A-Z0-9]{6}$/.test(messageText.toUpperCase())) {
          // Pass identifiedStoreId to handleLinkCode to enable verified owner logic
          const linkResult = await handleLinkCode(supabase, lineUserId, messageText, identifiedStoreId);
          const replyMessage = typeof linkResult === "string" ? { type: "text", text: linkResult } : linkResult;
          await sendReply(currentAccessToken, event.replyToken, [replyMessage]);
          continue;
        }

        // --- HANDLE STOCK SEARCH ---
        const userPerms = await getUserPermissions(supabase, lineUserId, identifiedStoreId || undefined);

        if (!canViewStock(userPerms)) {
          // Public Search
          const sanitizedInput = sanitizeSizeInput(messageText);
          const fuzzyPattern = buildFuzzyPattern(sanitizedInput);
          const { data: tires } = await supabase.from("tires")
            .select(`id, brand, model, size, price, store_id, tire_dots (id, dot_code, quantity, position, promotion), stores (name)`)
            .or(`size.ilike.${fuzzyPattern},brand.ilike.%${messageText}%,model.ilike.%${messageText}%`)
            .eq("is_shared", true).limit(5);

          await logLineSearch(supabase, lineUserId, messageText, tires?.length || 0);

          if (tires && tires.length > 0) {
            await sendReply(currentAccessToken, event.replyToken, [generateTireFlexMessage(tires as TireWithDots[], false), generateRegistrationMessage()]);
          } else {
            await sendReply(currentAccessToken, event.replyToken, [generateRegistrationMessage()]);
          }
          continue;
        }

        // Authenticated Search
        const canAdjust = canAdjustStock(userPerms);
        const sanitizedInput = sanitizeSizeInput(messageText);
        const fuzzyPattern = buildFuzzyPattern(sanitizedInput);

        let tiresQuery = supabase.from("tires")
          .select(`id, brand, model, size, price, store_id, tire_dots (id, dot_code, quantity, position, promotion), stores (name)`)
          .or(`size.ilike.${fuzzyPattern},brand.ilike.%${messageText}%,model.ilike.%${messageText}%`);

        if (userPerms?.store_id) {
          tiresQuery = tiresQuery.or(`store_id.eq.${userPerms.store_id},is_shared.eq.true`);
        } else {
          tiresQuery = tiresQuery.eq("is_shared", true);
        }

        const { data: tires } = await tiresQuery.limit(10);
        await logLineSearch(supabase, lineUserId, messageText, tires?.length || 0, userPerms?.store_id);
        await sendReply(currentAccessToken, event.replyToken, [generateTireFlexMessage(tires as TireWithDots[], canAdjust)]);
      }

      // --- HANDLE POSTBACK ---
      if (event.type === "postback" && event.postback) {
        const params = new URLSearchParams(event.postback.data);
        const action = params.get("action");
        const tireId = params.get("tire_id");
        const dotId = params.get("dot_id");

        const userPerms = await getUserPermissions(supabase, lineUserId, identifiedStoreId || undefined);

        if (action === "add_stock" && dotId) {
          if (!canAdjustStock(userPerms)) { await sendReply(currentAccessToken, event.replyToken, [generateAccessDeniedMessage()]); continue; }
          const result = await adjustStock(supabase, dotId, 1, lineUserId);
          await sendReply(currentAccessToken, event.replyToken, [{ type: "text", text: result.message }]);
        }

        if (action === "remove_stock" && dotId) {
          if (!canAdjustStock(userPerms)) { await sendReply(currentAccessToken, event.replyToken, [generateAccessDeniedMessage()]); continue; }
          const result = await adjustStock(supabase, dotId, -1, lineUserId);
          await sendReply(currentAccessToken, event.replyToken, [{ type: "text", text: result.message }]);
        }

        if (action === "check_branches" && tireId) {
            // Find same tire in other stores
            const { data: tire } = await supabase.from("tires").select("brand, model, size").eq("id", tireId).maybeSingle();
            if (tire) {
              const { data: otherTires } = await supabase.from("tires")
                .select(`id, brand, model, size, price, store_id, tire_dots (id, dot_code, quantity, position, promotion), stores (name)`)
                .eq("brand", tire.brand).eq("size", tire.size).eq("is_shared", true).neq("id", tireId).limit(5);
              
              const message = otherTires && otherTires.length > 0 
                ? generateTireFlexMessage(otherTires as TireWithDots[], canAdjustStock(userPerms))
                : { type: "text", text: "ไม่พบยางรุ่นนี้ในสาขาอื่น" };
              await sendReply(currentAccessToken, event.replyToken, [message]);
            }
        }

        if (action === "reserve" && tireId) {
          await sendReply(currentAccessToken, event.replyToken, [{ type: "text", text: "✅ ได้รับคำขอจองแล้ว\n\nเจ้าหน้าที่จะติดต่อกลับเพื่อยืนยันภายใน 30 นาที" }]);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});