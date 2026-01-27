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
// Removes common separators: /, R, r, -, spaces
function sanitizeSizeInput(input: string): string {
  return input.replace(/[\/Rr\-\s]/g, '').toLowerCase();
}

// Build a flexible search pattern for tire sizes
// Input "2656517" should match "265/65R17", "265-65-R17", etc.
function buildFuzzyPattern(sanitized: string): string {
  // Insert % between each character group to allow for separators
  // e.g., "2656517" becomes "%265%65%17%"
  let pattern = '%';
  for (let i = 0; i < sanitized.length; i++) {
    pattern += sanitized[i] + '%';
  }
  return pattern;
}

// Get user permissions from LINE user ID - now with store_id filter for multi-store support
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

    console.log(`[AUTH] Found ${data.length} permission record(s) for LINE user`);

    // If store_id was provided, return the matching record
    // Otherwise, return the first record (owner takes precedence from SQL UNION order)
    const record = data[0];
    console.log(`[AUTH] Using permission: store_id=${record.store_id}, is_owner=${record.is_owner}, is_approved=${record.is_approved}`);
    
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

// Get all store permissions for a LINE user (for multi-store scenarios)
// deno-lint-ignore no-explicit-any
async function getAllUserStorePermissions(supabase: any, lineUserId: string): Promise<UserPermissions[]> {
  try {
    console.log(`[AUTH] Getting ALL store permissions for LINE user: ${lineUserId}`);
    
    const { data, error } = await supabase
      .rpc("get_line_user_permissions", { 
        _line_user_id: lineUserId,
        _store_id: null
      });

    if (error) {
      console.error("[AUTH] Error getting all user permissions:", error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log("[AUTH] No permissions found");
      return [];
    }

    console.log(`[AUTH] Found ${data.length} store permission(s) for LINE user`);
    
    return data.map((record: any) => ({
      user_id: record.user_id,
      store_id: record.store_id,
      is_owner: record.is_owner,
      permissions: record.permissions,
      is_approved: record.is_approved,
    }));
  } catch (err) {
    console.error("[AUTH] Failed to get all user permissions:", err);
    return [];
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

// Generate success Flex Message after linking
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
        {
          type: "text",
          text: "📦",
          size: "sm",
          flex: 0
        },
        {
          type: "text",
          text: "ค้นหาและดูสต็อก",
          size: "sm",
          color: "#333333",
          margin: "sm",
          flex: 1
        }
      ]
    });
  }

  if (canAdjust) {
    capabilities.push({
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: "➕",
          size: "sm",
          flex: 0
        },
        {
          type: "text",
          text: "ปรับจำนวนสต็อก",
          size: "sm",
          color: "#333333",
          margin: "sm",
          flex: 1
        }
      ],
      margin: "sm"
    });
  }

  if (isOwner) {
    capabilities.push({
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: "👑",
          size: "sm",
          flex: 0
        },
        {
          type: "text",
          text: "สิทธิ์ผู้ดูแลร้านค้า",
          size: "sm",
          color: "#333333",
          margin: "sm",
          flex: 1
        }
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
          {
            type: "text",
            text: "✅ เชื่อมต่อบัญชีสำเร็จ!",
            weight: "bold",
            size: "lg",
            color: "#FFFFFF"
          }
        ],
        backgroundColor: "#22C55E",
        paddingAll: "lg"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "บัญชีเว็บของคุณเชื่อมต่อกับ LINE แล้ว",
            size: "sm",
            color: "#666666",
            wrap: true
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: "สิทธิ์ของคุณ:",
            size: "sm",
            color: "#888888",
            margin: "lg"
          },
          {
            type: "box",
            layout: "vertical",
            contents: capabilities,
            margin: "md"
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: "💡 ลองค้นหา: \"265/65R17\"",
            size: "sm",
            color: "#2563EB",
            margin: "lg"
          }
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
          {
            type: "text",
            text: "👑 เจ้าของร้านยืนยันแล้ว!",
            weight: "bold",
            size: "lg",
            color: "#FFFFFF"
          }
        ],
        backgroundColor: "#F59E0B",
        paddingAll: "lg"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `ร้าน: ${storeName}`,
            size: "md",
            color: "#333333",
            weight: "bold"
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: "สิทธิ์ผู้ดูแลระบบ:",
            size: "sm",
            color: "#888888",
            margin: "lg"
          },
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "✅ จัดการสต็อกทั้งหมด",
                size: "sm",
                color: "#333333"
              },
              {
                type: "text",
                text: "✅ อนุมัติ/ปฏิเสธพนักงาน",
                size: "sm",
                color: "#333333",
                margin: "xs"
              },
              {
                type: "text",
                text: "✅ รับแจ้งเตือนคำขอเข้าร่วม",
                size: "sm",
                color: "#333333",
                margin: "xs"
              },
              {
                type: "text",
                text: "✅ ดูรายงานและสถิติ",
                size: "sm",
                color: "#333333",
                margin: "xs"
              }
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
            action: {
              type: "message",
              label: "🔍 เช็คสต็อก",
              text: "สต็อก"
            },
            style: "primary",
            color: "#F59E0B"
          }
        ],
        paddingAll: "md"
      }
    }
  };
}

// Handle LINE account linking
// deno-lint-ignore no-explicit-any
async function handleLinkCode(supabase: any, lineUserId: string, code: string, storeId?: string): Promise<object | string> {
  console.log(`[LINK] Attempting to link code: ${code} for LINE user: ${lineUserId}`);
  
  // Check if this is a link code
  const { data: linkCode, error } = await supabase
    .from("line_link_codes")
    .select("user_id, expires_at")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (error) {
    console.error("[LINK] Error fetching link code:", error);
    return "❌ เกิดข้อผิดพลาดในการค้นหารหัส\n\nกรุณาลองใหม่อีกครั้ง";
  }

  if (!linkCode) {
    console.log("[LINK] Link code not found");
    return "❌ รหัสไม่ถูกต้อง\n\nกรุณาตรวจสอบรหัสและลองใหม่อีกครั้ง หรือสร้างรหัสใหม่ในเว็บแอพ";
  }

  // Check expiration
  if (new Date(linkCode.expires_at) < new Date()) {
    console.log("[LINK] Link code expired");
    return "⏰ รหัสหมดอายุแล้ว\n\nกรุณาสร้างรหัสใหม่ในเว็บแอพ";
  }

  // Link the LINE user ID to the profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ line_user_id: lineUserId })
    .eq("user_id", linkCode.user_id);

  if (updateError) {
    console.error("[LINK] Error linking LINE account:", updateError);
    return "❌ เกิดข้อผิดพลาด\n\nไม่สามารถเชื่อมต่อบัญชีได้ กรุณาลองใหม่อีกครั้ง";
  }

  // Delete the used code
  await supabase
    .from("line_link_codes")
    .delete()
    .eq("code", code.toUpperCase());

  console.log("[LINK] Successfully linked LINE account");

  // Get user permissions for the success message (filter by store if provided)
  const userPerms = await getUserPermissions(supabase, lineUserId, storeId);
  
  // If owner, get store name and return owner-specific message
  if (userPerms?.is_owner && userPerms.store_id) {
    const { data: store } = await supabase
      .from("stores")
      .select("name")
      .eq("id", userPerms.store_id)
      .maybeSingle();
    
    console.log(`[LINK] User is owner of store: ${store?.name}`);
    return generateOwnerSuccessFlexMessage(store?.name || "ร้านค้าของคุณ");
  }
  
  return generateLinkSuccessFlexMessage(userPerms);
}

// Generate Flex Message for tire search results with optional adjust buttons
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
            {
              type: "text",
              text: "🔍 ไม่พบยางที่ค้นหา",
              weight: "bold",
              size: "lg",
              color: "#2563EB"
            },
            {
              type: "text",
              text: "กรุณาลองค้นหาด้วยคำอื่น เช่น ขนาดยาง หรือ ยี่ห้อ",
              size: "sm",
              color: "#666666",
              margin: "md",
              wrap: true
            }
          ]
        }
      }
    };
  }

  const bubbles = tires.slice(0, 10).map((tire) => {
    // Generate DOT rows with optional +/- buttons
    const dotRows = tire.tire_dots.map((dot) => {
      let statusColor = "#22C55E"; // Green - In Stock
      let statusText = "มีสินค้า";
      
      if (dot.quantity === 0) {
        statusColor = "#EF4444"; // Red - Out of Stock
        statusText = "หมด";
      } else if (dot.quantity <= LOW_STOCK_THRESHOLD) {
        statusColor = "#F59E0B"; // Amber - Low Stock
        statusText = "เหลือน้อย";
      }

      const rowContents: object[] = [
        {
          type: "text",
          text: dot.dot_code || "-",
          size: "sm",
          color: "#555555",
          flex: 2
        },
        {
          type: "text",
          text: `${dot.quantity}`,
          size: "sm",
          color: "#111111",
          align: "center",
          flex: 1
        }
      ];

      // Add +/- buttons if user can adjust stock
      if (canAdjust) {
        rowContents.push({
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "button",
              action: {
                type: "postback",
                label: "-",
                data: `action=remove_stock&dot_id=${dot.id}`
              },
              style: "secondary",
              height: "sm",
              flex: 1
            },
            {
              type: "button",
              action: {
                type: "postback",
                label: "+",
                data: `action=add_stock&dot_id=${dot.id}`
              },
              style: "primary",
              height: "sm",
              flex: 1,
              color: "#2563EB"
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
            {
              type: "text",
              text: statusText,
              size: "xs",
              color: "#FFFFFF",
              align: "center"
            }
          ],
          backgroundColor: statusColor,
          cornerRadius: "sm",
          paddingAll: "xs",
          flex: 2
        });
      }

      return {
        type: "box",
        layout: "horizontal",
        contents: rowContents,
        margin: "sm"
      };
    });

    return {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `🏷️ ${tire.brand.toUpperCase()}`,
            weight: "bold",
            size: "lg",
            color: "#FFFFFF"
          },
          {
            type: "text",
            text: `${tire.model || ""} • ${tire.size}`,
            size: "sm",
            color: "#E0E7FF",
            margin: "xs"
          }
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
          {
            type: "separator",
            margin: "sm"
          },
          ...dotRows,
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: "💰 ราคา:",
                size: "md",
                color: "#111111",
                weight: "bold"
              },
              {
                type: "text",
                text: tire.price ? `฿${tire.price.toLocaleString()}` : "สอบถาม",
                size: "md",
                color: "#2563EB",
                weight: "bold",
                align: "end"
              }
            ],
            margin: "lg"
          },
          {
            type: "text",
            text: `📍 ${getStoreName(tire.stores)}`,
            size: "xs",
            color: "#888888",
            margin: "md"
          }
        ],
        paddingAll: "lg"
      },
      footer: {
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "button",
            action: {
              type: "postback",
              label: "สาขาอื่น",
              data: `action=check_branches&tire_id=${tire.id}`
            },
            style: "secondary",
            height: "sm",
            flex: 1
          },
          {
            type: "button",
            action: {
              type: "postback",
              label: "จอง",
              data: `action=reserve&tire_id=${tire.id}`
            },
            style: "primary",
            height: "sm",
            flex: 1,
            color: "#2563EB"
          }
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
          {
            type: "text",
            text: "🛞 BAANAKE Tire",
            weight: "bold",
            size: "xl",
            color: "#2563EB"
          },
          {
            type: "text",
            text: "ยินดีต้อนรับ! พิมพ์ขนาดยางหรือยี่ห้อเพื่อค้นหา",
            size: "sm",
            color: "#666666",
            margin: "lg",
            wrap: true
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: "ตัวอย่างการค้นหา:",
            size: "sm",
            color: "#888888",
            margin: "lg"
          },
          {
            type: "text",
            text: "• 265/65R17",
            size: "sm",
            color: "#2563EB",
            margin: "sm"
          },
          {
            type: "text",
            text: "• Michelin",
            size: "sm",
            color: "#2563EB",
            margin: "xs"
          },
          {
            type: "text",
            text: "• Bridgestone 215/55R17",
            size: "sm",
            color: "#2563EB",
            margin: "xs"
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: "💡 เชื่อมต่อบัญชี: พิมพ์รหัส 6 หลักจากเว็บแอพ",
            size: "xs",
            color: "#888888",
            margin: "lg",
            wrap: true
          }
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
          {
            type: "text",
            text: "🔐 กรุณาเชื่อมต่อบัญชี",
            weight: "bold",
            size: "lg",
            color: "#2563EB"
          },
          {
            type: "text",
            text: "เพื่อใช้งานฟีเจอร์เต็มรูปแบบ กรุณาเชื่อมต่อบัญชี LINE กับบัญชีในระบบ",
            size: "sm",
            color: "#666666",
            margin: "lg",
            wrap: true
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: "ขั้นตอน:",
            size: "sm",
            color: "#888888",
            margin: "lg"
          },
          {
            type: "text",
            text: "1. เข้าสู่ระบบที่เว็บแอพ",
            size: "sm",
            color: "#333333",
            margin: "sm"
          },
          {
            type: "text",
            text: "2. ไปที่ Profile > LINE Integration",
            size: "sm",
            color: "#333333",
            margin: "xs"
          },
          {
            type: "text",
            text: "3. กด 'Link LINE Account'",
            size: "sm",
            color: "#333333",
            margin: "xs"
          },
          {
            type: "text",
            text: "4. ส่งรหัส 6 หลักมาที่นี่",
            size: "sm",
            color: "#333333",
            margin: "xs"
          }
        ],
        paddingAll: "lg"
      }
    }
  };
}

// Generate access denied message
function generateAccessDeniedMessage(): object {
  return {
    type: "text",
    text: "⚠️ คุณไม่มีสิทธิ์ดำเนินการนี้\n\nกรุณาติดต่อเจ้าของร้านเพื่อขอสิทธิ์เพิ่มเติม"
  };
}

// Send reply to LINE
async function sendReply(replyToken: string, messages: object[]): Promise<void> {
  const channelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  
  if (!channelAccessToken) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not configured");
  }

  console.log(`[REPLY] Sending ${messages.length} message(s) to LINE`);

  const response = await fetch(LINE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${channelAccessToken}`
    },
    body: JSON.stringify({
      replyToken,
      messages
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[REPLY] LINE API error:", errorText);
    throw new Error(`LINE API error: ${response.status}`);
  }
  
  console.log("[REPLY] Message sent successfully");
}

// Log LINE interaction to stock_logs
// deno-lint-ignore no-explicit-any
async function logLineInteraction(
  supabase: any,
  action: string,
  notes: string,
  tireDotId: string,
  quantityBefore: number,
  quantityAfter: number,
  quantityChange: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from("stock_logs")
      .insert({
        action,
        notes,
        tire_dot_id: tireDotId,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        quantity_change: quantityChange,
        user_id: null // LINE users are not authenticated in web
      });

    if (error) {
      console.error("[LOG] Error logging LINE interaction:", error);
    } else {
      console.log(`[LOG] Logged interaction: ${action}`);
    }
  } catch (err) {
    console.error("[LOG] Failed to log LINE interaction:", err);
  }
}

// Log LINE search event
// deno-lint-ignore no-explicit-any
async function logLineSearch(
  supabase: any,
  lineUserId: string,
  searchQuery: string,
  resultsCount: number,
  storeId?: string
): Promise<void> {
  try {
    // We need a tire_dot_id for stock_logs, so we'll create a synthetic log
    // For search events, we can use a special approach or skip if no dot_id
    console.log(`[LOG] LINE search by ${lineUserId}: "${searchQuery}" -> ${resultsCount} results (store: ${storeId || 'public'})`);
    
    // Note: Since stock_logs requires tire_dot_id, we just log to console for searches
    // A separate search_logs table could be created for detailed search analytics
  } catch (err) {
    console.error("[LOG] Failed to log LINE search:", err);
  }
}

// Adjust stock quantity
// deno-lint-ignore no-explicit-any
async function adjustStock(
  supabase: any,
  dotId: string,
  change: number,
  lineUserId: string
): Promise<{ success: boolean; newQuantity: number; message: string }> {
  console.log(`[STOCK] Adjusting stock for dot ${dotId} by ${change} (LINE user: ${lineUserId})`);
  
  // Get current quantity
  const { data: dot, error: fetchError } = await supabase
    .from("tire_dots")
    .select("quantity, dot_code")
    .eq("id", dotId)
    .maybeSingle();

  if (fetchError || !dot) {
    console.error("[STOCK] Error fetching dot:", fetchError);
    return { success: false, newQuantity: 0, message: "ไม่พบรายการนี้" };
  }

  const newQuantity = Math.max(0, dot.quantity + change);

  // Update quantity
  const { error: updateError } = await supabase
    .from("tire_dots")
    .update({ quantity: newQuantity })
    .eq("id", dotId);

  if (updateError) {
    console.error("[STOCK] Error updating quantity:", updateError);
    return { success: false, newQuantity: dot.quantity, message: "เกิดข้อผิดพลาดในการอัปเดต" };
  }

  // Log the change
  await logLineInteraction(
    supabase,
    change > 0 ? "line_add" : "line_remove",
    `LINE stock adjustment by user ${lineUserId}`,
    dotId,
    dot.quantity,
    newQuantity,
    change
  );

  console.log(`[STOCK] Updated: ${dot.dot_code} from ${dot.quantity} to ${newQuantity}`);

  return {
    success: true,
    newQuantity,
    message: `✅ DOT: ${dot.dot_code}\n${change > 0 ? "เพิ่ม" : "ลด"} 1 → สต็อกใหม่: ${newQuantity}`
  };
}

// Verify signature and find matching store from database
async function verifyAndFindStore(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  body: string,
  signature: string
): Promise<{ storeId: string; valid: boolean } | null> {
  console.log("[VERIFY] Starting signature verification...");
  
  // Get all stores with LINE enabled and credentials
  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, name, line_channel_secret")
    .eq("line_enabled", true)
    .not("line_channel_secret", "is", null);

  if (error) {
    console.error("[VERIFY] Error fetching stores:", error);
  }

  console.log(`[VERIFY] Found ${stores?.length || 0} LINE-enabled store(s)`);

  // Try each store's secret until one validates
  if (stores && stores.length > 0) {
    for (const store of stores) {
      if (store.line_channel_secret) {
        console.log(`[VERIFY] Trying store: ${store.name} (${store.id})`);
        const isValid = await verifySignature(body, signature, store.line_channel_secret);
        if (isValid) {
          console.log(`[VERIFY] ✅ Signature verified for store: ${store.name} (${store.id})`);
          return { storeId: store.id, valid: true };
        }
      }
    }
  }

  // Fall back to global secret if no store matches
  const globalSecret = Deno.env.get("LINE_CHANNEL_SECRET");
  if (globalSecret) {
    console.log("[VERIFY] Trying global LINE_CHANNEL_SECRET...");
    const isValid = await verifySignature(body, signature, globalSecret);
    if (isValid) {
      console.log("[VERIFY] ✅ Signature verified using global secret");
      return { storeId: "", valid: true };
    }
  }

  console.log("[VERIFY] ❌ No valid signature found");
  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    // Get request body and signature
    const body = await req.text();
    const signature = req.headers.get("x-line-signature");

    console.log("[WEBHOOK] Received request");
    console.log(`[WEBHOOK] Signature present: ${!!signature}`);

    if (!signature) {
      console.error("[WEBHOOK] Missing X-Line-Signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Initialize Supabase client with service role for full access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to verify signature against store secrets (then fall back to global)
    const matchedStore = await verifyAndFindStore(supabase, body, signature);
    
    if (!matchedStore) {
      console.error("[WEBHOOK] Invalid signature - no matching store found");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const identifiedStoreId = matchedStore.storeId;
    console.log(`[WEBHOOK] Identified store ID: ${identifiedStoreId || 'global/unknown'}`);

    // Parse webhook body
    const webhookBody: LineWebhookBody = JSON.parse(body);

    // Handle webhook verification (LINE sends empty events array)
    if (webhookBody.events.length === 0) {
      console.log("[WEBHOOK] Verification request received (empty events)");
      
      // Mark the matching store as verified
      if (identifiedStoreId) {
        const { error: updateError } = await supabase
          .from("stores")
          .update({
            line_webhook_verified: true,
            line_webhook_verified_at: new Date().toISOString(),
          })
          .eq("id", identifiedStoreId);
        
        if (updateError) {
          console.error("[WEBHOOK] Error updating webhook verification:", updateError);
        } else {
          console.log(`[WEBHOOK] ✅ Store ${identifiedStoreId} webhook verified`);
        }
      }
      
      return new Response(JSON.stringify({ success: true, verified: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Process each event
    for (const event of webhookBody.events) {
      console.log(`[EVENT] Processing: ${event.type}`);
      const lineUserId = event.source.userId;
      console.log(`[EVENT] LINE User ID: ${lineUserId}`);

      if (event.type === "follow") {
        console.log("[EVENT] New follower");
        await sendReply(event.replyToken, [generateWelcomeMessage()]);
        continue;
      }

      if (event.type === "message" && event.message?.type === "text") {
        const messageText = event.message.text.trim();
        console.log(`[EVENT] Message: "${messageText}"`);

        // Check if this is a link code (6 uppercase alphanumeric characters)
        if (/^[A-Z0-9]{6}$/.test(messageText.toUpperCase())) {
          console.log("[EVENT] Detected link code");
          const linkResult = await handleLinkCode(supabase, lineUserId, messageText, identifiedStoreId);
          // Handle both string and Flex Message responses
          const replyMessage = typeof linkResult === "string" 
            ? { type: "text", text: linkResult }
            : linkResult;
          await sendReply(event.replyToken, [replyMessage]);
          continue;
        }

        // Get user permissions - filtered by identified store if available
        const userPerms = await getUserPermissions(supabase, lineUserId, identifiedStoreId || undefined);

        // Check if user can view stock
        if (!canViewStock(userPerms)) {
          console.log("[EVENT] User cannot view stock, showing public results + registration prompt");
          
          // Allow public search for shared items, but prompt registration
          // Use fuzzy size matching
          const sanitizedInput = sanitizeSizeInput(messageText);
          const fuzzyPattern = buildFuzzyPattern(sanitizedInput);
          
          console.log(`[SEARCH] Public search: "${messageText}" -> pattern: "${fuzzyPattern}"`);
          
          const { data: tires } = await supabase
            .from("tires")
            .select(`
              id, brand, model, size, price, store_id,
              tire_dots (id, dot_code, quantity, position, promotion),
              stores (name)
            `)
            .or(`size.ilike.${fuzzyPattern},brand.ilike.%${messageText}%,model.ilike.%${messageText}%`)
            .eq("is_shared", true)
            .limit(5);

          // Log the search
          await logLineSearch(supabase, lineUserId, messageText, tires?.length || 0);

          if (tires && tires.length > 0) {
            console.log(`[SEARCH] Found ${tires.length} public tire(s)`);
            const flexMessage = generateTireFlexMessage(tires as TireWithDots[], false);
            await sendReply(event.replyToken, [
              flexMessage,
              generateRegistrationMessage()
            ]);
          } else {
            console.log("[SEARCH] No public tires found");
            await sendReply(event.replyToken, [generateRegistrationMessage()]);
          }
          continue;
        }

        // User is authenticated - search with full permissions
        const canAdjust = canAdjustStock(userPerms);
        console.log(`[EVENT] User authenticated: can_adjust=${canAdjust}, store_id=${userPerms?.store_id}`);

        // Fuzzy size search: sanitize input and build flexible pattern
        const sanitizedInput = sanitizeSizeInput(messageText);
        const fuzzyPattern = buildFuzzyPattern(sanitizedInput);
        
        console.log(`[SEARCH] Fuzzy search: "${messageText}" -> sanitized: "${sanitizedInput}" -> pattern: "${fuzzyPattern}"`);

        // Build query - include user's store tires plus shared tires
        // Use fuzzy pattern for size, regular ilike for brand/model
        let tiresQuery = supabase
          .from("tires")
          .select(`
            id, brand, model, size, price, store_id,
            tire_dots (id, dot_code, quantity, position, promotion),
            stores (name)
          `)
          .or(`size.ilike.${fuzzyPattern},brand.ilike.%${messageText}%,model.ilike.%${messageText}%`);

        // Add store filter if user has a store
        if (userPerms?.store_id) {
          tiresQuery = tiresQuery.or(`store_id.eq.${userPerms.store_id},is_shared.eq.true`);
        } else {
          tiresQuery = tiresQuery.eq("is_shared", true);
        }

        const { data: tires, error } = await tiresQuery.limit(10);

        if (error) {
          console.error("[SEARCH] Database query error:", error);
          throw error;
        }

        console.log(`[SEARCH] Found ${tires?.length || 0} tire(s)`);

        // Log the search
        await logLineSearch(supabase, lineUserId, messageText, tires?.length || 0, userPerms?.store_id);

        // Send flex message with results (include adjust buttons if permitted)
        const flexMessage = generateTireFlexMessage(tires as TireWithDots[], canAdjust);
        await sendReply(event.replyToken, [flexMessage]);
      }

      if (event.type === "postback" && event.postback) {
        const params = new URLSearchParams(event.postback.data);
        const action = params.get("action");
        const tireId = params.get("tire_id");
        const dotId = params.get("dot_id");

        console.log(`[POSTBACK] Action: ${action}, tire_id: ${tireId}, dot_id: ${dotId}`);

        // Get user permissions for postback actions - filtered by identified store
        const userPerms = await getUserPermissions(supabase, lineUserId, identifiedStoreId || undefined);

        if (action === "add_stock" && dotId) {
          if (!canAdjustStock(userPerms)) {
            console.log("[POSTBACK] Access denied for add_stock");
            await sendReply(event.replyToken, [generateAccessDeniedMessage()]);
            continue;
          }

          const result = await adjustStock(supabase, dotId, 1, lineUserId);
          await sendReply(event.replyToken, [{ type: "text", text: result.message }]);
        }

        if (action === "remove_stock" && dotId) {
          if (!canAdjustStock(userPerms)) {
            console.log("[POSTBACK] Access denied for remove_stock");
            await sendReply(event.replyToken, [generateAccessDeniedMessage()]);
            continue;
          }

          const result = await adjustStock(supabase, dotId, -1, lineUserId);
          await sendReply(event.replyToken, [{ type: "text", text: result.message }]);
        }

        if (action === "check_branches" && tireId) {
          console.log("[POSTBACK] Checking other branches");
          
          // Find same tire in other stores
          const { data: tire } = await supabase
            .from("tires")
            .select("brand, model, size")
            .eq("id", tireId)
            .maybeSingle();

          if (tire) {
            const { data: otherTires } = await supabase
              .from("tires")
              .select(`
                id, brand, model, size, price, store_id,
                tire_dots (id, dot_code, quantity, position, promotion),
                stores (name)
              `)
              .eq("brand", tire.brand)
              .eq("size", tire.size)
              .eq("is_shared", true)
              .neq("id", tireId)
              .limit(5);

            const canAdjust = canAdjustStock(userPerms);
            const message = otherTires && otherTires.length > 0
              ? generateTireFlexMessage(otherTires as TireWithDots[], canAdjust)
              : { type: "text", text: "ไม่พบยางรุ่นนี้ในสาขาอื่น" };

            await sendReply(event.replyToken, [message]);
          }
        }

        if (action === "reserve" && tireId) {
          console.log("[POSTBACK] Reservation request");
          // Send reservation confirmation
          await sendReply(event.replyToken, [
            {
              type: "text",
              text: "✅ ได้รับคำขอจองแล้ว\n\nเจ้าหน้าที่จะติดต่อกลับเพื่อยืนยันภายใน 30 นาที"
            }
          ]);
        }
      }
    }

    console.log("[WEBHOOK] Processing complete");
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
