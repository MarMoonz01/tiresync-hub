-- Cleanup: remove orphaned AI-agent tables/functions after all agents were deleted.
-- Safe to run whether or not these objects exist (IF EXISTS + CASCADE drops policies).

-- Agent usage log + its admin RPC (from the reverted billing/usage work)
drop function if exists public.admin_agent_usage_by_store();
drop table if exists public.agent_usage_log cascade;

-- Scheduled-agent run history (HAWK/SCOUT/ATLAS/LENS health)
drop table if exists public.agent_runs cascade;

-- ORACLE/SPARK/PIXEL intelligence reports
drop table if exists public.intelligence_reports cascade;

-- Best-effort: unschedule any leftover pg_cron jobs for the deleted agents.
do $$
begin
  perform cron.unschedule(jobname)
  from cron.job
  where jobname in ('scout-daily', 'hawk-reorder', 'atlas-weekly', 'lens-deadstock');
exception when others then
  raise notice 'pg_cron not available / no jobs to remove: %', sqlerrm;
end $$;
