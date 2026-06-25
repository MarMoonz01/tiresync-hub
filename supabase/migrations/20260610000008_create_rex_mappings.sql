create table if not exists public.rex_mappings (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  car_model   text not null,
  tire_id     uuid references public.tires(id) on delete cascade,
  tire_name   text,
  sale_count  integer not null default 1,
  percentage  numeric(5,2) default 0,
  updated_at  timestamptz default now(),
  unique (store_id, car_model, tire_id)
);

alter table public.rex_mappings enable row level security;

create index if not exists idx_rex_car_model       on public.rex_mappings(store_id, car_model);
create index if not exists idx_rex_car_model_count on public.rex_mappings(store_id, car_model, sale_count desc);

-- Owner and staff can read REX data
create policy "store_members_see_rex"
  on public.rex_mappings for select to authenticated
  using (
    store_id in (
      select store_id from public.profiles
      where user_id = auth.uid() and role in ('owner','staff')
    )
  );

create policy "service_role_all_rex"
  on public.rex_mappings for all to service_role using (true);
