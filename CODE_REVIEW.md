# Code Review — TireHub

**Branch:** `main` (working tree changes)
**Date:** 2026-06-09
**Effort:** High (7 angles × 6 candidates → 1-vote verify)

---

## Summary

8 findings survived verification. Ranked most-severe first.

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | 🔴 Critical | `.claude/settings.local.json` | Leaked Supabase PAT token committed in plaintext |
| 2 | 🟠 High | `ProductGroupDialog.tsx:53` | No self-order guard — store can order from itself |
| 3 | 🟠 High | `Auth.tsx:184` | Silent `staff_join_requests` failure leaves user stuck in pending |
| 4 | 🟠 High | `ViewOffersDialog.tsx:46` | `handleAcceptDeal` is an unimplemented stub — button silently no-ops |
| 5 | 🟡 Medium | `StockComparisonDialog.tsx:225` | Unhandled throw leaves loading spinner stuck forever |
| 6 | 🟡 Medium | `useAuth.tsx:193` | Safety timer races with profile fetches, can redirect to wrong page |
| 7 | 🟡 Medium | `Pending.tsx:22` | Approved-user redirect on mount was removed — 10 s delay regression |
| 8 | 🟡 Medium | `Staff.tsx:419` | `Bearer null` sent when session is expired — opaque 401 |

---

## Findings

### 1. 🔴 Leaked Supabase Personal Access Token

**File:** [.claude/settings.local.json](.claude/settings.local.json) — lines 9, 10, 13

The token `[REDACTED — Supabase PAT; REVOKE immediately]` is hard-coded as a literal string inside permission allow-rules and committed to the repository.

**Impact:** Anyone with read access to the repo can use this token to deploy/delete edge functions, run migrations, and access service-role secrets for the Supabase project `rvtrwlcxdfnenqspagug`.

**Fix:**
1. **Revoke the token immediately** at `dashboard.supabase.com → Account → Access Tokens`
2. Add `.claude/settings.local.json` to `.gitignore`
3. Reference the token via an environment variable instead of hardcoding it

---

### 2. 🟠 No Self-Order Guard in ProductGroupDialog

**File:** [src/components/marketplace/ProductGroupDialog.tsx](src/components/marketplace/ProductGroupDialog.tsx) — line 53

The "Express Interest" button is rendered whenever `store` is truthy, with no check that `store.id !== storeData.store_id`. A store owner viewing their own shared listing can insert an order with `buyer_store_id === seller_store_id`.

**Failure scenario:** Store A views its own listing → clicks "Interested" → INSERT succeeds → the order notification trigger fires against both sides of the same store, creating a self-referential order.

**Fix:** Add a UI guard and a DB-level constraint:

```tsx
// Component guard
{store && store.id !== storeData.store_id && (
  <ExpressInterestForm ... />
)}
```

```sql
-- Migration
ALTER TABLE orders ADD CONSTRAINT no_self_order
  CHECK (buyer_store_id <> seller_store_id);
```

---

### 3. 🟠 Silent `staff_join_requests` Insert Failure

**File:** [src/pages/Auth.tsx](src/pages/Auth.tsx) — line 184

When a non-duplicate error (code ≠ `23505`) occurs during the `staff_join_requests` INSERT, the `if`-body is empty — the error is never thrown, toasted, or logged. `handleSubmit` falls through, shows "Account created", and navigates to `/pending` with no join request in the database.

**Failure scenario:** An RLS policy violation or FK constraint error sets `requestError`. The empty if-body silently discards it. The user is permanently stuck on `/pending` because the store owner has no request to approve.

**Fix:**

```tsx
if (requestError && requestError.code !== '23505') {
  toast({ title: 'Failed to submit join request', variant: 'destructive' });
  // optionally: await supabase.auth.signOut(); navigate('/auth');
  return;
}
```

---

### 4. 🟠 `handleAcceptDeal` is an Unimplemented Stub

**File:** [src/components/marketplace/ViewOffersDialog.tsx](src/components/marketplace/ViewOffersDialog.tsx) — line 46

`handleAcceptDeal` has an empty body (only a `// TODO` comment) and its parameter is renamed to `_offerId`. The "Accept Deal" `<Button>` calls `onClick={() => handleAcceptDeal(offer.id)}` with no `disabled` prop, so clicks silently do nothing.

**Failure scenario:** A store owner views offers on their broadcast request and clicks "Accept Deal" — no order is created, no notification is sent to the seller, and no feedback is shown.

**Fix:** Either implement the handler or disable the button until it is ready:

```tsx
<Button disabled>
  Accept Deal (coming soon)
</Button>
```

---

### 5. 🟡 Unhandled Throw in StockComparisonDialog Leaves Spinner Stuck

**File:** [src/components/network/StockComparisonDialog.tsx](src/components/network/StockComparisonDialog.tsx) — line 225

`fetchMy` and `fetchPartner` both execute `if (error) throw error`, but the `useEffect` that calls them does so without `try/catch` or `.catch()`. An unhandled rejection means `setLoadingMy(false)` / `setLoadingPartner(false)` never run.

**Failure scenario:** A Supabase error (network blip, RLS denial, cold-start timeout) causes an unhandled Promise rejection. The loading spinners for both panes are stuck at `true` forever with no error message shown.

**Fix:**

```tsx
useEffect(() => {
  fetchMy().catch(err => {
    setLoadingMy(false);
    toast({ title: 'Failed to load your stock', variant: 'destructive' });
  });
}, [storeId]);
```

---

### 6. 🟡 Auth Safety Timer Races With In-Flight Profile Fetches

**File:** [src/hooks/useAuth.tsx](src/hooks/useAuth.tsx) — line 193

A `setTimeout(() => setLoading(false), 5000)` fires unconditionally. On a slow connection where `fetchProfile`, `fetchRoles`, or `fetchStore` haven't resolved yet, it clears the loading gate while `profile`, `roles`, and `store` are still `null`.

**Failure scenario:** `ProtectedRoute` re-evaluates with `isApproved=false`, `isAdmin=false`, `isModerator=false` → a moderator is redirected to `/dashboard`; a staff member is sent to `/pending`. When the fetches eventually complete, the context updates again but the user is already on the wrong page.

**Fix:** Call `setLoading(false)` in each fetch's error path rather than relying on the timer as the primary mechanism:

```tsx
const fetchProfile = async (userId: string) => {
  try {
    // ...existing logic
  } catch {
    setLoading(false); // ensure loading clears on error
  }
};
```

The timer can remain as a last-resort fallback, but should not be the primary path.

---

### 7. 🟡 Approved-User Redirect Removed From Pending Page

**File:** [src/pages/Pending.tsx](src/pages/Pending.tsx) — line 22

The `useEffect` that previously checked `isApproved` on mount and immediately called `navigate('/dashboard')` was removed. The only redirect logic remaining is the 10-second auto-poll interval.

**Failure scenario:** An approved user bookmarks `/pending` or arrives there via the browser back button. They see the "Waiting for approval" screen for up to 10 seconds before the first poll fires and redirects them.

**Fix:** Restore the mount-time check:

```tsx
useEffect(() => {
  if (!loading && isApproved) navigate('/dashboard');
}, [loading, isApproved]);
```

---

### 8. 🟡 `Bearer null` Sent When Session Is Expired

**File:** [src/pages/Staff.tsx](src/pages/Staff.tsx) — line 419

`handleInviteStaff` constructs the Authorization header as `` `Bearer ${session?.access_token}` ``. If `getSession()` returns `{ data: { session: null } }` (expired or missing session), this evaluates to the literal string `"Bearer null"`. The edge function's `getUser("null")` call fails and returns a 401 with no meaningful message.

**Failure scenario:** User's session expires mid-session → they click "Invite Staff" → `getSession()` returns null session → header is `Bearer null` → edge function returns 401 → UI shows "Invite failed" with no indication the session needs refreshing.

**Fix:**

```tsx
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  toast({ title: 'Your session has expired. Please sign in again.', variant: 'destructive' });
  return;
}
```

---

## Out of Scope (Cleanup / Efficiency)

The following were found but are lower-priority cleanup items, not correctness bugs:

- **`usePartnerships.tsx`** — Realtime channel listens on the entire `store_partnerships` table with no row filter; every partnership change system-wide triggers a full re-fetch for all connected clients.
- **`Pending.tsx`** — `checkStatus` fires both `refetchProfile()` and a direct Supabase profile query, doubling DB round-trips on every 10-second poll.
- **`Staff.tsx` / `ModeratorDashboard.tsx`** — `handleInviteStaff` and `handleInviteOwner` are near-identical; a shared `useInvite` hook would remove ~40 lines of duplicated async plumbing.
- **`ModeratorDashboard.tsx`** — The fetch-then-join-profiles-in-memory pattern is duplicated for `allStoreMembers` and `recentActivity`.
- **`DesktopSidebar.tsx`** — Label fallback is a growing ternary chain (`labelKey === 'moderator' ? ... : labelKey === 'orders' ? ...`); add missing keys to the translation map instead.
