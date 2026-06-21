-- Ensure stores_signup_search and stores_public views exist
-- (used by Auth.tsx store search during signup)

create or replace view public.stores_signup_search as
select id, name
from public.stores
where is_active = true;

create or replace view public.stores_public as
select id, name, address, phone, is_active, created_at
from public.stores
where is_active = true;

grant select on public.stores_signup_search to anon, authenticated;
grant select on public.stores_public        to anon, authenticated;
