import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LINE_PUSH_API_URL = "https://api.line.me/v2/bot/message/push";
const LOW_STOCK_THRESHOLD = 4;

interface TireDot {
  id: string;
  dot_code: string;
  quantity: number;
}

interface Store {
  name: string;
  owner_id: string;
}

interface TireWithDots {
  id: string;
  brand: string;
  model: string | null;
  size: string;
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

// Generate low stock alert Flex Message
function generateLowStockAlert(tire: TireWithDots, lowStockDots: { dot_code: string; quantity: number }[]): object {
  const dotList = lowStockDots.map(dot => ({
    type: "box",
    layout: "horizontal",
    contents: [
      {
        type: "text",
        text: `DOT ${dot.dot_code}`,
        size: "sm",
        color: "#555555",
        flex: 2
      },
      {
        type: "text",
        text: `เหลือ ${dot.quantity} เส้น`,
        size: "sm",
        color: "#EF4444",
        weight: "bold",
        align: "end",
        flex: 1
      }
    ],
    margin: "sm"
  }));

  return {
    type: "flex",
    altText: `⚠️ แจ้งเตือน: ${tire.brand} ${tire.size} สต็อกต่ำ`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "⚠️ แจ้งเตือนสต็อกต่ำ",
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
            text: `${tire.brand.toUpperCase()}`,
            weight: "bold",
            size: "lg",
            color: "#2563EB"
          },
          {
            type: "text",
            text: `${tire.model || ""} • ${tire.size}`,
            size: "sm",
            color: "#666666",
            margin: "xs"
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: "รายการที่เหลือน้อย:",
            size: "sm",
            color: "#888888",
            margin: "lg"
          },
          ...dotList,
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: `📍 ${getStoreName(tire.stores)}`,
            size: "xs",
            color: "#888888",
            margin: "lg"
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
              type: "uri",
              label: "จัดการสต็อก",
              uri: "https://id-preview--a5cdc804-bf59-4c95-96b8-dab96ec988fc.lovable.app/inventory"
            },
            style: "primary",
            color: "#2563EB"
          }
        ],
        paddingAll: "md"
      }
    }
  };
}

// Send push message to LINE user
async function sendPushMessage(userId: string, messages: object[]): Promise<void> {
  const channelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  
  if (!channelAccessToken) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not configured");
  }

  const response = await fetch(LINE_PUSH_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${channelAccessToken}`
    },
    body: JSON.stringify({
      to: userId,
      messages
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("LINE Push API error:", errorText);
    throw new Error(`LINE Push API error: ${response.status}`);
  }
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { tire_id, admin_line_user_id } = body;

    // Option 1: Check specific tire
    if (tire_id) {
      const { data: tire, error } = await supabase
        .from("tires")
        .select(`
          id, brand, model, size,
          tire_dots (id, dot_code, quantity),
          stores (name, owner_id)
        `)
        .eq("id", tire_id)
        .single();

      if (error || !tire) {
        return new Response(JSON.stringify({ error: "Tire not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const tireData = tire as TireWithDots;
      const lowStockDots = tireData.tire_dots.filter(dot => dot.quantity > 0 && dot.quantity <= LOW_STOCK_THRESHOLD);

      if (lowStockDots.length > 0 && admin_line_user_id) {
        const alertMessage = generateLowStockAlert(tireData, lowStockDots);
        await sendPushMessage(admin_line_user_id, [alertMessage]);
        
        return new Response(JSON.stringify({ success: true, sent: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true, sent: false, reason: "No low stock items" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Option 2: Scan all tires for low stock (can be called by a cron job)
    const { data: tiresWithLowStock, error } = await supabase
      .from("tires")
      .select(`
        id, brand, model, size,
        tire_dots!inner (id, dot_code, quantity),
        stores (name, owner_id)
      `)
      .gt("tire_dots.quantity", 0)
      .lte("tire_dots.quantity", LOW_STOCK_THRESHOLD);

    if (error) {
      console.error("Error fetching low stock tires:", error);
      throw error;
    }

    console.log(`Found ${tiresWithLowStock?.length || 0} tires with low stock`);

    return new Response(JSON.stringify({ 
      success: true, 
      low_stock_count: tiresWithLowStock?.length || 0,
      message: "To send alerts, provide admin_line_user_id in the request body"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
