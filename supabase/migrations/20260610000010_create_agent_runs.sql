create table if not exists public.agent_runs (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid references public.stores(id) on delete cascade,
  agent_name    text not null,
  status        text not null check (status in ('running','success','failed')),
  error_message text,
  tokens_used   integer,
  started_at    timestamptz default now(),
  finished_at   timestamptz
);

alter table public.agent_runs enable row level security;

create index if not exists idx_agent_runs_store on public.agent_runs(store_id, started_at desc);

-- Owners can see their store's agent runs
create policy "owners_see_agent_runs"
  on public.agent_runs for select to authenticated
  using (
    store_id in (
      select store_id from public.profiles
      where user_id = auth.uid() and role = 'owner'
    )
  );

create policy "service_role_all_agent_runs"
  on public.agent_runs for all to service_role using (true);
