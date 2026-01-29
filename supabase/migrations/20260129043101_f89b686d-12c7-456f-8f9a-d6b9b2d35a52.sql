-- The stores_signup_search view intentionally uses security_invoker=false
-- This is by design because:
-- 1. We need anon users to search stores during signup
-- 2. The view only exposes id and name - no sensitive data
-- 3. It's filtered to active stores only
-- Adding a comment to document this intentional design decision

COMMENT ON VIEW public.stores_signup_search IS 'Public view for store search during signup. Intentionally accessible to anon users. Only exposes store id and name for active stores - no sensitive fields.';