

# Fix Store Search During Signup

## Problem Statement

When staff members try to sign up and search for a store to join, **they cannot see any stores** because:

1. The signup page queries the `stores` table directly
2. The RLS policy on `stores` requires users to be authenticated AND approved
3. Users signing up are not authenticated yet, so the search returns empty results

This breaks the staff onboarding flow completely.

---

## Solution Overview

Create a dedicated public endpoint that allows unauthenticated users to search for active stores during signup, while still protecting sensitive store information.

---

## Implementation Plan

### Phase 1: Create Public Store Search View

**Database Migration Required**

Create a new view `stores_signup_search` specifically for the signup flow that:
- Only exposes minimal store information (id, name)
- No sensitive fields (phone, email, address, owner_id)
- Only shows active stores
- Grants access to the `anon` role (unauthenticated users)

```sql
CREATE VIEW public.stores_signup_search AS
SELECT 
    id,
    name
FROM public.stores
WHERE is_active = true;

GRANT SELECT ON public.stores_signup_search TO anon;
GRANT SELECT ON public.stores_signup_search TO authenticated;
```

### Phase 2: Update Auth.tsx Store Search

**File:** `src/pages/Auth.tsx`

Modify the store search query to use the new public view:

```typescript
// Before (broken)
const { data, error } = await supabase
  .from("stores")
  .select("id, name, address")
  .ilike("name", `%${storeSearch}%`)
  .limit(5);

// After (fixed)
const { data, error } = await supabase
  .from("stores_signup_search")
  .select("id, name")
  .ilike("name", `%${storeSearch}%`)
  .limit(5);
```

### Phase 3: Update UI to Remove Address Display

Since the public view intentionally excludes the address for privacy, update the store search results UI:
- Remove the address display line from the store cards
- Show only the store name
- Optionally add a description field if needed in the future

---

## Security Considerations

| Concern | Resolution |
|---------|------------|
| Exposing store data to public | Only expose `id` and `name` - no sensitive fields |
| Store enumeration | Limited to active stores only, search requires minimum 2 characters |
| Privacy | Address, phone, email, owner_id all excluded from public view |

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/[new].sql` | Create `stores_signup_search` view with anon access |
| `src/pages/Auth.tsx` | Update query to use new view, remove address display |
| `src/integrations/supabase/types.ts` | Will auto-update after migration |

---

## Testing Checklist

After implementation:
- [ ] Open signup page in incognito/private browser (unauthenticated)
- [ ] Select "Staff" user type
- [ ] Type a store name and verify stores appear in search results
- [ ] Select a store and complete signup
- [ ] Verify the join request is created successfully

