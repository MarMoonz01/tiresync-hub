import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LINE_PUSH_API_URL = "https://api.line.me/v2/bot/message/push";

Deno.serve(async (req) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. รับ Payload จาก Database Webhook
    // (SQL Trigger จะส่ง object ชื่อ 'record' มาให้)
    const payload = await req.json()
    const record = payload.record 

    console.log("🔔 Webhook Payload received:", record);

    // 3. กรอง: ถ้าไม่มี record หรือ send_line = false ให้ข้ามไปเลย
    if (!record || !record.send_line) {
      console.log("Skipping: send_line is false or no record provided");
      return new Response(JSON.stringify({ message: 'Skipped' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. เชื่อมต่อ Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 5. หา LINE User ID ของคนรับ (จาก user_id)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('line_user_id')
      .eq('user_id', record.user_id)
      .single()

    if (profileError || !profile?.line_user_id) {
      console.log(`User ${record.user_id} has no LINE ID linked.`)
      // ไม่ถือเป็น Error แค่บอกว่าส่งไม่ได้
      return new Response(JSON.stringify({ message: 'User not linked to LINE' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 6. เลือกสีหัวข้อตามความด่วน (type)
    let headerColor = '#1DB446'; // เขียว (ค่าเริ่มต้น / info)
    let headerText = 'การแจ้งเตือน';

    if (record.type === 'critical') {
      headerColor = '#EF4444'; // แดง
      headerText = '⚠️ ด่วนมาก';
    } else if (record.type === 'warning') {
      headerColor = '#F59E0B'; // เหลือง
      headerText = 'แจ้งเตือน';
    }

    // 7. สร้าง Flex Message (ใช้ Title/Message จาก Database ตรงๆ)
    const flexMessage = {
      type: 'flex',
      altText: `${record.title}: ${record.message}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: headerText,
              color: '#FFFFFF',
              weight: 'bold'
            }
          ],
          backgroundColor: headerColor
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: record.title,
              weight: 'bold',
              size: 'lg',
              wrap: true
            },
            {
              type: 'text',
              text: record.message,
              size: 'md',
              color: '#666666',
              wrap: true,
              margin: 'md'
            }
          ]
        }
      }
    };

    // 8. ยิงเข้า LINE API
    const lineRes = await fetch(LINE_PUSH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')}`,
      },
      body: JSON.stringify({
        to: profile.line_user_id,
        messages: [flexMessage],
      }),
    })

    if (!lineRes.ok) {
      const errorText = await lineRes.text()
      throw new Error(`LINE API Error: ${errorText}`)
    }

    console.log("✅ Notification sent to LINE successfully!");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Internal Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})