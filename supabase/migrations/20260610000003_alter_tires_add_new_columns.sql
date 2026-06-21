-- Add new columns to tires table
-- quantity: direct stock count (previously only in tire_dots.quantity)
-- avg_cost: weighted-average cost used by OTTO/LENS
-- sell_price: canonical selling price (renamed from price — price kept for compat)
-- min_threshold: triggers HAWK reorder
-- last_sold_at: used by LENS for dead-stock detection
-- supplier: supplier name
-- is_active: soft delete

alter table public.tires
  add column if not exists quantity integer not null default 0,
  add column if not exists avg_cost numeric(10,2) default 0,
  add column if not exists sell_price numeric(10,2),
  add column if not exists min_threshold integer not null default 2,
  add column if not exists last_sold_at timestamptz,
  add column if not exists supplier text,
  add column if not exists is_active boolean not null default true;

-- Backfill sell_price from existing price column
update public.tires
set sell_price = price
where sell_price is null and price is not null;

-- Backfill quantity from tire_dots totals
update public.tires t
set quantity = coalesce((
  select sum(td.quantity)
  from public.tire_dots td
  where td.tire_id = t.id
), 0);

-- Ensure is_active is set
update public.tires set is_active = true where is_active is null;

-- Add updated_at if missing
alter table public.tires
  add column if not exists updated_at timestamptz default now();
