-- Purchase orders table (Phase 2 — HAWK reorder + PO approval flow)
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

-- Owner: full access
create policy "owner_all_purchase_orders" on public.purchase_orders
  for all using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.store_id = purchase_orders.store_id
        and p.role = 'owner'
    )
  );

-- service_role: full access (for edge functions)
create policy "service_all_purchase_orders" on public.purchase_orders
  for all using (auth.role() = 'service_role');

create index if not exists idx_po_store_status on public.purchase_orders(store_id, status, created_at desc);
