-- ============================================================
-- TIREHUB — NEW PROJECT SETUP (paste-once)
-- Run this entire file ONCE in the new project's SQL Editor.
-- Order: base schema -> view hotfix -> SaaS (network, subscriptions)
--        -> remove agents -> per-DOT stock system -> seed -> unschedule agent cron
-- Idempotent where possible; safe to re-run if it stops partway.
-- ============================================================


-- ========================================================
-- SOURCE: TIREHUB_FINAL_MIGRATION.sql
-- ========================================================

-- ============================================================
-- TIREHUB AI SYSTEM — FINAL COMBINED MIGRATION
-- Paste this entire file into Supabase SQL Editor and run once.
-- Fully idempotent — safe to re-run if it fails partway.
-- ============================================================


-- ============================================================
-- 000: Enable Extensions
-- ============================================================
create extension if not exists "pg_cron"     with schema extensions;
create extension if not exists "pg_net"      with schema extensions;
create extension if not exists "supabase_vault" with schema vault;


-- ============================================================
-- 001: Add role + store_id to profiles
-- ============================================================
alter table public.profiles
  add column if not exists role     text check (role in ('owner','staff','interbranch')) default 'staff',
  add column if not exists store_id uuid references public.stores(id) on delete set null;

-- Backfill owners
update public.profiles p
set role = 'owner', store_id = s.id
from public.stores s
where s.owner_id = p.user_id
  and (p.role is null or p.role = 'staff');

-- Backfill staff from store_members (only if not owner)
update public.profiles p
set role = 'staff', store_id = sm.store_id
from public.store_members sm
where sm.user_id = p.user_id
  and sm.is_approved = true
  and (p.role is null or p.role = 'staff')
  and not exists (select 1 from public.stores where owner_id = p.user_id);

-- Update handle_new_user trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'staff',
    'pending'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;


-- ============================================================
-- 002: Add vault reference columns to stores
-- ============================================================
alter table public.stores
  add column if not exists facebook_page_id       text,
  add column if not exists vault_line_secret_ref  text,
  add column if not exists vault_line_token_ref   text,
  add column if not exists vault_line_oa_ref      text,
  add column if not exists vault_fb_token_ref     text;


-- ============================================================
-- 003: Add new columns to tires
-- ============================================================
alter table public.tires
  add column if not exists quantity      integer not null default 0,
  add column if not exists avg_cost      numeric(10,2),
  add column if not exists sell_price    numeric(10,2),
  add column if not exists min_threshold integer not null default 3,
  add column if not exists last_sold_at  timestamptz,
  add column if not exists supplier      text,
  add column if not exists is_active     boolean not null default true;

-- Backfill sell_price from existing price column (if exists)
update public.tires set sell_price = price where sell_price is null and price is not null;

-- Backfill quantity from tire_dots sum (if tire_dots has data)
update public.tires t
set quantity = coalesce((
  select sum(td.quantity)
  from public.tire_dots td
  where td.tire_id = t.id
), 0)
where t.quantity = 0;


-- ============================================================
-- 004: Add new columns to stock_logs  (FIX: added store_id)
-- ============================================================
alter table public.stock_logs
  add column if not exists store_id  uuid references public.stores(id) on delete cascade,
  add column if not exists tire_id   uuid references public.tires(id) on delete cascade,
  add column if not exists qty_before integer,
  add column if not exists qty_change integer,
  add column if not exists qty_after  integer,
  add column if not exists note       text;

-- Backfill tire_id from tire_dot_id path
update public.stock_logs sl
set
  tire_id    = td.tire_id,
  qty_before = sl.quantity_before,
  qty_change = sl.quantity_change,
  qty_after  = sl.quantity_after
from public.tire_dots td
where td.id = sl.tire_dot_id
  and sl.tire_id is null;

create index if not exists idx_stock_logs_tire_id on public.stock_logs(tire_id);
create index if not exists idx_stock_logs_store   on public.stock_logs(store_id);


-- ============================================================
-- 005: Create customers table
-- ============================================================
create table if not exists public.customers (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  name            text not null,
  phone           text,
  plate_number    text,
  car_model       text,
  last_visit      date,
  visit_count     integer not null default 1,
  preferred_brand text,
  total_spend     numeric(12,2) not null default 0,
  segment         text check (segment in ('VIP','Regular','At-risk')) default 'Regular',
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.customers enable row level security;

create index if not exists idx_customers_store   on public.customers(store_id);
create index if not exists idx_customers_plate   on public.customers(plate_number);
create index if not exists idx_customers_phone   on public.customers(phone);
create index if not exists idx_customers_segment on public.customers(store_id, segment);

drop policy if exists "store_members_manage_customers" on public.customers;
create policy "store_members_manage_customers"
  on public.customers for all to authenticated
  using (
    store_id in (
      select store_id from public.profiles
      where user_id = auth.uid() and role in ('owner','staff')
    )
  );

drop policy if exists "service_role_all_customers" on public.customers;
create policy "service_role_all_customers"
  on public.customers for all to service_role using (true);


-- ============================================================
-- 006: Create sales_log table
-- ============================================================
create table if not exists public.sales_log (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references public.stores(id) on delete cascade,
  staff_id       uuid references public.profiles(id) on delete set null,
  customer_id    uuid references public.customers(id) on delete set null,
  tire_id        uuid references public.tires(id) on delete set null,
  tire_name      text not null,
  car_model      text,
  plate_number   text,
  quantity_sold  integer not null,
  services       text[] default '{}',
  sell_price     numeric(10,2) not null,
  total_revenue  numeric(12,2) not null,
  cost_at_sale   numeric(10,2),
  gross_profit   numeric(12,2),
  promotion_id   uuid,
  created_at     timestamptz default now()
);

alter table public.sales_log enable row level security;

create index if not exists idx_sales_log_store   on public.sales_log(store_id);
create index if not exists idx_sales_log_created on public.sales_log(created_at);
create index if not exists idx_sales_log_staff   on public.sales_log(staff_id);
create index if not exists idx_sales_log_tire    on public.sales_log(tire_id);

drop policy if exists "owners_see_all_sales" on public.sales_log;
create policy "owners_see_all_sales"
  on public.sales_log for select to authenticated
  using (
    store_id in (
      select store_id from public.profiles
      where user_id = auth.uid() and role = 'owner'
    )
  );

drop policy if exists "service_role_all_sales" on public.sales_log;
create policy "service_role_all_sales"
  on public.sales_log for all to service_role using (true);


-- ============================================================
-- 007: Create financials table
-- ============================================================
create table if not exists public.financials (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores(id) on delete cascade,
  type         text not null check (type in ('sale','purchase','expense','weekly_summary')),
  reference_id uuid,
  revenue      numeric(12,2) default 0,
  cogs         numeric(12,2) default 0,
  gross_profit numeric(12,2) default 0,
  expense      numeric(12,2) default 0,
  net_profit   numeric(12,2),
  period_day   date,
  period_week  text,
  period_month text,
  created_at   timestamptz default now()
);

alter table public.financials enable row level security;

create index if not exists idx_financials_store        on public.financials(store_id);
create index if not exists idx_financials_period_day   on public.financials(store_id, period_day);
create index if not exists idx_financials_period_month on public.financials(store_id, period_month);

drop policy if exists "owners_see_financials" on public.financials;
create policy "owners_see_financials"
  on public.financials for all to authenticated
  using (
    store_id in (
      select store_id from public.profiles
      where user_id = auth.uid() and role = 'owner'
    )
  );

drop policy if exists "service_role_all_financials" on public.financials;
create policy "service_role_all_financials"
  on public.financials for all to service_role using (true);


-- ============================================================
-- 008: Create rex_mappings table
-- ============================================================
create table if not exists public.rex_mappings (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  car_model  text not null,
  tire_id    uuid references public.tires(id) on delete cascade,
  tire_name  text,
  sale_count integer not null default 1,
  percentage numeric(5,2) default 0,
  updated_at timestamptz default now(),
  unique (store_id, car_model, tire_id)
);

alter table public.rex_mappings enable row level security;

create index if not exists idx_rex_car_model       on public.rex_mappings(store_id, car_model);
create index if not exists idx_rex_car_model_count on public.rex_mappings(store_id, car_model, sale_count desc);

drop policy if exists "store_members_see_rex" on public.rex_mappings;
create policy "store_members_see_rex"
  on public.rex_mappings for select to authenticated
  using (
    store_id in (
      select store_id from public.profiles
      where user_id = auth.uid() and role in ('owner','staff')
    )
  );

drop policy if exists "service_role_all_rex" on public.rex_mappings;
create policy "service_role_all_rex"
  on public.rex_mappings for all to service_role using (true);


-- ============================================================
-- 009: Update notifications table  (FIX: added body, is_read, reference_id)
-- ============================================================
alter table public.notifications
  add column if not exists body           text,
  add column if not exists is_read        boolean default false,
  add column if not exists reference_id   uuid,
  add column if not exists send_line      boolean default false,
  add column if not exists line_sent_at   timestamptz,
  add column if not exists reference_type text;

-- Drop old triggers referencing removed tables (safe if they don't exist)
drop trigger if exists on_partnership_change on public.store_partnerships;
drop trigger if exists on_new_offer          on public.broadcast_offers;
drop trigger if exists on_new_broadcast      on public.broadcast_requests;

-- Reset RLS policies
drop policy if exists "View own notifications"            on public.notifications;
drop policy if exists "Update own notifications"          on public.notifications;
drop policy if exists "view_own_or_store_notifications"   on public.notifications;
drop policy if exists "update_own_notifications"          on public.notifications;
drop policy if exists "service_role_all_notifications"    on public.notifications;

create policy "view_own_or_store_notifications"
  on public.notifications for select to authenticated
  using (
    user_id = auth.uid()
    or store_id in (
      select store_id from public.profiles where user_id = auth.uid()
    )
  );

create policy "update_own_notifications"
  on public.notifications for update to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "service_role_all_notifications"
  on public.notifications for all to service_role using (true);


-- ============================================================
-- 010: Create agent_runs table  (FIX: correct column names)
-- ============================================================
create table if not exists public.agent_runs (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid references public.stores(id) on delete cascade,
  agent      text not null,
  trigger    text not null default 'cron',
  status     text not null check (status in ('running','success','error')),
  summary    text,
  metadata   jsonb default '{}',
  created_at timestamptz not null default now()
);

alter table public.agent_runs enable row level security;

create index if not exists idx_agent_runs_store on public.agent_runs(store_id, created_at desc);

drop policy if exists "owners_see_agent_runs" on public.agent_runs;
create policy "owners_see_agent_runs"
  on public.agent_runs for select to authenticated
  using (
    store_id in (
      select store_id from public.profiles
      where user_id = auth.uid() and role = 'owner'
    )
  );

drop policy if exists "service_role_all_agent_runs" on public.agent_runs;
create policy "service_role_all_agent_runs"
  on public.agent_runs for all to service_role using (true);


-- ============================================================
-- 011: Create column-isolation views  (FIX: drop before create)
-- ============================================================

-- Drop existing views first (required to change column set)
drop view if exists public.tires_staff_view       cascade;
drop view if exists public.tires_interbranch_view cascade;
drop view if exists public.tires_owner_view       cascade;
drop view if exists public.sales_log_staff_view   cascade;

-- IMPORTANT: these views are SECURITY DEFINER (the default — security_invoker NOT set).
-- They run with the view owner's privileges, which bypasses both the base-table RLS
-- and the `revoke select on tires` below. Row isolation is therefore enforced INSIDE
-- each view via an explicit store_id scope keyed off the caller's profile. This is the
-- canonical column-level-security pattern: definer view + WHERE scope + revoked base
-- table. (A security_invoker view would be denied by the revoke — they cannot coexist.)

-- Staff view: sell_price visible, avg_cost/supplier absent. Scoped to caller's store.
create view public.tires_staff_view as
  select id, store_id, brand, model, size, quantity, sell_price, is_active, min_threshold
  from public.tires
  where is_active = true
    and store_id = (select store_id from public.profiles where user_id = auth.uid());

-- Interbranch view: network-wide stock availability only — no prices, no cost.
create view public.tires_interbranch_view as
  select store_id, brand, model, size, quantity
  from public.tires
  where is_active = true and quantity > 0;

-- Owner view: all columns, scoped to caller's store.
create view public.tires_owner_view as
  select t.* from public.tires t
  where t.store_id = (select store_id from public.profiles where user_id = auth.uid());

-- Staff sales view: no cost_at_sale or gross_profit. Scoped to caller's store.
create view public.sales_log_staff_view as
  select id, store_id, staff_id, tire_name, car_model, plate_number,
         quantity_sold, services, sell_price, total_revenue, created_at
  from public.sales_log
  where store_id = (select store_id from public.profiles where user_id = auth.uid());

-- Column isolation: revoke direct base-table access from authenticated role.
-- All reads must go through the scoped views above.
revoke select on public.tires     from authenticated;
revoke select on public.sales_log from authenticated;

grant select on public.tires_staff_view       to authenticated;
grant select on public.tires_interbranch_view to authenticated;
grant select on public.tires_owner_view       to authenticated;
grant select on public.sales_log_staff_view   to authenticated;


-- ============================================================
-- 012: Atomic functions
-- ============================================================

-- Atomic stock deduction (race-condition safe)
create or replace function public.deduct_stock_atomic(
  p_tire_id uuid,
  p_qty     integer
) returns boolean as $$
declare
  rows_affected integer;
begin
  update public.tires
  set
    quantity     = quantity - p_qty,
    last_sold_at = now(),
    updated_at   = now()
  where id = p_tire_id
    and quantity >= p_qty;

  get diagnostics rows_affected = row_count;
  return rows_affected = 1;
end;
$$ language plpgsql security definer;

-- Weighted-average cost recalculation
create or replace function public.recalc_avg_cost_on_purchase(
  p_tire_id  uuid,
  p_new_qty  integer,
  p_new_cost numeric
) returns void as $$
declare
  old_qty  integer;
  old_cost numeric;
begin
  select quantity, coalesce(avg_cost, 0) into old_qty, old_cost
  from public.tires where id = p_tire_id;

  update public.tires set
    avg_cost = round(
      ((old_qty * old_cost) + (p_new_qty * p_new_cost))
      / nullif(old_qty + p_new_qty, 0),
      2
    ),
    quantity   = quantity + p_new_qty,
    updated_at = now()
  where id = p_tire_id;
end;
$$ language plpgsql security definer;

-- REX mapping update
create or replace function public.update_rex_mapping(
  p_store_id  uuid,
  p_car_model text,
  p_tire_id   uuid,
  p_tire_name text
) returns void as $$
declare
  total_for_model integer;
begin
  p_car_model := lower(trim(p_car_model));

  insert into public.rex_mappings (store_id, car_model, tire_id, tire_name, sale_count)
  values (p_store_id, p_car_model, p_tire_id, p_tire_name, 1)
  on conflict (store_id, car_model, tire_id)
  do update set
    sale_count = rex_mappings.sale_count + 1,
    tire_name  = p_tire_name,
    updated_at = now();

  select sum(sale_count) into total_for_model
  from public.rex_mappings
  where store_id = p_store_id and car_model = p_car_model;

  update public.rex_mappings
  set percentage = round((sale_count::numeric / total_for_model) * 100, 1)
  where store_id = p_store_id and car_model = p_car_model;
end;
$$ language plpgsql security definer;

-- Trending tyres function
create or replace function public.get_trending_tyres(
  p_store_id uuid,
  p_days     integer default 30
) returns table(
  tire_id    uuid,
  tire_name  text,
  units_sold integer,
  revenue    numeric
) as $$
begin
  return query
  select
    sl.tire_id,
    sl.tire_name,
    sum(sl.quantity_sold)::integer as units_sold,
    sum(sl.total_revenue)          as revenue
  from public.sales_log sl
  where sl.store_id = p_store_id
    and sl.created_at >= now() - (p_days || ' days')::interval
  group by sl.tire_id, sl.tire_name
  order by units_sold desc
  limit 10;
end;
$$ language plpgsql security definer;


-- ============================================================
-- 013: Stock-low notification trigger
-- ============================================================
create or replace function public.handle_stock_low_notification()
returns trigger as $$
declare
  v_owner_user_id uuid;
  v_store_name    text;
begin
  if new.quantity < new.min_threshold and old.quantity >= old.min_threshold then

    select p.user_id, s.name
    into v_owner_user_id, v_store_name
    from public.profiles p
    join public.stores s on s.id = new.store_id
    where p.store_id = new.store_id and p.role = 'owner'
    limit 1;

    if v_owner_user_id is not null then
      insert into public.notifications (
        store_id, user_id, type, title, body,
        is_read, send_line, reference_id, reference_type
      ) values (
        new.store_id,
        v_owner_user_id,
        'stock_low',
        'สต็อกต่ำ: ' || new.brand || ' ' || new.model,
        new.brand || ' ' || new.model || ' ' || new.size || ' — เหลือ ' || new.quantity || ' เส้น',
        false,
        true,
        new.id,
        'tire'
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists notify_stock_low on public.tires;
create trigger notify_stock_low
  after update of quantity on public.tires
  for each row
  execute function public.handle_stock_low_notification();


-- ============================================================
-- 014: Re-create stores views  (FIX: drop before create)
-- ============================================================

-- Drop existing views (stores_public has MORE columns in DB — must drop first)
drop view if exists public.stores_signup_search cascade;
drop view if exists public.stores_public        cascade;

create view public.stores_signup_search as
  select id, name
  from public.stores
  where is_active = true;

create view public.stores_public as
  select id, name, address, phone, is_active, created_at
  from public.stores
  where is_active = true;

grant select on public.stores_signup_search to anon, authenticated;
grant select on public.stores_public        to anon, authenticated;


-- ============================================================
-- 015: Performance indexes
-- ============================================================
create index if not exists idx_tires_store_active  on public.tires(store_id, is_active);
create index if not exists idx_tires_quantity      on public.tires(store_id, quantity);
create index if not exists idx_tires_last_sold     on public.tires(store_id, last_sold_at);
create index if not exists idx_profiles_store_role on public.profiles(store_id, role);
create index if not exists idx_rex_model_count     on public.rex_mappings(store_id, car_model, sale_count desc);
create index if not exists idx_financials_type     on public.financials(store_id, type, period_day);


-- ============================================================
-- 016: Purchase orders table
-- ============================================================
create table if not exists public.purchase_orders (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  tire_id       uuid references public.tires(id) on delete set null,
  tire_name     text not null,
  supplier      text,
  qty_requested int not null check (qty_requested > 0),
  unit_cost     numeric(12,2),
  total_cost    numeric(12,2) generated always as (qty_requested * coalesce(unit_cost, 0)) stored,
  status        text not null default 'pending' check (status in ('pending','approved','rejected','received')),
  notes         text,
  agent         text default 'HAWK',
  approved_by   uuid references auth.users(id),
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.purchase_orders enable row level security;

drop policy if exists "owner_all_purchase_orders"   on public.purchase_orders;
create policy "owner_all_purchase_orders" on public.purchase_orders
  for all using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.store_id = purchase_orders.store_id
        and p.role = 'owner'
    )
  );

drop policy if exists "service_all_purchase_orders" on public.purchase_orders;
create policy "service_all_purchase_orders" on public.purchase_orders
  for all using (auth.role() = 'service_role');

create index if not exists idx_po_store_status on public.purchase_orders(store_id, status, created_at desc);


-- ============================================================
-- 017: Promotions table
-- ============================================================
create table if not exists public.promotions (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  title         text not null,
  body_text     text,
  facebook_copy text,
  line_copy     text,
  image_url     text,
  discount_pct  numeric(5,2),
  start_date    date,
  end_date      date,
  status        text not null default 'draft' check (status in ('draft','pending_approval','approved','published','rejected')),
  agent         text default 'SPARK',
  approved_by   uuid references auth.users(id),
  approved_at   timestamptz,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.promotions enable row level security;

drop policy if exists "owner_all_promotions"   on public.promotions;
create policy "owner_all_promotions" on public.promotions
  for all using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.store_id = promotions.store_id
        and p.role = 'owner'
    )
  );

drop policy if exists "service_all_promotions" on public.promotions;
create policy "service_all_promotions" on public.promotions
  for all using (auth.role() = 'service_role');

create index if not exists idx_promotions_store_status on public.promotions(store_id, status, created_at desc);


-- ============================================================
-- 018: Interbranch tokens table
-- ============================================================
create table if not exists public.interbranch_tokens (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  token_hash text not null unique,
  label      text,
  expires_at timestamptz,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.interbranch_tokens enable row level security;

drop policy if exists "owner_all_interbranch_tokens"   on public.interbranch_tokens;
create policy "owner_all_interbranch_tokens" on public.interbranch_tokens
  for all using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.store_id = interbranch_tokens.store_id
        and p.role = 'owner'
    )
  );

drop policy if exists "service_all_interbranch_tokens" on public.interbranch_tokens;
create policy "service_all_interbranch_tokens" on public.interbranch_tokens
  for all using (auth.role() = 'service_role');


-- ============================================================
-- 019: Intelligence reports table
-- ============================================================
create table if not exists public.intelligence_reports (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores(id) on delete cascade,
  agent        text not null check (agent in ('ORACLE','SAGE','SPARK','PIXEL','FINN','ATLAS')),
  report_type  text not null,
  content      jsonb not null default '{}',
  period_start date,
  period_end   date,
  tokens_used  int,
  created_at   timestamptz not null default now()
);

alter table public.intelligence_reports enable row level security;

drop policy if exists "owner_read_intelligence_reports"   on public.intelligence_reports;
create policy "owner_read_intelligence_reports" on public.intelligence_reports
  for select using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.store_id = intelligence_reports.store_id
        and p.role = 'owner'
    )
  );

drop policy if exists "service_all_intelligence_reports" on public.intelligence_reports;
create policy "service_all_intelligence_reports" on public.intelligence_reports
  for all using (auth.role() = 'service_role');

create index if not exists idx_intel_reports_store on public.intelligence_reports(store_id, agent, created_at desc);


-- ============================================================
-- 020: Vault secrets (documentation only — no-op)
-- ============================================================
-- Insert secrets manually via Supabase Dashboard → Vault (not in migrations):
--   select vault.create_secret('your-line-channel-secret',  'line_channel_secret_default');
--   select vault.create_secret('your-line-channel-token',   'line_channel_token_default');
--   select vault.create_secret('your-claude-api-key',       'claude_api_key_default');
--   select vault.create_secret('your-fb-page-token',        'fb_page_token_default');
select 1;


-- ============================================================
-- 021: pg_cron schedules for scheduled agents
-- ============================================================
do $outer$
declare
  v_base_url text := 'https://rvtrwlcxdfnenqspagug.supabase.co';
begin
  -- SCOUT: daily 08:00 Thai time (UTC+7 = 01:00 UTC)
  perform cron.schedule(
    'scout-daily',
    '0 1 * * *',
    format(
      $cmd$select net.http_post(url := %L, headers := %L::jsonb, body := %L::jsonb)$cmd$,
      v_base_url || '/functions/v1/scout-daily',
      '{"Content-Type":"application/json"}',
      '{}'
    )
  );

  -- HAWK: daily 02:00 UTC
  perform cron.schedule(
    'hawk-reorder',
    '0 2 * * *',
    format(
      $cmd$select net.http_post(url := %L, headers := %L::jsonb, body := %L::jsonb)$cmd$,
      v_base_url || '/functions/v1/hawk-reorder',
      '{"Content-Type":"application/json"}',
      '{}'
    )
  );

  -- ATLAS: Monday 03:00 UTC
  perform cron.schedule(
    'atlas-weekly',
    '0 3 * * 1',
    format(
      $cmd$select net.http_post(url := %L, headers := %L::jsonb, body := %L::jsonb)$cmd$,
      v_base_url || '/functions/v1/atlas-weekly',
      '{"Content-Type":"application/json"}',
      '{}'
    )
  );

  -- LENS: Monday 04:00 UTC
  perform cron.schedule(
    'lens-deadstock',
    '0 4 * * 1',
    format(
      $cmd$select net.http_post(url := %L, headers := %L::jsonb, body := %L::jsonb)$cmd$,
      v_base_url || '/functions/v1/lens-deadstock',
      '{"Content-Type":"application/json"}',
      '{}'
    )
  );

exception when others then
  raise notice 'pg_cron not available in this environment: %', sqlerrm;
end;
$outer$;


-- ============================================================
-- 022: VERA financial alert trigger
-- ============================================================
create or replace function public.handle_vera_alert()
returns trigger as $$
declare
  v_owner_user_id uuid;
  v_threshold     numeric := -10000;
begin
  if new.type = 'weekly_summary' and new.gross_profit < v_threshold then

    select p.user_id into v_owner_user_id
    from public.profiles p
    where p.store_id = new.store_id and p.role = 'owner'
    limit 1;

    if v_owner_user_id is not null then
      insert into public.notifications (
        store_id, user_id, type, title, body, is_read, send_line
      ) values (
        new.store_id,
        v_owner_user_id,
        'financial_alert',
        'VERA: กำไรต่ำกว่าเกณฑ์',
        'กำไรสัปดาห์นี้: ฿' || new.gross_profit || ' — ต่ำกว่าเกณฑ์ ฿' || v_threshold,
        false,
        true
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists vera_financial_alert on public.financials;
create trigger vera_financial_alert
  after insert on public.financials
  for each row
  execute function public.handle_vera_alert();


-- ============================================================
-- 023: Promotion + PO status-change notification triggers
-- ============================================================
create or replace function public.handle_promotion_status_change()
returns trigger as $$
declare
  v_owner_user_id uuid;
begin
  if old.status is distinct from new.status then
    select p.user_id into v_owner_user_id
    from public.profiles p
    where p.store_id = new.store_id and p.role = 'owner'
    limit 1;

    if v_owner_user_id is not null then
      insert into public.notifications (
        store_id, user_id, type, title, body, is_read, reference_id, reference_type
      ) values (
        new.store_id,
        v_owner_user_id,
        'promotion_status',
        'โปรโมชัน: ' || new.title,
        'สถานะเปลี่ยนเป็น: ' || new.status,
        false,
        new.id,
        'promotion'
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists promotion_status_notify on public.promotions;
create trigger promotion_status_notify
  after update of status on public.promotions
  for each row
  execute function public.handle_promotion_status_change();

create or replace function public.handle_po_status_change()
returns trigger as $$
declare
  v_owner_user_id uuid;
begin
  if old.status is distinct from new.status then
    select p.user_id into v_owner_user_id
    from public.profiles p
    where p.store_id = new.store_id and p.role = 'owner'
    limit 1;

    if v_owner_user_id is not null then
      insert into public.notifications (
        store_id, user_id, type, title, body, is_read, reference_id, reference_type
      ) values (
        new.store_id,
        v_owner_user_id,
        'po_status',
        'ใบสั่งซื้อ: ' || new.tire_name,
        'สถานะเปลี่ยนเป็น: ' || new.status,
        false,
        new.id,
        'purchase_order'
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists po_status_notify on public.purchase_orders;
create trigger po_status_notify
  after update of status on public.purchase_orders
  for each row
  execute function public.handle_po_status_change();


-- ============================================================
-- Done!
-- ============================================================
select 'TireHub AI System migration complete' as result;

-- ========================================================
-- SOURCE: FIX_VIEWS_HOTFIX.sql
-- ========================================================

-- ============================================================================
-- HOTFIX: Replace broken security_invoker views with definer + scoped views.
--
-- The original views were created `with (security_invoker = true)` while
-- `select on tires/sales_log` is revoked from the authenticated role. Those two
-- are mutually exclusive: a security_invoker view checks base-table access as the
-- calling user, who no longer has the privilege -> "permission denied for table
-- tires" for every logged-in user.
--
-- Fix: definer views (security_invoker NOT set) that bypass the revoke and the
-- base RLS, with an explicit per-store scope keyed off the caller's profile.
--
-- Safe to run multiple times.
-- ============================================================================

drop view if exists public.tires_staff_view       cascade;
drop view if exists public.tires_interbranch_view cascade;
drop view if exists public.tires_owner_view       cascade;
drop view if exists public.sales_log_staff_view   cascade;

-- Staff view: sell_price visible, avg_cost/supplier absent. Scoped to caller's store.
create view public.tires_staff_view as
  select id, store_id, brand, model, size, quantity, sell_price, is_active, min_threshold
  from public.tires
  where is_active = true
    and store_id = (select store_id from public.profiles where user_id = auth.uid());

-- Interbranch view: network-wide stock availability only — no prices, no cost.
create view public.tires_interbranch_view as
  select store_id, brand, model, size, quantity
  from public.tires
  where is_active = true and quantity > 0;

-- Owner view: all columns, scoped to caller's store.
create view public.tires_owner_view as
  select t.* from public.tires t
  where t.store_id = (select store_id from public.profiles where user_id = auth.uid());

-- Staff sales view: no cost_at_sale or gross_profit. Scoped to caller's store.
create view public.sales_log_staff_view as
  select id, store_id, staff_id, tire_name, car_model, plate_number,
         quantity_sold, services, sell_price, total_revenue, created_at
  from public.sales_log
  where store_id = (select store_id from public.profiles where user_id = auth.uid());

-- Column isolation: ensure direct base-table access stays revoked.
revoke select on public.tires     from authenticated;
revoke select on public.sales_log from authenticated;

-- Reads must go through the scoped views.
grant select on public.tires_staff_view       to authenticated;
grant select on public.tires_interbranch_view to authenticated;
grant select on public.tires_owner_view       to authenticated;
grant select on public.sales_log_staff_view   to authenticated;

-- ========================================================
-- SOURCE: 20260621000001_store_network_links.sql
-- ========================================================

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

-- ========================================================
-- SOURCE: 20260621000002_store_subscriptions.sql
-- ========================================================

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

-- ========================================================
-- SOURCE: 20260623000001_drop_agent_tables.sql
-- ========================================================

-- Cleanup: remove orphaned AI-agent tables/functions after all agents were deleted.
-- Safe to run whether or not these objects exist (IF EXISTS + CASCADE drops policies).

-- Agent usage log + its admin RPC (from the reverted billing/usage work)
drop function if exists public.admin_agent_usage_by_store();
drop table if exists public.agent_usage_log cascade;

-- Scheduled-agent run history (HAWK/SCOUT/ATLAS/LENS health)
drop table if exists public.agent_runs cascade;

-- ORACLE/SPARK/PIXEL intelligence reports
drop table if exists public.intelligence_reports cascade;

-- Best-effort: unschedule any leftover pg_cron jobs for the deleted agents.
do $$
begin
  perform cron.unschedule(jobname)
  from cron.job
  where jobname in ('scout-daily', 'hawk-reorder', 'atlas-weekly', 'lens-deadstock');
exception when others then
  raise notice 'pg_cron not available / no jobs to remove: %', sqlerrm;
end $$;

-- ========================================================
-- SOURCE: 20260623000002_dot_stock_system.sql
-- ========================================================

-- Per-DOT stock system
-- Re-activate DOT-batch tracking (tire_dots) as the source of truth for stock,
-- while keeping tires.quantity in sync (= sum of its DOT batches) so the POS,
-- record-sale flow and the existing Stock pages keep working unchanged.

-- 1. Load index lives on the tyre line (matches the shop's stock sheet).
alter table public.tires add column if not exists load_index text;

-- 2. Keep tires.quantity = sum(tire_dots.quantity) whenever DOT batches change.
create or replace function public.sync_tire_quantity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  tid := coalesce(new.tire_id, old.tire_id);
  update public.tires
     set quantity = coalesce((select sum(quantity) from public.tire_dots where tire_id = tid), 0),
         updated_at = now()
   where id = tid;
  return null;
end;
$$;

drop trigger if exists trg_sync_tire_quantity on public.tire_dots;
create trigger trg_sync_tire_quantity
  after insert or update or delete on public.tire_dots
  for each row execute function public.sync_tire_quantity();

-- 3. Preserve existing aggregate stock: any tyre that has quantity but no DOT
--    batches gets a single "N/A" batch so nothing is lost when the trigger
--    starts recomputing from tire_dots. Owners can rename/split it later.
insert into public.tire_dots (tire_id, dot_code, quantity, position)
select t.id, 'N/A', t.quantity, 1
  from public.tires t
 where coalesce(t.quantity, 0) > 0
   and not exists (select 1 from public.tire_dots d where d.tire_id = t.id);

-- ========================================================
-- SOURCE: seed_master_tires.sql
-- ========================================================

-- Seed data for master_tires
-- Run this in the Supabase SQL Editor to populate the catalog

INSERT INTO public.master_tires (brand, model, size, load_index, speed_rating)
VALUES
  -- Michelin Pilot Sport 5
  ('Michelin', 'Pilot Sport 5', '205/55R16', '91', 'V'),
  ('Michelin', 'Pilot Sport 5', '215/55R17', '94', 'V'),
  ('Michelin', 'Pilot Sport 5', '225/45R17', '91', 'Y'),
  ('Michelin', 'Pilot Sport 5', '235/40R18', '95', 'Y'),
  ('Michelin', 'Pilot Sport 5', '245/40R18', '97', 'Y'),
  ('Michelin', 'Pilot Sport 5', '225/40R18', '92', 'Y'),

  -- Bridgestone Potenza Adrenalin RE004
  ('Bridgestone', 'Potenza Adrenalin RE004', '195/50R15', '82', 'V'),
  ('Bridgestone', 'Potenza Adrenalin RE004', '195/55R15', '85', 'W'),
  ('Bridgestone', 'Potenza Adrenalin RE004', '205/45R17', '88', 'W'),
  ('Bridgestone', 'Potenza Adrenalin RE004', '215/45R17', '91', 'W'),
  ('Bridgestone', 'Potenza Adrenalin RE004', '225/45R18', '95', 'W'),

  -- Yokohama Advan dB V552
  ('Yokohama', 'Advan dB V552', '215/60R16', '95', 'V'),
  ('Yokohama', 'Advan dB V552', '215/55R17', '94', 'V'),
  ('Yokohama', 'Advan dB V552', '225/55R17', '97', 'W'),
  ('Yokohama', 'Advan dB V552', '235/50R18', '97', 'W'),

  -- Maxxis I-PRO
  ('Maxxis', 'I-PRO', '195/50R15', '82', 'V'),
  ('Maxxis', 'I-PRO', '205/45R17', '88', 'V'),

  -- Otani KC2000
  ('Otani', 'KC2000', '195/55R15', '85', 'V'),
  ('Otani', 'KC2000', '215/45R17', '91', 'Y'),
  ('Otani', 'KC2000', '225/40R18', '92', 'Y'),

  -- Toyo Proxes TR1
  ('Toyo', 'Proxes TR1', '195/50R15', '82', 'V'),
  ('Toyo', 'Proxes TR1', '205/45R17', '88', 'W'),

  -- Kumho Ecsta PS31
  ('Kumho', 'Ecsta PS31', '195/55R15', '85', 'V'),
  ('Kumho', 'Ecsta PS31', '205/55R16', '91', 'V')

ON CONFLICT (brand, model, size) DO NOTHING;

-- ============================================================
-- Ensure removed agents are not scheduled (no-op if absent)
-- ============================================================
do $$ begin
  perform cron.unschedule(jobname) from cron.job
   where jobname in ('scout-daily','hawk-reorder','atlas-weekly','lens-deadstock');
exception when others then null;
end $$;
