import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Authenticate caller ────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    // ── Validate body ──────────────────────────────────────────────────────
    let body: unknown
    try { body = await req.json() } catch {
      return json({ error: 'Invalid JSON' }, 400)
    }

    const { email, role, store_id } = body as Record<string, unknown>

    if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      return json({ error: 'Invalid email' }, 400)
    }
    if (role !== 'owner' && role !== 'staff') {
      return json({ error: 'role must be "owner" or "staff"' }, 400)
    }
    if (role === 'staff' && typeof store_id !== 'string') {
      return json({ error: 'store_id required for staff invite' }, 400)
    }

    // ── Permission check ───────────────────────────────────────────────────
    if (role === 'owner') {
      // Must be moderator or admin
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['moderator', 'admin'])
        .maybeSingle()

      if (!roleRow) return json({ error: 'Only moderators can invite owners' }, 403)

    } else {
      // Must be the owner of that store (single source of truth: stores.owner_id)
      const { data: ownedStore } = await supabase
        .from('stores')
        .select('id')
        .eq('id', store_id as string)
        .eq('owner_id', user.id)
        .maybeSingle()

      if (!ownedStore) return json({ error: 'You do not own this store' }, 403)
    }

    // ── Insert invite record FIRST so the DB trigger finds it ──────────────
    // (inviteUserByEmail immediately fires the auth trigger → profiles insert
    //  → our auto_handle_invited_user trigger. The record must exist by then.)
    const { error: insertError } = await supabase
      .from('user_invites')
      .insert({
        email,
        invited_as: role,
        store_id:   role === 'staff' ? store_id : null,
        invited_by: user.id,
      })

    if (insertError) throw insertError

    // ── Send the invite email ──────────────────────────────────────────────
    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        data: { invited_as: role, store_id: role === 'staff' ? store_id : null },
        redirectTo: `${siteUrl}/dashboard`,
      }
    )

    if (inviteError) {
      // Roll back the invite record if the email failed for any reason
      // other than "user already exists" (they may have a pending invite)
      if (!inviteError.message.toLowerCase().includes('already been registered')) {
        await supabase
          .from('user_invites')
          .delete()
          .eq('email', email)
          .is('accepted_at', null)
        throw inviteError
      }
      // Already-registered users: invite record is kept so they're auto-approved
      // next time they log in (handles the re-invite edge case).
    }

    return json({ success: true })

  } catch (err) {
    console.error('[send-invite] Error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
