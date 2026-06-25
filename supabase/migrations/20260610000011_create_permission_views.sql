-- Column-isolation views
-- security_invoker = true means the view still obeys the caller's RLS policies

-- Staff view: sell_price visible, avg_cost/supplier absent
create or replace view public.tires_staff_view
  with (security_invoker = true) as
  select id, store_id, brand, model, size, quantity, sell_price, is_active, min_threshold
  from public.tires
  where is_active = true;

-- Interbranch view: stock availability only — no prices
create or replace view public.tires_interbranch_view
  with (security_invoker = true) as
  select store_id, brand, model, size, quantity
  from public.tires
  where is_active = true and quantity > 0;

-- Owner view: all columns (for stock-management page)
create or replace view public.tires_owner_view
  with (security_invoker = true) as
  select * from public.tires;

-- Staff sales view: no cost_at_sale or gross_profit
create or replace view public.sales_log_staff_view
  with (security_invoker = true) as
  select id, store_id, staff_id, tire_name, car_model, plate_number,
         quantity_sold, services, sell_price, total_revenue, created_at
  from public.sales_log;

-- Column isolation:
-- Revoke direct table access from authenticated role
-- Staff/interbranch users can only query via the restricted views
-- NOTE: service_role is NOT affected by revoke
revoke select on public.tires      from authenticated;
revoke select on public.sales_log  from authenticated;

grant select on public.tires_staff_view        to authenticated;
grant select on public.tires_interbranch_view  to authenticated;
grant select on public.tires_owner_view        to authenticated;
grant select on public.sales_log_staff_view    to authenticated;
