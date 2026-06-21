-- ============================================================================
-- Self-service onboarding: per-business invite codes (store creation) +
-- per-store join PIN (staff joining). Replaces the manual admin-approval system.
--
--   - Store creation now requires a single-use invite code that YOU generate per
--     real business. A valid code -> the store is created ACTIVE immediately, no
--     manual SQL approval.
--   - Staff join a store by entering that store's join PIN (rotatable by the
--     owner). Valid PIN -> instant staff access, no owner-approval wait.
--
-- Safe to run multiple times.
-- ============================================================================

-- ── Code generator: uppercase alphanumeric, ambiguous chars removed ─────────
create or replace function public.gen_alnum_code(p_len integer default 8)
returns text as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- no O/0/I/1/L
  result text := '';
  i integer;
begin
  for i in 1..p_len loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$ language plpgsql volatile;

-- ── Store join PIN ──────────────────────────────────────────────────────────
alter table public.stores
  add column if not exists join_code text;

-- Backfill any store missing a code.
update public.stores set join_code = public.gen_alnum_code(8) where join_code is null;

create unique index if not exists idx_stores_join_code on public.stores(join_code);

-- ── Invite codes (store creation) ───────────────────────────────────────────
create table if not exists public.store_invite_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  note       text,                 -- which business this code was issued for
  store_id   uuid references public.stores(id) on delete set null,  -- set when consumed
  used_by    uuid,                 -- auth user that consumed it
  used_at    timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.store_invite_codes enable row level security;

-- Only service_role (edge functions) touches this table from the app.
drop policy if exists "service_all_invite_codes" on public.store_invite_codes;
create policy "service_all_invite_codes"
  on public.store_invite_codes for all to service_role using (true) with check (true);

create index if not exists idx_invite_codes_unused
  on public.store_invite_codes(code) where used_at is null;

-- ── Helper for YOU to mint a code (run in the SQL editor) ────────────────────
--   select public.create_store_invite_code('Joe''s Tire Shop');     -- 30-day expiry
--   select public.create_store_invite_code('Walk-in', 90);          -- custom expiry
-- Returns the code string to hand to the business.
create or replace function public.create_store_invite_code(
  p_note         text default null,
  p_expires_days integer default 30
) returns text as $$
declare
  v_code text;
begin
  loop
    v_code := public.gen_alnum_code(8);
    exit when not exists (select 1 from public.store_invite_codes where code = v_code);
  end loop;

  insert into public.store_invite_codes (code, note, expires_at)
  values (v_code, p_note, now() + (p_expires_days || ' days')::interval);

  return v_code;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.create_store_invite_code(text, integer) from public, anon, authenticated;

-- ── Owner regenerates their store's join PIN ────────────────────────────────
create or replace function public.regenerate_store_join_code()
returns text as $$
declare
  v_store_id uuid;
  v_code     text;
begin
  select id into v_store_id from public.stores where owner_id = auth.uid() limit 1;
  if v_store_id is null then
    raise exception 'not_an_owner';
  end if;

  loop
    v_code := public.gen_alnum_code(8);
    exit when not exists (select 1 from public.stores where join_code = v_code);
  end loop;

  update public.stores set join_code = v_code, updated_at = now() where id = v_store_id;
  return v_code;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.regenerate_store_join_code() from public, anon;
grant execute on function public.regenerate_store_join_code() to authenticated;
