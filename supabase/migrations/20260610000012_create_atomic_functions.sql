-- Atomic stock deduction (race-condition safe)
-- Returns true if deduction succeeded, false if insufficient stock
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

-- Weighted-average cost recalculation (called on stock receipt)
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

-- REX mapping update (called after every sale)
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

  -- Recalculate percentages for this car model
  select sum(sale_count) into total_for_model
  from public.rex_mappings
  where store_id = p_store_id and car_model = p_car_model;

  update public.rex_mappings
  set percentage = round((sale_count::numeric / total_for_model) * 100, 1)
  where store_id = p_store_id and car_model = p_car_model;
end;
$$ language plpgsql security definer;

-- Trending tyres function (used by TREND panel on sales page)
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
