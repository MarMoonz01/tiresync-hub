-- Add new columns to stock_logs for direct tire reference
-- Keeps tire_dot_id for backward compat with existing audit log queries

alter table public.stock_logs
  add column if not exists tire_id uuid references public.tires(id) on delete cascade,
  add column if not exists qty_before integer,
  add column if not exists qty_change integer,
  add column if not exists qty_after integer,
  add column if not exists note text;

-- Backfill tire_id from tire_dot_id path
update public.stock_logs sl
set
  tire_id   = td.tire_id,
  qty_before = sl.quantity_before,
  qty_change = sl.quantity_change,
  qty_after  = sl.quantity_after
from public.tire_dots td
where td.id = sl.tire_dot_id
  and sl.tire_id is null;

create index if not exists idx_stock_logs_tire_id on public.stock_logs(tire_id);
