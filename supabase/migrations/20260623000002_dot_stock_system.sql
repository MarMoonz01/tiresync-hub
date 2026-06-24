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
