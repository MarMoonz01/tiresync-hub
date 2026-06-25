-- ============================================================================
-- Atomic sale transaction.
--
-- Replaces the multi-step (deduct -> log -> financials -> sales_log) sequence in
-- the record-sale edge function with a SINGLE Postgres function. A function body
-- runs in one implicit transaction, so either every write commits or none do —
-- no more "stock deducted but no sale recorded" desync if a later step fails.
--
-- Concurrency: the tire row is locked with SELECT ... FOR UPDATE, serialising
-- concurrent sales of the same tire. Two simultaneous sales of the last unit ->
-- exactly one succeeds, the other gets insufficient_stock.
--
-- Returns jsonb: { success, error?, sale_id?, customer_id?, qty_after?, low_stock? }
-- ============================================================================

create or replace function public.record_sale_txn(
  p_tire_id       uuid,
  p_quantity_sold integer,
  p_sell_price    numeric,
  p_service_total numeric default 0,
  p_services      text[]   default '{}',
  p_plate_number  text     default null,
  p_car_model     text     default null,
  p_customer_name text     default null,
  p_phone         text     default null,
  p_promotion_id  uuid     default null,
  p_staff_id      uuid     default null,   -- profiles.id of the seller
  p_user_id       uuid     default null    -- auth.uid() for stock_logs
) returns jsonb as $$
declare
  v_store_id      uuid;
  v_brand         text;
  v_model         text;
  v_size          text;
  v_avg_cost      numeric;
  v_min_threshold integer;
  v_qty_before    integer;
  v_qty_after     integer;
  v_tire_name     text;
  v_total_revenue numeric;
  v_cogs          numeric;
  v_gross_profit  numeric;
  v_low_stock     boolean;
  v_customer_id   uuid;
  v_existing_id   uuid;
  v_visit_count   integer;
  v_total_spend   numeric;
  v_brand_first   text;
  v_today         date := current_date;
  v_sale_id       uuid;
begin
  if p_quantity_sold is null or p_quantity_sold < 1 or p_sell_price is null then
    return jsonb_build_object('success', false, 'error', 'invalid_input');
  end if;

  -- Lock the tire row for the duration of the transaction (concurrency-safe).
  select store_id, brand, model, size, coalesce(avg_cost, 0), min_threshold, quantity
    into v_store_id, v_brand, v_model, v_size, v_avg_cost, v_min_threshold, v_qty_before
  from public.tires
  where id = p_tire_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'tire_not_found');
  end if;

  if v_qty_before < p_quantity_sold then
    return jsonb_build_object('success', false, 'error', 'insufficient_stock');
  end if;

  v_tire_name     := trim(both ' ' from concat_ws(' ', v_brand, v_model, v_size));
  v_total_revenue := (p_sell_price * p_quantity_sold) + coalesce(p_service_total, 0);
  v_cogs          := v_avg_cost * p_quantity_sold;
  v_gross_profit  := v_total_revenue - v_cogs;
  v_qty_after     := v_qty_before - p_quantity_sold;
  v_low_stock     := v_qty_after < v_min_threshold;
  v_brand_first   := split_part(v_tire_name, ' ', 1);

  -- 1. Deduct stock
  update public.tires
  set quantity = v_qty_after, last_sold_at = now(), updated_at = now()
  where id = p_tire_id;

  -- 2. Stock log
  insert into public.stock_logs (store_id, tire_id, user_id, action, qty_before, qty_change, qty_after, note)
  values (v_store_id, p_tire_id, p_user_id, 'sale', v_qty_before, -p_quantity_sold, v_qty_after,
          format('Sale: %sx %s', p_quantity_sold, v_tire_name));

  -- 3. Customer upsert (IRIS) — only if we have an identifier
  if coalesce(p_plate_number, '') <> '' or coalesce(p_phone, '') <> '' then
    select id, visit_count, total_spend
      into v_existing_id, v_visit_count, v_total_spend
    from public.customers
    where store_id = v_store_id
      and (
        (coalesce(p_plate_number, '') <> '' and plate_number = p_plate_number)
        or (coalesce(p_plate_number, '') = '' and coalesce(p_phone, '') <> '' and phone = p_phone)
      )
    limit 1;

    if v_existing_id is not null then
      v_total_spend := coalesce(v_total_spend, 0) + v_total_revenue;
      update public.customers set
        last_visit      = v_today,
        visit_count     = coalesce(v_visit_count, 0) + 1,
        total_spend     = v_total_spend,
        preferred_brand = v_brand_first,
        segment         = case when v_total_spend >= 50000 then 'VIP' else 'Regular' end,
        updated_at      = now()
      where id = v_existing_id;
      v_customer_id := v_existing_id;
    else
      insert into public.customers (store_id, name, phone, plate_number, car_model,
                                    last_visit, visit_count, total_spend, preferred_brand, segment)
      values (v_store_id, coalesce(nullif(p_customer_name, ''), 'ลูกค้า'),
              nullif(p_phone, ''), nullif(p_plate_number, ''), nullif(p_car_model, ''),
              v_today, 1, v_total_revenue, v_brand_first,
              case when v_total_revenue >= 50000 then 'VIP' else 'Regular' end)
      returning id into v_customer_id;
    end if;
  end if;

  -- 4. Financials (OTTO)
  insert into public.financials (store_id, type, revenue, cogs, gross_profit,
                                 period_day, period_week, period_month)
  values (v_store_id, 'sale', v_total_revenue, v_cogs, v_gross_profit,
          v_today, to_char(now(), 'IYYY"-W"IW'), to_char(now(), 'YYYY-MM'));

  -- 5. REX mapping
  if coalesce(p_car_model, '') <> '' then
    perform public.update_rex_mapping(v_store_id, lower(trim(p_car_model)), p_tire_id, v_tire_name);
  end if;

  -- 6. Sales log
  insert into public.sales_log (store_id, staff_id, customer_id, tire_id, tire_name,
                                car_model, plate_number, quantity_sold, services,
                                sell_price, total_revenue, cost_at_sale, gross_profit, promotion_id)
  values (v_store_id, p_staff_id, v_customer_id, p_tire_id, v_tire_name,
          nullif(p_car_model, ''), nullif(p_plate_number, ''), p_quantity_sold, coalesce(p_services, '{}'),
          p_sell_price, v_total_revenue, v_avg_cost, v_gross_profit, p_promotion_id)
  returning id into v_sale_id;

  return jsonb_build_object(
    'success',     true,
    'sale_id',     v_sale_id,
    'customer_id', v_customer_id,
    'store_id',    v_store_id,
    'tire_name',   v_tire_name,
    'qty_after',   v_qty_after,
    'min_threshold', v_min_threshold,
    'low_stock',   v_low_stock
  );
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.record_sale_txn from public, anon, authenticated;
grant execute on function public.record_sale_txn to service_role;
