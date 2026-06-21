-- Enable required extensions
-- pg_cron and pg_net require Supabase Pro plan
-- Wrapped in exception handler so local dev still works
do $$ begin
  create extension if not exists pg_cron;
exception when others then null;
end $$;

do $$ begin
  create extension if not exists pg_net;
exception when others then null;
end $$;

do $$ begin
  create extension if not exists supabase_vault;
exception when others then null;
end $$;
