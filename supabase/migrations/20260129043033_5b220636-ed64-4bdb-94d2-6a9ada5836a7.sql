-- Create a public view for store search during signup
-- Only exposes minimal info (id, name) for active stores
-- Accessible to unauthenticated users (anon role)

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