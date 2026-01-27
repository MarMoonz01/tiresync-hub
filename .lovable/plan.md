
# LINE Chatbot Integration with Backend Functions

This plan outlines the implementation of a LINE Chatbot that connects directly to the tire inventory system, replacing the previous Google Apps Script/Google Sheets approach.

## Overview

The integration will enable:
- Real-time inventory queries via LINE chat (search by tire size, brand, or model)
- Stock adjustments directly from LINE with proper audit logging
- Low stock alerts pushed to admins
- Professional Flex Message cards matching the new BAANAKE design

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                         LINE Platform                           │
│                                                                  │
│   User Message → LINE Webhook → Edge Function → Database        │
│                                    ↓                             │
│                            Flex Message Reply                    │
└─────────────────────────────────────────────────────────────────┘

Flow:
1. User sends message (e.g., "265/65R17" or "michelin")
2. LINE webhook POSTs to Edge Function
3. Edge Function verifies signature, queries database
4. Returns Flex Message with tire data + action buttons
5. Stock changes are logged to stock_logs table
```

---

## Required Secrets

Before proceeding, you'll need to provide two LINE API credentials:

| Secret Name | Description |
|-------------|-------------|
| `LINE_CHANNEL_ACCESS_TOKEN` | Long-lived access token from LINE Developers Console |
| `LINE_CHANNEL_SECRET` | Channel secret for webhook signature verification |

I'll prompt you to add these secrets using a secure input form.

---

## Components to Build

### 1. Main Webhook Edge Function
**File**: `supabase/functions/line-webhook/index.ts`

Handles all incoming LINE webhook events:
- **Signature Verification**: HMAC-SHA256 validation using `X-Line-Signature` header
- **Message Parsing**: Extract user messages and postback data
- **Database Queries**: Search tires by size, brand, or model
- **Reply Generation**: Create and send Flex Messages

### 2. Flex Message Generator
**File**: `supabase/functions/line-webhook/flex-messages.ts`

Generates LINE Flex Message JSON for:
- **Tire Search Results**: Display brand, model, size, DOT codes, and stock levels
- **Stock Status Badges**: Green (In Stock), Yellow (Low Stock), Red (Out of Stock)
- **Action Buttons**: "Check Other Branches", "Reserve Tire", "View Details"

Design specs based on plan.md:
- Primary color: `#2563EB` (brand blue)
- Clean, minimal layout with proper spacing
- Thai language support

### 3. Stock Alert Push Notifications
**File**: `supabase/functions/line-push-notification/index.ts`

Triggered when stock falls below threshold (4 units):
- Sends push message to admin LINE users
- Includes tire details and current stock level

### 4. LINE Interaction Audit Logging

All LINE chatbot interactions will be logged to the existing `stock_logs` table:
- Action type: `line_search`, `line_add`, `line_remove`
- Notes field will include LINE user ID for traceability
- Uses the same logging pattern as the web app

---

## Database Considerations

### Current Schema Mapping (to reference document)
Your existing tables already support the required data:

| PDF Reference | Your Schema |
|---------------|-------------|
| TIRE_SIZE, BRAND, MODEL | `tires.size`, `tires.brand`, `tires.model` |
| DOT1-4, STOCK1-4, PROMO1-4 | `tire_dots` table (up to 4 per tire via `position`) |
| LINE_log / Web_log | `stock_logs` table |
| Price | `tires.price` |

### No Schema Changes Required
The existing `stock_logs` table can handle LINE interactions with the current fields:
- `action`: Will use values like `"line_add"`, `"line_remove"`
- `notes`: Will include LINE context (user display name, message ID)
- `user_id`: Can be null for LINE users (they're not web-authenticated)

---

## Flex Message Design

Based on NEW_DEMO.pdf and plan.md styling:

```text
┌─────────────────────────────────────────┐
│  🏷️ MICHELIN                            │
│  Primacy 4  •  265/65R17               │
├─────────────────────────────────────────┤
│  DOT      Stock    Status              │
│  ─────────────────────────────────────  │
│  2024    🟢 12     In Stock             │
│  2023    🟡 3      Low Stock            │
│  2022    🔴 0      Out of Stock         │
├─────────────────────────────────────────┤
│  💰 Price: ฿3,500                       │
├─────────────────────────────────────────┤
│ [Check Branches] [Reserve] [View]       │
└─────────────────────────────────────────┘
```

Color scheme:
- Header background: `#2563EB` (primary blue)
- In Stock badge: `#22C55E` (green)
- Low Stock badge: `#F59E0B` (amber)
- Out of Stock badge: `#EF4444` (red)

---

## Implementation Steps

### Step 1: Add LINE API Secrets
I'll use the secret input tool to securely collect:
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`

### Step 2: Create Main Webhook Edge Function
- CORS headers for LINE platform
- Signature verification using HMAC-SHA256
- Event type routing (message, postback, follow)
- Database queries using Supabase client

### Step 3: Create Flex Message Generator
- Tire search results card
- Stock status with DOT breakdown
- Action buttons with postback data
- Thai/English language support

### Step 4: Create Push Notification Function
- Triggered by stock threshold
- Admin notification via LINE Push API
- Configurable threshold (default: 4)

### Step 5: Update Config
- Add `verify_jwt = false` for webhook endpoint (LINE doesn't send JWT)
- Configure function settings in `supabase/config.toml`

---

## LINE Developers Console Setup (Your Action Required)

After I create the edge functions, you'll need to:

1. **Get your Webhook URL**: 
   `https://wqqaqafhpxytwbwykqbg.supabase.co/functions/v1/line-webhook`

2. **Configure in LINE Developers Console**:
   - Go to your Messaging API channel settings
   - Set the Webhook URL
   - Enable "Use webhook"
   - Disable "Auto-reply messages"

3. **Get Credentials**:
   - Copy the Channel Secret (for signature verification)
   - Issue a long-lived Channel Access Token

---

## Security Considerations

| Security Measure | Implementation |
|------------------|----------------|
| Webhook Signature | HMAC-SHA256 verification of all requests |
| No JWT (intentional) | LINE webhooks don't use JWT; signature is the auth method |
| Rate Limiting | LINE platform handles rate limiting |
| Input Validation | Sanitize search queries before database operations |
| Audit Trail | All actions logged with LINE user context |

---

## Technical Details

### Edge Function Structure
```
supabase/functions/
├── line-webhook/
│   ├── index.ts           # Main webhook handler
│   └── deno.json          # Deno configuration
└── line-push-notification/
    ├── index.ts           # Push notification sender
    └── deno.json          # Deno configuration
```

### Signature Verification (Critical)
Using Deno's Web Crypto API:
```typescript
// Pseudocode for signature verification
const signature = request.headers.get('x-line-signature');
const body = await request.text();
const key = await crypto.subtle.importKey(...channelSecret);
const digest = await crypto.subtle.sign("HMAC", key, body);
const expectedSignature = base64Encode(digest);
const isValid = signature === expectedSignature;
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/line-webhook/index.ts` | Main webhook handler with signature verification, message routing, and database queries |
| `supabase/functions/line-push-notification/index.ts` | Push notification sender for low stock alerts |

---

## Summary

This implementation will:
- Replace the Google Apps Script/Sheets system entirely
- Connect LINE directly to your Supabase database
- Maintain the same user experience from your PDF demo
- Apply the new BAANAKE minimal design to Flex Messages
- Log all interactions for audit purposes
- Send proactive low-stock alerts to admins

Ready to proceed? Click **Approve** and I'll start by prompting you for the LINE API secrets, then create the edge functions.
