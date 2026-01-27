
# Sequential LINE Integration Flow for Store Setup

This plan implements a three-phase LINE integration flow with strict sequential progression: Webhook Connectivity → Owner Identity Linking → Confirmation.

---

## Current State Analysis

**Already implemented:**
- `WebhookSetupSection.tsx` displays webhook URL, copy button, and setup instructions
- Owner identity verification section with link code generation
- `line-webhook` edge function handles signature verification and link codes
- `stores` table has `line_enabled`, `line_channel_id`, `line_channel_secret` columns
- `useLineLink` hook manages link code generation

**Missing functionality:**
- No webhook connection test/validation mechanism
- No per-store channel secret verification (currently uses global secret)
- No sequential phase locking (all sections visible at once)
- No "Webhook Connected" status indicator
- No owner-specific Flex Message for confirmation

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Sequential LINE Integration Flow                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Phase 1: Credentials & Webhook         Phase 2: Owner Linking              │
│  ┌─────────────────────────┐            ┌─────────────────────────┐         │
│  │ 1. Enter Channel ID     │            │ 1. Generate Link Code   │         │
│  │ 2. Enter Channel Secret │  ─────▶    │ 2. Send to LINE OA      │  ─────▶ │
│  │ 3. Copy Webhook URL     │            │ 3. Verify via Webhook   │         │
│  │ 4. Wait for validation  │            └─────────────────────────┘         │
│  │    🟢 Webhook Connected │                                                 │
│  └─────────────────────────┘            Phase 3: Confirmation               │
│                                          ┌─────────────────────────┐         │
│                                          │ 👑 Owner Flex Message   │         │
│                                          │ - Admin Rights Confirmed│         │
│                                          │ - Quick Stock Check     │         │
│                                          │ - Manage Store Button   │         │
│                                          └─────────────────────────┘         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Updates

### Add Webhook Verification Column to Stores

A new column to track webhook connectivity status:

```sql
ALTER TABLE public.stores 
ADD COLUMN line_webhook_verified BOOLEAN DEFAULT false,
ADD COLUMN line_webhook_verified_at TIMESTAMP WITH TIME ZONE;
```

This allows the UI to show "Webhook Connected" only after LINE has successfully sent a webhook event that was verified.

---

## Phase 1: Store Credentials & Webhook Connectivity

### 1.1 Enhanced WebhookSetupSection Component

Restructure the component to show phases sequentially:

| Element | Behavior |
|---------|----------|
| **Channel ID Input** | Always visible when LINE enabled |
| **Channel Secret Input** | Always visible when LINE enabled |
| **Webhook URL Display** | Always visible with copy button |
| **Connection Status** | Shows "⏳ Waiting for webhook..." or "🟢 Webhook Connected" |
| **Owner Verification** | **Hidden until webhook verified** |

### 1.2 Webhook Verification Flow

```text
1. Owner saves Channel ID + Secret to database
2. Owner pastes Webhook URL in LINE Developers Console
3. LINE sends a verification request to our webhook
4. Webhook verifies signature using STORE'S channel secret (not global)
5. If valid → updates stores.line_webhook_verified = true
6. UI polls or uses realtime to detect change
7. UI shows "🟢 Webhook Connected" badge
8. Owner Verification section becomes visible
```

### 1.3 Multi-Store Channel Secret Lookup

Update `line-webhook` to look up channel secrets per-store:

```typescript
// Current: Uses global LINE_CHANNEL_SECRET
const channelSecret = Deno.env.get("LINE_CHANNEL_SECRET");

// New: Try store-specific secret first, fall back to global
async function getChannelSecretForRequest(supabase, body): Promise<string | null> {
  // For webhook verification events, LINE sends specific format
  // For normal events, we check if the destination matches a store
  
  // Fall back to global secret for shared LINE OA model
  return Deno.env.get("LINE_CHANNEL_SECRET");
}
```

**Note:** For the initial implementation, we'll support a "shared channel" model where all stores use the same LINE OA. The store's `line_channel_secret` is used for future per-store OA support, but verification currently uses the global secret.

### 1.4 Webhook Verification Event Handler

Add handler for LINE's webhook verification in `line-webhook`:

```typescript
// LINE sends events with empty array for webhook verification
if (webhookBody.events.length === 0) {
  console.log("Webhook verification request received");
  // Mark webhook as verified for the store (if we can identify it)
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
```

---

## Phase 2: Owner Identity Linking

### 2.1 Conditional Visibility

The Owner Identity Verification section only appears after `line_webhook_verified = true`:

```tsx
{webhookVerified && (
  <OwnerVerificationSection ... />
)}
```

### 2.2 Link Code Flow (Already Implemented)

The existing flow works:
1. Owner clicks "Verify My Owner Identity"
2. 6-digit code generated and shown
3. Owner sends code to LINE chatbot
4. Webhook handles code → links `line_user_id`
5. UI updates to show "👑 Verified Owner"

---

## Phase 3: Owner Confirmation Flex Message

### 3.1 Owner-Specific Success Message

Update `generateLinkSuccessFlexMessage` to detect owners and show enhanced message:

```typescript
function generateOwnerSuccessFlexMessage(storeName: string): object {
  return {
    type: "flex",
    altText: "👑 ยืนยันตัวตนเจ้าของร้านสำเร็จ!",
    contents: {
      type: "bubble",
      header: {
        // Gold/amber gradient for owner status
        backgroundColor: "#F59E0B",
        contents: [{
          type: "text",
          text: "👑 เจ้าของร้านยืนยันแล้ว!",
          color: "#FFFFFF"
        }]
      },
      body: {
        contents: [
          { text: `ร้าน: ${storeName}` },
          { text: "สิทธิ์ผู้ดูแลระบบ:" },
          { text: "✅ จัดการสต็อกทั้งหมด" },
          { text: "✅ อนุมัติ/ปฏิเสธพนักงาน" },
          { text: "✅ รับแจ้งเตือนคำขอเข้าร่วม" },
          { text: "✅ ดูรายงานและสถิติ" }
        ]
      },
      footer: {
        contents: [
          {
            type: "button",
            action: { type: "message", label: "🔍 เช็คสต็อก", text: "สต็อก" },
            style: "primary"
          }
        ]
      }
    }
  };
}
```

---

## Implementation Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/store/WebhookSetupSection.tsx` | Sequential phase UI, webhook status polling |
| `src/pages/StoreSetup.tsx` | Pass store data, handle webhook verification state |
| `src/hooks/useLineLink.tsx` | Add webhook verification status query |
| `supabase/functions/line-webhook/index.ts` | Multi-store secret lookup, owner Flex Message |
| `src/lib/translations.ts` | New translation keys for phases |

### New Hook: useWebhookStatus

```typescript
export function useWebhookStatus(storeId: string | undefined) {
  // Query stores table for line_webhook_verified
  // Poll every 3 seconds while waiting
  // Return: { isVerified, isChecking, checkNow }
}
```

### Updated WebhookSetupSection Props

```typescript
interface WebhookSetupSectionProps {
  storeId?: string; // For existing stores
  lineChannelId: string;
  setLineChannelId: (value: string) => void;
  lineChannelSecret: string;
  setLineChannelSecret: (value: string) => void;
  onCredentialsSaved?: () => void; // Trigger when credentials are saved
}
```

---

## New Translation Keys

```typescript
// English
webhookStatus: "Connection Status",
webhookWaiting: "Waiting for webhook verification...",
webhookConnected: "Webhook Connected",
webhookTestInstructions: "After entering your credentials, paste the Webhook URL in LINE Developers Console and save. We'll detect the connection automatically.",
phase1Title: "Step 1: Connect LINE Channel",
phase2Title: "Step 2: Verify Owner Identity",
phase3Complete: "Setup Complete!",

// Thai
webhookStatus: "สถานะการเชื่อมต่อ",
webhookWaiting: "รอการยืนยัน webhook...",
webhookConnected: "เชื่อมต่อ Webhook แล้ว",
webhookTestInstructions: "หลังจากกรอกข้อมูลแล้ว ให้วาง Webhook URL ใน LINE Developers Console และบันทึก ระบบจะตรวจจับการเชื่อมต่อโดยอัตโนมัติ",
phase1Title: "ขั้นตอนที่ 1: เชื่อมต่อ LINE Channel",
phase2Title: "ขั้นตอนที่ 2: ยืนยันตัวตนเจ้าของร้าน",
phase3Complete: "ตั้งค่าเสร็จสมบูรณ์!",
```

---

## UI Flow Mockup

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  🟢 Enable LINE Chatbot                                          [Toggle]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  📡 Step 1: Connect LINE Channel                                            │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  LINE Channel ID                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ 1234567890                                                         │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  LINE Channel Secret                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ ••••••••••••••••••••••••••••••••                                   │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  Webhook URL                                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ https://wqqaqafhpxytwbwykqbg.supabase.co/functions/v1/line-webhook │ [📋]│
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  📋 Setup Instructions                                              [▼]     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  Connection Status:                                                │     │
│  │                                                                    │     │
│  │  ⏳ Waiting for webhook verification...                            │     │
│  │  ─────────────────────────────────────                             │     │
│  │  After saving credentials in LINE Developers Console,              │     │
│  │  the connection will be detected automatically.                    │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  🔒 Step 2: Verify Owner Identity                          [LOCKED - ▼]    │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  Connect your LINE channel first to unlock this step.                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

After Webhook Connected:

┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  Connection Status:                                                │     │
│  │                                                                    │     │
│  │  🟢 Webhook Connected                                    ✓         │     │
│  │                                                                    │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  👑 Step 2: Verify Owner Identity                                           │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  Link your personal LINE account to receive staff alerts and admin access.  │
│                                                                              │
│  [Not Verified]                                                             │
│                                                                              │
│                      [ Verify My Owner Identity ]                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Database Migration
1. Add `line_webhook_verified` and `line_webhook_verified_at` columns to stores

### Step 2: Update Edge Function
1. Handle webhook verification events (empty events array)
2. Add owner-specific success Flex Message
3. Update webhook verified status in database on successful verification

### Step 3: Create useWebhookStatus Hook
1. Query webhook verification status
2. Implement polling while waiting for verification
3. Return verification state

### Step 4: Refactor WebhookSetupSection
1. Split into Phase 1 (Credentials + Status) and Phase 2 (Owner Verification)
2. Add connection status indicator with animations
3. Lock Phase 2 until webhook verified
4. Add progress indicators between phases

### Step 5: Update Translations
1. Add all new translation keys for both languages

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Spoofed webhook verification | LINE's signature verification ensures authenticity |
| Credential exposure | Channel secret stored securely, not exposed to client |
| Unauthorized webhook marking | Only webhook endpoint can update `line_webhook_verified` |
| Polling abuse | Limit polling frequency, stop after verification |

---

## Summary

This implementation creates a guided, sequential LINE integration experience:

1. **Phase 1**: Owner enters credentials, copies webhook URL, and waits for LINE to verify the connection
2. **Phase 2**: After webhook verification, owner links their personal LINE for admin access
3. **Phase 3**: Owner receives a special Flex Message confirming their administrative rights

The flow ensures proper setup order and provides clear visual feedback at each step.
