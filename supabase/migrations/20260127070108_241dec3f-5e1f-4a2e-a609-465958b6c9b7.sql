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