

# Finalizing LINE Integration: Webhook UI, Owner Verification & Staff Link-Code System

This plan implements the final stage of LINE Chatbot integration with automated webhook display, owner identity verification, and enhanced staff account linking.

---

## Overview

The implementation adds three key capabilities:

1. **Webhook URL Display** in Store Setup with copy functionality and setup instructions
2. **Owner Identity Verification** using the same link-code flow as staff
3. **Enhanced LINE webhook** with successful account linking confirmation and multi-store awareness

---

## Current State Analysis

**Already implemented:**
- `line_link_codes` table exists with `user_id`, `code`, `expires_at`
- `profiles.line_user_id` column exists
- `useLineLink` hook generates 6-character codes with 10-minute expiry
- `LineIntegrationCard` displays link status and code generation UI
- `line-webhook` already handles link code verification (lines 139-174)
- `get_line_user_permissions` function returns user permissions

**Needs enhancement:**
- StoreSetup.tsx lacks webhook URL display and owner verification
- line-webhook returns simple text on successful linking (should be Flex Message)
- No multi-store discrimination based on channel identification

---

## Implementation Details

### 1. Enhanced Store Setup Page

**File:** `src/pages/StoreSetup.tsx`

Add these new elements when LINE is enabled:

| Element | Description |
|---------|-------------|
| **Webhook URL Display** | Static URL: `https://wqqaqafhpxytwbwykqbg.supabase.co/functions/v1/line-webhook` |
| **Copy Button** | One-click copy with visual feedback |
| **Setup Instructions** | Step-by-step guide for LINE Developers Console |
| **Owner Verification Button** | "Verify My Owner Identity" triggers link code generation |
| **Verification Status** | Shows connected/not connected with owner's LINE ID |

**UI Layout:**
```text
┌─────────────────────────────────────────────────┐
│  🟢 Enable LINE Chatbot              [Toggle]   │
├─────────────────────────────────────────────────┤
│  Webhook URL                                     │
│  ┌─────────────────────────────────────────────┐│
│  │ https://...supabase.co/functions/v1/line... ││
│  └─────────────────────────────────────────────┘│
│                                         [Copy]   │
│                                                  │
│  📋 Setup Instructions                          │
│  1. Go to LINE Developers Console               │
│  2. Select your Messaging API channel           │
│  3. Paste the Webhook URL above                 │
│  4. Enable "Use webhook"                        │
│  5. Disable "Auto-reply messages"               │
│                                                  │
│  LINE Channel ID                                │
│  ┌─────────────────────────────────────────────┐│
│  │ [Input field]                               ││
│  └─────────────────────────────────────────────┘│
│                                                  │
│  LINE Channel Secret                            │
│  ┌─────────────────────────────────────────────┐│
│  │ [Password field]                            ││
│  └─────────────────────────────────────────────┘│
│                                                  │
├─────────────────────────────────────────────────┤
│  🔐 Owner Identity Verification                 │
│                                                  │
│  [Not Verified]                                 │
│  Link your personal LINE account to receive    │
│  staff approval alerts and admin access.       │
│                                                  │
│  [Verify My Owner Identity]                     │
│                                                  │
│  -- OR if code generated --                     │
│                                                  │
│  Send this code to the LINE chatbot:           │
│           AB12CD                                │
│  Code expires in 10 minutes                    │
└─────────────────────────────────────────────────┘
```

### 2. Enhanced LINE Integration Card

**File:** `src/components/profile/LineIntegrationCard.tsx`

Minor improvements to existing component:
- Add clearer instructions: "Send this code to our Shop's LINE Official Account"
- Show permission summary when linked (View/Adjust capabilities)

### 3. Enhanced Link Success Message in Webhook

**File:** `supabase/functions/line-webhook/index.ts`

Update the `handleLinkCode` function to return a rich Flex Message on success:

**Success Flex Message Design:**
```text
┌─────────────────────────────────────┐
│  ✅ Account Linked Successfully     │
│                                      │
│  Your web account is now connected  │
│  to LINE. You can now:              │
│                                      │
│  📦 Check Stock   📊 View Inventory │
│                                      │
│  [If has adjust permission:]        │
│  ➕ Adjust stock directly via chat  │
│                                      │
│  Try searching: "265/65R17"         │
└─────────────────────────────────────┘
```

**Update handleLinkCode function:**
```typescript
async function handleLinkCode(supabase, lineUserId, code): Promise<object | string> {
  // ... existing validation ...
  
  // On success, return Flex Message instead of plain text
  // Include user's permissions in the success message
  const userPerms = await getUserPermissions(supabase, lineUserId);
  return generateLinkSuccessMessage(userPerms);
}
```

### 4. Multi-Store Discrimination

**Current Architecture:**
The webhook currently uses a single global `LINE_CHANNEL_SECRET` from environment variables. For multi-store support where each store has its own LINE OA:

**Approach A (Current - Shared Channel):**
All stores share one LINE Official Account. The webhook identifies the user's store via `get_line_user_permissions` which returns `store_id`. This is already implemented.

**Approach B (Future - Per-Store Channels):**
Each store has its own LINE OA with unique credentials stored in `stores.line_channel_id` and `stores.line_channel_secret`. 

For this plan, we'll document the architecture but keep the current shared-channel approach since:
1. It's simpler for users (one LINE OA for the whole platform)
2. It's already working
3. Per-store channels require additional webhook routing logic

**Documentation note:** If per-store channels are needed later, the webhook would:
1. Extract channel ID from LINE webhook headers
2. Look up the store by `line_channel_id`
3. Use that store's `line_channel_secret` for signature verification

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/StoreSetup.tsx` | Add webhook URL display, copy button, setup instructions, owner verification section |
| `src/components/profile/LineIntegrationCard.tsx` | Improve instructions, add permission display |
| `supabase/functions/line-webhook/index.ts` | Return Flex Message on successful link, include permission summary |
| `src/lib/translations.ts` | Add new translation keys for webhook setup |

---

## New Translation Keys

```typescript
// English
webhookUrl: "Webhook URL",
copyUrl: "Copy URL",
urlCopied: "URL Copied!",
lineSetupInstructions: "Setup Instructions",
lineSetupStep1: "Go to LINE Developers Console",
lineSetupStep2: "Select your Messaging API channel",
lineSetupStep3: "Paste the Webhook URL in settings",
lineSetupStep4: "Enable 'Use webhook'",
lineSetupStep5: "Disable 'Auto-reply messages'",
ownerVerification: "Owner Identity Verification",
verifyOwnerIdentity: "Verify My Owner Identity",
ownerVerified: "Verified",
ownerNotVerified: "Not Verified",
ownerVerificationDesc: "Link your personal LINE account to receive staff approval alerts and admin access.",
sendCodeToShop: "Send this code to our Shop's LINE Official Account to link your account",

// Thai
webhookUrl: "Webhook URL",
copyUrl: "คัดลอก URL",
urlCopied: "คัดลอกแล้ว!",
lineSetupInstructions: "คู่มือการตั้งค่า",
lineSetupStep1: "ไปที่ LINE Developers Console",
lineSetupStep2: "เลือก Messaging API channel ของคุณ",
lineSetupStep3: "วาง Webhook URL ในการตั้งค่า",
lineSetupStep4: "เปิดใช้งาน 'Use webhook'",
lineSetupStep5: "ปิดใช้งาน 'Auto-reply messages'",
ownerVerification: "ยืนยันตัวตนเจ้าของร้าน",
verifyOwnerIdentity: "ยืนยันตัวตนเจ้าของร้าน",
ownerVerified: "ยืนยันแล้ว",
ownerNotVerified: "ยังไม่ยืนยัน",
ownerVerificationDesc: "เชื่อมต่อบัญชี LINE ส่วนตัวเพื่อรับการแจ้งเตือนคำขอพนักงานและการเข้าถึงแบบผู้ดูแล",
sendCodeToShop: "ส่งรหัสนี้ไปยัง LINE Official Account ของร้านเพื่อเชื่อมต่อบัญชี",
```

---

## Implementation Steps

### Step 1: Update Store Setup Page
1. Add webhook URL display with static URL
2. Add copy-to-clipboard functionality
3. Add collapsible setup instructions section
4. Add owner verification section using `useLineLink` hook
5. Show verification status based on `profile.line_user_id`

### Step 2: Enhance LINE Webhook
1. Create `generateLinkSuccessFlexMessage` function
2. Update `handleLinkCode` to return Flex Message
3. Include user's permissions in the success message
4. Show different capabilities based on owner vs staff role

### Step 3: Update Profile Card
1. Update instruction text to reference "Shop's LINE Official Account"
2. Add permission badges when linked (View Stock / Adjust Stock)

### Step 4: Add Translations
1. Add all new translation keys to both English and Thai

---

## Security Notes

| Aspect | Implementation |
|--------|----------------|
| Code Expiry | 10 minutes (already implemented) |
| Code Format | 6 alphanumeric characters, single-use |
| Owner Detection | Uses `get_line_user_permissions` which checks `stores.owner_id` |
| Permission Display | Only shows capabilities the user actually has |

---

## Summary

This implementation completes the LINE integration by:

1. **Making webhook setup self-service** - Owners see the URL and instructions right in the store setup form
2. **Unifying owner and staff linking** - Both use the same link-code mechanism, identified by their role in the database
3. **Improving user feedback** - Rich Flex Messages on successful linking with capability summary
4. **Supporting future multi-store** - Architecture documented for per-store LINE OA channels if needed

