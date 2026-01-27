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
    console.error("Signature verification error:", error);
    return false;
  }
}

// Generate Flex Message for tire search results
function generateTireFlexMessage(tires: TireWithDots[]): object {
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
    const totalStock = tire.tire_dots.reduce((sum, dot) => sum + dot.quantity, 0);
    
    // Generate DOT rows
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

      return {
        type: "box",
        layout: "horizontal",
        contents: [
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
          },
          {
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
          }
        ],
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
              { type: "text", text: "สถานะ", size: "xs", color: "#888888", weight: "bold", align: "center", flex: 2 }
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
          }
        ],
        paddingAll: "lg"
      }
    }
  };
}

// Send reply to LINE
async function sendReply(replyToken: string, messages: object[]): Promise<void> {
  const channelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  
  if (!channelAccessToken) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not configured");
  }

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
    console.error("LINE API error:", errorText);
    throw new Error(`LINE API error: ${response.status}`);
  }
}

// Log LINE interaction to stock_logs (for search actions)
// deno-lint-ignore no-explicit-any
async function logLineInteraction(
  supabase: any,
  action: string,
  notes: string,
  tireDotId?: string
): Promise<void> {
  // Only log if we have a tire_dot_id (required by the schema)
  if (!tireDotId) {
    console.log("Skipping log - no tire_dot_id provided");
    return;
  }

  try {
    const { error } = await supabase
      .from("stock_logs")
      .insert({
        action,
        notes,
        tire_dot_id: tireDotId,
        quantity_before: 0,
        quantity_after: 0,
        quantity_change: 0,
        user_id: null // LINE users are not authenticated in web
      });

    if (error) {
      console.error("Error logging LINE interaction:", error);
    }
  } catch (err) {
    console.error("Failed to log LINE interaction:", err);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const channelSecret = Deno.env.get("LINE_CHANNEL_SECRET");
    if (!channelSecret) {
      throw new Error("LINE_CHANNEL_SECRET is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    // Get request body and signature
    const body = await req.text();
    const signature = req.headers.get("x-line-signature");

    if (!signature) {
      console.error("Missing X-Line-Signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verify signature
    const isValid = await verifySignature(body, signature, channelSecret);
    if (!isValid) {
      console.error("Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Parse webhook body
    const webhookBody: LineWebhookBody = JSON.parse(body);
    
    // Initialize Supabase client with service role for full access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Process each event
    for (const event of webhookBody.events) {
      console.log("Processing event:", event.type);

      if (event.type === "follow") {
        // New user followed the bot
        await sendReply(event.replyToken, [generateWelcomeMessage()]);
        continue;
      }

      if (event.type === "message" && event.message?.type === "text") {
        const searchQuery = event.message.text.trim();
        const userId = event.source.userId;

        console.log(`Search query from ${userId}: ${searchQuery}`);

        // Search tires by size, brand, or model
        const { data: tires, error } = await supabase
          .from("tires")
          .select(`
            id,
            brand,
            model,
            size,
            price,
            store_id,
            tire_dots (
              id,
              dot_code,
              quantity,
              position,
              promotion
            ),
            stores (
              name
            )
          `)
          .or(`size.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%`)
          .eq("is_shared", true)
          .limit(10);

        if (error) {
          console.error("Database query error:", error);
          throw error;
        }

        // Log the search interaction (using first tire's first DOT if available)
        if (tires && tires.length > 0) {
          const firstTire = tires[0] as TireWithDots;
          if (firstTire.tire_dots && firstTire.tire_dots.length > 0) {
            await logLineInteraction(
              supabase,
              "line_search",
              `LINE search: "${searchQuery}" by user ${userId}`,
              firstTire.tire_dots[0].id
            );
          }
        }

        // Send flex message with results
        const flexMessage = generateTireFlexMessage(tires as TireWithDots[]);
        await sendReply(event.replyToken, [flexMessage]);
      }

      if (event.type === "postback" && event.postback) {
        const params = new URLSearchParams(event.postback.data);
        const action = params.get("action");
        const tireId = params.get("tire_id");

        console.log(`Postback action: ${action}, tireId: ${tireId}`);

        if (action === "check_branches" && tireId) {
          // Find same tire in other stores
          const { data: tire } = await supabase
            .from("tires")
            .select("brand, model, size")
            .eq("id", tireId)
            .single();

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

            const message = otherTires && otherTires.length > 0
              ? generateTireFlexMessage(otherTires as TireWithDots[])
              : {
                  type: "text",
                  text: "ไม่พบยางรุ่นนี้ในสาขาอื่น"
                };

            await sendReply(event.replyToken, [message]);
          }
        }

        if (action === "reserve" && tireId) {
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

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
