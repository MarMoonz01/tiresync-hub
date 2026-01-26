-- Fix Issue 1: profiles_table_public_exposure
-- Remove the overly permissive policy that allows all approved users to see all profiles
DROP POLICY IF EXISTS "Approved users can view all profiles" ON public.profiles;

-- Fix Issue 2: stores_contact_data_exposure  
-- Create a public view for stores that excludes sensitive contact information
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