-- ============================================================================
-- Store subscriptions (lightweight SaaS billing state — NO payment provider yet).
--
-- Each store is now a paying tenant. This table records subscription state so the
-- app can gate access; wiring a real payment provider is a later step. The gate
-- in ProtectedRoute is product/paywall UX — the actual per-store data isolation
-- is still enforced by the existing RLS on tires/sales_log/financials/etc.
--
-- platform_admin (the platform_admins table + is_platform_admin() from migration
-- 028) can read/write subscriptions; store owners can read only their own.
-- Safe to run multiple times.
-- ============================================================================

create table if not exists public.store_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null unique references public.stores(id) on delete cascade,
  plan          text not null default 'trial'  check (plan in ('trial','standard','suspended')),
  status        text not null default 'active' check (status in ('active','past_due','canceled')),
  trial_ends_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.store_subscriptions enable row level security;
create index if not exists idx_store_subscriptions_store on public.store_subscriptions(store_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Owners can READ their own subscription (to render plan/trial state); they
-- cannot change it (no self-serve billing yet). Platform admin manages all.
drop policy if exists "owners_view_own_subscription" on public.store_subscriptions;
create policy "owners_view_own_subscription"
  on public.store_subscriptions for select to authenticated
  using (public.auth_owns_store(store_id));

drop policy if exists "admin_all_subscriptions" on public.store_subscriptions;
create policy "admin_all_subscriptions"
  on public.store_subscriptions for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "service_all_subscriptions" on public.store_subscriptions;
create policy "service_all_subscriptions"
  on public.store_subscriptions for all to service_role using (true) with check (true);

-- ── Auto-create a 14-day trial when a store is created ──────────────────────
-- Trigger on stores so it works no matter which path creates the store
-- (register-store edge function, admin tooling, etc.).
create or replace function public.create_trial_subscription()
returns trigger as $$
begin
  insert into public.store_subscriptions (store_id, plan, status, trial_ends_at)
  values (new.id, 'trial', 'active', now() + interval '14 days')
  on conflict (store_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_store_trial_subscription on public.stores;
create trigger trg_store_trial_subscription
  after insert on public.stores
  for each row execute function public.create_trial_subscription();

-- Backfill existing stores that predate this table.
insert into public.store_subscriptions (store_id, plan, status, trial_ends_at)
select id, 'trial', 'active', now() + interval '14 days'
from public.stores
on conflict (store_id) do nothing;

-- ── Gate helper: is the store's subscription currently usable? ───────────────
-- active + (standard, or trial that hasn't expired). suspended/past_due/canceled
-- and expired trials are blocked.
create or replace function public.store_subscription_active(p_store_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.store_subscriptions sub
    where sub.store_id = p_store_id
      and sub.status = 'active'
      and sub.plan in ('trial','standard')
      and (sub.plan <> 'trial' or sub.trial_ends_at is null or sub.trial_ends_at > now())
  );
$$ language sql stable security definer set search_path = public;

grant execute on function public.store_subscription_active(uuid) to authenticated;
