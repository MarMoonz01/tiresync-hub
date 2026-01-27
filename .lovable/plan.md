

# Comprehensive TireSync Hub with LINE Chatbot & Advanced Permissions

This plan implements a complete multi-tier authorization system with granular permissions and deep LINE Chatbot integration for the BAANAKE tire inventory platform.

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BAANAKE Permission Architecture                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   Moderator   │    │ Store Owner  │    │    Staff     │                   │
│  │   (System)    │    │   (Store)    │    │   (Store)    │                   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                   │
│         │                   │                   │                            │
│   Approve Owners       Approve Staff       Limited Access                    │
│   Manage System        Set Permissions     Per Permission                    │
│                        LINE Integration    Matrix                            │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                         LINE Integration Layer                               │
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │ line_user_id    │───▶│  Verify Access  │───▶│ Execute Action   │          │
│  │ in profiles     │    │  Check Perms    │    │ Log to stock_logs│          │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema Updates

### 1.1 Add LINE Integration Fields to Profiles

Add `line_user_id` column to track linked LINE accounts:

```sql
ALTER TABLE public.profiles 
ADD COLUMN line_user_id TEXT UNIQUE;
```

### 1.2 Add LINE Settings to Stores

Track LINE OA credentials and settings per store:

```sql
ALTER TABLE public.stores 
ADD COLUMN line_enabled BOOLEAN DEFAULT false,
ADD COLUMN line_channel_id TEXT,
ADD COLUMN line_channel_secret TEXT;
```

### 1.3 Enhance Store Members with Permissions

Add granular permission controls using JSONB:

```sql
ALTER TABLE public.store_members 
ADD COLUMN permissions JSONB DEFAULT '{
  "web": {"view": true, "add": false, "edit": false, "delete": false},
  "line": {"view": true, "adjust": false}
}'::jsonb,
ADD COLUMN is_approved BOOLEAN DEFAULT false;
```

### 1.4 Create Security Definer Functions

Functions to check permissions without RLS recursion:

```sql
-- Check if user has specific web permission for a store
CREATE OR REPLACE FUNCTION public.has_store_permission(
  _user_id uuid, 
  _store_id uuid, 
  _permission_type text, 
  _permission text
) RETURNS boolean...

-- Check if a LINE user can perform an action
CREATE OR REPLACE FUNCTION public.get_line_user_permissions(
  _line_user_id text
) RETURNS TABLE(...)...
```

---

## Phase 2: Enhanced Sign-Up Flow

### 2.1 Update Auth Page

Add role selection during registration:

| Selection | Flow |
|-----------|------|
| **Owner** | Sign up → Status: `pending` → Wait for Moderator approval → Create store |
| **Staff** | Sign up → Select/enter store code → Status: `pending` → Wait for Store Owner approval |

**New UI Elements:**
- Radio buttons: "I'm a Store Owner" / "I'm joining a Store"
- Store code input field (for staff)
- Store search/select dropdown (for staff)

### 2.2 Create Staff Join Request Table

Track pending staff join requests:

```sql
CREATE TABLE public.staff_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  store_id UUID NOT NULL REFERENCES stores(id),
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  requested_at TIMESTAMP DEFAULT now(),
  responded_at TIMESTAMP,
  responded_by UUID
);
```

---

## Phase 3: Store Owner Dashboard Enhancements

### 3.1 Update Store Setup Page

Add LINE Chatbot configuration:

- "Enable LINE Chatbot" toggle switch
- LINE Channel ID input (shown when enabled)
- "Connect My LINE" button that generates a link code
- QR code or deep link to initiate LINE account linking

### 3.2 Create Pending Staff Requests View

New section in Staff page showing:

- List of pending join requests
- Staff name, email, requested date
- Approve / Reject buttons
- When approved → trigger LINE push notification to owner

### 3.3 Permission Matrix UI

For each staff member, show checkboxes:

| Permission | Description |
|------------|-------------|
| **Web: View** | Can view inventory (always on) |
| **Web: Add** | Can add new tires |
| **Web: Edit** | Can edit existing tires |
| **Web: Delete** | Can delete tires |
| **LINE: View** | Can search stock via LINE |
| **LINE: Adjust** | Can use +/- buttons in Flex Messages |

---

## Phase 4: LINE Integration Enhancements

### 4.1 Update line-webhook Edge Function

Add authorization layer:

```typescript
// 1. Extract LINE user ID from event
const lineUserId = event.source.userId;

// 2. Check if linked to a profile
const { data: profile } = await supabase
  .from("profiles")
  .select("user_id, store_members(store_id, permissions, is_approved)")
  .eq("line_user_id", lineUserId)
  .single();

// 3. If not linked → send registration message
// 4. If linked but not approved → send "pending approval" message
// 5. If linked and approved → check permission for action
```

### 4.2 Interactive Stock Adjustment Buttons

Update Flex Message generator to conditionally show +/- buttons:

```typescript
// Only show if user has LINE adjust permission
if (userPermissions.line.adjust) {
  buttons.push({
    type: "button",
    action: { type: "postback", label: "+1", data: `action=add_stock&dot_id=${dot.id}` }
  });
  buttons.push({
    type: "button",  
    action: { type: "postback", label: "-1", data: `action=remove_stock&dot_id=${dot.id}` }
  });
}
```

### 4.3 Stock Adjustment via Postback

Handle postback actions for stock changes:

```typescript
if (action === "add_stock" || action === "remove_stock") {
  // Verify permission
  // Update tire_dots quantity
  // Log to stock_logs with LINE context
  // Send confirmation message
}
```

### 4.4 Push Notifications for Staff Requests

Update line-push-notification to support:

- New staff request alerts to store owner
- Staff approval confirmations
- Low stock alerts (existing)

---

## Phase 5: Profile Page LINE Integration

### 5.1 Add LINE Integration Section

New card in Profile page:

- Current status: "Linked" with LINE display name, or "Not Linked"
- "Link LINE Account" button → generates unique link code
- "Unlink" button → removes `line_user_id`

### 5.2 LINE Account Linking Flow

```text
1. User clicks "Link LINE Account" in web app
2. System generates temporary link code (expires in 10 min)
3. User sends code to LINE chatbot
4. Chatbot verifies code and links accounts
5. Web app updates to show "Linked" status
```

**Database for link codes:**

```sql
CREATE TABLE public.line_link_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/pages/StaffRequests.tsx` | View for owners to manage pending staff requests |
| `src/components/profile/LineIntegrationCard.tsx` | LINE linking UI component |
| `src/components/store/LineSettingsCard.tsx` | Store LINE configuration component |
| `src/hooks/useStaffRequests.tsx` | Hook for staff request management |
| `src/hooks/useLineLink.tsx` | Hook for LINE account linking |

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Add Owner/Staff role selection, store code input |
| `src/pages/StoreSetup.tsx` | Add LINE enable toggle, channel inputs |
| `src/pages/Profile.tsx` | Add LINE Integration section |
| `src/pages/Staff.tsx` | Add permission matrix, pending requests tab |
| `src/components/staff/StoreStaffCard.tsx` | Show permission badges, edit button |
| `supabase/functions/line-webhook/index.ts` | Authorization checks, stock adjustment handling |
| `supabase/functions/line-push-notification/index.ts` | Staff request notifications |
| `src/lib/translations.ts` | Add Thai/English translations for new UI |

### Database Migrations

| Migration | Purpose |
|-----------|---------|
| `add_line_user_id_to_profiles.sql` | Add LINE integration to profiles |
| `add_line_settings_to_stores.sql` | Add LINE config to stores |
| `add_permissions_to_store_members.sql` | Add JSONB permissions column |
| `create_staff_join_requests.sql` | Table for pending staff requests |
| `create_line_link_codes.sql` | Table for LINE linking codes |
| `create_permission_helper_functions.sql` | Security definer functions |

---

## Implementation Order

### Step 1: Database Schema (30%)
1. Create all migrations for new columns and tables
2. Add security definer functions for permission checks
3. Update RLS policies

### Step 2: Auth Flow Enhancement (20%)
1. Update Auth.tsx with role selection
2. Create staff join request flow
3. Add store code generation to Store setup

### Step 3: Permission Management UI (20%)
1. Create permission matrix component
2. Update Staff page with requests tab
3. Add permission editing dialog

### Step 4: LINE Webhook Enhancements (20%)
1. Add authorization layer to webhook
2. Implement stock adjustment via postback
3. Add conditional +/- buttons to Flex Messages

### Step 5: Profile LINE Integration (10%)
1. Create LINE linking UI
2. Implement link code generation
3. Add webhook handler for link verification

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Unauthorized LINE access | Verify `line_user_id` against database before any action |
| Permission escalation | Use security definer functions, store permissions in JSONB |
| Link code hijacking | Codes expire in 10 minutes, single-use, user-specific |
| Stock manipulation | Log all changes with LINE user context to `stock_logs` |

---

## Summary

This implementation transforms BAANAKE into a comprehensive multi-tier platform:

1. **Dual Sign-Up Paths**: Owners vs Staff with appropriate approval workflows
2. **Granular Permissions**: 6-point permission matrix (4 web + 2 LINE)
3. **LINE Authorization Bridge**: Every LINE action verified against database permissions
4. **Interactive Stock Control**: +/- buttons in Flex Messages for authorized users
5. **Complete Audit Trail**: All actions logged with user context

The system maintains the existing BAANAKE Minimal Design (#2563EB) throughout all new UI components.

