-- ============================================================================
-- HOTFIX: break infinite recursion between profiles and stores RLS policies.
--
-- Migration 026 added:
--   - stores."members_view_their_store"  -> subquery on profiles
--   - profiles."owners_view_store_staff" -> subquery on stores
-- Each policy's subquery is itself subject to the OTHER table's RLS, so:
--   read profiles -> evaluate stores RLS -> read profiles -> ... (loop)
-- PostgreSQL raises "infinite recursion detected in policy" on EVERY profile
-- read, which breaks login (the app can't load the profile and signs you out).
--
-- Fix: move the cross-table lookups into SECURITY DEFINER helper functions.
-- A definer function bypasses RLS on the table it reads, so the cycle is cut.
--
-- Safe to run multiple times.
-- ============================================================================

-- Caller's own store_id, read WITHOUT triggering profiles RLS.
create or replace function public.auth_store_id()
returns uuid as $$
  select store_id from public.profiles where user_id = auth.uid() limit 1;
$$ language sql stable security definer set search_path = public;

-- Does the caller own this store? Read WITHOUT triggering stores RLS.
create or replace function public.auth_owns_store(p_store_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.stores where id = p_store_id and owner_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

grant execute on function public.auth_store_id()            to authenticated;
grant execute on function public.auth_owns_store(uuid)      to authenticated;

-- ── Recreate the two cross-referencing policies using the helpers ───────────

drop policy if exists "members_view_their_store" on public.stores;
create policy "members_view_their_store"
  on public.stores for select to authenticated
  using (id = public.auth_store_id());

drop policy if exists "owners_view_store_staff" on public.profiles;
create policy "owners_view_store_staff"
  on public.profiles for select to authenticated
  using (public.auth_owns_store(store_id));

drop policy if exists "owners_update_store_staff" on public.profiles;
create policy "owners_update_store_staff"
  on public.profiles for update to authenticated
  using (public.auth_owns_store(store_id))
  with check (store_id is null or public.auth_owns_store(store_id));
