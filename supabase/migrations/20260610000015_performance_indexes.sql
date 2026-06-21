-- Phase 1 performance indexes

create index if not exists idx_tires_store_active  on public.tires(store_id, is_active);
create index if not exists idx_tires_quantity      on public.tires(store_id, quantity);
create index if not exists idx_tires_last_sold     on public.tires(store_id, last_sold_at);
create index if not exists idx_profiles_user_id    on public.profiles(user_id);
create index if not exists idx_profiles_store_role on public.profiles(store_id, role);
create index if not exists idx_rex_model_count     on public.rex_mappings(store_id, car_model, sale_count desc);
create index if not exists idx_financials_type     on public.financials(store_id, type, period_day);
