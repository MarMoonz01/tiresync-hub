-- Promotions table (Phase 2 — SPARK proposals + PIXEL content generation)
create table if not exists public.promotions (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  title           text not null,
  body_text       text,
  facebook_copy   text,
  line_copy       text,
  image_url       text,
  discount_pct    numeric(5,2),
  start_date      date,
  end_date        date,
  status          text not null default 'draft' check (status in ('draft','pending_approval','approved','published','rejected')),
  agent           text default 'SPARK',
  approved_by     uuid references auth.users(id),
  approved_at     timestamptz,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.promotions enable row level security;

create policy "owner_all_promotions" on public.promotions
  for all using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.store_id = promotions.store_id
        and p.role = 'owner'
    )
  );

create policy "service_all_promotions" on public.promotions
  for all using (auth.role() = 'service_role');

create index if not exists idx_promotions_store_status on public.promotions(store_id, status, created_at desc);
