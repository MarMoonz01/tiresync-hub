-- Performance indexes for frequently queried columns
-- Run: supabase db push  (or apply via Supabase dashboard SQL editor)

-- ─────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_user_id
  ON public.profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id
  ON public.profiles (line_user_id)
  WHERE line_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_status
  ON public.profiles (status);

-- ─────────────────────────────────────────────
-- user_roles
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles (user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role
  ON public.user_roles (role);

-- ─────────────────────────────────────────────
-- stores
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stores_owner_id
  ON public.stores (owner_id);

CREATE INDEX IF NOT EXISTS idx_stores_is_active
  ON public.stores (is_active);

-- ─────────────────────────────────────────────
-- store_members
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_store_members_store_id
  ON public.store_members (store_id);

CREATE INDEX IF NOT EXISTS idx_store_members_user_id
  ON public.store_members (user_id);

CREATE INDEX IF NOT EXISTS idx_store_members_store_user
  ON public.store_members (store_id, user_id);

-- ─────────────────────────────────────────────
-- tires
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tires_store_id
  ON public.tires (store_id);

CREATE INDEX IF NOT EXISTS idx_tires_brand
  ON public.tires (brand);

CREATE INDEX IF NOT EXISTS idx_tires_is_shared
  ON public.tires (is_shared)
  WHERE is_shared = true;

CREATE INDEX IF NOT EXISTS idx_tires_store_brand
  ON public.tires (store_id, brand);

CREATE INDEX IF NOT EXISTS idx_tires_master_tire_id
  ON public.tires (master_tire_id)
  WHERE master_tire_id IS NOT NULL;

-- ─────────────────────────────────────────────
-- tire_dots
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tire_dots_tire_id
  ON public.tire_dots (tire_id);

CREATE INDEX IF NOT EXISTS idx_tire_dots_tire_position
  ON public.tire_dots (tire_id, position);

-- ─────────────────────────────────────────────
-- stock_logs  (heavy read — filtered by date, user, dot)
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stock_logs_tire_dot_id
  ON public.stock_logs (tire_dot_id);

CREATE INDEX IF NOT EXISTS idx_stock_logs_user_id
  ON public.stock_logs (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_logs_created_at
  ON public.stock_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_logs_dot_created
  ON public.stock_logs (tire_dot_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_logs_action
  ON public.stock_logs (action);

-- ─────────────────────────────────────────────
-- notifications
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_send_line
  ON public.notifications (send_line)
  WHERE send_line = true;

-- ─────────────────────────────────────────────
-- store_partnerships
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_partnerships_requester
  ON public.store_partnerships (requester_store_id);

CREATE INDEX IF NOT EXISTS idx_partnerships_receiver
  ON public.store_partnerships (receiver_store_id);

CREATE INDEX IF NOT EXISTS idx_partnerships_status
  ON public.store_partnerships (status);

-- ─────────────────────────────────────────────
-- staff_join_requests
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_staff_join_requests_store_id
  ON public.staff_join_requests (store_id);

CREATE INDEX IF NOT EXISTS idx_staff_join_requests_user_id
  ON public.staff_join_requests (user_id);

CREATE INDEX IF NOT EXISTS idx_staff_join_requests_status
  ON public.staff_join_requests (status);

-- ─────────────────────────────────────────────
-- favorites
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_favorites_user_id
  ON public.favorites (user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_tire_id
  ON public.favorites (tire_id);

-- ─────────────────────────────────────────────
-- master_tires / master_tire_requests
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_master_tires_brand
  ON public.master_tires (brand);

CREATE INDEX IF NOT EXISTS idx_master_tire_requests_status
  ON public.master_tire_requests (status);
