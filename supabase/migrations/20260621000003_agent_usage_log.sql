-- ============================================================================
-- Per-store Claude API usage log (cost tracking).
--
-- 19 AI agents run per store and every Claude call costs money. This table logs
-- each call so the platform operator can see what each store is costing. It holds
-- only cost metadata (store_id, agent_name, tokens, cost_usd) — NOT tire, sales,
-- or financial business data — so letting platform_admin read it does not violate
-- the rule that admins never see a store's actual business data.
--
-- Distinct from `agent_runs` (run status / success-fail), this is cost-focused.
-- Inserts come from edge functions via the service role (see
-- supabase/functions/_shared/anthropic.ts).
-- Safe to run multiple times.
-- ============================================================================

create table if not exists public.agent_usage_log (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid references public.stores(id) on delete cascade,
  agent_name text not null,
  tokens     integer not null default 0,
  cost_usd   numeric(12,6) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.agent_usage_log enable row level security;
create index if not exists idx_agent_usage_store on public.agent_usage_log(store_id, created_at desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Owners see their own store's usage (their own AI cost).
drop policy if exists "owners_view_own_agent_usage" on public.agent_usage_log;
create policy "owners_view_own_agent_usage"
  on public.agent_usage_log for select to authenticated
  using (public.auth_owns_store(store_id));

-- Platform admin sees all usage — cost monitoring across tenants (read only).
drop policy if exists "admin_view_agent_usage" on public.agent_usage_log;
create policy "admin_view_agent_usage"
  on public.agent_usage_log for select to authenticated
  using (public.is_platform_admin());

-- Edge functions log via the service role.
drop policy if exists "service_all_agent_usage" on public.agent_usage_log;
create policy "service_all_agent_usage"
  on public.agent_usage_log for all to service_role using (true) with check (true);

-- ── Admin aggregation: cost per store ───────────────────────────────────────
-- SECURITY DEFINER + the is_platform_admin() guard in WHERE means non-admins get
-- zero rows even though the function bypasses RLS.
create or replace function public.admin_agent_usage_by_store()
returns table (
  store_id       uuid,
  store_name     text,
  total_tokens   bigint,
  total_cost_usd numeric,
  call_count     bigint
) as $$
  select u.store_id,
         s.name,
         sum(u.tokens)::bigint,
         sum(u.cost_usd),
         count(*)::bigint
  from public.agent_usage_log u
  left join public.stores s on s.id = u.store_id
  where public.is_platform_admin()
  group by u.store_id, s.name
  order by sum(u.cost_usd) desc;
$$ language sql stable security definer set search_path = public;

revoke all on function public.admin_agent_usage_by_store() from public, anon;
grant execute on function public.admin_agent_usage_by_store() to authenticated;
