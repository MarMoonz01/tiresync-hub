-- ============================================================================
-- RLS smoke tests for the multi-tenant SaaS layer (migrations 20260621000001..03).
--
-- HOW TO RUN
--   Paste into the Supabase SQL editor (it runs as a privileged role) AFTER
--   `supabase db push`. Each block switches identity to `authenticated` + a JWT
--   `sub`, so RLS is actually enforced (the editor's default postgres role
--   BYPASSES RLS — these tests are meaningless without the role switch).
--   Everything runs in ONE transaction that ROLLS BACK, so it mutates nothing.
--   Results surface as NOTICE lines in the "Messages" tab; a failed assertion
--   RAISEs EXCEPTION and aborts.
--
-- FILL IN the four UUIDs below (from `select user_id, store_id, role from profiles`
-- and `select user_id from platform_admins`). STORE_A must have at least one
-- ACCEPTED network link; NONLINKED must have none; ADMIN is a platform admin.
-- ============================================================================

begin;

-- ── Identity placeholders — REPLACE THESE ───────────────────────────────────
-- (Replace the UUID literals inline in each block below.)
-- A store owner whose store HAS ≥1 accepted partner:
--   STORE_A_OWNER_UID  = '00000000-0000-0000-0000-00000000000A'
-- A store owner whose store has NO accepted links:
--   NONLINKED_OWNER_UID = '00000000-0000-0000-0000-0000000000B0'
-- A platform admin (row in platform_admins):
--   ADMIN_UID          = '00000000-0000-0000-0000-0000000000AD'

create or replace function pg_temp.as_user(p_uid uuid) returns void as $$
begin
  reset role;
  perform set_config('request.jwt.claims',
                     json_build_object('sub', p_uid::text, 'role', 'authenticated')::text,
                     true);
  set local role authenticated;
end;
$$ language plpgsql;

-- ── TEST 1: interbranch view shows ONLY accepted-partner stock ───────────────
do $$
declare
  v_uid uuid := '00000000-0000-0000-0000-00000000000A';  -- << STORE_A_OWNER_UID
  v_my_store uuid;
  v_total int;
  v_own int;
  v_unlinked int;
begin
  perform pg_temp.as_user(v_uid);
  select store_id into v_my_store from public.profiles where user_id = v_uid;

  select count(*) into v_total from public.tires_interbranch_view;
  -- caller's own store must never appear in the view
  select count(*) into v_own from public.tires_interbranch_view where store_id = v_my_store;
  -- every visible store must be an accepted partner of the caller's store
  select count(*) into v_unlinked
  from public.tires_interbranch_view v
  where v.store_id not in (select public.linked_store_ids());

  raise notice 'TEST 1 store A: % rows visible (own=%, non-partner=%)', v_total, v_own, v_unlinked;
  if v_own > 0 then raise exception 'FAIL T1: own store leaks into interbranch view'; end if;
  if v_unlinked > 0 then raise exception 'FAIL T1: non-partner stock visible (the leak is NOT closed)'; end if;
  raise notice 'PASS T1: interbranch view scoped to accepted partners only';
end $$;

-- ── TEST 2: a store with no accepted links sees NOTHING ──────────────────────
do $$
declare
  v_uid uuid := '00000000-0000-0000-0000-0000000000B0';  -- << NONLINKED_OWNER_UID
  v_total int;
begin
  perform pg_temp.as_user(v_uid);
  select count(*) into v_total from public.tires_interbranch_view;
  raise notice 'TEST 2 non-linked store: % rows visible', v_total;
  if v_total > 0 then raise exception 'FAIL T2: non-linked store can see other stores'' stock'; end if;
  raise notice 'PASS T2: non-linked store sees zero cross-store stock';
end $$;

-- ── TEST 3: platform admin CAN see SaaS metadata, CANNOT see business data ───
do $$
declare
  v_uid uuid := '00000000-0000-0000-0000-0000000000AD';  -- << ADMIN_UID
  v_is_admin boolean;
  v_subs int;
  v_usage int;
  v_fin int;
  v_tires_blocked boolean := false;
begin
  perform pg_temp.as_user(v_uid);

  select public.is_platform_admin() into v_is_admin;
  if not v_is_admin then raise exception 'FAIL T3: ADMIN_UID is not a platform admin (insert into platform_admins first)'; end if;

  select count(*) into v_subs  from public.store_subscriptions;   -- admin policy allows
  select count(*) into v_usage from public.agent_usage_log;       -- admin policy allows

  -- financials: RLS owner-only, no admin policy -> admin must get 0 rows
  select count(*) into v_fin from public.financials;

  -- tires: base SELECT revoked from authenticated -> permission denied is the block
  begin
    perform 1 from public.tires limit 1;
  exception when insufficient_privilege then
    v_tires_blocked := true;
  end;

  raise notice 'TEST 3 admin: subs=% usage=% financials_rows=% tires_blocked=%',
               v_subs, v_usage, v_fin, v_tires_blocked;
  if v_fin > 0 then raise exception 'FAIL T3: platform admin can read financials business data'; end if;
  if not v_tires_blocked then raise exception 'FAIL T3: platform admin can read tires business data'; end if;
  raise notice 'PASS T3: admin sees subscriptions+usage but is blocked from tires/financials';
end $$;

-- ── TEST 4: subscription gate helper ─────────────────────────────────────────
do $$
declare
  v_store_a uuid := (select store_id from public.profiles
                     where user_id = '00000000-0000-0000-0000-00000000000A');  -- << STORE_A_OWNER_UID
begin
  reset role;  -- run as privileged so the helper sees all rows
  raise notice 'TEST 4 store A subscription_active = %', public.store_subscription_active(v_store_a);
  raise notice 'PASS T4: gate helper callable (active=true should let the dashboard load; false -> /billing)';
end $$;

rollback;

-- ============================================================================
-- OPTIONAL mutation test (run separately; also rolls back):
-- Store A requests a link to Store B, Store B accepts, then A sees B's stock.
-- Replace STORE_B_OWNER_UID + STORE_B_STORE_ID.
-- ============================================================================
-- begin;
-- create or replace function pg_temp.as_user(p_uid uuid) returns void as $$
-- begin reset role;
--   perform set_config('request.jwt.claims', json_build_object('sub',p_uid::text,'role','authenticated')::text, true);
--   set local role authenticated; end $$ language plpgsql;
--
-- select pg_temp.as_user('...STORE_A_OWNER_UID...');
-- select public.request_network_link('...STORE_B_STORE_ID...');   -- A -> B pending
-- select pg_temp.as_user('...STORE_B_OWNER_UID...');
-- select id from public.store_network_links where status='pending';  -- grab the id
-- select public.accept_network_link('...the id...');                  -- B accepts
-- select pg_temp.as_user('...STORE_A_OWNER_UID...');
-- select count(*) from public.tires_interbranch_view;  -- should now include B's in-stock tyres
-- rollback;
