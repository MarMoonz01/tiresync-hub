import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Restrict CORS to Supabase internal callers (database webhooks only).
// Browser-originated requests are not expected for this function.
const corsHeaders = {
  // Auto-derives from the project the function is deployed to (Supabase injects SUPABASE_URL).
  'Access-Control-Allow-Origin': Deno.env.get('SUPABASE_URL') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LINE_PUSH_API_URL = "https://api.line.me/v2/bot/message/push";

// Maximum allowed lengths to prevent injection via Flex Message content
const MAX_TITLE_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 1000;

// ─── In-memory rate limiter ───────────────────────────────────────────────────
// Limits each LINE user to MAX_REQUESTS notifications per WINDOW_MS.
// State resets when the Deno isolate restarts, which is acceptable for basic abuse prevention.
const WINDOW_MS = 60_000;  // 1 minute
const MAX_REQUESTS = 10;   // max 10 pushes per user per minute

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= MAX_REQUESTS) return true;

  entry.count += 1;
  return false;
}

interface NotificationRecord {
  user_id: string;
  title: string;
  message: string;
  type?: string;
  send_line?: boolean;
}

function isValidRecord(record: unknown): record is NotificationRecord {
  if (!record || typeof record !== 'object') return false;
  const r = record as Record<string, unknown>;
  return (
    typeof r.user_id === 'string' && r.user_id.length > 0 &&
    typeof r.title === 'string' && r.title.length > 0 &&
    typeof r.message === 'string' && r.message.length > 0
  );
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse and validate payload structure
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payload || typeof payload !== 'object') {
      return new Response(JSON.stringify({ error: 'Missing payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const record = (payload as Record<string, unknown>).record;

    // Skip if send_line flag is false or record is missing/invalid
    if (!record || !(record as Record<string, unknown>).send_line) {
      return new Response(JSON.stringify({ message: 'Skipped' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isValidRecord(record)) {
      return new Response(JSON.stringify({ error: 'Invalid record structure' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize string lengths to prevent oversized Flex Message content
    const title = record.title.slice(0, MAX_TITLE_LENGTH);
    const message = record.message.slice(0, MAX_MESSAGE_LENGTH);

    // Connect to Supabase with service role (server-side only — never exposed to browser)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Look up the recipient's LINE User ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('line_user_id')
      .eq('user_id', record.user_id)
      .single();

    if (profileError || !profile?.line_user_id) {
      return new Response(JSON.stringify({ message: 'User not linked to LINE' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit per LINE user ID
    if (isRateLimited(profile.line_user_id)) {
      return new Response(JSON.stringify({ message: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map severity type to header color
    let headerColor = '#1DB446'; // green (default / info)
    let headerText = 'การแจ้งเตือน';

    if (record.type === 'critical') {
      headerColor = '#EF4444'; // red
      headerText = '⚠️ ด่วนมาก';
    } else if (record.type === 'warning') {
      headerColor = '#F59E0B'; // amber
      headerText = 'แจ้งเตือน';
    }

    // Build LINE Flex Message
    const flexMessage = {
      type: 'flex',
      altText: `${title}: ${message}`,
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
              weight: 'bold',
            },
          ],
          backgroundColor: headerColor,
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: title,
              weight: 'bold',
              size: 'lg',
              wrap: true,
            },
            {
              type: 'text',
              text: message,
              size: 'md',
              color: '#666666',
              wrap: true,
              margin: 'md',
            },
          ],
        },
      },
    };

    // Push notification to LINE API
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
    });

    if (!lineRes.ok) {
      const errorText = await lineRes.text();
      throw new Error(`LINE API Error: ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // Log full details server-side; return a generic message to the caller
    console.error('[line-push-notification] Internal error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
