

# Save Credentials & Dynamic Webhook Verification Flow

This plan implements a strict sequential flow where LINE credentials must be saved first, then the webhook URL is shown, and the connection status is verified dynamically per-store.

---

## Overview

The implementation addresses four key requirements:

1. **Save Credentials Mechanism** - Separate "Save LINE Settings" button before showing Webhook URL
2. **Dynamic Webhook Verification** - Edge function looks up store by channel_id and verifies using that store's secret
3. **UI State Management** - Polling for `line_webhook_verified` with clear visual feedback
4. **Owner Verification Unlock** - Section stays disabled until webhook is verified

---

## Current State vs. Required State

| Aspect | Current | Required |
|--------|---------|----------|
| Credential saving | Part of store creation form | Separate "Save LINE Settings" step |
| Webhook URL visibility | Shown immediately when LINE enabled | Only after credentials are saved |
| Signature verification | Uses global `LINE_CHANNEL_SECRET` env var | Looks up store-specific `line_channel_secret` from DB |
| Webhook verification update | Does nothing on empty events | Updates matching store's `line_webhook_verified = true` |
| Phase progression | All phases visible at once | Strict sequential: Save → Verify → Link |

---

## Implementation Details

### 1. StoreSetup.tsx Changes

**Add new state for credentials saved status:**
```typescript
const [credentialsSaved, setCredentialsSaved] = useState(false);
const [savingCredentials, setSavingCredentials] = useState(false);
```

**Add "Save LINE Settings" handler:**
```typescript
const handleSaveLineSettings = async () => {
  if (!createdStoreId) return;
  
  setSavingCredentials(true);
  try {
    const { error } = await supabase
      .from("stores")
      .update({
        line_channel_id: lineChannelId,
        line_channel_secret: lineChannelSecret,
      })
      .eq("id", createdStoreId);
    
    if (error) throw error;
    setCredentialsSaved(true);
    toast({ title: "LINE credentials saved!" });
  } catch (error) {
    toast({ title: "Error", variant: "destructive" });
  } finally {
    setSavingCredentials(false);
  }
};
```

**Update WebhookSetupSection props:**
- Pass `credentialsSaved` and `onSaveCredentials` props

### 2. WebhookSetupSection.tsx Restructure

**Three distinct UI states:**

```text
State A: Credentials Not Saved
┌─────────────────────────────────────────┐
│ Step 1: Connect LINE Channel            │
│                                         │
│ LINE Channel ID: [________]             │
│ LINE Channel Secret: [________]         │
│                                         │
│         [Save LINE Settings]            │
│                                         │
│ 🔒 Webhook URL will appear after saving │
└─────────────────────────────────────────┘

State B: Credentials Saved, Waiting for Verification
┌─────────────────────────────────────────┐
│ Step 1: Connect LINE Channel     ✓ Saved│
│                                         │
│ Webhook URL:                            │
│ https://...line-webhook        [Copy]   │
│                                         │
│ Setup Instructions [▼]                  │
│                                         │
│ ⏳ Waiting for webhook verification...  │
│ ─────────────────────────────────       │
│                                         │
│ 🔒 Step 2: Verify Owner Identity        │
└─────────────────────────────────────────┘

State C: Webhook Verified
┌─────────────────────────────────────────┐
│ Step 1: Connect LINE Channel     ✓      │
│                                         │
│ 🟢 Webhook Connected                    │
│                                         │
│ Step 2: Verify Owner Identity           │
│ [Generate Link Code]                    │
└─────────────────────────────────────────┘
```

**New props interface:**
```typescript
interface WebhookSetupSectionProps {
  storeId?: string;
  lineChannelId: string;
  setLineChannelId: (value: string) => void;
  lineChannelSecret: string;
  setLineChannelSecret: (value: string) => void;
  credentialsSaved: boolean;
  onSaveCredentials: () => void;
  isSaving: boolean;
}
```

### 3. line-webhook Edge Function Updates

**New function to look up store by channel credentials:**
```typescript
async function findStoreByChannel(
  supabase: any, 
  body: LineWebhookBody
): Promise<{ storeId: string; channelSecret: string } | null> {
  // For verification events, we need to match by signature
  // Try all stores with LINE enabled and find which secret validates
  const { data: stores } = await supabase
    .from("stores")
    .select("id, line_channel_id, line_channel_secret")
    .eq("line_enabled", true)
    .not("line_channel_secret", "is", null);
  
  if (!stores) return null;
  
  // Return the store data for signature verification later
  // The actual matching happens during signature verification
  return stores;
}
```

**Updated verification flow:**
```typescript
// For each request, try to find matching store by valid signature
async function verifyAndFindStore(
  supabase: any,
  body: string,
  signature: string
): Promise<{ storeId: string; valid: boolean } | null> {
  // Get all stores with LINE enabled
  const { data: stores } = await supabase
    .from("stores")
    .select("id, line_channel_secret")
    .eq("line_enabled", true)
    .not("line_channel_secret", "is", null);
  
  if (!stores || stores.length === 0) {
    // Fall back to global secret
    const globalSecret = Deno.env.get("LINE_CHANNEL_SECRET");
    if (globalSecret && await verifySignature(body, signature, globalSecret)) {
      return { storeId: "", valid: true };
    }
    return null;
  }
  
  // Try each store's secret until one validates
  for (const store of stores) {
    if (await verifySignature(body, signature, store.line_channel_secret)) {
      return { storeId: store.id, valid: true };
    }
  }
  
  return null;
}
```

**Update webhook verification handler:**
```typescript
// Handle webhook verification (LINE sends empty events array)
if (webhookBody.events.length === 0) {
  console.log("Webhook verification request - marking store as verified");
  
  if (matchedStore && matchedStore.storeId) {
    // Update store's webhook verified status
    await supabase
      .from("stores")
      .update({
        line_webhook_verified: true,
        line_webhook_verified_at: new Date().toISOString(),
      })
      .eq("id", matchedStore.storeId);
    
    console.log(`Store ${matchedStore.storeId} webhook verified`);
  }
  
  return new Response(JSON.stringify({ success: true, verified: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
```

### 4. Updated Main Handler Flow

```typescript
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const body = await req.text();
    const signature = req.headers.get("x-line-signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to verify signature against store secrets (then fall back to global)
    const matchedStore = await verifyAndFindStore(supabase, body, signature);
    
    if (!matchedStore) {
      console.error("Invalid signature - no matching store found");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const webhookBody: LineWebhookBody = JSON.parse(body);

    // Handle verification ping
    if (webhookBody.events.length === 0) {
      if (matchedStore.storeId) {
        await supabase
          .from("stores")
          .update({
            line_webhook_verified: true,
            line_webhook_verified_at: new Date().toISOString(),
          })
          .eq("id", matchedStore.storeId);
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // ... rest of event handling
  } catch (error) {
    // error handling
  }
});
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/StoreSetup.tsx` | Add `credentialsSaved` state, `handleSaveLineSettings` function, pass new props |
| `src/components/store/WebhookSetupSection.tsx` | Restructure for three states, add Save button, only show webhook URL after save |
| `supabase/functions/line-webhook/index.ts` | Add `verifyAndFindStore` function, update main handler to use store secrets |
| `src/lib/translations.ts` | Add new translation keys for save states |

---

## New Translation Keys

```typescript
// English
saveLineSettings: "Save LINE Settings",
savingLineSettings: "Saving...",
lineSettingsSaved: "LINE settings saved",
webhookUrlHidden: "Webhook URL will appear after saving credentials",

// Thai
saveLineSettings: "บันทึกการตั้งค่า LINE",
savingLineSettings: "กำลังบันทึก...",
lineSettingsSaved: "บันทึกการตั้งค่า LINE แล้ว",
webhookUrlHidden: "URL Webhook จะปรากฏหลังจากบันทึกข้อมูล",
```

---

## Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Complete LINE Setup Flow                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   [Create Store]                                                            │
│        │                                                                     │
│        ▼                                                                     │
│   ┌─────────────────────────────────┐                                       │
│   │ Enter Channel ID + Secret       │                                       │
│   │                                 │                                       │
│   │ [Save LINE Settings]  ◄─────────┼─── Saves to stores table              │
│   └─────────────────────────────────┘                                       │
│        │                                                                     │
│        ▼  credentials saved                                                  │
│   ┌─────────────────────────────────┐                                       │
│   │ Webhook URL Revealed            │                                       │
│   │                                 │                                       │
│   │ Copy URL → Paste in LINE Dev    │                                       │
│   │                                 │                                       │
│   │ ⏳ Polling for verification...  │◄─── useWebhookStatus polls every 3s   │
│   └─────────────────────────────────┘                                       │
│        │                                                                     │
│        │  LINE sends verification ping                                       │
│        ▼                                                                     │
│   ┌─────────────────────────────────┐                                       │
│   │ Edge Function:                  │                                       │
│   │ 1. Try each store's secret      │                                       │
│   │ 2. Find matching store          │                                       │
│   │ 3. Set line_webhook_verified=T  │                                       │
│   └─────────────────────────────────┘                                       │
│        │                                                                     │
│        ▼  DB updated                                                         │
│   ┌─────────────────────────────────┐                                       │
│   │ UI polls → sees verified=true   │                                       │
│   │                                 │                                       │
│   │ 🟢 Webhook Connected            │                                       │
│   │                                 │                                       │
│   │ Step 2 UNLOCKED                 │                                       │
│   │ [Verify My Owner Identity]      │                                       │
│   └─────────────────────────────────┘                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Channel secret stored in DB | Only accessible via service role; not exposed to client |
| Multiple stores with same secret | Signature verification returns first match (rare edge case) |
| Brute force signature attempts | LINE's signature includes timestamp and replay protection |
| RLS on stores table | Service role key used in edge function bypasses RLS appropriately |

---

## Summary

This implementation ensures:

1. **Credentials must be saved first** - No webhook URL shown until Channel ID/Secret are persisted
2. **Per-store verification** - Each store's own secret is used to validate LINE signatures
3. **Automatic status updates** - When LINE pings the webhook, the matching store is marked verified
4. **Sequential phase locking** - Owner verification only unlocks after webhook connectivity is confirmed

