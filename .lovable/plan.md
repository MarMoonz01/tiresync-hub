
# Profile Page and Staff Management Implementation Plan

## Overview
This plan covers building two main features:
1. **Profile Page** - A dedicated page where users can view and edit their personal information
2. **Staff Management Pages** - Admin-only pages for managing all users/staff in the system

---

## Feature 1: Profile Page

### What It Does
- Allows users to view their complete profile information
- Provides a form to update personal details (full name, phone, avatar)
- Shows current role and account status
- Links from the Settings page "Edit Profile" card

### Files to Create/Modify

**New Files:**
- `src/pages/Profile.tsx` - The profile editing page with a form

**Modified Files:**
- `src/App.tsx` - Add route for `/profile`
- `src/pages/Settings.tsx` - Make "Edit Profile" card clickable and navigate to `/profile`

### Profile Page Design
- Header with avatar (large, centered)
- Form fields: Full Name, Phone, Email (read-only)
- Save button with loading state
- Uses existing `useAuth` hook and `refetchProfile` after updates

---

## Feature 2: Staff Management Pages (Admin Only)

### What It Does
- Lists all users in the system with their profiles and roles
- Allows admins to:
  - View all staff members
  - Change user status (pending, approved, rejected, suspended)
  - Assign/remove roles (admin, moderator, store_member, pending)
  - Search and filter users
- Protected by `requireAdmin` flag in `ProtectedRoute`

### Database Changes Required
Currently, the `profiles` table RLS only allows users to view their own profile. We need to add a policy that allows admins to view all profiles.

**RLS Policy to Add:**
```sql
-- Admins can view all profiles (already exists for ALL command)
-- But we need to ensure admins can read profiles they don't own
```

Looking at the existing policies, there's already an "Admins can manage all profiles" policy with the ALL command. This should cover admin access.

### Files to Create

**New Files:**
1. `src/pages/Staff.tsx` - Main staff listing page
2. `src/components/staff/StaffCard.tsx` - Card component for each staff member
3. `src/components/staff/StaffStatusDialog.tsx` - Dialog to change user status
4. `src/components/staff/StaffRoleDialog.tsx` - Dialog to manage user roles
5. `src/hooks/useStaff.tsx` - Hook to fetch all profiles and roles (admin only)

**Modified Files:**
- `src/App.tsx` - Add route for `/staff` with `requireAdmin`
- `src/components/layout/DesktopSidebar.tsx` - Add Staff link (shown only to admins)

### Staff Page Design

```text
+------------------------------------------+
|  Staff Management                        |
|  Manage all users and their permissions  |
+------------------------------------------+
|  [Search users...]           [Filters v] |
+------------------------------------------+
|  +-------------+  +-------------+        |
|  | User Card   |  | User Card   |  ...   |
|  | - Avatar    |  | - Avatar    |        |
|  | - Name      |  | - Name      |        |
|  | - Email     |  | - Email     |        |
|  | - Role Badge|  | - Role Badge|        |
|  | - Status    |  | - Status    |        |
|  | [Actions v] |  | [Actions v] |        |
|  +-------------+  +-------------+        |
+------------------------------------------+
```

### Staff Card Actions
- **Change Status**: Opens dialog to set pending/approved/rejected/suspended
- **Manage Roles**: Opens dialog to add/remove roles

---

## Implementation Details

### 1. useStaff Hook (`src/hooks/useStaff.tsx`)
```typescript
// Fetches all profiles with their roles
// Only works for admin users
// Includes search/filter functionality
// Provides mutation functions for status and role updates
```

### 2. Staff Page Flow
1. Check if user is admin (redirect if not)
2. Fetch all profiles from database
3. For each profile, fetch associated roles
4. Display in searchable, filterable grid
5. Each card has dropdown menu with actions

### 3. Status Change Flow
1. Admin clicks "Change Status" on a user
2. Dialog opens with status options
3. Admin selects new status and confirms
4. Updates `profiles` table `status` column
5. Refreshes the list

### 4. Role Management Flow
1. Admin clicks "Manage Roles" on a user
2. Dialog opens showing current roles
3. Admin can add or remove roles
4. Updates `user_roles` table
5. Refreshes the list

### 5. Navigation Integration
- Staff link appears in sidebar only for admins
- Uses `isAdmin` from `useAuth` hook
- Icon: `Users` or `UserCog` from lucide-react

---

## Route Structure

| Route | Page | Access |
|-------|------|--------|
| `/profile` | Profile | Authenticated users |
| `/staff` | Staff Management | Admin only |

---

## Technical Considerations

### Security
- Staff management routes protected by `requireAdmin={true}`
- All database mutations use existing RLS policies that require admin role
- Role changes validated server-side through RLS

### Existing Patterns Followed
- Uses `AppLayout` for consistent navigation
- Framer Motion animations matching other pages
- Glass-card styling for cards
- Toast notifications for success/error feedback
- Debounced search like Network page

### Dependencies
No new dependencies required. Uses existing:
- `@radix-ui/react-dropdown-menu` for action menus
- `@radix-ui/react-dialog` for dialogs
- `framer-motion` for animations
- `lucide-react` for icons

---

## File Creation Order

1. `src/hooks/useStaff.tsx` - Staff data hook
2. `src/components/staff/StaffCard.tsx` - User card component
3. `src/components/staff/StaffStatusDialog.tsx` - Status change dialog
4. `src/components/staff/StaffRoleDialog.tsx` - Role management dialog
5. `src/pages/Staff.tsx` - Staff listing page
6. `src/pages/Profile.tsx` - Profile editing page
7. Update `src/App.tsx` - Add routes
8. Update `src/components/layout/DesktopSidebar.tsx` - Add staff navigation
9. Update `src/pages/Settings.tsx` - Make profile card clickable
