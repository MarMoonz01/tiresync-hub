
# Staff Onboarding & RBAC System Implementation Plan

## Overview
This plan implements a complete Role-Based Access Control system that allows staff members to seamlessly access their assigned store's inventory after approval, with appropriate permission restrictions.

---

## Phase 1: Fix Build Errors

### 1.1 Remove Invalid `role` Property Usage
**File:** `src/components/layout/AppLayout.tsx`

The component currently uses `role` from `useAuth` which doesn't exist. We'll remove the `userRole` prop being passed to `DesktopSidebar` since it already fetches `isAdmin` internally.

**Changes:**
- Remove `const { role } = useAuth();` 
- Remove `userRole` prop from `DesktopSidebar`
- `DesktopSidebar` already uses `isAdmin` and `hasStore` directly from `useAuth`

---

## Phase 2: Enhance Auth Context for Staff Support

### 2.1 Update `useAuth.tsx` to Support Multi-Role Users

**New Properties to Add:**
- `activeRole`: `'owner' | 'staff' | null` - Identifies the user's relationship to their store
- `permissions`: Permission object for the current store
- `storeMembership`: The `store_members` record if user is staff

**Updated `fetchStore` Logic:**
```text
1. Check if user is a store OWNER (stores.owner_id = user.id)
   - If found: set store, activeRole = 'owner', permissions = full access
   
2. If not owner, check store_members table:
   - Query where user_id = user.id AND is_approved = true
   - Join with stores to get store details
   - If found: set store from joined data, activeRole = 'staff', permissions from store_members record
   
3. If neither: store = null, activeRole = null
```

**New Interface:**
```typescript
interface AuthContextType {
  // ... existing properties
  activeRole: 'owner' | 'staff' | null;
  permissions: Permissions | null;
  storeMembership: StoreMembership | null;
  isOwner: boolean;  // Helper: activeRole === 'owner'
  isStaff: boolean;  // Helper: activeRole === 'staff'
}
```

---

## Phase 3: Update Staff Approval Logic

### 3.1 Enhance `useStaffRequests.tsx` 

**Approval Flow Updates:**
1. Update `staff_join_requests.status` to `'approved'`
2. Upsert into `store_members` with:
   - `store_id`, `user_id`, `role: 'staff'`
   - Default permissions JSONB:
     ```json
     {
       "web": { "view": true, "add": false, "edit": false, "delete": false },
       "line": { "view": true, "adjust": false }
     }
     ```
   - `is_approved: true`
3. Update `profiles.status` to `'approved'`
4. Invalidate queries to trigger immediate UI update

---

## Phase 4: Protected Route Updates

### 4.1 Update `ProtectedRoute.tsx`

**New Logic for `requireStore`:**
```text
Current: Redirects to /store/setup if !hasStore
New Logic:
- If user is OWNER without store → redirect to /store/setup
- If user is STAFF without approved membership → redirect to /pending
- Staff should NEVER access /store/setup (only owners can create stores)
```

**Add New Prop:**
- `ownerOnly?: boolean` - For routes like `/store/setup` that only owners can access

---

## Phase 5: Permission-Based UI Controls

### 5.1 Create Permission Check Utility
**New File:** `src/hooks/usePermissions.tsx`

```typescript
function usePermissions() {
  const { permissions, isOwner } = useAuth();
  
  return {
    canView: isOwner || permissions?.web?.view,
    canAdd: isOwner || permissions?.web?.add,
    canEdit: isOwner || permissions?.web?.edit,
    canDelete: isOwner || permissions?.web?.delete,
    canAdjustLine: isOwner || permissions?.line?.adjust,
    canViewLine: isOwner || permissions?.line?.view,
  };
}
```

### 5.2 Update Inventory Page
**File:** `src/pages/Inventory.tsx`

- Wrap "Add Tire" button with `canAdd` check
- Wrap "Import" button with `canAdd` check  
- Show store name in welcome message

### 5.3 Update TireCard Component
**File:** `src/components/inventory/TireCard.tsx`

- Add `permissions` prop or use `usePermissions` hook
- Conditionally render Edit button based on `canEdit`
- Conditionally render Delete button based on `canDelete`
- Conditionally render +/- quantity buttons based on `canEdit`
- Conditionally render Share toggle based on `canEdit`

---

## Phase 6: Staff Dashboard Experience

### 6.1 Update Dashboard Page
**File:** `src/pages/Dashboard.tsx`

**Changes:**
- Show different welcome message for staff: "Welcome to {store.name}"
- Hide "Set Up Store" CTA for staff members
- Conditionally show Quick Actions based on permissions:
  - "Add Tire" → only if `canAdd`
  - "Import" → only if `canAdd`

### 6.2 Update Desktop Sidebar
**File:** `src/components/layout/DesktopSidebar.tsx`

**Current Logic:** Shows admin items if `isAdmin && hasStore`
**New Logic:** 
- Use `isOwner` from auth context instead of just `isAdmin`
- Staff should NOT see: Sales Report, Audit Log, Staff Management

### 6.3 Update Mobile Bottom Nav
**File:** `src/components/layout/MobileBottomNav.tsx`

- Admin menu item should only show for store owners, not staff

---

## Phase 7: Empty State Improvements

### 7.1 Staff-Specific Empty State
When inventory is empty for a staff member, show:
```
"Welcome to {store.name}!"
"Your store's inventory is empty. Contact your store owner to add products."
```

Instead of showing "Set Up Store" button.

---

## Implementation Order

1. **Fix Build Errors** (Phase 1) - Critical, unblocks the app
2. **Update Auth Context** (Phase 2) - Foundation for all RBAC
3. **Update Staff Approval** (Phase 3) - Enables staff onboarding
4. **Protected Routes** (Phase 4) - Security layer
5. **Permission Hooks** (Phase 5.1) - Reusable permission checking
6. **UI Permission Checks** (Phase 5.2, 5.3, Phase 6) - User-facing restrictions

---

## Technical Details

### Database Queries for Staff Store Resolution

```sql
-- Query to get staff's store membership
SELECT 
  sm.*, 
  s.id as store_id,
  s.name as store_name,
  s.* 
FROM store_members sm
JOIN stores s ON sm.store_id = s.id
WHERE sm.user_id = $user_id 
  AND sm.is_approved = true
LIMIT 1;
```

### Permission Object Structure
```typescript
interface Permissions {
  web: {
    view: boolean;
    add: boolean;
    edit: boolean;
    delete: boolean;
  };
  line: {
    view: boolean;
    adjust: boolean;
  };
}
```

### Files to Modify
1. `src/components/layout/AppLayout.tsx` - Remove invalid props
2. `src/hooks/useAuth.tsx` - Add staff store resolution
3. `src/hooks/useStaffRequests.tsx` - Enhance approval flow
4. `src/components/auth/ProtectedRoute.tsx` - Staff-aware routing
5. `src/pages/Inventory.tsx` - Permission-based UI
6. `src/components/inventory/TireCard.tsx` - Action restrictions
7. `src/pages/Dashboard.tsx` - Staff experience
8. `src/components/layout/DesktopSidebar.tsx` - Menu visibility
9. `src/components/layout/MobileBottomNav.tsx` - Menu visibility

### New Files to Create
1. `src/hooks/usePermissions.tsx` - Permission utility hook

---

## Testing Checklist

After implementation, verify:
- [ ] Build compiles without errors
- [ ] Owner can create store and see all menu items
- [ ] Staff approval updates store_members correctly
- [ ] Staff sees their assigned store's inventory immediately after approval
- [ ] Staff cannot access /store/setup route
- [ ] Staff without approved membership redirects to /pending
- [ ] Add/Edit/Delete buttons hidden for staff without permissions
- [ ] Staff sees appropriate dashboard message
- [ ] Mobile nav hides admin items for staff
