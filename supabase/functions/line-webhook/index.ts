import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-line-signature",
};

const LOW_STOCK_THRESHOLD = 4;
const ITEMS_PER_PAGE = 9; // แสดง 9 สินค้า + 1 ปุ่ม Next

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

// Helper to get store name from stores field
function getStoreName(stores: Store | Store[] | null | undefined): string {
  if (!stores) return "ร้านค้า";
  if (Array.isArray(stores)) {
    return stores[0]?.name || "ร้านค้า";
  }
  return stores.name || "ร้านค้า";
}

// Signature verification
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

// Sanitize input
function sanitizeSizeInput(input: string): string {
  return input.replace(/[\/Rr\-\s]/g, '').toLowerCase();
}

function buildFuzzyPattern(sanitized: string): string {
  let pattern = '%';
  for (let i = 0; i < sanitized.length; i++) {
    pattern += sanitized[i] + '%';
  }
  return pattern;
}

// Get Permissions
// deno-lint-ignore no-explicit-any
async function getUserPermissions(supabase: any, lineUserId: string, storeId?: string): Promise<UserPermissions | null> {
  try {
    const { data, error } = await supabase
      .rpc("get_line_user_permissions", { 
        _line_user_id: lineUserId,
        _store_id: storeId || null
      });

    if (error || !data || data.length === 0) return null;
    return data[0];
  } catch (err) {
    console.error("[AUTH] Failed to get user permissions:", err);
    return null;
  }
}

function canAdjustStock(userPerms: UserPermissions | null): boolean {
  if (!userPerms) return false;
  if (!userPerms.is_approved) return false;
  if (userPerms.is_owner) return true;
  return userPerms.permissions?.line?.adjust ?? false;
}

function canViewStock(userPerms: UserPermissions | null): boolean {
  if (!userPerms) return false;
  if (!userPerms.is_approved) return false;
  if (userPerms.is_owner) return true;
  return userPerms.permissions?.line?.view ?? true;
}

// --- FLEX MESSAGE GENERATORS ---

// 1. Pagination Carousel (แบ่งหน้าสินค้า)
function generateTireFlexMessage(
  tires: TireWithDots[], 
  canAdjust: boolean, 
  page: number, 
  keyword: string, 
  hasNextPage: boolean
): object {
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
            { type: "text", text: `คำค้นหา: "${keyword}"`, size: "sm", color: "#666666", margin: "md", wrap: true }
          ]
        }
      }
    };
  }

  const bubbles = tires.map((tire) => {
    // Logic: Sort dots by quantity
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
        // ปุ่มปรับสต็อก (ส่ง action pre_adjust)
        rowContents.push({
          type: "box",
          layout: "horizontal",
          contents: [
            { 
              type: "button", 
              action: { 
                type: "postback", 
                label: "-", 
                data: `action=pre_adjust&dot_id=${dot.id}&change=-1&tire_info=${encodeURIComponent(tire.brand + ' ' + tire.size + ' ' + dot.dot_code)}` 
              }, 
              style: "secondary", height: "sm", flex: 1 
            },
            { 
              type: "button", 
              action: { 
                type: "postback", 
                label: "+", 
                data: `action=pre_adjust&dot_id=${dot.id}&change=1&tire_info=${encodeURIComponent(tire.brand + ' ' + tire.size + ' ' + dot.dot_code)}` 
              }, 
              style: "primary", height: "sm", flex: 1, color: "#2563EB" 
            }
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
  }); // End map

  // Add Next Page Bubble if needed
  if (hasNextPage) {
    bubbles.push({
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        contents: [
          {
            type: "text",
            text: "ยังมีสินค้าอีก...",
            weight: "bold",
            color: "#666666",
            margin: "md"
          },
          {
            type: "button",
            action: {
              type: "postback",
              label: `ดูหน้าถัดไป (${page + 1}) ➡️`,
              // ส่ง keyword เดิมไปค้นหาต่อในหน้าถัดไป
              data: `action=search&keyword=${encodeURIComponent(keyword)}&page=${page + 1}`
            },
            style: "primary",
            color: "#2563EB",
            margin: "md"
          }
        ]
      }
    });
  }

  return {
    type: "flex",
    altText: `ผลการค้นหาหน้า ${page}`,
    contents: { type: "carousel", contents: bubbles }
  };
}

// 2. Confirm Adjust Bubble (แก้ไขตำแหน่ง Label แล้ว)
function createConfirmAdjustBubble(
  dotId: string,
  tireInfo: string,
  change: number,
  currentQty: number
): object {
  const newQty = Math.max(0, currentQty + change);
  const isAdd = change > 0;
  
  return {
    type: "flex",
    altText: "ยืนยันการปรับสต็อก",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "⚠️ ยืนยันการปรับสต็อก?",
            weight: "bold",
            size: "lg",
            color: isAdd ? "#2563EB" : "#EF4444",
            align: "center"
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: decodeURIComponent(tireInfo),
            wrap: true,
            weight: "bold",
            margin: "md",
            align: "center",
            size: "sm",
            color: "#333333"
          },
          {
            type: "box",
            layout: "horizontal",
            justifyContent: "center",
            alignItems: "center",
            margin: "lg",
            contents: [
              { type: "text", text: `${currentQty}`, size: "xl", color: "#aaaaaa" },
              { type: "text", text: " ➔ ", size: "xl" },
              { 
                type: "text", 
                text: `${newQty}`, 
                size: "xl", 
                weight: "bold", 
                color: isAdd ? "#2563EB" : "#EF4444"
              }
            ]
          },
          {
            type: "text",
            text: isAdd ? "(เพิ่มสินค้า +1)" : "(ลดสินค้า -1)",
            size: "xs",
            color: "#888888",
            align: "center",
            margin: "sm"
          }
        ]
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "md",
        contents: [
          {
            type: "button",
            style: "secondary",
            // FIX: ย้าย label เข้าไปใน action
            action: { type: "postback", label: "ยกเลิก", data: "action=cancel" }
          },
          {
            type: "button",
            style: "primary",
            color: isAdd ? "#2563EB" : "#EF4444",
            // FIX: ย้าย label เข้าไปใน action
            action: {
              type: "postback",
              label: "ยืนยัน",
              data: `action=confirm_adjust&dot_id=${dotId}&change=${change}`
            }
          }
        ]
      }
    }
  };
}

// Generate other standard messages
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

function generateAccessDeniedMessage(): object {
  return { type: "text", text: "⚠️ คุณไม่มีสิทธิ์ดำเนินการนี้\n\nกรุณาติดต่อเจ้าของร้านเพื่อขอสิทธิ์เพิ่มเติม" };
}

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

// Send reply
async function sendReply(accessToken: string, replyToken: string, messages: object[]): Promise<void> {
  if (!accessToken) return;
  const response = await fetch(LINE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
    body: JSON.stringify({ replyToken, messages })
  });
  if (!response.ok) {
    console.error("[REPLY] Error:", await response.text());
  }
}

// Log logs
// deno-lint-ignore no-explicit-any
async function logLineInteraction(supabase: any, action: string, notes: string, tireDotId: string, qBefore: number, qAfter: number, qChange: number): Promise<void> {
  await supabase.from("stock_logs").insert({
    action, notes, tire_dot_id: tireDotId,
    quantity_before: qBefore, quantity_after: qAfter, quantity_change: qChange,
    user_id: null
  });
}

// Helper: Handle Link Code (FULL LOGIC)
// deno-lint-ignore no-explicit-any
async function handleLinkCode(supabase: any, lineUserId: string, code: string, storeId?: string): Promise<object | string> {
  const { data: linkCode, error } = await supabase.from("line_link_codes").select("user_id, expires_at").eq("code", code.toUpperCase()).maybeSingle();
  
  if (error || !linkCode) return "❌ รหัสไม่ถูกต้อง\n\nกรุณาตรวจสอบรหัสและลองใหม่อีกครั้ง";
  if (new Date(linkCode.expires_at) < new Date()) return "⏰ รหัสหมดอายุแล้ว\n\nกรุณาสร้างรหัสใหม่ในเว็บแอพ";

  // Check Store Ownership
  let isOwnerVerified = false;
  let storeName = "";

  if (storeId) {
    const { data: store } = await supabase.from("stores").select("id, name, owner_id").eq("id", storeId).eq("owner_id", linkCode.user_id).maybeSingle();
    if (store) {
      console.log(`[LINK] ✅ User is OWNER of store: ${store.name}`);
      await supabase.from("stores").update({ line_webhook_verified: true, line_webhook_verified_at: new Date().toISOString(), line_enabled: true }).eq("id", storeId);
      storeName = store.name;
      isOwnerVerified = true;
    }
  }

  // Link Profile
  await supabase.from("profiles").update({ line_user_id: lineUserId }).eq("user_id", linkCode.user_id);
  // Delete Code
  await supabase.from("line_link_codes").delete().eq("code", code.toUpperCase());

  if (isOwnerVerified) {
    return `✅ ยืนยันเจ้าของร้าน ${storeName} สำเร็จ! \n\nกรุณากลับไปที่หน้าเว็บเพื่อตั้งค่าให้เสร็จสิ้นครับ`;
  }

  // Return Permissions View
  const userPerms = await getUserPermissions(supabase, lineUserId, storeId);
  if (userPerms?.is_owner) {
     const { data: ownedStore } = await supabase.from("stores").select("name").eq("owner_id", linkCode.user_id).limit(1).maybeSingle();
     return generateOwnerSuccessFlexMessage(ownedStore?.name || "ร้านค้าของคุณ");
  }
  
  return generateStaffSuccessFlexMessage(userPerms, storeId);
}

// Helper: Adjust Stock (Database Update)
// deno-lint-ignore no-explicit-any
async function adjustStock(supabase: any, dotId: string, change: number, lineUserId: string): Promise<{ success: boolean; message: string }> {
  const { data: dot } = await supabase.from("tire_dots").select("quantity, dot_code").eq("id", dotId).maybeSingle();
  if (!dot) return { success: false, message: "ไม่พบรายการนี้" };

  const newQuantity = Math.max(0, dot.quantity + change);
  const { error } = await supabase.from("tire_dots").update({ quantity: newQuantity }).eq("id", dotId);

  if (error) return { success: false, message: "เกิดข้อผิดพลาดในการอัปเดต" };
  await logLineInteraction(supabase, change > 0 ? "line_add" : "line_remove", `LINE: ${lineUserId}`, dotId, dot.quantity, newQuantity, change);
  
  return { success: true, message: `✅ บันทึกสำเร็จ\nDOT: ${dot.dot_code}\nจำนวนใหม่: ${newQuantity}` };
}

// Helper: Search Tires with Pagination (รวม Logic ค้นหาไว้ที่เดียว)
// deno-lint-ignore no-explicit-any
async function searchTires(supabase: any, messageText: string, userPerms: UserPermissions | null, page: number) {
  const sanitizedInput = sanitizeSizeInput(messageText);
  const fuzzyPattern = buildFuzzyPattern(sanitizedInput);
  
  // Calculate Pagination Range
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE; 

  let query = supabase.from("tires")
    .select(`id, brand, model, size, price, store_id, tire_dots (id, dot_code, quantity, position, promotion), stores (name)`)
    .or(`size.ilike.${fuzzyPattern},brand.ilike.%${messageText}%,model.ilike.%${messageText}%`);

  // Permission filtering (รวม Public/Private Logic)
  if (userPerms && canViewStock(userPerms)) {
    if (userPerms.store_id) {
      query = query.or(`store_id.eq.${userPerms.store_id},is_shared.eq.true`);
    } else {
      query = query.eq("is_shared", true);
    }
  } else {
    // Public Search
    query = query.eq("is_shared", true);
  }

  // Fetch 1 extra item to check if "Next Page" exists
  const { data: tires, error } = await query.range(from, to);
  
  if (error || !tires) return { tires: [], hasNextPage: false };

  // Check if we have more items than limit
  const hasNextPage = tires.length > ITEMS_PER_PAGE;
  // Slice to get only the items for this page
  const displayTires = tires.slice(0, ITEMS_PER_PAGE);

  return { tires: displayTires, hasNextPage };
}

// Verify signature and find matching store
// deno-lint-ignore no-explicit-any
async function verifyAndFindStore(supabase: any, body: string, signature: string): Promise<{ storeId: string; accessToken: string; valid: boolean } | null> {
  const { data: stores } = await supabase.from("stores").select("id, name, line_channel_secret, line_channel_access_token").not("line_channel_secret", "is", null);

  if (stores) {
    for (const store of stores) {
      if (store.line_channel_secret && await verifySignature(body, signature, store.line_channel_secret)) {
        // STRICT Token Selection
        let token = store.line_channel_access_token;
        if (!token) {
             console.warn(`[VERIFY] Store verified but missing token. Fallback to Global.`);
             token = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") || "";
        }
        return { storeId: store.id, accessToken: token, valid: true };
      }
    }
  }

  const globalSecret = Deno.env.get("LINE_CHANNEL_SECRET");
  if (globalSecret && await verifySignature(body, signature, globalSecret)) {
    return { storeId: "", accessToken: Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") || "", valid: true };
  }
  return null;
}

// --- MAIN SERVER ---
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Config missing");

    const body = await req.text();
    const signature = req.headers.get("x-line-signature");
    if (!signature) return new Response("Missing signature", { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const matchedStore = await verifyAndFindStore(supabase, body, signature);
    
    if (!matchedStore) return new Response("Invalid signature", { status: 401 });
    const { storeId: identifiedStoreId, accessToken: currentAccessToken } = matchedStore;

    const webhookBody: LineWebhookBody = JSON.parse(body);
    if (webhookBody.events.length === 0) {
      if (identifiedStoreId) {
        await supabase.from("stores").update({ line_webhook_verified: true, line_webhook_verified_at: new Date().toISOString() }).eq("id", identifiedStoreId);
      }
      return new Response("OK", { status: 200 });
    }

    for (const event of webhookBody.events) {
      const lineUserId = event.source.userId;
      
      if (event.type === "follow") {
        await sendReply(currentAccessToken, event.replyToken, [generateWelcomeMessage()]);
        continue;
      }

      // 1. Handle TEXT Message (Search Page 1)
      if (event.type === "message" && event.message?.type === "text") {
        const messageText = event.message.text.trim();

        if (/^[A-Z0-9]{6}$/.test(messageText.toUpperCase())) {
          const reply = await handleLinkCode(supabase, lineUserId, messageText, identifiedStoreId);
          // Handle both string (simple text) and object (Flex Message) replies
          const messages = typeof reply === "string" ? [{ type: "text", text: reply }] : [reply];
          await sendReply(currentAccessToken, event.replyToken, messages);
          continue;
        }

        // Search (Page 1)
        const userPerms = await getUserPermissions(supabase, lineUserId, identifiedStoreId || undefined);
        const { tires, hasNextPage } = await searchTires(supabase, messageText, userPerms, 1);

        if (!userPerms || !canViewStock(userPerms)) {
            // Public View
            const flex = tires.length > 0 
                ? generateTireFlexMessage(tires as TireWithDots[], false, 1, messageText, false) // Public usually no pagination or limited
                : generateRegistrationMessage();
            await sendReply(currentAccessToken, event.replyToken, [flex]);
        } else {
            // Authenticated View
            const canAdjust = canAdjustStock(userPerms);
            const flex = generateTireFlexMessage(tires as TireWithDots[], canAdjust, 1, messageText, hasNextPage);
            await sendReply(currentAccessToken, event.replyToken, [flex]);
        }
      }

      // 2. Handle POSTBACK (Pagination & Actions)
      if (event.type === "postback" && event.postback) {
        const params = new URLSearchParams(event.postback.data);
        const action = params.get("action");
        const userPerms = await getUserPermissions(supabase, lineUserId, identifiedStoreId || undefined);

        // --- CASE: SEARCH (Pagination) ---
        if (action === "search") {
           const page = parseInt(params.get("page") || "1");
           const keyword = params.get("keyword") || "";
           
           const { tires, hasNextPage } = await searchTires(supabase, keyword, userPerms, page);
           const canAdjust = canAdjustStock(userPerms);
           
           const flex = generateTireFlexMessage(tires as TireWithDots[], canAdjust, page, keyword, hasNextPage);
           await sendReply(currentAccessToken, event.replyToken, [flex]);
        }

        // --- CASE: PRE_ADJUST (Show Confirmation) ---
        else if (action === "pre_adjust") {
            const dotId = params.get("dot_id");
            const change = parseInt(params.get("change") || "0");
            const tireInfo = params.get("tire_info") || ""; // Received from button data

            if (!canAdjustStock(userPerms)) {
                await sendReply(currentAccessToken, event.replyToken, [generateAccessDeniedMessage()]);
                continue;
            }

            if (dotId) {
                // Fetch REAL-TIME quantity for confirmation
                const { data: dot } = await supabase.from("tire_dots").select("quantity").eq("id", dotId).single();
                if (dot) {
                    const confirmMsg = createConfirmAdjustBubble(dotId, tireInfo, change, dot.quantity);
                    await sendReply(currentAccessToken, event.replyToken, [confirmMsg]);
                }
            }
        }

        // --- CASE: CONFIRM_ADJUST (Execute DB Update) ---
        else if (action === "confirm_adjust") {
            const dotId = params.get("dot_id");
            const change = parseInt(params.get("change") || "0");

            if (!canAdjustStock(userPerms)) {
                 // Double check permission just in case
                await sendReply(currentAccessToken, event.replyToken, [generateAccessDeniedMessage()]);
                continue;
            }

            if (dotId) {
                const result = await adjustStock(supabase, dotId, change, lineUserId);
                await sendReply(currentAccessToken, event.replyToken, [{ type: "text", text: result.message }]);
            }
        }

        // --- CASE: CANCEL ---
        else if (action === "cancel") {
            await sendReply(currentAccessToken, event.replyToken, [{ type: "text", text: "❌ ยกเลิกรายการแล้ว" }]);
        }

        // --- CASE: CHECK BRANCHES ---
        else if (action === "check_branches") {
            // ... (Logic เดิม) ...
            const tireId = params.get("tire_id");
            const { data: tire } = await supabase.from("tires").select("brand, model, size").eq("id", tireId).maybeSingle();
            if (tire) {
              const { data: otherTires } = await supabase.from("tires")
                .select(`id, brand, model, size, price, store_id, tire_dots (id, dot_code, quantity, position, promotion), stores (name)`)
                .eq("brand", tire.brand).eq("size", tire.size).eq("is_shared", true).neq("id", tireId).limit(5);
              
              const message = otherTires && otherTires.length > 0 
                ? generateTireFlexMessage(otherTires as TireWithDots[], canAdjustStock(userPerms), 1, "", false)
                : { type: "text", text: "ไม่พบยางรุ่นนี้ในสาขาอื่น" };
              await sendReply(currentAccessToken, event.replyToken, [message]);
            }
        }

        // --- CASE: RESERVE ---
        else if (action === "reserve") {
            await sendReply(currentAccessToken, event.replyToken, [{ type: "text", text: "✅ ได้รับคำขอจองแล้ว" }]);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});