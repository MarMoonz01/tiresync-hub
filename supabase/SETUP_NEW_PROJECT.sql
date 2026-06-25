-- ============================================================
-- TIREHUB — NEW PROJECT SETUP (paste-once, RE-RUNNABLE) — v3
-- Safe to run repeatedly: it RESETS the public schema first, then rebuilds.
-- ⚠️  RUN ONLY ON THE NEW/EMPTY PROJECT — it DROPS everything in schema public.
-- ============================================================

-- ---------- 0. RESET (wipes public; harmless extensions stay) ----------
drop schema if exists public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables    to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- ---------- 1. GENESIS (tables/functions the original Lovable base made,
--                         which are missing from the migration export) ----------
create or replace function public.get_current_user_store_id()
returns uuid language plpgsql stable security definer set search_path = public as $genesis$
declare sid uuid;
begin
  select store_id into sid from public.profiles where user_id = auth.uid() limit 1;
  return sid;
exception when others then return null;
end $genesis$;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  store_id uuid, user_id uuid,
  type text default 'info', title text default '', message text default '',
  body text, link text, metadata jsonb default '{}'::jsonb,
  is_read boolean not null default false,
  reference_id uuid, reference_type text,
  send_line boolean default false, line_sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- legacy (abandoned marketplace) — stubs so old triggers can attach/detach cleanly
create table public.broadcast_requests (id uuid primary key default gen_random_uuid(), store_id uuid, title text, created_at timestamptz default now());
create table public.broadcast_offers   (id uuid primary key default gen_random_uuid(), request_id uuid, store_id uuid, created_at timestamptz default now());

-- ---------- 2. MIGRATION CHAIN (chronological) ----------

-- ===== 20260126054943_9dda628f-4af2-424c-9ad7-b695c13e24b4.sql =====

-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'store_member', 'pending');

-- Create user status enum
CREATE TYPE public.user_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Create order status enum
CREATE TYPE public.order_status AS ENUM ('interested', 'approved', 'shipped', 'delivered', 'cancelled');

-- Create user roles table (for secure role checking)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    status user_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create stores table
CREATE TABLE public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Create tires table
CREATE TABLE public.tires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    size TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT,
    load_index TEXT,
    speed_rating TEXT,
    price DECIMAL(10, 2),
    is_shared BOOLEAN NOT NULL DEFAULT false,
    network_price DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tires
ALTER TABLE public.tires ENABLE ROW LEVEL SECURITY;

-- Create tire DOT codes table (up to 4 DOT codes per tire)
CREATE TABLE public.tire_dots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tire_id UUID REFERENCES public.tires(id) ON DELETE CASCADE NOT NULL,
    dot_code TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    promotion TEXT,
    position INTEGER NOT NULL DEFAULT 1 CHECK (position >= 1 AND position <= 4),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (tire_id, position)
);

-- Enable RLS on tire_dots
ALTER TABLE public.tire_dots ENABLE ROW LEVEL SECURITY;

-- Create stock logs table
CREATE TABLE public.stock_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tire_dot_id UUID REFERENCES public.tire_dots(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on stock_logs
ALTER TABLE public.stock_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Create function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE user_id = _user_id
          AND status = 'approved'
    )
$$;

-- Create function to get user's store
CREATE OR REPLACE FUNCTION public.get_user_store_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.stores WHERE owner_id = _user_id LIMIT 1
$$;

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON public.stores
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tires_updated_at
    BEFORE UPDATE ON public.tires
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tire_dots_updated_at
    BEFORE UPDATE ON public.tire_dots
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    
    -- Assign 'pending' role by default
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'pending');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Approved users can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_approved(auth.uid()));

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for stores
CREATE POLICY "Store owners can manage their store"
    ON public.stores FOR ALL
    TO authenticated
    USING (owner_id = auth.uid());

CREATE POLICY "Approved users can view all stores"
    ON public.stores FOR SELECT
    TO authenticated
    USING (public.is_approved(auth.uid()) AND is_active = true);

CREATE POLICY "Admins can manage all stores"
    ON public.stores FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tires
CREATE POLICY "Store owners can manage their tires"
    ON public.tires FOR ALL
    TO authenticated
    USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

CREATE POLICY "Approved users can view shared tires"
    ON public.tires FOR SELECT
    TO authenticated
    USING (public.is_approved(auth.uid()) AND is_shared = true);

CREATE POLICY "Admins can manage all tires"
    ON public.tires FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tire_dots
CREATE POLICY "Store owners can manage their tire dots"
    ON public.tire_dots FOR ALL
    TO authenticated
    USING (tire_id IN (
        SELECT t.id FROM public.tires t
        JOIN public.stores s ON t.store_id = s.id
        WHERE s.owner_id = auth.uid()
    ));

CREATE POLICY "Approved users can view shared tire dots"
    ON public.tire_dots FOR SELECT
    TO authenticated
    USING (tire_id IN (
        SELECT id FROM public.tires WHERE is_shared = true
    ) AND public.is_approved(auth.uid()));

CREATE POLICY "Admins can manage all tire dots"
    ON public.tire_dots FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for stock_logs
CREATE POLICY "Store owners can view their stock logs"
    ON public.stock_logs FOR SELECT
    TO authenticated
    USING (tire_dot_id IN (
        SELECT td.id FROM public.tire_dots td
        JOIN public.tires t ON td.tire_id = t.id
        JOIN public.stores s ON t.store_id = s.id
        WHERE s.owner_id = auth.uid()
    ));

CREATE POLICY "Store owners can insert stock logs"
    ON public.stock_logs FOR INSERT
    TO authenticated
    WITH CHECK (tire_dot_id IN (
        SELECT td.id FROM public.tire_dots td
        JOIN public.tires t ON td.tire_id = t.id
        JOIN public.stores s ON t.store_id = s.id
        WHERE s.owner_id = auth.uid()
    ));

CREATE POLICY "Admins can manage all stock logs"
    ON public.stock_logs FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- ===== 20260126073912_76fa07ee-6d86-437e-920c-236a00288c92.sql =====

-- Fix Issue 1: profiles_table_public_exposure
-- Remove the overly permissive policy that allows all approved users to see all profiles
DROP POLICY IF EXISTS "Approved users can view all profiles" ON public.profiles;

-- Fix Issue 2: stores_contact_data_exposure  
-- Create a public view for stores that excludes sensitive contact information
drop view if exists public.stores_public cascade;
CREATE VIEW public.stores_public
WITH (security_invoker=on) AS
SELECT 
    id,
    name,
    description,
    logo_url,
    is_active,
    created_at,
    updated_at
    -- Excludes: phone, email, address, owner_id (sensitive fields)
FROM public.stores;

-- Update the policy for approved users to only see basic store info via the view
-- First drop the existing overly permissive policy
DROP POLICY IF EXISTS "Approved users can view all stores" ON public.stores;

-- Create a new restrictive policy that only allows approved users to view basic info
-- Store owners and admins can still see full details via their existing policies
CREATE POLICY "Approved users can view active stores basic info"
ON public.stores
FOR SELECT
USING (
    -- Store owners can see their own store's full details
    owner_id = auth.uid()
    -- Admins handled by separate policy
    OR (is_approved(auth.uid()) AND is_active = true)
);

-- Grant SELECT on the public view to authenticated users
GRANT SELECT ON public.stores_public TO authenticated;

-- ===== 20260126145437_da1ec3f7-187f-4cf7-baad-0535b1b4af50.sql =====

-- Create orders table to track interest expressions
CREATE TABLE public.orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    seller_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    tire_id UUID NOT NULL REFERENCES public.tires(id) ON DELETE CASCADE,
    tire_dot_id UUID REFERENCES public.tire_dots(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC,
    status order_status NOT NULL DEFAULT 'interested',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own orders
CREATE POLICY "Buyers can view their orders"
ON public.orders
FOR SELECT
USING (buyer_store_id = get_user_store_id(auth.uid()));

-- Buyers can create orders (express interest)
CREATE POLICY "Buyers can create orders"
ON public.orders
FOR INSERT
WITH CHECK (buyer_store_id = get_user_store_id(auth.uid()));

-- Buyers can update their own orders
CREATE POLICY "Buyers can update their orders"
ON public.orders
FOR UPDATE
USING (buyer_store_id = get_user_store_id(auth.uid()));

-- Sellers can view orders for their products
CREATE POLICY "Sellers can view orders for their products"
ON public.orders
FOR SELECT
USING (seller_store_id = get_user_store_id(auth.uid()));

-- Sellers can update orders for their products
CREATE POLICY "Sellers can update orders for their products"
ON public.orders
FOR UPDATE
USING (seller_store_id = get_user_store_id(auth.uid()));

-- Admins can manage all orders
CREATE POLICY "Admins can manage all orders"
ON public.orders
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- ===== 20260126151940_56ad3ba0-ef1c-4129-aa19-6bd816127d46.sql =====

-- Create favorites table for wishlist functionality
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tire_id UUID NOT NULL REFERENCES public.tires(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tire_id)
);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
ON public.favorites
FOR SELECT
USING (auth.uid() = user_id);

-- Users can add to their own favorites
CREATE POLICY "Users can add to their own favorites"
ON public.favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove from their own favorites
CREATE POLICY "Users can delete their own favorites"
ON public.favorites
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can manage all favorites
CREATE POLICY "Admins can manage all favorites"
ON public.favorites
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== 20260126153433_b9a51082-5b1c-4c9c-82eb-67e9b5f9c50e.sql =====

-- Create store_members table to track which users belong to which store
CREATE TABLE public.store_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(store_id, user_id)
);

-- Enable RLS
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

-- Store owners can manage their store members
CREATE POLICY "Store owners can manage their members"
ON public.store_members
FOR ALL
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- Users can view their own membership
CREATE POLICY "Users can view their own membership"
ON public.store_members
FOR SELECT
USING (user_id = auth.uid());

-- Admins can manage all store members
CREATE POLICY "Admins can manage all store members"
ON public.store_members
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_store_members_updated_at
BEFORE UPDATE ON public.store_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ===== 20260127070108_241dec3f-5e1f-4a2e-a609-465958b6c9b7.sql =====

-- Phase 1: Add LINE Integration to Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS line_user_id TEXT UNIQUE;

-- Phase 2: Add LINE Settings to Stores
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS line_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS line_channel_id TEXT,
ADD COLUMN IF NOT EXISTS line_channel_secret TEXT;

-- Phase 3: Add Permissions and Approval Status to Store Members
ALTER TABLE public.store_members 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"web": {"view": true, "add": false, "edit": false, "delete": false}, "line": {"view": true, "adjust": false}}'::jsonb,
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Phase 4: Create Staff Join Requests Table
CREATE TABLE IF NOT EXISTS public.staff_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, store_id)
);

-- Enable RLS on staff_join_requests
ALTER TABLE public.staff_join_requests ENABLE ROW LEVEL SECURITY;

-- Phase 5: Create LINE Link Codes Table
CREATE TABLE IF NOT EXISTS public.line_link_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on line_link_codes
ALTER TABLE public.line_link_codes ENABLE ROW LEVEL SECURITY;

-- Phase 6: Create Security Definer Functions

-- Function to check store member permission
CREATE OR REPLACE FUNCTION public.has_store_permission(
  _user_id uuid, 
  _store_id uuid, 
  _permission_type text, 
  _permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.store_members
    WHERE user_id = _user_id
      AND store_id = _store_id
      AND is_approved = true
      AND (permissions->_permission_type->>_permission)::boolean = true
  )
$$;

-- Function to check if user is store owner
CREATE OR REPLACE FUNCTION public.is_store_owner(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stores
    WHERE id = _store_id
      AND owner_id = _user_id
  )
$$;

-- Function to get LINE user permissions
CREATE OR REPLACE FUNCTION public.get_line_user_permissions(_line_user_id text)
RETURNS TABLE(
  user_id uuid,
  store_id uuid,
  is_owner boolean,
  permissions jsonb,
  is_approved boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- First check if user is a store owner
  SELECT 
    p.user_id,
    s.id as store_id,
    true as is_owner,
    '{"web": {"view": true, "add": true, "edit": true, "delete": true}, "line": {"view": true, "adjust": true}}'::jsonb as permissions,
    true as is_approved
  FROM public.profiles p
  JOIN public.stores s ON s.owner_id = p.user_id
  WHERE p.line_user_id = _line_user_id
  
  UNION ALL
  
  -- Then check if user is a store member
  SELECT 
    p.user_id,
    sm.store_id,
    false as is_owner,
    sm.permissions,
    sm.is_approved
  FROM public.profiles p
  JOIN public.store_members sm ON sm.user_id = p.user_id
  WHERE p.line_user_id = _line_user_id
$$;

-- Phase 7: RLS Policies for staff_join_requests

-- Admins can manage all requests
CREATE POLICY "Admins can manage all staff requests"
ON public.staff_join_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Store owners can view and manage requests for their store
CREATE POLICY "Store owners can manage their store requests"
ON public.staff_join_requests
FOR ALL
USING (
  store_id IN (
    SELECT id FROM public.stores WHERE owner_id = auth.uid()
  )
);

-- Users can view their own requests
CREATE POLICY "Users can view their own requests"
ON public.staff_join_requests
FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own requests
CREATE POLICY "Users can create their own requests"
ON public.staff_join_requests
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Phase 8: RLS Policies for line_link_codes

-- Users can manage their own link codes
CREATE POLICY "Users can manage their own link codes"
ON public.line_link_codes
FOR ALL
USING (user_id = auth.uid());

-- Admins can view all link codes
CREATE POLICY "Admins can view all link codes"
ON public.line_link_codes
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== 20260127084631_1002660d-4d4e-4813-868c-0ada0dacf254.sql =====

-- Add webhook verification columns to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS line_webhook_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS line_webhook_verified_at TIMESTAMP WITH TIME ZONE;

-- ===== 20260127093215_80dedbbe-e3d4-4135-ac33-c1bc43a5eab0.sql =====

-- Fix has_store_permission to give owners all permissions immediately
CREATE OR REPLACE FUNCTION public.has_store_permission(_user_id uuid, _store_id uuid, _permission_type text, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Owner override: If user is the store owner, they have ALL permissions
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.stores
      WHERE id = _store_id AND owner_id = _user_id
    ) THEN true
    -- Otherwise, check the store_members table
    ELSE EXISTS (
      SELECT 1
      FROM public.store_members
      WHERE user_id = _user_id
        AND store_id = _store_id
        AND is_approved = true
        AND (permissions->_permission_type->>_permission)::boolean = true
    )
  END
$$;

-- Fix get_line_user_permissions to give owners full permissions and prioritize owner role
CREATE OR REPLACE FUNCTION public.get_line_user_permissions(_line_user_id text)
RETURNS TABLE(user_id uuid, store_id uuid, is_owner boolean, permissions jsonb, is_approved boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- First check if user is a store owner (gives full permissions)
  SELECT 
    p.user_id,
    s.id as store_id,
    true as is_owner,
    '{"web": {"view": true, "add": true, "edit": true, "delete": true}, "line": {"view": true, "adjust": true}}'::jsonb as permissions,
    true as is_approved
  FROM public.profiles p
  JOIN public.stores s ON s.owner_id = p.user_id
  WHERE p.line_user_id = _line_user_id
  
  UNION ALL
  
  -- Then check if user is a store member (only if not already owner)
  SELECT 
    p.user_id,
    sm.store_id,
    false as is_owner,
    sm.permissions,
    sm.is_approved
  FROM public.profiles p
  JOIN public.store_members sm ON sm.user_id = p.user_id
  WHERE p.line_user_id = _line_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.owner_id = p.user_id
    )
$$;

-- ===== 20260127095517_a47f7783-95d2-4969-8a66-3e9755833e0d.sql =====

-- Update get_line_user_permissions to accept optional store_id parameter
-- and return ALL store associations for a user when store_id is null
CREATE OR REPLACE FUNCTION public.get_line_user_permissions(_line_user_id text, _store_id uuid DEFAULT NULL)
 RETURNS TABLE(user_id uuid, store_id uuid, is_owner boolean, permissions jsonb, is_approved boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  -- First check if user is a store owner (gives full permissions)
  SELECT 
    p.user_id,
    s.id as store_id,
    true as is_owner,
    '{"web": {"view": true, "add": true, "edit": true, "delete": true}, "line": {"view": true, "adjust": true}}'::jsonb as permissions,
    true as is_approved
  FROM public.profiles p
  JOIN public.stores s ON s.owner_id = p.user_id
  WHERE p.line_user_id = _line_user_id
    AND (_store_id IS NULL OR s.id = _store_id)
  
  UNION ALL
  
  -- Then check if user is a store member (only if not already owner for that store)
  SELECT 
    p.user_id,
    sm.store_id,
    false as is_owner,
    sm.permissions,
    sm.is_approved
  FROM public.profiles p
  JOIN public.store_members sm ON sm.user_id = p.user_id
  WHERE p.line_user_id = _line_user_id
    AND (_store_id IS NULL OR sm.store_id = _store_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.owner_id = p.user_id
        AND s.id = sm.store_id
    )
$$;

-- Create a helper function to get user store associations for the Profile page
CREATE OR REPLACE FUNCTION public.get_user_store_associations(_user_id uuid)
 RETURNS TABLE(
   store_id uuid, 
   store_name text, 
   is_owner boolean, 
   role text,
   is_approved boolean,
   permissions jsonb
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  -- Get stores where user is owner
  SELECT 
    s.id as store_id,
    s.name as store_name,
    true as is_owner,
    'owner'::text as role,
    true as is_approved,
    '{"web": {"view": true, "add": true, "edit": true, "delete": true}, "line": {"view": true, "adjust": true}}'::jsonb as permissions
  FROM public.stores s
  WHERE s.owner_id = _user_id
  
  UNION ALL
  
  -- Get stores where user is a member (but not owner)
  SELECT 
    sm.store_id,
    s.name as store_name,
    false as is_owner,
    sm.role,
    sm.is_approved,
    sm.permissions
  FROM public.store_members sm
  JOIN public.stores s ON s.id = sm.store_id
  WHERE sm.user_id = _user_id
    AND s.owner_id != _user_id
$$;

-- ===== 20260129043033_5b220636-ed64-4bdb-94d2-6a9ada5836a7.sql =====

-- Create a public view for store search during signup
-- Only exposes minimal info (id, name) for active stores
-- Accessible to unauthenticated users (anon role)

drop view if exists public.stores_signup_search cascade;
CREATE VIEW public.stores_signup_search 
WITH (security_invoker = false) AS
SELECT 
    id,
    name
FROM public.stores
WHERE is_active = true;

-- Grant access to both anonymous and authenticated users
GRANT SELECT ON public.stores_signup_search TO anon;
GRANT SELECT ON public.stores_signup_search TO authenticated;

-- ===== 20260129043101_f89b686d-12c7-456f-8f9a-d6b9b2d35a52.sql =====

-- The stores_signup_search view intentionally uses security_invoker=false
-- This is by design because:
-- 1. We need anon users to search stores during signup
-- 2. The view only exposes id and name - no sensitive data
-- 3. It's filtered to active stores only
-- Adding a comment to document this intentional design decision

COMMENT ON VIEW public.stores_signup_search IS 'Public view for store search during signup. Intentionally accessible to anon users. Only exposes store id and name for active stores - no sensitive fields.';

-- ===== 20260131_add_partnership_fixed.sql =====

-- 1. Create Partnership Status Enum
DO $$ BEGIN
    CREATE TYPE public.partnership_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Store Partnerships Table
CREATE TABLE IF NOT EXISTS public.store_partnerships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    receiver_store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    status public.partnership_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(requester_store_id, receiver_store_id)
);

-- Enable RLS
ALTER TABLE public.store_partnerships ENABLE ROW LEVEL SECURITY;

-- Policies for Partnerships
DROP POLICY IF EXISTS "Stores can view their partnerships" ON public.store_partnerships;
CREATE POLICY "Stores can view their partnerships"
    ON public.store_partnerships FOR SELECT
    USING (
        requester_store_id = public.get_user_store_id(auth.uid()) OR 
        receiver_store_id = public.get_user_store_id(auth.uid())
    );

DROP POLICY IF EXISTS "Stores can create partnership requests" ON public.store_partnerships;
CREATE POLICY "Stores can create partnership requests"
    ON public.store_partnerships FOR INSERT
    WITH CHECK (requester_store_id = public.get_user_store_id(auth.uid()));

DROP POLICY IF EXISTS "Stores can update their partnerships" ON public.store_partnerships;
CREATE POLICY "Stores can update their partnerships"
    ON public.store_partnerships FOR UPDATE
    USING (
        requester_store_id = public.get_user_store_id(auth.uid()) OR 
        receiver_store_id = public.get_user_store_id(auth.uid())
    );

-- 3. Create Partnership Notifications Table (New name to avoid conflict)
CREATE TABLE IF NOT EXISTS public.partnership_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    reference_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.partnership_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stores can view their notifications" ON public.partnership_notifications;
CREATE POLICY "Stores can view their notifications"
    ON public.partnership_notifications FOR SELECT
    USING (store_id = public.get_user_store_id(auth.uid()));

DROP POLICY IF EXISTS "Stores can update their notifications" ON public.partnership_notifications;
CREATE POLICY "Stores can update their notifications"
    ON public.partnership_notifications FOR UPDATE
    USING (store_id = public.get_user_store_id(auth.uid()));

-- 4. Helper Function: Check partnership status
CREATE OR REPLACE FUNCTION public.check_partnership_status(_store_a UUID, _store_b UUID)
RETURNS public.partnership_status
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT status 
    FROM public.store_partnerships
    WHERE (requester_store_id = _store_a AND receiver_store_id = _store_b)
       OR (requester_store_id = _store_b AND receiver_store_id = _store_a)
    LIMIT 1;
$$;

-- 5. RPC: Get Partner Inventory (Securely)
CREATE OR REPLACE FUNCTION public.get_partner_inventory(_partner_store_id UUID)
RETURNS TABLE (
    id UUID,
    brand TEXT,
    model TEXT,
    size TEXT,
    price DECIMAL,
    quantity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _my_store_id UUID;
    _status public.partnership_status;
BEGIN
    -- Use existing function
    _my_store_id := public.get_user_store_id(auth.uid());
    
    -- Check if they are partners
    SELECT public.check_partnership_status(_my_store_id, _partner_store_id) INTO _status;
    
    IF _status = 'approved' THEN
        RETURN QUERY
        SELECT 
            t.id,
            t.brand,
            t.model,
            t.size,
            t.price,
            COALESCE(SUM(td.quantity), 0)::INTEGER as quantity
        FROM public.tires t
        LEFT JOIN public.tire_dots td ON t.id = td.tire_id
        WHERE t.store_id = _partner_store_id
        GROUP BY t.id, t.brand, t.model, t.size, t.price;
    ELSE
        RETURN;
    END IF;
END;
$$;

-- 6. Trigger for Notifications
CREATE OR REPLACE FUNCTION public.handle_partnership_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Notify Receiver about new request
        INSERT INTO public.partnership_notifications (store_id, type, title, message, reference_id)
        VALUES (
            NEW.receiver_store_id,
            'partnership_request',
            'New Partnership Request',
            'Another store wants to connect with you.',
            NEW.id
        );
    ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved') THEN
        -- Notify Requester that request was accepted
        INSERT INTO public.partnership_notifications (store_id, type, title, message, reference_id)
        VALUES (
            NEW.requester_store_id,
            'partnership_accepted',
            'Partnership Accepted',
            'Your partnership request has been accepted.',
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_partnership_change ON public.store_partnerships;
CREATE TRIGGER on_partnership_change
    AFTER INSERT OR UPDATE ON public.store_partnerships
    FOR EACH ROW EXECUTE FUNCTION public.handle_partnership_notification();

-- ===== 20260201120000_add_centralized_notifications.sql =====

-- 1. ปรับปรุงโครงสร้างตาราง Notifications (Safe Add Columns)
DO $$ 
BEGIN 
    -- เพิ่ม store_id (สำหรับแจ้งเตือนระดับร้าน)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'store_id') THEN
        ALTER TABLE public.notifications ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
    END IF;

    -- เพิ่ม user_id (สำหรับแจ้งเตือนส่วนตัว)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
        ALTER TABLE public.notifications ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- เพิ่ม metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'metadata') THEN
        ALTER TABLE public.notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- เพิ่ม type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
        ALTER TABLE public.notifications ADD COLUMN type TEXT DEFAULT 'info';
    END IF;

    -- เพิ่ม link
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'link') THEN
        ALTER TABLE public.notifications ADD COLUMN link TEXT;
    END IF;
END $$;

-- 2. รีเซ็ต Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own notifications" ON public.notifications;
CREATE POLICY "View own notifications" ON public.notifications 
FOR SELECT USING (
  (store_id IS NOT NULL AND store_id = public.get_current_user_store_id()) 
  OR 
  (user_id = auth.uid())
);

DROP POLICY IF EXISTS "Update own notifications" ON public.notifications;
CREATE POLICY "Update own notifications" ON public.notifications 
FOR UPDATE USING (
  (store_id IS NOT NULL AND store_id = public.get_current_user_store_id()) 
  OR 
  (user_id = auth.uid())
);

-- 3. ฟังก์ชันกลาง (Master Function)
CREATE OR REPLACE FUNCTION public.create_notification(
    _store_id UUID DEFAULT NULL,
    _user_id UUID DEFAULT NULL,
    _type TEXT DEFAULT 'info',
    _title TEXT DEFAULT '',
    _message TEXT DEFAULT '',
    _link TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.notifications (store_id, user_id, type, title, message, link)
    VALUES (_store_id, _user_id, _type, _title, _message, _link);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. TRIGGERS (4 หัวข้อหลักตาม Requirement)
-- ============================================================

-- 🔔 1. Staff Sign Up -> แจ้งเตือน Store Owner
CREATE OR REPLACE FUNCTION public.notify_staff_request()
RETURNS TRIGGER AS $$
DECLARE
    _user_name TEXT;
BEGIN
    SELECT full_name INTO _user_name FROM public.profiles WHERE id = NEW.user_id;
    
    PERFORM public.create_notification(
        _store_id := NEW.store_id, 
        _type := 'staff_request',
        _title := 'New Staff Request 👤',
        _message := COALESCE(_user_name, 'Someone') || ' wants to join your store.',
        _link := '/staff?tab=requests'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_staff_join_request ON public.staff_join_requests;
CREATE TRIGGER on_staff_join_request
    AFTER INSERT ON public.staff_join_requests
    FOR EACH ROW EXECUTE FUNCTION public.notify_staff_request();


-- 🔔 2. Partnership (ขอมา / ตอบรับ / ปฏิเสธ)
CREATE OR REPLACE FUNCTION public.notify_partnership_event()
RETURNS TRIGGER AS $$
DECLARE
    _req_store_name TEXT;
    _rec_store_name TEXT;
BEGIN
    SELECT name INTO _req_store_name FROM public.stores WHERE id = NEW.requestor_store_id;
    SELECT name INTO _rec_store_name FROM public.stores WHERE id = NEW.receiver_store_id;

    IF (TG_OP = 'INSERT') THEN
        -- มีคนขอมา -> แจ้งปลายทาง
        PERFORM public.create_notification(
            _store_id := NEW.receiver_store_id,
            _type := 'partnership_request',
            _title := 'Partnership Request 🤝',
            _message := _req_store_name || ' wants to be partners with you.',
            _link := '/network?tab=requests'
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        IF NEW.status = 'approved' THEN
            -- แจ้งคนขอ
            PERFORM public.create_notification(
                _store_id := NEW.requestor_store_id,
                _type := 'partnership_accepted',
                _title := 'Partnership Accepted! 🎉',
                _message := _rec_store_name || ' accepted your partnership request.',
                _link := '/network?tab=partners'
            );
        ELSIF NEW.status = 'rejected' THEN
            -- แจ้งคนขอ (ปฏิเสธ)
            PERFORM public.create_notification(
                _store_id := NEW.requestor_store_id,
                _type := 'partnership_rejected',
                _title := 'Request Declined ❌',
                _message := _rec_store_name || ' declined your partnership request.',
                _link := '/network?tab=discover'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_partnership_change ON public.store_partnerships;
CREATE TRIGGER on_partnership_change
    AFTER INSERT OR UPDATE ON public.store_partnerships
    FOR EACH ROW EXECUTE FUNCTION public.notify_partnership_event();


-- 🔔 3. Offer Help -> แจ้งเตือนร้านที่ขอ
CREATE OR REPLACE FUNCTION public.notify_broadcast_offer()
RETURNS TRIGGER AS $$
DECLARE
    _owner_store_id UUID;
    _request_title TEXT;
    _offerer_name TEXT;
BEGIN
    SELECT store_id, title INTO _owner_store_id, _request_title FROM public.broadcast_requests WHERE id = NEW.request_id;
    SELECT name INTO _offerer_name FROM public.stores WHERE id = NEW.store_id;

    IF _owner_store_id IS NOT NULL AND _owner_store_id != NEW.store_id THEN
        PERFORM public.create_notification(
            _store_id := _owner_store_id,
            _type := 'offer_received',
            _title := 'Offer Received! 🎁',
            _message := _offerer_name || ' sent an offer for: ' || _request_title,
            _link := '/marketplace?tab=broadcast'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_offer ON public.broadcast_offers;
CREATE TRIGGER on_new_offer
    AFTER INSERT ON public.broadcast_offers
    FOR EACH ROW EXECUTE FUNCTION public.notify_broadcast_offer();


-- 🔔 4. Role Change -> แจ้งเตือน Staff คนนั้น
CREATE OR REPLACE FUNCTION public.notify_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role != NEW.role THEN
        PERFORM public.create_notification(
            _user_id := NEW.user_id, 
            _type := 'role_change',
            _title := 'Role Updated 🛡️',
            _message := 'Your role has been updated to: ' || NEW.role,
            _link := '/profile'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_role_change ON public.store_members;
CREATE TRIGGER on_role_change
    AFTER UPDATE ON public.store_members
    FOR EACH ROW EXECUTE FUNCTION public.notify_role_change();

-- ===== 20260205000000_init_master_tires.sql =====

-- Create master_tires table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.master_tires (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    size TEXT NOT NULL,
    load_index TEXT,
    speed_rating TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Add unique constraint to prevent duplicates
    CONSTRAINT master_tires_brand_model_size_key UNIQUE (brand, model, size)
);

-- Enable RLS
ALTER TABLE public.master_tires ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'master_tires' AND policyname = 'Enable read access for authenticated users'
    ) THEN
        CREATE POLICY "Enable read access for authenticated users" ON public.master_tires
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'master_tires' AND policyname = 'Enable write access for moderators and admins'
    ) THEN
        CREATE POLICY "Enable write access for moderators and admins" ON public.master_tires
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.user_roles
                WHERE user_id = auth.uid()
                AND role IN ('admin', 'moderator')
            )
        );
    END IF;
END
$$;

-- ===== 20260205130000_fix_schema_consistency.sql =====

-- 1. Add master_tire_id to tires table
ALTER TABLE public.tires 
ADD COLUMN IF NOT EXISTS master_tire_id UUID REFERENCES public.master_tires(id);

CREATE INDEX IF NOT EXISTS idx_tires_master_tire_id ON public.tires(master_tire_id);

-- 2. Create master_tire_requests table
CREATE TABLE IF NOT EXISTS public.master_tire_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    size TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.master_tire_requests ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for master_tire_requests (safely)
DO $$
BEGIN
    -- Policy: Users can create requests
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'master_tire_requests' AND policyname = 'Users can create requests'
    ) THEN
        CREATE POLICY "Users can create requests" 
        ON public.master_tire_requests 
        FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Policy: Users can view their own requests
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'master_tire_requests' AND policyname = 'Users can view own requests'
    ) THEN
        CREATE POLICY "Users can view own requests" 
        ON public.master_tire_requests 
        FOR SELECT 
        TO authenticated 
        USING (auth.uid() = user_id);
    END IF;

    -- Policy: Moderators/Admins can view all requests
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'master_tire_requests' AND policyname = 'Moderators can view all requests'
    ) THEN
        CREATE POLICY "Moderators can view all requests" 
        ON public.master_tire_requests 
        FOR SELECT 
        TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_id = auth.uid() 
                AND role IN ('admin', 'moderator')
            )
        );
    END IF;

    -- Policy: Moderators/Admins can update requests
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'master_tire_requests' AND policyname = 'Moderators can update requests'
    ) THEN
        CREATE POLICY "Moderators can update requests" 
        ON public.master_tire_requests 
        FOR UPDATE 
        TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_id = auth.uid() 
                AND role IN ('admin', 'moderator')
            )
        );
    END IF;
END $$;

-- 5. Add triggers for updated_at (safely)
DROP TRIGGER IF EXISTS update_master_tire_requests_updated_at ON public.master_tire_requests;
CREATE TRIGGER update_master_tire_requests_updated_at
    BEFORE UPDATE ON public.master_tire_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== 20260216000000_fix_notification_triggers.sql =====

-- Fix #2: Repair broken notification trigger and missing RLS helper function
-- Issues:
--   1. notify_partnership_event() references NEW.requestor_store_id but table uses requester_store_id
--   2. get_current_user_store_id() function is missing (used by notification RLS policies)

-- ============================================================
-- 1. Create missing get_current_user_store_id() function
--    Wraps existing get_user_store_id(uuid) with auth.uid()
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_current_user_store_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_user_store_id(auth.uid());
$$;

-- ============================================================
-- 2. Fix partnership notification trigger (requestor -> requester)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_partnership_event()
RETURNS TRIGGER AS $$
DECLARE
    _req_store_name TEXT;
    _rec_store_name TEXT;
BEGIN
    SELECT name INTO _req_store_name FROM public.stores WHERE id = NEW.requester_store_id;
    SELECT name INTO _rec_store_name FROM public.stores WHERE id = NEW.receiver_store_id;

    IF (TG_OP = 'INSERT') THEN
        PERFORM public.create_notification(
            _store_id := NEW.receiver_store_id,
            _type := 'partnership_request',
            _title := 'Partnership Request',
            _message := _req_store_name || ' wants to be partners with you.',
            _link := '/network?tab=requests'
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        IF NEW.status = 'approved' THEN
            PERFORM public.create_notification(
                _store_id := NEW.requester_store_id,
                _type := 'partnership_accepted',
                _title := 'Partnership Accepted!',
                _message := _rec_store_name || ' accepted your partnership request.',
                _link := '/network?tab=partners'
            );
        ELSIF NEW.status = 'rejected' THEN
            PERFORM public.create_notification(
                _store_id := NEW.requester_store_id,
                _type := 'partnership_rejected',
                _title := 'Request Declined',
                _message := _rec_store_name || ' declined your partnership request.',
                _link := '/network?tab=discover'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger (safe: DROP IF EXISTS first)
DROP TRIGGER IF EXISTS on_partnership_change ON public.store_partnerships;
CREATE TRIGGER on_partnership_change
    AFTER INSERT OR UPDATE ON public.store_partnerships
    FOR EACH ROW EXECUTE FUNCTION public.notify_partnership_event();

-- ===== 20260216000001_add_approve_request_rpc.sql =====

-- Fix #4: Atomic approve-and-add-to-catalog RPC function
-- Ensures master_tire insert + request status update happen in a single transaction.
-- If either step fails, both are rolled back.

CREATE OR REPLACE FUNCTION public.approve_master_tire_request(
    _request_id UUID,
    _brand TEXT,
    _model TEXT,
    _size TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _new_id UUID;
BEGIN
    -- Verify the request exists and is still pending
    IF NOT EXISTS (
        SELECT 1 FROM public.master_tire_requests
        WHERE id = _request_id AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'Request not found or already processed';
    END IF;

    -- Insert new master tire
    INSERT INTO public.master_tires (brand, model, size)
    VALUES (_brand, _model, _size)
    RETURNING id INTO _new_id;

    -- Update request status to approved
    UPDATE public.master_tire_requests
    SET status = 'approved', updated_at = now()
    WHERE id = _request_id;

    RETURN _new_id;
END;
$$;

-- ===== 20260312000000_add_performance_indexes.sql =====

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

-- ===== 20260312000002_user_invites.sql =====

-- ─────────────────────────────────────────────────────────────────────────────
-- user_invites: tracks email invites sent by moderators (for owners)
--               and store owners (for staff).
-- The trigger auto-approves the profile and adds to store_members
-- when the invited user's profile is first created.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_invites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL,
  invited_as  text        NOT NULL CHECK (invited_as IN ('owner', 'staff')),
  store_id    uuid        REFERENCES public.stores(id) ON DELETE CASCADE,
  invited_by  uuid        REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  accepted_at timestamptz
);

ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Moderators / admins can read all invites
CREATE POLICY "moderators_read_invites" ON public.user_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('moderator', 'admin')
    )
  );

-- Store owners can read invites they sent
CREATE POLICY "owners_read_own_invites" ON public.user_invites
  FOR SELECT USING (invited_by = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: when a profile is inserted, check if the user was invited.
-- If so: auto-approve them and (for staff) add them to the store.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.auto_handle_invited_user()
RETURNS TRIGGER AS $$
DECLARE
  invite_rec RECORD;
BEGIN
  SELECT * INTO invite_rec
  FROM public.user_invites
  WHERE email       = NEW.email
    AND accepted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Auto-approve the profile
    UPDATE public.profiles
    SET status = 'approved'
    WHERE user_id = NEW.user_id;

    -- For staff invites: add to the store immediately
    IF invite_rec.invited_as = 'staff' AND invite_rec.store_id IS NOT NULL THEN
      INSERT INTO public.store_members (store_id, user_id, role)
      VALUES (invite_rec.store_id, NEW.user_id, 'staff')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Mark invite as accepted
    UPDATE public.user_invites
    SET accepted_at = now()
    WHERE id = invite_rec.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_check_invite
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_handle_invited_user();

-- Index for the trigger lookup
CREATE INDEX IF NOT EXISTS idx_user_invites_email_pending
  ON public.user_invites (email)
  WHERE accepted_at IS NULL;

-- ===== 20260312000003_order_notifications.sql =====

-- ─────────────────────────────────────────────────────────────────────────────
-- Order Notification Triggers
-- 1. New order (interested) → notify seller store via LINE
-- 2. Status change (approved/shipped/delivered) → notify buyer store via LINE
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Trigger 1: Notify seller when a new order arrives ────────────────────────

CREATE OR REPLACE FUNCTION public.notify_seller_new_order()
RETURNS TRIGGER AS $$
DECLARE
  _buyer_store_name  text;
  _tire_label        text;
BEGIN
  -- Only fire on new orders (status = interested)
  IF NEW.status != 'interested' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO _buyer_store_name FROM public.stores WHERE id = NEW.buyer_store_id;
  SELECT brand || ' ' || COALESCE(model, '') || ' ' || size INTO _tire_label
    FROM public.tires WHERE id = NEW.tire_id;

  -- Notify the seller store (store-level notification → LINE push via webhook)
  INSERT INTO public.notifications (store_id, type, title, message, link, send_line)
  VALUES (
    NEW.seller_store_id,
    'order_received',
    'คำสั่งซื้อใหม่ 🛒',
    COALESCE(_buyer_store_name, 'ร้านค้า') || ' สนใจ ' ||
      COALESCE(trim(_tire_label), 'ยาง') || ' จำนวน ' || NEW.quantity || ' เส้น',
    '/orders',
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_created_notify_seller ON public.orders;
CREATE TRIGGER on_order_created_notify_seller
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seller_new_order();


-- ── Trigger 2: Notify buyer when order status changes ────────────────────────

CREATE OR REPLACE FUNCTION public.notify_buyer_order_update()
RETURNS TRIGGER AS $$
DECLARE
  _seller_store_name text;
  _tire_label        text;
  _title             text;
  _message           text;
  _type              text;
BEGIN
  -- Only fire on meaningful status changes
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('approved', 'shipped', 'delivered', 'cancelled') THEN RETURN NEW; END IF;

  SELECT name INTO _seller_store_name FROM public.stores WHERE id = NEW.seller_store_id;
  SELECT brand || ' ' || COALESCE(model, '') || ' ' || size INTO _tire_label
    FROM public.tires WHERE id = NEW.tire_id;

  IF NEW.status = 'approved' THEN
    _type    := 'order_approved';
    _title   := 'คำสั่งซื้ออนุมัติแล้ว ✅';
    _message := COALESCE(_seller_store_name, 'ร้านค้า') || ' อนุมัติ ' || COALESCE(trim(_tire_label), 'ยาง') || ' แล้ว';

  ELSIF NEW.status = 'shipped' THEN
    _type    := 'order_shipped';
    _title   := 'สินค้าถูกจัดส่งแล้ว 🚚';
    _message := COALESCE(trim(_tire_label), 'ยาง') || ' จาก ' || COALESCE(_seller_store_name, 'ร้านค้า') || ' กำลังมา';

  ELSIF NEW.status = 'delivered' THEN
    _type    := 'order_delivered';
    _title   := 'สินค้าส่งถึงแล้ว 🎉';
    _message := COALESCE(trim(_tire_label), 'ยาง') || ' ส่งถึงคุณเรียบร้อยแล้ว';

  ELSIF NEW.status = 'cancelled' THEN
    _type    := 'order_cancelled';
    _title   := 'คำสั่งซื้อถูกยกเลิก ❌';
    _message := 'คำสั่งซื้อ ' || COALESCE(trim(_tire_label), 'ยาง') || ' ถูกยกเลิกแล้ว';
  END IF;

  -- Notify buyer store
  INSERT INTO public.notifications (store_id, type, title, message, link, send_line)
  VALUES (NEW.buyer_store_id, _type, _title, _message, '/orders', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_status_changed_notify_buyer ON public.orders;
CREATE TRIGGER on_order_status_changed_notify_buyer
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_buyer_order_update();

-- ===== 20260316000000_security_hardening.sql =====

-- ─────────────────────────────────────────────────────────────────────────────
-- Security Hardening (2026-03-16)
--
-- 1. Fix stores RLS: scopes sensitive column access to owners/staff/admins only.
--    Any approved user could previously read line_channel_secret from any store.
--
-- 2. Prevent stores from partnering with themselves.
--
-- 3. Validate store_members.permissions JSON structure.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Fix stores table RLS ───────────────────────────────────────────────────

-- Drop the overly-permissive policy that exposed ALL columns
-- (including line_channel_secret) to every approved user.
DROP POLICY IF EXISTS "Approved users can view active stores basic info" ON public.stores;
DROP POLICY IF EXISTS "Approved users can view all stores" ON public.stores;

-- Approved staff members can read their own store only.
-- (Store owners are already covered by the existing ALL policy.)
CREATE POLICY "Store members can view their own store"
ON public.stores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.store_members sm
    WHERE sm.store_id = stores.id
      AND sm.user_id = auth.uid()
      AND sm.is_approved = true
  )
  OR public.has_role(auth.uid(), 'moderator')
);

-- Recreate stores_public WITHOUT security_invoker.
-- Without security_invoker the view runs under the schema-owner's privileges,
-- which bypasses RLS on the underlying table.  This is intentional: the view
-- is the *only* way for non-members to discover other stores, and it
-- deliberately omits every sensitive column.
drop view if exists public.stores_public cascade;
CREATE OR REPLACE VIEW public.stores_public AS
SELECT
  id,
  name,
  description,
  logo_url,
  address,
  phone,
  email,
  is_active,
  created_at,
  updated_at
  -- Omitted: owner_id, line_channel_secret,
  --          line_channel_access_token, line_webhook_secret
FROM public.stores
WHERE is_active = true;

-- Re-grant access (CREATE OR REPLACE resets grants on the view)
GRANT SELECT ON public.stores_public TO authenticated;


-- ── 2. Prevent self-referential partnerships ──────────────────────────────────

ALTER TABLE public.store_partnerships
ADD CONSTRAINT check_no_self_partnership
CHECK (requester_store_id != receiver_store_id);


-- ── 3. Validate store_members.permissions JSON structure ──────────────────────

ALTER TABLE public.store_members
ADD CONSTRAINT check_permissions_structure
CHECK (
  permissions IS NULL
  OR (
    jsonb_typeof(permissions)           = 'object'
    AND jsonb_typeof(permissions->'web')  = 'object'
    AND jsonb_typeof(permissions->'line') = 'object'
    AND (permissions->'web' ->>'view')    IS NOT NULL
    AND (permissions->'web' ->>'add')     IS NOT NULL
    AND (permissions->'web' ->>'edit')    IS NOT NULL
    AND (permissions->'web' ->>'delete')  IS NOT NULL
    AND (permissions->'line'->>'view')    IS NOT NULL
    AND (permissions->'line'->>'adjust')  IS NOT NULL
  )
);

-- ===== 20260610000000_enable_extensions.sql =====

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

-- ===== 20260610000001_alter_profiles_add_role.sql =====

-- Add role + store_id columns to profiles (new single-column role model)
-- Keeps user_roles table intact for backward compat during transition

alter table public.profiles
  add column if not exists role text check (role in ('owner','staff','interbranch')) default 'staff',
  add column if not exists store_id uuid references public.stores(id) on delete set null;

-- Backfill: owners (from stores.owner_id)
update public.profiles p
set role = 'owner',
    store_id = s.id
from public.stores s
where s.owner_id = p.user_id;

-- Backfill: staff (from store_members, only if not already owner)
update public.profiles p
set role = 'staff',
    store_id = sm.store_id
from public.store_members sm
where sm.user_id = p.user_id
  and sm.is_approved = true
  and p.role = 'staff'
  and not exists (
    select 1 from public.stores where owner_id = p.user_id
  );

-- Update handle_new_user trigger to include role field
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'staff',
    'pending'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ===== 20260610000002_alter_stores_add_vault_refs.sql =====

-- Add vault reference columns to stores
-- Existing line_channel_secret / line_channel_access_token kept for backward compat
-- (line-webhook still reads them until Phase 2 migration)

alter table public.stores
  add column if not exists facebook_page_id text,
  add column if not exists vault_line_secret_ref text,
  add column if not exists vault_line_token_ref text,
  add column if not exists vault_line_oa_ref text,
  add column if not exists vault_fb_token_ref text;

-- ===== 20260610000003_alter_tires_add_new_columns.sql =====

-- Add new columns to tires table
-- quantity: direct stock count (previously only in tire_dots.quantity)
-- avg_cost: weighted-average cost used by OTTO/LENS
-- sell_price: canonical selling price (renamed from price — price kept for compat)
-- min_threshold: triggers HAWK reorder
-- last_sold_at: used by LENS for dead-stock detection
-- supplier: supplier name
-- is_active: soft delete

alter table public.tires
  add column if not exists quantity integer not null default 0,
  add column if not exists avg_cost numeric(10,2) default 0,
  add column if not exists sell_price numeric(10,2),
  add column if not exists min_threshold integer not null default 2,
  add column if not exists last_sold_at timestamptz,
  add column if not exists supplier text,
  add column if not exists is_active boolean not null default true;

-- Backfill sell_price from existing price column
update public.tires
set sell_price = price
where sell_price is null and price is not null;

-- Backfill quantity from tire_dots totals
update public.tires t
set quantity = coalesce((
  select sum(td.quantity)
  from public.tire_dots td
  where td.tire_id = t.id
), 0);

-- Ensure is_active is set
update public.tires set is_active = true where is_active is null;

-- Add updated_at if missing
alter table public.tires
  add column if not exists updated_at timestamptz default now();

-- ===== 20260610000004_alter_stock_logs.sql =====

-- Add new columns to stock_logs for direct tire reference
-- Keeps tire_dot_id for backward compat with existing audit log queries

alter table public.stock_logs
  add column if not exists tire_id uuid references public.tires(id) on delete cascade,
  add column if not exists qty_before integer,
  add column if not exists qty_change integer,
  add column if not exists qty_after integer,
  add column if not exists note text;

-- Backfill tire_id from tire_dot_id path
update public.stock_logs sl
set
  tire_id   = td.tire_id,
  qty_before = sl.quantity_before,
  qty_change = sl.quantity_change,
  qty_after  = sl.quantity_after
from public.tire_dots td
where td.id = sl.tire_dot_id
  and sl.tire_id is null;

create index if not exists idx_stock_logs_tire_id on public.stock_logs(tire_id);

-- ===== 20260610000005_create_customers.sql =====

create table if not exists public.customers (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores(id) on delete cascade,
  name         text not null,
  phone        text,
  plate_number text,
  car_model    text,
  last_visit   date,
  visit_count  integer not null default 1,
  preferred_brand text,
  total_spend  numeric(12,2) not null default 0,
  segment      text check (segment in ('VIP','Regular','At-risk')) default 'Regular',
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table public.customers enable row level security;

create index if not exists idx_customers_store    on public.customers(store_id);
create index if not exists idx_customers_plate    on public.customers(plate_number);
create index if not exists idx_customers_phone    on public.customers(phone);
create index if not exists idx_customers_segment  on public.customers(store_id, segment);

-- Owner and staff of same store can manage customers
create policy "store_members_manage_customers"
  on public.customers for all to authenticated
  using (
    store_id in (
      select store_id from public.profiles
      where user_id = auth.uid() and role in ('owner','staff')
    )
  );

create policy "service_role_all_customers"
  on public.customers for all to service_role using (true);

-- ===== 20260610000006_create_sales_log.sql =====

create table if not exists public.sales_log (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references public.stores(id) on delete cascade,
  staff_id       uuid references public.profiles(id) on delete set null,
  customer_id    uuid references public.customers(id) on delete set null,
  tire_id        uuid references public.tires(id) on delete set null,
  tire_name      text not null,
  car_model      text,
  plate_number   text,
  quantity_sold  integer not null,
  services       text[] default '{}',
  sell_price     numeric(10,2) not null,
  total_revenue  numeric(12,2) not null,
  cost_at_sale   numeric(10,2),
  gross_profit   numeric(12,2),
  promotion_id   uuid,
  created_at     timestamptz default now()
);

alter table public.sales_log enable row level security;

create index if not exists idx_sales_log_store   on public.sales_log(store_id);
create index if not exists idx_sales_log_created on public.sales_log(created_at);
create index if not exists idx_sales_log_staff   on public.sales_log(staff_id);
create index if not exists idx_sales_log_tire    on public.sales_log(tire_id);

-- Owners see all their store's sales
create policy "owners_see_all_sales"
  on public.sales_log for select to authenticated
  using (
    store_id in (
      select store_id from public.profiles
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- Service role has full access (used by record-sale edge function)
create policy "service_role_all_sales"
  on public.sales_log for all to service_role using (true);

-- ===== 20260610000007_create_financials.sql =====

create table if not exists public.financials (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores(id) on delete cascade,
  type         text not null check (type in ('sale','purchase','expense','weekly_summary')),
  reference_id uuid,
  revenue      numeric(12,2) default 0,
  cogs         numeric(12,2) default 0,
  gross_profit numeric(12,2) default 0,
  expense      numeric(12,2) default 0,
  net_profit   numeric(12,2),
  period_day   date,
  period_week  text,
  period_month text,
  created_at   timestamptz default now()
);

alter table public.financials enable row level security;

create index if not exists idx_financials_store        on public.financials(store_id);
create index if not exists idx_financials_period_day   on public.financials(store_id, period_day);
create index if not exists idx_financials_period_month on public.financials(store_id, period_month);

-- Owner-only access
create policy "owners_see_financials"
  on public.financials for all to authenticated
  using (
    store_id in (
      select store_id from public.profiles
      where user_id = auth.uid() and role = 'owner'
    )
  );

create policy "service_role_all_financials"
  on public.financials for all to service_role using (true);

-- ===== 20260610000008_create_rex_mappings.sql =====

create table if not exists public.rex_mappings (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  car_model   text not null,
  tire_id     uuid references public.tires(id) on delete cascade,
  tire_name   text,
  sale_count  integer not null default 1,
  percentage  numeric(5,2) default 0,
  updated_at  timestamptz default now(),
  unique (store_id, car_model, tire_id)
);

alter table public.rex_mappings enable row level security;

create index if not exists idx_rex_car_model       on public.rex_mappings(store_id, car_model);
create index if not exists idx_rex_car_model_count on public.rex_mappings(store_id, car_model, sale_count desc);

-- Owner and staff can read REX data
create policy "store_members_see_rex"
  on public.rex_mappings for select to authenticated
  using (
    store_id in (
      select store_id from public.profiles
      where user_id = auth.uid() and role in ('owner','staff')
    )
  );

create policy "service_role_all_rex"
  on public.rex_mappings for all to service_role using (true);

-- ===== 20260610000009_create_notifications_update.sql =====

-- Add new columns to existing notifications table
alter table public.notifications
  add column if not exists send_line      boolean default false,
  add column if not exists line_sent_at   timestamptz,
  add column if not exists reference_type text;

-- Drop old triggers that reference removed tables (safe if they don't exist)
drop trigger if exists on_partnership_change on public.store_partnerships;
drop trigger if exists on_new_offer          on public.broadcast_offers;
drop trigger if exists on_new_broadcast      on public.broadcast_requests;

-- Update RLS for the new model
drop policy if exists "View own notifications"   on public.notifications;
drop policy if exists "Update own notifications" on public.notifications;

create policy "view_own_or_store_notifications"
  on public.notifications for select to authenticated
  using (
    user_id = auth.uid()
    or store_id in (
      select store_id from public.profiles
      where user_id = auth.uid()
    )
  );

create policy "update_own_notifications"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "service_role_all_notifications"
  on public.notifications for all to service_role using (true);

-- ===== 20260610000010_create_agent_runs.sql =====

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

-- ===== 20260610000011_create_permission_views.sql =====

-- Column-isolation views
-- security_invoker = true means the view still obeys the caller's RLS policies

-- Staff view: sell_price visible, avg_cost/supplier absent
drop view if exists public.tires_staff_view cascade;
create or replace view public.tires_staff_view
  with (security_invoker = true) as
  select id, store_id, brand, model, size, quantity, sell_price, is_active, min_threshold
  from public.tires
  where is_active = true;

-- Interbranch view: stock availability only — no prices
drop view if exists public.tires_interbranch_view cascade;
create or replace view public.tires_interbranch_view
  with (security_invoker = true) as
  select store_id, brand, model, size, quantity
  from public.tires
  where is_active = true and quantity > 0;

-- Owner view: all columns (for stock-management page)
drop view if exists public.tires_owner_view cascade;
create or replace view public.tires_owner_view
  with (security_invoker = true) as
  select * from public.tires;

-- Staff sales view: no cost_at_sale or gross_profit
drop view if exists public.sales_log_staff_view cascade;
create or replace view public.sales_log_staff_view
  with (security_invoker = true) as
  select id, store_id, staff_id, tire_name, car_model, plate_number,
         quantity_sold, services, sell_price, total_revenue, created_at
  from public.sales_log;

-- Column isolation:
-- Revoke direct table access from authenticated role
-- Staff/interbranch users can only query via the restricted views
-- NOTE: service_role is NOT affected by revoke
revoke select on public.tires      from authenticated;
revoke select on public.sales_log  from authenticated;

grant select on public.tires_staff_view        to authenticated;
grant select on public.tires_interbranch_view  to authenticated;
grant select on public.tires_owner_view        to authenticated;
grant select on public.sales_log_staff_view    to authenticated;

-- ===== 20260610000012_create_atomic_functions.sql =====

-- Atomic stock deduction (race-condition safe)
-- Returns true if deduction succeeded, false if insufficient stock
create or replace function public.deduct_stock_atomic(
  p_tire_id uuid,
  p_qty     integer
) returns boolean as $$
declare
  rows_affected integer;
begin
  update public.tires
  set
    quantity     = quantity - p_qty,
    last_sold_at = now(),
    updated_at   = now()
  where id = p_tire_id
    and quantity >= p_qty;

  get diagnostics rows_affected = row_count;
  return rows_affected = 1;
end;
$$ language plpgsql security definer;

-- Weighted-average cost recalculation (called on stock receipt)
create or replace function public.recalc_avg_cost_on_purchase(
  p_tire_id  uuid,
  p_new_qty  integer,
  p_new_cost numeric
) returns void as $$
declare
  old_qty  integer;
  old_cost numeric;
begin
  select quantity, coalesce(avg_cost, 0) into old_qty, old_cost
  from public.tires where id = p_tire_id;

  update public.tires set
    avg_cost = round(
      ((old_qty * old_cost) + (p_new_qty * p_new_cost))
      / nullif(old_qty + p_new_qty, 0),
      2
    ),
    quantity   = quantity + p_new_qty,
    updated_at = now()
  where id = p_tire_id;
end;
$$ language plpgsql security definer;

-- REX mapping update (called after every sale)
create or replace function public.update_rex_mapping(
  p_store_id  uuid,
  p_car_model text,
  p_tire_id   uuid,
  p_tire_name text
) returns void as $$
declare
  total_for_model integer;
begin
  p_car_model := lower(trim(p_car_model));

  insert into public.rex_mappings (store_id, car_model, tire_id, tire_name, sale_count)
  values (p_store_id, p_car_model, p_tire_id, p_tire_name, 1)
  on conflict (store_id, car_model, tire_id)
  do update set
    sale_count = rex_mappings.sale_count + 1,
    tire_name  = p_tire_name,
    updated_at = now();

  -- Recalculate percentages for this car model
  select sum(sale_count) into total_for_model
  from public.rex_mappings
  where store_id = p_store_id and car_model = p_car_model;

  update public.rex_mappings
  set percentage = round((sale_count::numeric / total_for_model) * 100, 1)
  where store_id = p_store_id and car_model = p_car_model;
end;
$$ language plpgsql security definer;

-- Trending tyres function (used by TREND panel on sales page)
create or replace function public.get_trending_tyres(
  p_store_id uuid,
  p_days     integer default 30
) returns table(
  tire_id    uuid,
  tire_name  text,
  units_sold integer,
  revenue    numeric
) as $$
begin
  return query
  select
    sl.tire_id,
    sl.tire_name,
    sum(sl.quantity_sold)::integer as units_sold,
    sum(sl.total_revenue)          as revenue
  from public.sales_log sl
  where sl.store_id = p_store_id
    and sl.created_at >= now() - (p_days || ' days')::interval
  group by sl.tire_id, sl.tire_name
  order by units_sold desc
  limit 10;
end;
$$ language plpgsql security definer;

-- ===== 20260610000013_create_stock_low_trigger.sql =====

-- Stock-low notification trigger
-- Fires when tires.quantity crosses below min_threshold

create or replace function public.handle_stock_low_notification()
returns trigger as $$
declare
  v_owner_user_id uuid;
  v_store_name    text;
begin
  if new.quantity < new.min_threshold and old.quantity >= old.min_threshold then

    select p.user_id, s.name
    into v_owner_user_id, v_store_name
    from public.profiles p
    join public.stores s on s.id = new.store_id
    where p.store_id = new.store_id and p.role = 'owner'
    limit 1;

    if v_owner_user_id is not null then
      insert into public.notifications (
        store_id, user_id, type, title, body,
        is_read, send_line, reference_id, reference_type
      ) values (
        new.store_id,
        v_owner_user_id,
        'stock_low',
        'สต็อกต่ำ: ' || new.brand || ' ' || new.model,
        new.brand || ' ' || new.model || ' ' || new.size || ' — เหลือ ' || new.quantity || ' เส้น',
        false,
        true,
        new.id,
        'tire'
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists notify_stock_low on public.tires;
create trigger notify_stock_low
  after update of quantity on public.tires
  for each row
  execute function public.handle_stock_low_notification();

-- ===== 20260610000014_create_stores_signup_view.sql =====

-- Ensure stores_signup_search and stores_public views exist
-- (used by Auth.tsx store search during signup)

drop view if exists public.stores_signup_search cascade;
create or replace view public.stores_signup_search as
select id, name
from public.stores
where is_active = true;

drop view if exists public.stores_public cascade;
create or replace view public.stores_public as
select id, name, address, phone, is_active, created_at
from public.stores
where is_active = true;

grant select on public.stores_signup_search to anon, authenticated;
grant select on public.stores_public        to anon, authenticated;

-- ===== 20260610000015_performance_indexes.sql =====

-- Phase 1 performance indexes

create index if not exists idx_tires_store_active  on public.tires(store_id, is_active);
create index if not exists idx_tires_quantity      on public.tires(store_id, quantity);
create index if not exists idx_tires_last_sold     on public.tires(store_id, last_sold_at);
create index if not exists idx_profiles_user_id    on public.profiles(user_id);
create index if not exists idx_profiles_store_role on public.profiles(store_id, role);
create index if not exists idx_rex_model_count     on public.rex_mappings(store_id, car_model, sale_count desc);
create index if not exists idx_financials_type     on public.financials(store_id, type, period_day);

-- ===== 20260610000016_create_purchase_orders.sql =====

-- Purchase orders table (Phase 2 — HAWK reorder + PO approval flow)
create table if not exists public.purchase_orders (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  tire_id       uuid references public.tires(id) on delete set null,
  tire_name     text not null,
  supplier      text,
  qty_requested int not null check (qty_requested > 0),
  unit_cost     numeric(12,2),
  total_cost    numeric(12,2) generated always as (qty_requested * coalesce(unit_cost, 0)) stored,
  status        text not null default 'pending' check (status in ('pending','approved','rejected','received')),
  notes         text,
  agent         text default 'HAWK',
  approved_by   uuid references auth.users(id),
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.purchase_orders enable row level security;

-- Owner: full access
create policy "owner_all_purchase_orders" on public.purchase_orders
  for all using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.store_id = purchase_orders.store_id
        and p.role = 'owner'
    )
  );

-- service_role: full access (for edge functions)
create policy "service_all_purchase_orders" on public.purchase_orders
  for all using (auth.role() = 'service_role');

create index if not exists idx_po_store_status on public.purchase_orders(store_id, status, created_at desc);

-- ===== 20260610000017_create_promotions.sql =====

-- Promotions table (Phase 2 — SPARK proposals + PIXEL content generation)
create table if not exists public.promotions (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  title           text not null,
  body_text       text,
  facebook_copy   text,
  line_copy       text,
  image_url       text,
  discount_pct    numeric(5,2),
  start_date      date,
  end_date        date,
  status          text not null default 'draft' check (status in ('draft','pending_approval','approved','published','rejected')),
  agent           text default 'SPARK',
  approved_by     uuid references auth.users(id),
  approved_at     timestamptz,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.promotions enable row level security;

create policy "owner_all_promotions" on public.promotions
  for all using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.store_id = promotions.store_id
        and p.role = 'owner'
    )
  );

create policy "service_all_promotions" on public.promotions
  for all using (auth.role() = 'service_role');

create index if not exists idx_promotions_store_status on public.promotions(store_id, status, created_at desc);

-- ===== 20260610000018_create_interbranch_tokens.sql =====

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

-- ===== 20260610000019_create_intelligence_reports.sql =====

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

-- ===== 20260610000020_setup_vault_secrets.sql =====

-- Instructions for inserting secrets into Supabase Vault
-- Run these manually via the Supabase dashboard → Vault, or via psql with service_role.
-- Never run in a migration that auto-executes in prod — secrets must be injected per-environment.

-- Example (replace with real values):
-- select vault.create_secret('your-line-channel-secret', 'line_channel_secret_default');
-- select vault.create_secret('your-line-channel-token', 'line_channel_token_default');
-- select vault.create_secret('your-claude-api-key', 'claude_api_key_default');
-- select vault.create_secret('your-fb-page-token', 'fb_page_token_default');

-- This migration is a no-op — it just documents the Vault setup pattern.
select 1;

-- ===== 20260610000022_create_vera_trigger.sql =====

-- VERA: financial threshold alert trigger
-- Fires when a weekly_summary financial entry shows gross_profit below threshold

create or replace function public.handle_vera_alert()
returns trigger as $$
declare
  v_owner_user_id uuid;
  v_threshold     numeric := -10000;
begin
  -- Only trigger on weekly_summary entries with negative or very low profit
  if new.type = 'weekly_summary' and new.gross_profit < v_threshold then

    select p.user_id into v_owner_user_id
    from public.profiles p
    where p.store_id = new.store_id and p.role = 'owner'
    limit 1;

    if v_owner_user_id is not null then
      insert into public.notifications (
        store_id, user_id, type, title, body, is_read, send_line
      ) values (
        new.store_id,
        v_owner_user_id,
        'financial_alert',
        'VERA: กำไรต่ำกว่าเกณฑ์',
        'กำไรสัปดาห์นี้: ฿' || new.gross_profit || ' — ต่ำกว่าเกณฑ์ ฿' || v_threshold,
        false,
        true
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists vera_financial_alert on public.financials;
create trigger vera_financial_alert
  after insert on public.financials
  for each row
  execute function public.handle_vera_alert();

-- ===== 20260610000023_create_promo_po_triggers.sql =====

-- Notification triggers for promotions and purchase_orders status changes

-- Promotion status change → notify owner
create or replace function public.handle_promotion_status_change()
returns trigger as $$
declare
  v_owner_user_id uuid;
begin
  if old.status is distinct from new.status then
    select p.user_id into v_owner_user_id
    from public.profiles p
    where p.store_id = new.store_id and p.role = 'owner'
    limit 1;

    if v_owner_user_id is not null then
      insert into public.notifications (
        store_id, user_id, type, title, body, is_read, reference_id, reference_type
      ) values (
        new.store_id,
        v_owner_user_id,
        'promotion_status',
        'โปรโมชัน: ' || new.title,
        'สถานะเปลี่ยนเป็น: ' || new.status,
        false,
        new.id,
        'promotion'
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists promotion_status_notify on public.promotions;
create trigger promotion_status_notify
  after update of status on public.promotions
  for each row
  execute function public.handle_promotion_status_change();

-- Purchase order status change → notify owner
create or replace function public.handle_po_status_change()
returns trigger as $$
declare
  v_owner_user_id uuid;
begin
  if old.status is distinct from new.status then
    select p.user_id into v_owner_user_id
    from public.profiles p
    where p.store_id = new.store_id and p.role = 'owner'
    limit 1;

    if v_owner_user_id is not null then
      insert into public.notifications (
        store_id, user_id, type, title, body, is_read, reference_id, reference_type
      ) values (
        new.store_id,
        v_owner_user_id,
        'po_status',
        'ใบสั่งซื้อ: ' || new.tire_name,
        'สถานะเปลี่ยนเป็น: ' || new.status,
        false,
        new.id,
        'purchase_order'
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists po_status_notify on public.purchase_orders;
create trigger po_status_notify
  after update of status on public.purchase_orders
  for each row
  execute function public.handle_po_status_change();

-- ===== 20260610000025_atomic_sale.sql =====

-- ============================================================================
-- Atomic sale transaction.
--
-- Replaces the multi-step (deduct -> log -> financials -> sales_log) sequence in
-- the record-sale edge function with a SINGLE Postgres function. A function body
-- runs in one implicit transaction, so either every write commits or none do —
-- no more "stock deducted but no sale recorded" desync if a later step fails.
--
-- Concurrency: the tire row is locked with SELECT ... FOR UPDATE, serialising
-- concurrent sales of the same tire. Two simultaneous sales of the last unit ->
-- exactly one succeeds, the other gets insufficient_stock.
--
-- Returns jsonb: { success, error?, sale_id?, customer_id?, qty_after?, low_stock? }
-- ============================================================================

create or replace function public.record_sale_txn(
  p_tire_id       uuid,
  p_quantity_sold integer,
  p_sell_price    numeric,
  p_service_total numeric default 0,
  p_services      text[]   default '{}',
  p_plate_number  text     default null,
  p_car_model     text     default null,
  p_customer_name text     default null,
  p_phone         text     default null,
  p_promotion_id  uuid     default null,
  p_staff_id      uuid     default null,   -- profiles.id of the seller
  p_user_id       uuid     default null    -- auth.uid() for stock_logs
) returns jsonb as $$
declare
  v_store_id      uuid;
  v_brand         text;
  v_model         text;
  v_size          text;
  v_avg_cost      numeric;
  v_min_threshold integer;
  v_qty_before    integer;
  v_qty_after     integer;
  v_tire_name     text;
  v_total_revenue numeric;
  v_cogs          numeric;
  v_gross_profit  numeric;
  v_low_stock     boolean;
  v_customer_id   uuid;
  v_existing_id   uuid;
  v_visit_count   integer;
  v_total_spend   numeric;
  v_brand_first   text;
  v_today         date := current_date;
  v_sale_id       uuid;
begin
  if p_quantity_sold is null or p_quantity_sold < 1 or p_sell_price is null then
    return jsonb_build_object('success', false, 'error', 'invalid_input');
  end if;

  -- Lock the tire row for the duration of the transaction (concurrency-safe).
  select store_id, brand, model, size, coalesce(avg_cost, 0), min_threshold, quantity
    into v_store_id, v_brand, v_model, v_size, v_avg_cost, v_min_threshold, v_qty_before
  from public.tires
  where id = p_tire_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'tire_not_found');
  end if;

  if v_qty_before < p_quantity_sold then
    return jsonb_build_object('success', false, 'error', 'insufficient_stock');
  end if;

  v_tire_name     := trim(both ' ' from concat_ws(' ', v_brand, v_model, v_size));
  v_total_revenue := (p_sell_price * p_quantity_sold) + coalesce(p_service_total, 0);
  v_cogs          := v_avg_cost * p_quantity_sold;
  v_gross_profit  := v_total_revenue - v_cogs;
  v_qty_after     := v_qty_before - p_quantity_sold;
  v_low_stock     := v_qty_after < v_min_threshold;
  v_brand_first   := split_part(v_tire_name, ' ', 1);

  -- 1. Deduct stock
  update public.tires
  set quantity = v_qty_after, last_sold_at = now(), updated_at = now()
  where id = p_tire_id;

  -- 2. Stock log
  insert into public.stock_logs (store_id, tire_id, user_id, action, qty_before, qty_change, qty_after, note)
  values (v_store_id, p_tire_id, p_user_id, 'sale', v_qty_before, -p_quantity_sold, v_qty_after,
          format('Sale: %sx %s', p_quantity_sold, v_tire_name));

  -- 3. Customer upsert (IRIS) — only if we have an identifier
  if coalesce(p_plate_number, '') <> '' or coalesce(p_phone, '') <> '' then
    select id, visit_count, total_spend
      into v_existing_id, v_visit_count, v_total_spend
    from public.customers
    where store_id = v_store_id
      and (
        (coalesce(p_plate_number, '') <> '' and plate_number = p_plate_number)
        or (coalesce(p_plate_number, '') = '' and coalesce(p_phone, '') <> '' and phone = p_phone)
      )
    limit 1;

    if v_existing_id is not null then
      v_total_spend := coalesce(v_total_spend, 0) + v_total_revenue;
      update public.customers set
        last_visit      = v_today,
        visit_count     = coalesce(v_visit_count, 0) + 1,
        total_spend     = v_total_spend,
        preferred_brand = v_brand_first,
        segment         = case when v_total_spend >= 50000 then 'VIP' else 'Regular' end,
        updated_at      = now()
      where id = v_existing_id;
      v_customer_id := v_existing_id;
    else
      insert into public.customers (store_id, name, phone, plate_number, car_model,
                                    last_visit, visit_count, total_spend, preferred_brand, segment)
      values (v_store_id, coalesce(nullif(p_customer_name, ''), 'ลูกค้า'),
              nullif(p_phone, ''), nullif(p_plate_number, ''), nullif(p_car_model, ''),
              v_today, 1, v_total_revenue, v_brand_first,
              case when v_total_revenue >= 50000 then 'VIP' else 'Regular' end)
      returning id into v_customer_id;
    end if;
  end if;

  -- 4. Financials (OTTO)
  insert into public.financials (store_id, type, revenue, cogs, gross_profit,
                                 period_day, period_week, period_month)
  values (v_store_id, 'sale', v_total_revenue, v_cogs, v_gross_profit,
          v_today, to_char(now(), 'IYYY"-W"IW'), to_char(now(), 'YYYY-MM'));

  -- 5. REX mapping
  if coalesce(p_car_model, '') <> '' then
    perform public.update_rex_mapping(v_store_id, lower(trim(p_car_model)), p_tire_id, v_tire_name);
  end if;

  -- 6. Sales log
  insert into public.sales_log (store_id, staff_id, customer_id, tire_id, tire_name,
                                car_model, plate_number, quantity_sold, services,
                                sell_price, total_revenue, cost_at_sale, gross_profit, promotion_id)
  values (v_store_id, p_staff_id, v_customer_id, p_tire_id, v_tire_name,
          nullif(p_car_model, ''), nullif(p_plate_number, ''), p_quantity_sold, coalesce(p_services, '{}'),
          p_sell_price, v_total_revenue, v_avg_cost, v_gross_profit, p_promotion_id)
  returning id into v_sale_id;

  return jsonb_build_object(
    'success',     true,
    'sale_id',     v_sale_id,
    'customer_id', v_customer_id,
    'store_id',    v_store_id,
    'tire_name',   v_tire_name,
    'qty_after',   v_qty_after,
    'min_threshold', v_min_threshold,
    'low_stock',   v_low_stock
  );
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.record_sale_txn from public, anon, authenticated;
grant execute on function public.record_sale_txn to service_role;

-- ===== 20260610000026_staff_unify_profiles.sql =====

-- ============================================================================
-- Unify the staff/membership model onto `profiles`.
--
-- Before this migration the app had TWO sources of truth for "who belongs to
-- which store": `store_members` (legacy, drove stores RLS + the Staff UI) and
-- `profiles.role`/`profiles.store_id` (new, drives every Phase 1-4 data table).
-- The split caused several latent bugs:
--   1. Owners had no RLS policy to update a staff member's profile, so approval
--      silently failed to set profiles.status/role/store_id (RLS blocked it).
--   2. The invite trigger + join-request approval never set profiles.store_id.
--   3. stores RLS for staff required a store_members row.
--   4. send-invite checked ownership via store_members (new owners aren't there).
--
-- This migration makes `profiles` the single source of truth:
--   - adds staff_position + permissions columns (the granularity store_members had)
--   - backfills them from store_members
--   - adds stores SELECT access for profiles-based members
--   - adds owner SELECT/UPDATE access over their store's staff profiles
--   - replaces the approval path with SECURITY DEFINER RPCs (handles the
--     chicken-and-egg where the target profile isn't in the store yet)
--   - updates the invite trigger to set profiles.role/store_id
--
-- store_members is left in place (deprecated) so nothing silently breaks; it is
-- no longer the source of truth and can be dropped in a later migration.
-- Safe to run multiple times.
-- ============================================================================

-- ── 1. New columns on profiles ──────────────────────────────────────────────
alter table public.profiles
  add column if not exists staff_position text,                 -- 'manager' | 'staff' | 'sales'
  add column if not exists permissions    jsonb;

-- Backfill from store_members for currently-approved members.
update public.profiles p
set staff_position = coalesce(p.staff_position, sm.role),
    permissions    = coalesce(p.permissions, sm.permissions)
from public.store_members sm
where sm.user_id = p.user_id
  and sm.is_approved = true
  and p.role = 'staff';

-- ── 2. stores: let profiles-based members read their store ──────────────────
drop policy if exists "members_view_their_store" on public.stores;
create policy "members_view_their_store"
  on public.stores for select to authenticated
  using (id = (select store_id from public.profiles where user_id = auth.uid()));

-- ── 3. profiles: owners can see & manage their store's staff ────────────────
drop policy if exists "owners_view_store_staff" on public.profiles;
create policy "owners_view_store_staff"
  on public.profiles for select to authenticated
  using (store_id in (select id from public.stores where owner_id = auth.uid()));

drop policy if exists "owners_update_store_staff" on public.profiles;
create policy "owners_update_store_staff"
  on public.profiles for update to authenticated
  using (store_id in (select id from public.stores where owner_id = auth.uid()))
  with check (
    store_id is null
    or store_id in (select id from public.stores where owner_id = auth.uid())
  );

-- ── 4. Approval RPCs (SECURITY DEFINER) ─────────────────────────────────────
-- The target profile has no store_id until approved, so an RLS UPDATE can't
-- reach it. These functions verify the caller owns the request's store, then
-- write the profile. They run as definer but gate on auth.uid() ownership.

create or replace function public.approve_staff_request(
  p_request_id  uuid,
  p_position    text  default 'staff',
  p_permissions jsonb default null
) returns jsonb as $$
declare
  v_req   record;
  v_owner boolean;
begin
  select * into v_req from public.staff_join_requests where id = p_request_id;
  if not found then return jsonb_build_object('success', false, 'error', 'request_not_found'); end if;

  select exists(
    select 1 from public.stores where id = v_req.store_id and owner_id = auth.uid()
  ) into v_owner;
  if not v_owner then return jsonb_build_object('success', false, 'error', 'forbidden'); end if;

  update public.staff_join_requests
    set status = 'approved', responded_at = now(), responded_by = auth.uid()
    where id = p_request_id;

  update public.profiles
    set status         = 'approved',
        role           = 'staff',
        store_id       = v_req.store_id,
        staff_position = coalesce(p_position, 'staff'),
        permissions    = coalesce(p_permissions, permissions)
    where user_id = v_req.user_id;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.reject_staff_request(
  p_request_id uuid
) returns jsonb as $$
declare
  v_req   record;
  v_owner boolean;
begin
  select * into v_req from public.staff_join_requests where id = p_request_id;
  if not found then return jsonb_build_object('success', false, 'error', 'request_not_found'); end if;

  select exists(
    select 1 from public.stores where id = v_req.store_id and owner_id = auth.uid()
  ) into v_owner;
  if not v_owner then return jsonb_build_object('success', false, 'error', 'forbidden'); end if;

  update public.staff_join_requests
    set status = 'rejected', responded_at = now(), responded_by = auth.uid()
    where id = p_request_id;

  update public.profiles set status = 'rejected' where user_id = v_req.user_id;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer set search_path = public;

-- Add an existing user (by email) directly as staff of the caller's store.
create or replace function public.add_staff_member(
  p_email       text,
  p_position    text  default 'staff',
  p_permissions jsonb default null
) returns jsonb as $$
declare
  v_store_id uuid;
  v_user_id  uuid;
begin
  select id into v_store_id from public.stores where owner_id = auth.uid() limit 1;
  if v_store_id is null then return jsonb_build_object('success', false, 'error', 'not_an_owner'); end if;

  select user_id into v_user_id from public.profiles where lower(email) = lower(p_email) limit 1;
  if v_user_id is null then return jsonb_build_object('success', false, 'error', 'user_not_found'); end if;

  update public.profiles
    set status         = 'approved',
        role           = 'staff',
        store_id       = v_store_id,
        staff_position = coalesce(p_position, 'staff'),
        permissions    = coalesce(p_permissions, permissions)
    where user_id = v_user_id;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.approve_staff_request(uuid, text, jsonb) from public, anon;
revoke all on function public.reject_staff_request(uuid)               from public, anon;
revoke all on function public.add_staff_member(text, text, jsonb)      from public, anon;
grant execute on function public.approve_staff_request(uuid, text, jsonb) to authenticated;
grant execute on function public.reject_staff_request(uuid)               to authenticated;
grant execute on function public.add_staff_member(text, text, jsonb)      to authenticated;

-- ── 5. Invited-user trigger now writes profiles (role + store_id) ───────────
create or replace function public.auto_handle_invited_user()
returns trigger as $$
declare
  invite_rec record;
begin
  select * into invite_rec
  from public.user_invites
  where email = new.email and accepted_at is null
  order by created_at desc
  limit 1;

  if found then
    if invite_rec.invited_as = 'staff' and invite_rec.store_id is not null then
      update public.profiles
        set status = 'approved', role = 'staff', store_id = invite_rec.store_id
        where user_id = new.user_id;
    else
      update public.profiles set status = 'approved' where user_id = new.user_id;
    end if;

    update public.user_invites set accepted_at = now() where id = invite_rec.id;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ===== 20260610000027_invite_codes_join_pin.sql =====

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

-- ===== 20260610000028_platform_admin.sql =====

-- ============================================================================
-- Platform admin (operator) console backend.
--
-- A "platform admin" is the operator of the whole SaaS (you) — distinct from a
-- store owner. Membership lives in `platform_admins`. Every privileged action is
-- enforced server-side via is_platform_admin(), so the /admin console is secure,
-- not just hidden in the UI.
--
-- BOOTSTRAP (one time): anoint yourself after your account exists —
--   insert into public.platform_admins (user_id)
--   select user_id from public.profiles where email = 'you@example.com'
--   on conflict do nothing;
--
-- Safe to run multiple times.
-- ============================================================================

create table if not exists public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- A user may see their own admin membership (so the app can check it). No one
-- can grant themselves admin from the app — inserts come from SQL/service_role.
drop policy if exists "see_own_admin_membership" on public.platform_admins;
create policy "see_own_admin_membership"
  on public.platform_admins for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "service_all_platform_admins" on public.platform_admins;
create policy "service_all_platform_admins"
  on public.platform_admins for all to service_role using (true) with check (true);

-- SECURITY DEFINER so it bypasses RLS on platform_admins (no recursion).
create or replace function public.is_platform_admin()
returns boolean as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$ language sql stable security definer set search_path = public;

grant execute on function public.is_platform_admin() to authenticated;

-- ── Admin read/write access via RLS (additive) ──────────────────────────────
drop policy if exists "admin_all_stores" on public.stores;
create policy "admin_all_stores"
  on public.stores for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "admin_all_profiles" on public.profiles;
create policy "admin_all_profiles"
  on public.profiles for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "admin_all_invite_codes" on public.store_invite_codes;
create policy "admin_all_invite_codes"
  on public.store_invite_codes for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ── Generate an invite code from the console ────────────────────────────────
create or replace function public.admin_generate_invite_code(
  p_note         text default null,
  p_expires_days integer default 30
) returns text as $$
declare
  v_code text;
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;

  loop
    v_code := public.gen_alnum_code(8);
    exit when not exists (select 1 from public.store_invite_codes where code = v_code);
  end loop;

  insert into public.store_invite_codes (code, note, expires_at)
  values (v_code, p_note, now() + (p_expires_days || ' days')::interval);

  return v_code;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.admin_generate_invite_code(text, integer) from public, anon;
grant execute on function public.admin_generate_invite_code(text, integer) to authenticated;

-- ── Platform-wide metrics ───────────────────────────────────────────────────
create or replace function public.admin_platform_metrics()
returns jsonb as $$
declare
  v jsonb;
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;

  select jsonb_build_object(
    'total_stores',   (select count(*) from public.stores),
    'active_stores',  (select count(*) from public.stores where is_active),
    'total_users',    (select count(*) from public.profiles),
    'total_owners',   (select count(*) from public.profiles where role = 'owner'),
    'total_staff',    (select count(*) from public.profiles where role = 'staff'),
    'total_sales',    (select count(*) from public.sales_log),
    'total_revenue',  (select coalesce(sum(total_revenue), 0) from public.sales_log),
    'unused_codes',   (select count(*) from public.store_invite_codes where used_at is null)
  ) into v;

  return v;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.admin_platform_metrics() from public, anon;
grant execute on function public.admin_platform_metrics() to authenticated;

-- ===== 20260610000029_fix_rls_recursion.sql =====

-- ============================================================================
-- HOTFIX: break infinite recursion between profiles and stores RLS policies.
--
-- Migration 026 added:
--   - stores."members_view_their_store"  -> subquery on profiles
--   - profiles."owners_view_store_staff" -> subquery on stores
-- Each policy's subquery is itself subject to the OTHER table's RLS, so:
--   read profiles -> evaluate stores RLS -> read profiles -> ... (loop)
-- PostgreSQL raises "infinite recursion detected in policy" on EVERY profile
-- read, which breaks login (the app can't load the profile and signs you out).
--
-- Fix: move the cross-table lookups into SECURITY DEFINER helper functions.
-- A definer function bypasses RLS on the table it reads, so the cycle is cut.
--
-- Safe to run multiple times.
-- ============================================================================

-- Caller's own store_id, read WITHOUT triggering profiles RLS.
create or replace function public.auth_store_id()
returns uuid as $$
  select store_id from public.profiles where user_id = auth.uid() limit 1;
$$ language sql stable security definer set search_path = public;

-- Does the caller own this store? Read WITHOUT triggering stores RLS.
create or replace function public.auth_owns_store(p_store_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.stores where id = p_store_id and owner_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

grant execute on function public.auth_store_id()            to authenticated;
grant execute on function public.auth_owns_store(uuid)      to authenticated;

-- ── Recreate the two cross-referencing policies using the helpers ───────────

drop policy if exists "members_view_their_store" on public.stores;
create policy "members_view_their_store"
  on public.stores for select to authenticated
  using (id = public.auth_store_id());

drop policy if exists "owners_view_store_staff" on public.profiles;
create policy "owners_view_store_staff"
  on public.profiles for select to authenticated
  using (public.auth_owns_store(store_id));

drop policy if exists "owners_update_store_staff" on public.profiles;
create policy "owners_update_store_staff"
  on public.profiles for update to authenticated
  using (public.auth_owns_store(store_id))
  with check (store_id is null or public.auth_owns_store(store_id));

-- ===== 20260621000001_store_network_links.sql =====

-- ============================================================================
-- Multi-tenant network links (opt-in cross-store stock visibility).
--
-- Previously `tires_interbranch_view` was a SECURITY DEFINER view with NO store
-- scoping, granted to every authenticated user — so any logged-in user could see
-- EVERY store's stock. Now that stores are independent, competing tenants, that
-- leaks competitor data by default.
--
-- This migration makes cross-store visibility opt-in:
--   - `store_network_links` records a handshake between two stores
--     (pending -> accepted -> revoked).
--   - owners request / accept / revoke links via SECURITY DEFINER RPCs.
--   - `tires_interbranch_view` is rewritten to show stock ONLY from stores that
--     have an ACCEPTED link with the caller's store. Visibility is mutual: once
--     accepted, both parties can see each other's availability (no prices/cost).
--
-- Follows the existing patterns: SECURITY DEFINER helpers (auth_store_id /
-- auth_owns_store from 029), drop-and-recreate policies, service_role bypass.
-- Safe to run multiple times.
-- ============================================================================

create table if not exists public.store_network_links (
  id                  uuid primary key default gen_random_uuid(),
  requesting_store_id uuid not null references public.stores(id) on delete cascade,
  target_store_id     uuid not null references public.stores(id) on delete cascade,
  status              text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (requesting_store_id, target_store_id),
  check (requesting_store_id <> target_store_id)
);

alter table public.store_network_links enable row level security;

create index if not exists idx_network_links_requesting on public.store_network_links(requesting_store_id, status);
create index if not exists idx_network_links_target     on public.store_network_links(target_store_id, status);

-- ── RLS: a store's members can READ links their store is party to ────────────
-- Writes go through the owner-gated RPCs below, never direct table access.
drop policy if exists "members_view_their_network_links" on public.store_network_links;
create policy "members_view_their_network_links"
  on public.store_network_links for select to authenticated
  using (
    requesting_store_id = public.auth_store_id()
    or target_store_id = public.auth_store_id()
  );

drop policy if exists "service_all_network_links" on public.store_network_links;
create policy "service_all_network_links"
  on public.store_network_links for all to service_role using (true) with check (true);

-- ── Accepted-partner store ids for the caller's store (mutual) ───────────────
-- SECURITY DEFINER so it can read the link table regardless of the caller's RLS.
create or replace function public.linked_store_ids()
returns setof uuid as $$
  select case
           when l.requesting_store_id = public.auth_store_id() then l.target_store_id
           else l.requesting_store_id
         end
  from public.store_network_links l
  where l.status = 'accepted'
    and (l.requesting_store_id = public.auth_store_id()
         or l.target_store_id = public.auth_store_id());
$$ language sql stable security definer set search_path = public;

grant execute on function public.linked_store_ids() to authenticated;

-- ── Owner-gated RPCs: request / accept / revoke ─────────────────────────────
create or replace function public.request_network_link(p_target_store_id uuid)
returns public.store_network_links as $$
declare
  v_store_id uuid;
  v_row public.store_network_links;
begin
  select store_id into v_store_id from public.profiles
    where user_id = auth.uid() and role = 'owner' limit 1;
  if v_store_id is null then raise exception 'only store owners can manage network links'; end if;
  if p_target_store_id = v_store_id then raise exception 'cannot link a store to itself'; end if;
  if not exists (select 1 from public.stores where id = p_target_store_id) then
    raise exception 'target store not found';
  end if;

  insert into public.store_network_links (requesting_store_id, target_store_id, status)
  values (v_store_id, p_target_store_id, 'pending')
  on conflict (requesting_store_id, target_store_id)
    do update set status = 'pending', updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.accept_network_link(p_link_id uuid)
returns public.store_network_links as $$
declare
  v_store_id uuid;
  v_row public.store_network_links;
begin
  select store_id into v_store_id from public.profiles
    where user_id = auth.uid() and role = 'owner' limit 1;
  if v_store_id is null then raise exception 'only store owners can manage network links'; end if;

  update public.store_network_links
    set status = 'accepted', updated_at = now()
    where id = p_link_id and target_store_id = v_store_id and status = 'pending'
  returning * into v_row;
  if v_row.id is null then raise exception 'link not found or not awaiting your approval'; end if;
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.revoke_network_link(p_link_id uuid)
returns public.store_network_links as $$
declare
  v_store_id uuid;
  v_row public.store_network_links;
begin
  select store_id into v_store_id from public.profiles
    where user_id = auth.uid() and role = 'owner' limit 1;
  if v_store_id is null then raise exception 'only store owners can manage network links'; end if;

  update public.store_network_links
    set status = 'revoked', updated_at = now()
    where id = p_link_id
      and (requesting_store_id = v_store_id or target_store_id = v_store_id)
  returning * into v_row;
  if v_row.id is null then raise exception 'link not found'; end if;
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.request_network_link(uuid) from public, anon;
revoke all on function public.accept_network_link(uuid)  from public, anon;
revoke all on function public.revoke_network_link(uuid)  from public, anon;
grant execute on function public.request_network_link(uuid) to authenticated;
grant execute on function public.accept_network_link(uuid)  to authenticated;
grant execute on function public.revoke_network_link(uuid)  to authenticated;

-- ── Rewrite the interbranch view: accepted-linked stores only ───────────────
-- Definer view (no security_invoker) so it can read across stores, but now
-- scoped by linked_store_ids(). Availability only — no sell_price, no cost —
-- so linked competitors never see each other's pricing.
drop view if exists public.tires_interbranch_view cascade;
drop view if exists public.tires_interbranch_view cascade;
create view public.tires_interbranch_view as
  select t.store_id,
         s.name as store_name,
         t.brand,
         t.model,
         t.size,
         t.quantity
  from public.tires t
  join public.stores s on s.id = t.store_id
  where t.is_active = true
    and t.quantity > 0
    and t.store_id in (select public.linked_store_ids());

grant select on public.tires_interbranch_view to authenticated;

-- ── Store directory (name only) so owners can find partners to link with ─────
-- The per-store RLS on `stores` restricts owners to their own row, so they can't
-- discover other stores or resolve a partner's name. This definer view exposes
-- id + name of active stores ONLY (no addresses, phones, or business data) — the
-- minimum needed for a B2B link directory.
drop view if exists public.store_directory cascade;
create or replace view public.store_directory as
  select id, name, is_active
  from public.stores
  where is_active = true;

grant select on public.store_directory to authenticated;

-- ===== 20260621000002_store_subscriptions.sql =====

-- ============================================================================
-- Store subscriptions (lightweight SaaS billing state — NO payment provider yet).
--
-- Each store is now a paying tenant. This table records subscription state so the
-- app can gate access; wiring a real payment provider is a later step. The gate
-- in ProtectedRoute is product/paywall UX — the actual per-store data isolation
-- is still enforced by the existing RLS on tires/sales_log/financials/etc.
--
-- platform_admin (the platform_admins table + is_platform_admin() from migration
-- 028) can read/write subscriptions; store owners can read only their own.
-- Safe to run multiple times.
-- ============================================================================

create table if not exists public.store_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null unique references public.stores(id) on delete cascade,
  plan          text not null default 'trial'  check (plan in ('trial','standard','suspended')),
  status        text not null default 'active' check (status in ('active','past_due','canceled')),
  trial_ends_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.store_subscriptions enable row level security;
create index if not exists idx_store_subscriptions_store on public.store_subscriptions(store_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Owners can READ their own subscription (to render plan/trial state); they
-- cannot change it (no self-serve billing yet). Platform admin manages all.
drop policy if exists "owners_view_own_subscription" on public.store_subscriptions;
create policy "owners_view_own_subscription"
  on public.store_subscriptions for select to authenticated
  using (public.auth_owns_store(store_id));

drop policy if exists "admin_all_subscriptions" on public.store_subscriptions;
create policy "admin_all_subscriptions"
  on public.store_subscriptions for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "service_all_subscriptions" on public.store_subscriptions;
create policy "service_all_subscriptions"
  on public.store_subscriptions for all to service_role using (true) with check (true);

-- ── Auto-create a 14-day trial when a store is created ──────────────────────
-- Trigger on stores so it works no matter which path creates the store
-- (register-store edge function, admin tooling, etc.).
create or replace function public.create_trial_subscription()
returns trigger as $$
begin
  insert into public.store_subscriptions (store_id, plan, status, trial_ends_at)
  values (new.id, 'trial', 'active', now() + interval '14 days')
  on conflict (store_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_store_trial_subscription on public.stores;
create trigger trg_store_trial_subscription
  after insert on public.stores
  for each row execute function public.create_trial_subscription();

-- Backfill existing stores that predate this table.
insert into public.store_subscriptions (store_id, plan, status, trial_ends_at)
select id, 'trial', 'active', now() + interval '14 days'
from public.stores
on conflict (store_id) do nothing;

-- ── Gate helper: is the store's subscription currently usable? ───────────────
-- active + (standard, or trial that hasn't expired). suspended/past_due/canceled
-- and expired trials are blocked.
create or replace function public.store_subscription_active(p_store_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.store_subscriptions sub
    where sub.store_id = p_store_id
      and sub.status = 'active'
      and sub.plan in ('trial','standard')
      and (sub.plan <> 'trial' or sub.trial_ends_at is null or sub.trial_ends_at > now())
  );
$$ language sql stable security definer set search_path = public;

grant execute on function public.store_subscription_active(uuid) to authenticated;

-- ===== 20260623000001_drop_agent_tables.sql =====

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

-- ===== 20260623000002_dot_stock_system.sql =====

-- Per-DOT stock system
-- Re-activate DOT-batch tracking (tire_dots) as the source of truth for stock,
-- while keeping tires.quantity in sync (= sum of its DOT batches) so the POS,
-- record-sale flow and the existing Stock pages keep working unchanged.

-- 1. Load index lives on the tyre line (matches the shop's stock sheet).
alter table public.tires add column if not exists load_index text;

-- 2. Keep tires.quantity = sum(tire_dots.quantity) whenever DOT batches change.
create or replace function public.sync_tire_quantity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  tid := coalesce(new.tire_id, old.tire_id);
  update public.tires
     set quantity = coalesce((select sum(quantity) from public.tire_dots where tire_id = tid), 0),
         updated_at = now()
   where id = tid;
  return null;
end;
$$;

drop trigger if exists trg_sync_tire_quantity on public.tire_dots;
create trigger trg_sync_tire_quantity
  after insert or update or delete on public.tire_dots
  for each row execute function public.sync_tire_quantity();

-- 3. Preserve existing aggregate stock: any tyre that has quantity but no DOT
--    batches gets a single "N/A" batch so nothing is lost when the trigger
--    starts recomputing from tire_dots. Owners can rename/split it later.
insert into public.tire_dots (tire_id, dot_code, quantity, position)
select t.id, 'N/A', t.quantity, 1
  from public.tires t
 where coalesce(t.quantity, 0) > 0
   and not exists (select 1 from public.tire_dots d where d.tire_id = t.id);

-- ===== FIX_VIEWS_HOTFIX.sql =====

-- ============================================================================
-- HOTFIX: Replace broken security_invoker views with definer + scoped views.
--
-- The original views were created `with (security_invoker = true)` while
-- `select on tires/sales_log` is revoked from the authenticated role. Those two
-- are mutually exclusive: a security_invoker view checks base-table access as the
-- calling user, who no longer has the privilege -> "permission denied for table
-- tires" for every logged-in user.
--
-- Fix: definer views (security_invoker NOT set) that bypass the revoke and the
-- base RLS, with an explicit per-store scope keyed off the caller's profile.
--
-- Safe to run multiple times.
-- ============================================================================

drop view if exists public.tires_staff_view       cascade;
drop view if exists public.tires_interbranch_view cascade;
drop view if exists public.tires_owner_view       cascade;
drop view if exists public.sales_log_staff_view   cascade;

-- Staff view: sell_price visible, avg_cost/supplier absent. Scoped to caller's store.
drop view if exists public.tires_staff_view cascade;
create view public.tires_staff_view as
  select id, store_id, brand, model, size, quantity, sell_price, is_active, min_threshold
  from public.tires
  where is_active = true
    and store_id = (select store_id from public.profiles where user_id = auth.uid());

-- Interbranch view: network-wide stock availability only — no prices, no cost.
drop view if exists public.tires_interbranch_view cascade;
create view public.tires_interbranch_view as
  select store_id, brand, model, size, quantity
  from public.tires
  where is_active = true and quantity > 0;

-- Owner view: all columns, scoped to caller's store.
drop view if exists public.tires_owner_view cascade;
create view public.tires_owner_view as
  select t.* from public.tires t
  where t.store_id = (select store_id from public.profiles where user_id = auth.uid());

-- Staff sales view: no cost_at_sale or gross_profit. Scoped to caller's store.
drop view if exists public.sales_log_staff_view cascade;
create view public.sales_log_staff_view as
  select id, store_id, staff_id, tire_name, car_model, plate_number,
         quantity_sold, services, sell_price, total_revenue, created_at
  from public.sales_log
  where store_id = (select store_id from public.profiles where user_id = auth.uid());

-- Column isolation: ensure direct base-table access stays revoked.
revoke select on public.tires     from authenticated;
revoke select on public.sales_log from authenticated;

-- Reads must go through the scoped views.
grant select on public.tires_staff_view       to authenticated;
grant select on public.tires_interbranch_view to authenticated;
grant select on public.tires_owner_view       to authenticated;
grant select on public.sales_log_staff_view   to authenticated;

-- ===== seed_master_tires.sql =====

-- Seed data for master_tires
-- Run this in the Supabase SQL Editor to populate the catalog

INSERT INTO public.master_tires (brand, model, size, load_index, speed_rating)
VALUES
  -- Michelin Pilot Sport 5
  ('Michelin', 'Pilot Sport 5', '205/55R16', '91', 'V'),
  ('Michelin', 'Pilot Sport 5', '215/55R17', '94', 'V'),
  ('Michelin', 'Pilot Sport 5', '225/45R17', '91', 'Y'),
  ('Michelin', 'Pilot Sport 5', '235/40R18', '95', 'Y'),
  ('Michelin', 'Pilot Sport 5', '245/40R18', '97', 'Y'),
  ('Michelin', 'Pilot Sport 5', '225/40R18', '92', 'Y'),

  -- Bridgestone Potenza Adrenalin RE004
  ('Bridgestone', 'Potenza Adrenalin RE004', '195/50R15', '82', 'V'),
  ('Bridgestone', 'Potenza Adrenalin RE004', '195/55R15', '85', 'W'),
  ('Bridgestone', 'Potenza Adrenalin RE004', '205/45R17', '88', 'W'),
  ('Bridgestone', 'Potenza Adrenalin RE004', '215/45R17', '91', 'W'),
  ('Bridgestone', 'Potenza Adrenalin RE004', '225/45R18', '95', 'W'),

  -- Yokohama Advan dB V552
  ('Yokohama', 'Advan dB V552', '215/60R16', '95', 'V'),
  ('Yokohama', 'Advan dB V552', '215/55R17', '94', 'V'),
  ('Yokohama', 'Advan dB V552', '225/55R17', '97', 'W'),
  ('Yokohama', 'Advan dB V552', '235/50R18', '97', 'W'),

  -- Maxxis I-PRO
  ('Maxxis', 'I-PRO', '195/50R15', '82', 'V'),
  ('Maxxis', 'I-PRO', '205/45R17', '88', 'V'),

  -- Otani KC2000
  ('Otani', 'KC2000', '195/55R15', '85', 'V'),
  ('Otani', 'KC2000', '215/45R17', '91', 'Y'),
  ('Otani', 'KC2000', '225/40R18', '92', 'Y'),

  -- Toyo Proxes TR1
  ('Toyo', 'Proxes TR1', '195/50R15', '82', 'V'),
  ('Toyo', 'Proxes TR1', '205/45R17', '88', 'W'),

  -- Kumho Ecsta PS31
  ('Kumho', 'Ecsta PS31', '195/55R15', '85', 'V'),
  ('Kumho', 'Ecsta PS31', '205/55R16', '91', 'V')

ON CONFLICT (brand, model, size) DO NOTHING;

-- ---------- 3. unschedule removed agents (no-op if absent) ----------
do $$ begin
  perform cron.unschedule(jobname) from cron.job
   where jobname in ('scout-daily','hawk-reorder','atlas-weekly','lens-deadstock');
exception when others then null;
end $$;
