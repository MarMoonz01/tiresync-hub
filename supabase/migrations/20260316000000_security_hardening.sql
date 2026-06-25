-- ─────────────────────────────────────────────────────────────────────────────
-- Security Hardening (2026-03-16)
--
-- 1. Fix stores RLS: scopes sensitive column access to owners/staff/admins only.
--    Any approved user could previously read line_channel_secret from any store.
--
-- 2. Prevent stores from partnering with themselves.
--
-- 3. Validate store_members.permissions JSON structure.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Fix stores table RLS ───────────────────────────────────────────────────

-- Drop the overly-permissive policy that exposed ALL columns
-- (including line_channel_secret) to every approved user.
DROP POLICY IF EXISTS "Approved users can view active stores basic info" ON public.stores;
DROP POLICY IF EXISTS "Approved users can view all stores" ON public.stores;

-- Approved staff members can read their own store only.
-- (Store owners are already covered by the existing ALL policy.)
CREATE POLICY "Store members can view their own store"
ON public.stores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = stores.id
      AND sm.user_id = auth.uid()
      AND sm.is_approved = true
  )
  OR public.has_role(auth.uid(), 'moderator')
);

-- Recreate stores_public WITHOUT security_invoker.
-- Without security_invoker the view runs under the schema-owner's privileges,
-- which bypasses RLS on the underlying table.  This is intentional: the view
-- is the *only* way for non-members to discover other stores, and it
-- deliberately omits every sensitive column.
CREATE OR REPLACE VIEW public.stores_public AS
SELECT
  id,
  name,
  description,
  logo_url,
  address,
  phone,
  email,
  is_active,
  created_at,
  updated_at
  -- Omitted: owner_id, line_channel_secret,
  --          line_channel_access_token, line_webhook_secret
FROM public.stores
WHERE is_active = true;

-- Re-grant access (CREATE OR REPLACE resets grants on the view)
GRANT SELECT ON public.stores_public TO authenticated;


-- ── 2. Prevent self-referential partnerships ──────────────────────────────────

ALTER TABLE public.store_partnerships
ADD CONSTRAINT check_no_self_partnership
CHECK (requester_store_id != receiver_store_id);


-- ── 3. Validate store_members.permissions JSON structure ──────────────────────

ALTER TABLE public.store_members
ADD CONSTRAINT check_permissions_structure
CHECK (
  permissions IS NULL
  OR (
    jsonb_typeof(permissions)           = 'object'
    AND jsonb_typeof(permissions->'web')  = 'object'
    AND jsonb_typeof(permissions->'line') = 'object'
    AND (permissions->'web' ->>'view')    IS NOT NULL
    AND (permissions->'web' ->>'add')     IS NOT NULL
    AND (permissions->'web' ->>'edit')    IS NOT NULL
    AND (permissions->'web' ->>'delete')  IS NOT NULL
    AND (permissions->'line'->>'view')    IS NOT NULL
    AND (permissions->'line'->>'adjust')  IS NOT NULL
  )
);
