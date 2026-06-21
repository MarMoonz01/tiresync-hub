create table if not exists public.customers (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores(id) on delete cascade,
  name         text not null,
  phone        text,
  plate_number text,
  car_model    text,
  last_visit   date,
  visit_count  integer not null default 1,
  preferred_brand text,
  total_spend  numeric(12,2) not null default 0,
  segment      text check (segment in ('VIP','Regular','At-risk')) default 'Regular',
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table public.customers enable row level security;

create index if not exists idx_customers_store    on public.customers(store_id);
create index if not exists idx_customers_plate    on public.customers(plate_number);
create index if not exists idx_customers_phone    on public.customers(phone);
create index if not exists idx_customers_segment  on public.customers(store_id, segment);

-- Owner and staff of same store can manage customers
create policy "store_members_manage_customers"
  on public.customers for all to authenticated
  using (
    store_id in (
      select store_id from public.profiles
      where user_id = auth.uid() and role in ('owner','staff')
    )
  );

create policy "service_role_all_customers"
  on public.customers for all to service_role using (true);
