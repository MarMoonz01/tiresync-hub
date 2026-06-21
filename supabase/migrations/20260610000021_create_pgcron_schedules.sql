-- pg_cron schedules for scheduled agents (Phase 2)

do $outer$
begin
  -- SCOUT: daily 08:00 Thai time (UTC+7 = 01:00 UTC)
  perform cron.schedule(
    'scout-daily',
    '0 1 * * *',
    format(
      $cmd$select net.http_post(url := %L, headers := %L::jsonb, body := %L::jsonb)$cmd$,
      current_setting('app.settings.supabase_url') || '/functions/v1/scout-daily',
      '{"Content-Type":"application/json"}',
      '{}'
    )
  );

  -- HAWK: daily 02:00 UTC
  perform cron.schedule(
    'hawk-reorder',
    '0 2 * * *',
    format(
      $cmd$select net.http_post(url := %L, headers := %L::jsonb, body := %L::jsonb)$cmd$,
      current_setting('app.settings.supabase_url') || '/functions/v1/hawk-reorder',
      '{"Content-Type":"application/json"}',
      '{}'
    )
  );

  -- ATLAS: Monday 03:00 UTC
  perform cron.schedule(
    'atlas-weekly',
    '0 3 * * 1',
    format(
      $cmd$select net.http_post(url := %L, headers := %L::jsonb, body := %L::jsonb)$cmd$,
      current_setting('app.settings.supabase_url') || '/functions/v1/atlas-weekly',
      '{"Content-Type":"application/json"}',
      '{}'
    )
  );

  -- LENS: Monday 04:00 UTC
  perform cron.schedule(
    'lens-deadstock',
    '0 4 * * 1',
    format(
      $cmd$select net.http_post(url := %L, headers := %L::jsonb, body := %L::jsonb)$cmd$,
      current_setting('app.settings.supabase_url') || '/functions/v1/lens-deadstock',
      '{"Content-Type":"application/json"}',
      '{}'
    )
  );

exception when others then
  raise notice 'pg_cron not available in this environment: %', sqlerrm;
end;
$outer$;
