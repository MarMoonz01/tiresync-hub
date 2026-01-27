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