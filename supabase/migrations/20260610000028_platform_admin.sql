-- ============================================================================
-- Platform admin (operator) console backend.
--
-- A "platform admin" is the operator of the whole SaaS (you) — distinct from a
-- store owner. Membership lives in `platform_admins`. Every privileged action is
-- enforced server-side via is_platform_admin(), so the /admin console is secure,
-- not just hidden in the UI.
--
-- BOOTSTRAP (one time): anoint yourself after your account exists —
--   insert into public.platform_admins (user_id)
--   select user_id from public.profiles where email = 'you@example.com'
--   on conflict do nothing;
--
-- Safe to run multiple times.
-- ============================================================================

create table if not exists public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- A user may see their own admin membership (so the app can check it). No one
-- can grant themselves admin from the app — inserts come from SQL/service_role.
drop policy if exists "see_own_admin_membership" on public.platform_admins;
create policy "see_own_admin_membership"
  on public.platform_admins for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "service_all_platform_admins" on public.platform_admins;
create policy "service_all_platform_admins"
  on public.platform_admins for all to service_role using (true) with check (true);

-- SECURITY DEFINER so it bypasses RLS on platform_admins (no recursion).
create or replace function public.is_platform_admin()
returns boolean as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$ language sql stable security definer set search_path = public;

grant execute on function public.is_platform_admin() to authenticated;

-- ── Admin read/write access via RLS (additive) ──────────────────────────────
drop policy if exists "admin_all_stores" on public.stores;
create policy "admin_all_stores"
  on public.stores for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "admin_all_profiles" on public.profiles;
create policy "admin_all_profiles"
  on public.profiles for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "admin_all_invite_codes" on public.store_invite_codes;
create policy "admin_all_invite_codes"
  on public.store_invite_codes for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ── Generate an invite code from the console ────────────────────────────────
create or replace function public.admin_generate_invite_code(
  p_note         text default null,
  p_expires_days integer default 30
) returns text as $$
declare
  v_code text;
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;

  loop
    v_code := public.gen_alnum_code(8);
    exit when not exists (select 1 from public.store_invite_codes where code = v_code);
  end loop;

  insert into public.store_invite_codes (code, note, expires_at)
  values (v_code, p_note, now() + (p_expires_days || ' days')::interval);

  return v_code;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.admin_generate_invite_code(text, integer) from public, anon;
grant execute on function public.admin_generate_invite_code(text, integer) to authenticated;

-- ── Platform-wide metrics ───────────────────────────────────────────────────
create or replace function public.admin_platform_metrics()
returns jsonb as $$
declare
  v jsonb;
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;

  select jsonb_build_object(
    'total_stores',   (select count(*) from public.stores),
    'active_stores',  (select count(*) from public.stores where is_active),
    'total_users',    (select count(*) from public.profiles),
    'total_owners',   (select count(*) from public.profiles where role = 'owner'),
    'total_staff',    (select count(*) from public.profiles where role = 'staff'),
    'total_sales',    (select count(*) from public.sales_log),
    'total_revenue',  (select coalesce(sum(total_revenue), 0) from public.sales_log),
    'unused_codes',   (select count(*) from public.store_invite_codes where used_at is null)
  ) into v;

  return v;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.admin_platform_metrics() from public, anon;
grant execute on function public.admin_platform_metrics() to authenticated;
