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

-- Owners see all their store's sales
create policy "owners_see_all_sales"
  on public.sales_log for select to authenticated
  using (
    store_id in (
      select store_id from public.profiles
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- Service role has full access (used by record-sale edge function)
create policy "service_role_all_sales"
  on public.sales_log for all to service_role using (true);
