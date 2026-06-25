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

-- Owner-only access
create policy "owners_see_financials"
  on public.financials for all to authenticated
  using (
    store_id in (
      select store_id from public.profiles
      where user_id = auth.uid() and role = 'owner'
    )
  );

create policy "service_role_all_financials"
  on public.financials for all to service_role using (true);
