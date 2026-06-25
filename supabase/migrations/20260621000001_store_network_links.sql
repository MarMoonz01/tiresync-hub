-- ============================================================================
-- Multi-tenant network links (opt-in cross-store stock visibility).
--
-- Previously `tires_interbranch_view` was a SECURITY DEFINER view with NO store
-- scoping, granted to every authenticated user — so any logged-in user could see
-- EVERY store's stock. Now that stores are independent, competing tenants, that
-- leaks competitor data by default.
--
-- This migration makes cross-store visibility opt-in:
--   - `store_network_links` records a handshake between two stores
--     (pending -> accepted -> revoked).
--   - owners request / accept / revoke links via SECURITY DEFINER RPCs.
--   - `tires_interbranch_view` is rewritten to show stock ONLY from stores that
--     have an ACCEPTED link with the caller's store. Visibility is mutual: once
--     accepted, both parties can see each other's availability (no prices/cost).
--
-- Follows the existing patterns: SECURITY DEFINER helpers (auth_store_id /
-- auth_owns_store from 029), drop-and-recreate policies, service_role bypass.
-- Safe to run multiple times.
-- ============================================================================

create table if not exists public.store_network_links (
  id                  uuid primary key default gen_random_uuid(),
  requesting_store_id uuid not null references public.stores(id) on delete cascade,
  target_store_id     uuid not null references public.stores(id) on delete cascade,
  status              text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (requesting_store_id, target_store_id),
  check (requesting_store_id <> target_store_id)
);

alter table public.store_network_links enable row level security;

create index if not exists idx_network_links_requesting on public.store_network_links(requesting_store_id, status);
create index if not exists idx_network_links_target     on public.store_network_links(target_store_id, status);

-- ── RLS: a store's members can READ links their store is party to ────────────
-- Writes go through the owner-gated RPCs below, never direct table access.
drop policy if exists "members_view_their_network_links" on public.store_network_links;
create policy "members_view_their_network_links"
  on public.store_network_links for select to authenticated
  using (
    requesting_store_id = public.auth_store_id()
    or target_store_id = public.auth_store_id()
  );

drop policy if exists "service_all_network_links" on public.store_network_links;
create policy "service_all_network_links"
  on public.store_network_links for all to service_role using (true) with check (true);

-- ── Accepted-partner store ids for the caller's store (mutual) ───────────────
-- SECURITY DEFINER so it can read the link table regardless of the caller's RLS.
create or replace function public.linked_store_ids()
returns setof uuid as $$
  select case
           when l.requesting_store_id = public.auth_store_id() then l.target_store_id
           else l.requesting_store_id
         end
  from public.store_network_links l
  where l.status = 'accepted'
    and (l.requesting_store_id = public.auth_store_id()
         or l.target_store_id = public.auth_store_id());
$$ language sql stable security definer set search_path = public;

grant execute on function public.linked_store_ids() to authenticated;

-- ── Owner-gated RPCs: request / accept / revoke ─────────────────────────────
create or replace function public.request_network_link(p_target_store_id uuid)
returns public.store_network_links as $$
declare
  v_store_id uuid;
  v_row public.store_network_links;
begin
  select store_id into v_store_id from public.profiles
    where user_id = auth.uid() and role = 'owner' limit 1;
  if v_store_id is null then raise exception 'only store owners can manage network links'; end if;
  if p_target_store_id = v_store_id then raise exception 'cannot link a store to itself'; end if;
  if not exists (select 1 from public.stores where id = p_target_store_id) then
    raise exception 'target store not found';
  end if;

  insert into public.store_network_links (requesting_store_id, target_store_id, status)
  values (v_store_id, p_target_store_id, 'pending')
  on conflict (requesting_store_id, target_store_id)
    do update set status = 'pending', updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.accept_network_link(p_link_id uuid)
returns public.store_network_links as $$
declare
  v_store_id uuid;
  v_row public.store_network_links;
begin
  select store_id into v_store_id from public.profiles
    where user_id = auth.uid() and role = 'owner' limit 1;
  if v_store_id is null then raise exception 'only store owners can manage network links'; end if;

  update public.store_network_links
    set status = 'accepted', updated_at = now()
    where id = p_link_id and target_store_id = v_store_id and status = 'pending'
  returning * into v_row;
  if v_row.id is null then raise exception 'link not found or not awaiting your approval'; end if;
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.revoke_network_link(p_link_id uuid)
returns public.store_network_links as $$
declare
  v_store_id uuid;
  v_row public.store_network_links;
begin
  select store_id into v_store_id from public.profiles
    where user_id = auth.uid() and role = 'owner' limit 1;
  if v_store_id is null then raise exception 'only store owners can manage network links'; end if;

  update public.store_network_links
    set status = 'revoked', updated_at = now()
    where id = p_link_id
      and (requesting_store_id = v_store_id or target_store_id = v_store_id)
  returning * into v_row;
  if v_row.id is null then raise exception 'link not found'; end if;
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.request_network_link(uuid) from public, anon;
revoke all on function public.accept_network_link(uuid)  from public, anon;
revoke all on function public.revoke_network_link(uuid)  from public, anon;
grant execute on function public.request_network_link(uuid) to authenticated;
grant execute on function public.accept_network_link(uuid)  to authenticated;
grant execute on function public.revoke_network_link(uuid)  to authenticated;

-- ── Rewrite the interbranch view: accepted-linked stores only ───────────────
-- Definer view (no security_invoker) so it can read across stores, but now
-- scoped by linked_store_ids(). Availability only — no sell_price, no cost —
-- so linked competitors never see each other's pricing.
drop view if exists public.tires_interbranch_view cascade;
create view public.tires_interbranch_view as
  select t.store_id,
         s.name as store_name,
         t.brand,
         t.model,
         t.size,
         t.quantity
  from public.tires t
  join public.stores s on s.id = t.store_id
  where t.is_active = true
    and t.quantity > 0
    and t.store_id in (select public.linked_store_ids());

grant select on public.tires_interbranch_view to authenticated;

-- ── Store directory (name only) so owners can find partners to link with ─────
-- The per-store RLS on `stores` restricts owners to their own row, so they can't
-- discover other stores or resolve a partner's name. This definer view exposes
-- id + name of active stores ONLY (no addresses, phones, or business data) — the
-- minimum needed for a B2B link directory.
create or replace view public.store_directory as
  select id, name, is_active
  from public.stores
  where is_active = true;

grant select on public.store_directory to authenticated;
