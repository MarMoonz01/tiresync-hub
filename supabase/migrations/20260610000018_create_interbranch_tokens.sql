-- Interbranch access tokens (for read-only cross-store stock viewing)
create table if not exists public.interbranch_tokens (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores(id) on delete cascade,
  token_hash   text not null unique,
  label        text,
  expires_at   timestamptz,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table public.interbranch_tokens enable row level security;

create policy "owner_all_interbranch_tokens" on public.interbranch_tokens
  for all using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.store_id = interbranch_tokens.store_id
        and p.role = 'owner'
    )
  );

create policy "service_all_interbranch_tokens" on public.interbranch_tokens
  for all using (auth.role() = 'service_role');
