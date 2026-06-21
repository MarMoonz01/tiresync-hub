-- Add role + store_id columns to profiles (new single-column role model)
-- Keeps user_roles table intact for backward compat during transition

alter table public.profiles
  add column if not exists role text check (role in ('owner','staff','interbranch')) default 'staff',
  add column if not exists store_id uuid references public.stores(id) on delete set null;

-- Backfill: owners (from stores.owner_id)
update public.profiles p
set role = 'owner',
    store_id = s.id
from public.stores s
where s.owner_id = p.user_id;

-- Backfill: staff (from store_members, only if not already owner)
update public.profiles p
set role = 'staff',
    store_id = sm.store_id
from public.store_members sm
where sm.user_id = p.user_id
  and sm.is_approved = true
  and p.role = 'staff'
  and not exists (
    select 1 from public.stores where owner_id = p.user_id
  );

-- Update handle_new_user trigger to include role field
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'staff',
    'pending'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
