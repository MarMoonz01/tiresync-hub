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