-- ============================================================================
-- Unify the staff/membership model onto `profiles`.
--
-- Before this migration the app had TWO sources of truth for "who belongs to
-- which store": `store_members` (legacy, drove stores RLS + the Staff UI) and
-- `profiles.role`/`profiles.store_id` (new, drives every Phase 1-4 data table).
-- The split caused several latent bugs:
--   1. Owners had no RLS policy to update a staff member's profile, so approval
--      silently failed to set profiles.status/role/store_id (RLS blocked it).
--   2. The invite trigger + join-request approval never set profiles.store_id.
--   3. stores RLS for staff required a store_members row.
--   4. send-invite checked ownership via store_members (new owners aren't there).
--
-- This migration makes `profiles` the single source of truth:
--   - adds staff_position + permissions columns (the granularity store_members had)
--   - backfills them from store_members
--   - adds stores SELECT access for profiles-based members
--   - adds owner SELECT/UPDATE access over their store's staff profiles
--   - replaces the approval path with SECURITY DEFINER RPCs (handles the
--     chicken-and-egg where the target profile isn't in the store yet)
--   - updates the invite trigger to set profiles.role/store_id
--
-- store_members is left in place (deprecated) so nothing silently breaks; it is
-- no longer the source of truth and can be dropped in a later migration.
-- Safe to run multiple times.
-- ============================================================================

-- ── 1. New columns on profiles ──────────────────────────────────────────────
alter table public.profiles
  add column if not exists staff_position text,                 -- 'manager' | 'staff' | 'sales'
  add column if not exists permissions    jsonb;

-- Backfill from store_members for currently-approved members.
update public.profiles p
set staff_position = coalesce(p.staff_position, sm.role),
    permissions    = coalesce(p.permissions, sm.permissions)
from public.store_members sm
where sm.user_id = p.user_id
  and sm.is_approved = true
  and p.role = 'staff';

-- ── 2. stores: let profiles-based members read their store ──────────────────
drop policy if exists "members_view_their_store" on public.stores;
create policy "members_view_their_store"
  on public.stores for select to authenticated
  using (id = (select store_id from public.profiles where user_id = auth.uid()));

-- ── 3. profiles: owners can see & manage their store's staff ────────────────
drop policy if exists "owners_view_store_staff" on public.profiles;
create policy "owners_view_store_staff"
  on public.profiles for select to authenticated
  using (store_id in (select id from public.stores where owner_id = auth.uid()));

drop policy if exists "owners_update_store_staff" on public.profiles;
create policy "owners_update_store_staff"
  on public.profiles for update to authenticated
  using (store_id in (select id from public.stores where owner_id = auth.uid()))
  with check (
    store_id is null
    or store_id in (select id from public.stores where owner_id = auth.uid())
  );

-- ── 4. Approval RPCs (SECURITY DEFINER) ─────────────────────────────────────
-- The target profile has no store_id until approved, so an RLS UPDATE can't
-- reach it. These functions verify the caller owns the request's store, then
-- write the profile. They run as definer but gate on auth.uid() ownership.

create or replace function public.approve_staff_request(
  p_request_id  uuid,
  p_position    text  default 'staff',
  p_permissions jsonb default null
) returns jsonb as $$
declare
  v_req   record;
  v_owner boolean;
begin
  select * into v_req from public.staff_join_requests where id = p_request_id;
  if not found then return jsonb_build_object('success', false, 'error', 'request_not_found'); end if;

  select exists(
    select 1 from public.stores where id = v_req.store_id and owner_id = auth.uid()
  ) into v_owner;
  if not v_owner then return jsonb_build_object('success', false, 'error', 'forbidden'); end if;

  update public.staff_join_requests
    set status = 'approved', responded_at = now(), responded_by = auth.uid()
    where id = p_request_id;

  update public.profiles
    set status         = 'approved',
        role           = 'staff',
        store_id       = v_req.store_id,
        staff_position = coalesce(p_position, 'staff'),
        permissions    = coalesce(p_permissions, permissions)
    where user_id = v_req.user_id;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.reject_staff_request(
  p_request_id uuid
) returns jsonb as $$
declare
  v_req   record;
  v_owner boolean;
begin
  select * into v_req from public.staff_join_requests where id = p_request_id;
  if not found then return jsonb_build_object('success', false, 'error', 'request_not_found'); end if;

  select exists(
    select 1 from public.stores where id = v_req.store_id and owner_id = auth.uid()
  ) into v_owner;
  if not v_owner then return jsonb_build_object('success', false, 'error', 'forbidden'); end if;

  update public.staff_join_requests
    set status = 'rejected', responded_at = now(), responded_by = auth.uid()
    where id = p_request_id;

  update public.profiles set status = 'rejected' where user_id = v_req.user_id;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer set search_path = public;

-- Add an existing user (by email) directly as staff of the caller's store.
create or replace function public.add_staff_member(
  p_email       text,
  p_position    text  default 'staff',
  p_permissions jsonb default null
) returns jsonb as $$
declare
  v_store_id uuid;
  v_user_id  uuid;
begin
  select id into v_store_id from public.stores where owner_id = auth.uid() limit 1;
  if v_store_id is null then return jsonb_build_object('success', false, 'error', 'not_an_owner'); end if;

  select user_id into v_user_id from public.profiles where lower(email) = lower(p_email) limit 1;
  if v_user_id is null then return jsonb_build_object('success', false, 'error', 'user_not_found'); end if;

  update public.profiles
    set status         = 'approved',
        role           = 'staff',
        store_id       = v_store_id,
        staff_position = coalesce(p_position, 'staff'),
        permissions    = coalesce(p_permissions, permissions)
    where user_id = v_user_id;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.approve_staff_request(uuid, text, jsonb) from public, anon;
revoke all on function public.reject_staff_request(uuid)               from public, anon;
revoke all on function public.add_staff_member(text, text, jsonb)      from public, anon;
grant execute on function public.approve_staff_request(uuid, text, jsonb) to authenticated;
grant execute on function public.reject_staff_request(uuid)               to authenticated;
grant execute on function public.add_staff_member(text, text, jsonb)      to authenticated;

-- ── 5. Invited-user trigger now writes profiles (role + store_id) ───────────
create or replace function public.auto_handle_invited_user()
returns trigger as $$
declare
  invite_rec record;
begin
  select * into invite_rec
  from public.user_invites
  where email = new.email and accepted_at is null
  order by created_at desc
  limit 1;

  if found then
    if invite_rec.invited_as = 'staff' and invite_rec.store_id is not null then
      update public.profiles
        set status = 'approved', role = 'staff', store_id = invite_rec.store_id
        where user_id = new.user_id;
    else
      update public.profiles set status = 'approved' where user_id = new.user_id;
    end if;

    update public.user_invites set accepted_at = now() where id = invite_rec.id;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
