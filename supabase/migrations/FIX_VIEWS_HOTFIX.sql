-- ============================================================================
-- HOTFIX: Replace broken security_invoker views with definer + scoped views.
--
-- The original views were created `with (security_invoker = true)` while
-- `select on tires/sales_log` is revoked from the authenticated role. Those two
-- are mutually exclusive: a security_invoker view checks base-table access as the
-- calling user, who no longer has the privilege -> "permission denied for table
-- tires" for every logged-in user.
--
-- Fix: definer views (security_invoker NOT set) that bypass the revoke and the
-- base RLS, with an explicit per-store scope keyed off the caller's profile.
--
-- Safe to run multiple times.
-- ============================================================================

drop view if exists public.tires_staff_view       cascade;
drop view if exists public.tires_interbranch_view cascade;
drop view if exists public.tires_owner_view       cascade;
drop view if exists public.sales_log_staff_view   cascade;

-- Staff view: sell_price visible, avg_cost/supplier absent. Scoped to caller's store.
create view public.tires_staff_view as
  select id, store_id, brand, model, size, quantity, sell_price, is_active, min_threshold
  from public.tires
  where is_active = true
    and store_id = (select store_id from public.profiles where user_id = auth.uid());

-- Interbranch view: network-wide stock availability only — no prices, no cost.
create view public.tires_interbranch_view as
  select store_id, brand, model, size, quantity
  from public.tires
  where is_active = true and quantity > 0;

-- Owner view: all columns, scoped to caller's store.
create view public.tires_owner_view as
  select t.* from public.tires t
  where t.store_id = (select store_id from public.profiles where user_id = auth.uid());

-- Staff sales view: no cost_at_sale or gross_profit. Scoped to caller's store.
create view public.sales_log_staff_view as
  select id, store_id, staff_id, tire_name, car_model, plate_number,
         quantity_sold, services, sell_price, total_revenue, created_at
  from public.sales_log
  where store_id = (select store_id from public.profiles where user_id = auth.uid());

-- Column isolation: ensure direct base-table access stays revoked.
revoke select on public.tires     from authenticated;
revoke select on public.sales_log from authenticated;

-- Reads must go through the scoped views.
grant select on public.tires_staff_view       to authenticated;
grant select on public.tires_interbranch_view to authenticated;
grant select on public.tires_owner_view       to authenticated;
grant select on public.sales_log_staff_view   to authenticated;
