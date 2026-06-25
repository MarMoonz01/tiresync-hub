-- Intelligence reports (ORACLE insights + SAGE forecasts stored outputs)
create table if not exists public.intelligence_reports (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores(id) on delete cascade,
  agent        text not null check (agent in ('ORACLE','SAGE','SPARK','PIXEL','FINN','ATLAS')),
  report_type  text not null,
  content      jsonb not null default '{}',
  period_start date,
  period_end   date,
  tokens_used  int,
  created_at   timestamptz not null default now()
);

alter table public.intelligence_reports enable row level security;

create policy "owner_read_intelligence_reports" on public.intelligence_reports
  for select using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.store_id = intelligence_reports.store_id
        and p.role = 'owner'
    )
  );

create policy "service_all_intelligence_reports" on public.intelligence_reports
  for all using (auth.role() = 'service_role');

create index if not exists idx_intel_reports_store on public.intelligence_reports(store_id, agent, created_at desc);
