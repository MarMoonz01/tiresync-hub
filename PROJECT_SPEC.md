# Tire Retail & Service — AI-Powered Backend System
## Complete Project Breakdown — Final Version

> **What this document is:** A single source of truth merging the existing TireHub codebase (React + TypeScript + Vite + Supabase) with the new AI agent architecture (19 agents, 5 zones) and all production-critical fixes identified in the code review. Removed: marketplace, B2B orders, broadcast requests, partnership system, moderator role.

---

## The Big Picture

```
User's Browser
      ↕
   React App  (Vite 5.4 + React 18.3 + TypeScript 5.8 + Tailwind + shadcn/ui)
      ↕
   Supabase   (PostgreSQL + Auth + RLS + Views + Edge Functions + pg_cron + Vault)
      ↕
   External APIs  (LINE Messaging API · Facebook Graph API · Claude API)
```

Three layers:

- **Browser** — React app used daily by owner and sales staff
- **Supabase cloud** — all data, auth, agent logic, scheduled jobs, secrets
- **External APIs** — LINE for notifications, Facebook for promotions, Claude for intelligence

---

## Frontend Stack (from existing codebase)

| Tool | Version | Purpose |
|------|---------|---------|
| React | 18.3 | UI framework |
| TypeScript | 5.8 | Type safety — existing strict config kept |
| Vite | 5.4 | Build tool + dev server (SWC compiler) |
| @vitejs/plugin-react-swc | 3.11 | Rust-based compiler |
| react-router-dom | v6 | All page routing — lazy-loaded |
| @tanstack/react-query | v5 | Data fetching, caching, mutations |
| Supabase JS SDK | latest | DB queries, auth, realtime |
| Tailwind CSS | v3 | All styling |
| shadcn/ui + Radix UI | — | 50 accessible UI components |
| react-hook-form | v7 | Form state |
| Zod | v3 | Schema validation |
| recharts | v2 | Charts (P&L, trends, dashboard) |
| framer-motion | v12 | Page transitions, animations |
| lucide-react | v0.462 | Icons |
| date-fns | v3 | Date formatting |
| react-day-picker | v8 | Date range picker |
| sonner | v1 | Toast notifications |
| next-themes | — | Dark/light mode |
| xlsx | v0.18 | Excel import for bulk tire entry |
| @sentry/react | v10 | Error tracking (wire up VITE_SENTRY_DSN) |

---

## Routing

| Path | Page | Role Access |
|------|------|-------------|
| `/` | Landing / redirect | Public |
| `/auth` | Login | Public |
| `/pending` | Awaiting approval | Public |
| `/sales` | Sales form — main staff page | Staff + Owner |
| `/customers` | Customer lookup | Staff + Owner |
| `/stock` | Stock view (sell price, qty) | Staff + Owner |
| `/dashboard` | Owner dashboard | Owner only |
| `/financials` | P&L report | Owner only |
| `/stock-management` | Full stock incl. cost + margin | Owner only |
| `/promotions` | SPARK proposals + approval | Owner only |
| `/content-approval` | PIXEL draft review + publish | Owner only |
| `/po-approval` | HAWK PO drafts + approval | Owner only |
| `/crm` | Full customer database | Owner only |
| `/intelligence` | ORACLE + SAGE reports | Owner only |
| `/audit-log` | Stock change history (from TireHub) | Owner only |
| `/staff` | Manage staff members | Owner only |
| `/settings` | Account + LINE linking | All |
| `/interbranch` | Read-only stock lookup | Inter-branch only |
| `*` | 404 Not Found | — |

All routes lazy-loaded. `ProtectedRoute` wraps every page.

```
ProtectedRoute checks (in order):
1. Logged-in user?              → No  → /auth
2. User approved?               → No  → /pending
3. Owner-only route?            → Staff/interbranch trying → /sales
4. Interbranch-only route?      → Other roles → /sales
5. Interbranch role elsewhere?  → /interbranch
6. All pass → render
```

---

## Backend — Supabase Services

| Service | Role |
|---------|------|
| PostgreSQL | All data storage |
| Auth | JWT sessions, invite links, password reset |
| Row Level Security | Row isolation — store sees only its own rows |
| **Database Views** | **Column isolation — staff/inter-branch query restricted views, never base tables** |
| Edge Functions | Server-side agent logic (Deno runtime) |
| pg_cron + pg_net | Scheduled background jobs — no external server needed |
| Supabase Vault | Stores LINE/Facebook tokens + cron service key |
| Realtime | Live stock quantity updates on sales page |
| Storage | PDF receipts |

### Extensions — enable first (migration 00)

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;
```

---

## ⚠️ Critical Architecture: Views for Column-Level Permissions

PostgreSQL RLS filters **rows**, not **columns**. You cannot hide `cost_price` from staff with an RLS policy alone.

**Solution: two-layer model**

1. **RLS on base tables** → row isolation (which store's rows you can see)
2. **Views with restricted columns** → column isolation (which fields you can see)

Staff and inter-branch users are granted access **only to views**. Base tables are owner + service role only.

```
Base table: tires  (owner + service role only)
   ├── tires_staff_view        → id, brand, model, size, quantity, sell_price
   └── tires_interbranch_view  → brand, model, size, quantity  (no prices)

Base table: sales_log  (owner + service role only)
   └── sales_log_staff_view    → id, tire_name, car_model, plate_number,
                                  quantity_sold, services, sell_price,
                                  total_revenue, created_at  (no cost, no profit)
```

---

## Database Tables — Complete Schema

### 1. `profiles`
Replaces TireHub's combined profiles+user_roles tables. Role is a single column.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | References auth.users |
| `name` | text | Full name |
| `email` | text | Email address |
| `phone` | text | Phone number |
| `status` | text | `pending` / `approved` / `rejected` / `suspended` |
| `role` | text | `owner` / `staff` / `interbranch` |
| `line_user_id` | text | Linked LINE account ID |
| `store_id` | uuid FK | References stores.id |
| `created_at` | timestamptz | — |

---

### 2. `stores`
Secrets stored in Vault — not as plain columns (code review fix #1).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | — |
| `name` | text | Branch name |
| `address` | text | Physical address |
| `phone` | text | Contact number |
| `is_active` | boolean | Active/suspended |
| `line_channel_id` | text | LINE channel ID (non-secret) |
| `facebook_page_id` | text | Facebook Page ID (non-secret) |
| `vault_line_secret_ref` | text | Vault key → LINE channel secret |
| `vault_line_token_ref` | text | Vault key → LINE access token |
| `vault_line_oa_ref` | text | Vault key → LINE OA broadcast token |
| `vault_fb_token_ref` | text | Vault key → Facebook Graph token |
| `created_at` | timestamptz | — |

---

### 3. `tires`
Base table — owner + service role only. Staff query `tires_staff_view`.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | SKU identifier |
| `store_id` | uuid FK | — |
| `brand` | text | e.g. Bridgestone |
| `model` | text | e.g. Ecopia EP300 |
| `size` | text | e.g. 185/60R15 |
| `quantity` | integer | Current stock |
| `min_threshold` | integer | Reorder trigger |
| `avg_cost` | numeric | Weighted-average cost (used by OTTO) |
| `sell_price` | numeric | Retail selling price |
| `supplier` | text | Supplier name |
| `last_sold_at` | timestamptz | Used by LENS for dead stock |
| `is_active` | boolean | Soft delete |
| `created_at` | timestamptz | — |
| `updated_at` | timestamptz | — |

> **Costing:** weighted-average (`avg_cost`). Recalculated on every purchase via `recalc_avg_cost_on_purchase()`. Simpler and sufficient for SME. True FIFO available via optional `tire_lots` table if accounting requires it.

---

### 4. `tire_dots`
DOT codes per tyre — from TireHub, kept as-is.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | — |
| `tire_id` | uuid FK | References tires.id |
| `store_id` | uuid FK | — |
| `dot_code` | text | DOT production code |
| `quantity` | integer | Quantity for this DOT |
| `promotion` | text | Optional promo label |
| `position` | integer | Display order (1–4) |
| `created_at` | timestamptz | — |

---

### 5. `sales_log`
Base table — owner + service role only.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Sale ID |
| `store_id` | uuid FK | — |
| `staff_id` | uuid FK | References profiles.id |
| `customer_id` | uuid FK | References customers.id |
| `tire_id` | uuid FK | References tires.id |
| `tire_name` | text | Snapshot at sale time |
| `car_model` | text | Used by REX learning |
| `plate_number` | text | Vehicle plate |
| `quantity_sold` | integer | — |
| `services` | text[] | e.g. `{balancing,alignment}` |
| `sell_price` | numeric | Unit price at sale |
| `total_revenue` | numeric | sell_price × qty + services |
| `cost_at_sale` | numeric | avg_cost captured at sale time |
| `gross_profit` | numeric | total_revenue − (cost_at_sale × qty) |
| `promotion_id` | uuid FK | References promotions.id |
| `created_at` | timestamptz | — |

---

### 6. `stock_logs`
Every stock change — from TireHub audit log feature, kept.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | — |
| `store_id` | uuid FK | — |
| `tire_id` | uuid FK | — |
| `user_id` | uuid FK | Who made the change |
| `action` | text | `add` / `remove` / `adjust` / `sale` |
| `qty_before` | integer | Stock before change |
| `qty_change` | integer | Delta (positive = add, negative = remove) |
| `qty_after` | integer | Stock after change |
| `note` | text | Optional reason |
| `created_at` | timestamptz | — |

---

### 7. `customers`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | — |
| `store_id` | uuid FK | — |
| `name` | text | Full name |
| `phone` | text | — |
| `plate_number` | text | Primary vehicle plate |
| `car_model` | text | Car brand + model |
| `last_visit` | date | Used by RADAR |
| `visit_count` | integer | Total visits |
| `preferred_brand` | text | Most purchased brand |
| `total_spend` | numeric | Lifetime spend (THB) |
| `segment` | text | `VIP` / `Regular` / `At-risk` |
| `notes` | text | Staff notes |
| `created_at` | timestamptz | — |
| `updated_at` | timestamptz | — |

---

### 8. `financials`
Written by OTTO in real time.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | — |
| `store_id` | uuid FK | — |
| `type` | text | `sale` / `purchase` / `expense` / `weekly_summary` |
| `reference_id` | uuid | FK → sales_log.id or purchase_orders.id |
| `revenue` | numeric | — |
| `cogs` | numeric | Cost of goods sold |
| `gross_profit` | numeric | revenue − cogs |
| `expense` | numeric | If type = expense |
| `net_profit` | numeric | gross_profit − expense (FINN) |
| `period_day` | date | YYYY-MM-DD |
| `period_week` | text | YYYY-WW |
| `period_month` | text | YYYY-MM |
| `created_at` | timestamptz | — |

---

### 9. `promotions`
Full lifecycle from SPARK proposal to ended.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | — |
| `store_id` | uuid FK | — |
| `title` | text | Short title |
| `description` | text | Full mechanic |
| `target_segment` | text | `All` / `VIP` / `At-risk` |
| `channel` | text | `LINE OA` / `Facebook` / `Both` |
| `start_date` | date | — |
| `end_date` | date | — |
| `status` | text | `draft` → `pending_approval` → `approved` → `content_ready` → `live` → `ended` |
| `approved_by` | uuid FK | — |
| `approved_at` | timestamptz | — |
| `facebook_post_url` | text | After publishing |
| `line_broadcast_sent_at` | timestamptz | — |
| `revenue_during` | numeric | Tagged via sales_log.promotion_id |
| `expected_revenue_lift` | numeric | SPARK estimate |
| `margin_impact` | numeric | SPARK estimate |
| `facebook_copy` | text | PIXEL output |
| `line_copy` | text | PIXEL output |
| `created_by` | text | `SPARK` |
| `created_at` | timestamptz | — |

---

### 10. `purchase_orders`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | — |
| `store_id` | uuid FK | — |
| `tire_id` | uuid FK | — |
| `tire_name` | text | Snapshot |
| `current_stock` | integer | At PO creation |
| `min_threshold` | integer | Trigger value |
| `recommended_qty` | integer | HAWK suggestion |
| `confirmed_qty` | integer | Owner-adjusted |
| `supplier` | text | — |
| `status` | text | `pending_approval` / `approved` / `rejected` |
| `approved_by` | uuid FK | — |
| `approved_at` | timestamptz | — |
| `created_by` | text | `HAWK` |
| `created_at` | timestamptz | — |

---

### 11. `notifications`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | — |
| `store_id` | uuid FK | — |
| `user_id` | uuid FK | Recipient |
| `type` | text | `stock_low` / `po_draft` / `promo_proposal` / `content_draft` / `financial_alert` |
| `title` | text | — |
| `body` | text | — |
| `is_read` | boolean | — |
| `send_line` | boolean | Also push via LINE |
| `line_sent_at` | timestamptz | — |
| `reference_id` | uuid | FK to relevant record |
| `reference_type` | text | — |
| `created_at` | timestamptz | — |

---

### 12. `intelligence_reports`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | — |
| `store_id` | uuid FK | — |
| `type` | text | `oracle_insight` / `sage_forecast` |
| `period_start` | date | — |
| `period_end` | date | — |
| `content` | jsonb | Full Claude API output |
| `summary` | text | Human-readable dashboard summary |
| `created_at` | timestamptz | — |

---

### 13. `rex_mappings`
Updated by REX after every sale.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | — |
| `store_id` | uuid FK | — |
| `car_model` | text | Normalised e.g. `toyota yaris` |
| `tire_id` | uuid FK | — |
| `tire_name` | text | Snapshot |
| `sale_count` | integer | Times sold for this car model |
| `percentage` | numeric | % of sales for this model |
| `updated_at` | timestamptz | — |

---

### 14. `interbranch_tokens`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | — |
| `store_id` | uuid FK | Branch granting access |
| `branch_name` | text | Sibling branch name |
| `token_hash` | text | Hashed — never store plaintext |
| `is_active` | boolean | — |
| `created_at` | timestamptz | — |

---

### 15. `staff_join_requests`
From TireHub — kept for staff onboarding flow.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | — |
| `user_id` | uuid FK | Requesting staff |
| `store_id` | uuid FK | Target store |
| `status` | text | `pending` / `approved` / `rejected` |
| `created_at` | timestamptz | — |

---

### 16. `user_invites`
From TireHub — kept for invite-only owner onboarding.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | — |
| `email` | text | Invited email |
| `role` | text | `owner` |
| `invited_by` | uuid FK | — |
| `used_at` | timestamptz | Null until claimed |
| `created_at` | timestamptz | — |

---

### 17. `line_link_codes`
From TireHub — temporary codes to link LINE accounts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | — |
| `user_id` | uuid FK | — |
| `code` | text | 6-digit temp code |
| `expires_at` | timestamptz | — |
| `used_at` | timestamptz | — |

---

### 18. `agent_runs`
New — operational observability. Every scheduled/intelligence agent logs here.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | — |
| `store_id` | uuid FK | — |
| `agent_name` | text | `SCOUT` / `HAWK` / `ORACLE` etc. |
| `status` | text | `running` / `success` / `failed` |
| `error_message` | text | If failed |
| `tokens_used` | integer | Claude tokens (intelligence only) |
| `started_at` | timestamptz | — |
| `finished_at` | timestamptz | — |

> Without this table, a silently-failing cron job is invisible. The owner dashboard shows an agent health panel driven by this table.

---

## Database Views

```sql
-- Staff: sees sell_price but NOT avg_cost, supplier, or financial data
create view tires_staff_view
  with (security_invoker = true) as
  select id, store_id, brand, model, size, quantity, sell_price, is_active
  from tires where is_active = true;

-- Inter-branch: sees availability only — no prices
create view tires_interbranch_view
  with (security_invoker = true) as
  select store_id, brand, model, size, quantity
  from tires where is_active = true and quantity > 0;

-- Staff sales: own entries, no cost or profit columns
create view sales_log_staff_view
  with (security_invoker = true) as
  select id, store_id, staff_id, tire_name, car_model, plate_number,
         quantity_sold, services, sell_price, total_revenue, created_at
  from sales_log;

-- Revoke base table access from authenticated role
revoke all on tires from authenticated;
revoke all on sales_log from authenticated;
grant select on tires_staff_view to authenticated;
grant select on tires_interbranch_view to authenticated;
grant select on sales_log_staff_view to authenticated;
-- RLS on base tables still applies for row isolation
```

---

## All Migrations — 28 Files

| # | Name | Creates |
|---|------|---------|
| 00 | `enable_extensions` | pg_cron, pg_net, supabase_vault |
| 01 | `create_profiles_stores` | profiles, stores + auth trigger |
| 02 | `create_tires` | tires + tire_dots |
| 03 | `create_sales_log` | sales_log with cost_at_sale, gross_profit |
| 04 | `create_stock_logs` | stock_logs audit table |
| 05 | `create_customers` | customers CRM |
| 06 | `create_financials` | financials for OTTO/FINN/VERA |
| 07 | `create_promotions` | promotions full lifecycle |
| 08 | `create_purchase_orders` | purchase_orders for HAWK |
| 09 | `create_notifications` | notifications + LINE flag |
| 10 | `create_intelligence_reports` | ORACLE + SAGE output |
| 11 | `create_rex_mappings` | car model → tyre mapping |
| 12 | `create_interbranch_tokens` | sibling branch tokens |
| 13 | `create_staff_invites` | staff_join_requests, user_invites, line_link_codes |
| 14 | `create_agent_runs` | agent execution log |
| 15 | `create_permission_views` | tires_staff_view, tires_interbranch_view, sales_log_staff_view |
| 16 | `setup_rls_all_tables` | Row isolation on every base table |
| 17 | `setup_view_grants` | Grant views to authenticated; revoke base table |
| 18 | `create_atomic_stock_fn` | `deduct_stock_atomic` (race-condition safe) |
| 19 | `create_costing_fn` | `recalc_avg_cost_on_purchase` |
| 20 | `create_rex_trend_fns` | `update_rex_mapping`, `get_trending_tyres` |
| 21 | `create_notification_triggers` | stock_low, promo/po status change |
| 22 | `create_vera_trigger` | financial threshold alert trigger |
| 23 | `setup_vault_secrets` | Store all API tokens + cron service key in Vault |
| 24 | `create_pgcron_schedules` | Schedule all background agents (key from Vault) |
| 25 | `create_performance_indexes` | Indexes on FK, status, period, car_model |
| 26 | `create_views_public` | `stores_signup_search` for anon store search (from TireHub) |
| 27 | `seed_store_data` | Initial store + owner profile |

---

## Atomic Stock Deduction (race condition fix)

```sql
create or replace function deduct_stock_atomic(
  p_tire_id uuid,
  p_qty integer
) returns boolean as $$
declare rows_affected integer;
begin
  update tires
    set quantity   = quantity - p_qty,
        last_sold_at = now(),
        updated_at   = now()
  where id = p_tire_id
    and quantity >= p_qty;  -- only succeeds if stock available
  get diagnostics rows_affected = row_count;
  return rows_affected = 1; -- false = insufficient stock
end;
$$ language plpgsql;
```

---

## Weighted-Average Cost Function

```sql
create or replace function recalc_avg_cost_on_purchase(
  p_tire_id uuid,
  p_new_qty integer,
  p_new_cost numeric
) returns void as $$
declare
  old_qty  integer;
  old_cost numeric;
begin
  select quantity, avg_cost into old_qty, old_cost
  from tires where id = p_tire_id;
  update tires set
    avg_cost = round(
      ((old_qty * old_cost) + (p_new_qty * p_new_cost))
      / nullif(old_qty + p_new_qty, 0), 2),
    quantity = quantity + p_new_qty
  where id = p_tire_id;
end;
$$ language plpgsql;
```

---

## Edge Functions — 14 Functions

### Real-time (triggered by app events)

#### `record-sale` — MAX routes Zone A agents

> **Ordering fix:** BOLT (stock deduction) runs first and is blocking. If it fails, nothing else executes — no phantom CRM entries or financial records for stock that didn't exist.

```
Input: { tire_id, quantity_sold, services, sell_price,
         plate_number, car_model, customer_name, phone, staff_id }

Step 1 — BOLT (blocking):
  → deduct_stock_atomic(tire_id, quantity_sold)
  → if false: return { error: "insufficient stock" }  ← abort here
  → log to stock_logs
  → if qty now < min_threshold: set low_stock_flag = true

Step 2 — parallel (only after BOLT succeeds):
  IRIS → upsert customers (last_visit, visit_count, preferred_brand,
          segment, total_spend)
  OTTO → read avg_cost as cost_at_sale
       → insert financials (gross_profit = revenue − cost_at_sale × qty)
  REX  → update_rex_mapping(store_id, car_model, tire_id)
  DOC  → generate PDF receipt → upload to Supabase Storage

Step 3 — post:
  PING → if low_stock_flag: insert notification → call line-push
  → return { success, sale_id, receipt_url }
```

---

#### `line-webhook` — staff + inter-branch stock queries

```
Flow:
  1. Verify HMAC signature (reject if invalid)
  2. Lookup user by line_user_id in profiles
  3. Branch by role:
     staff/owner   → "/stock [size]" → query tires_staff_view
     interbranch   → "/stock [size]" → query tires_interbranch_view
  4. call line-push-notification to reply
```

---

#### `line-push-notification` — resolves token from Vault

```
Flow:
  1. Read store.vault_line_token_ref
  2. Resolve actual token from Supabase Vault
  3. POST to LINE Messaging API
  4. Update notification.line_sent_at
```

---

#### `publish-promotion` — Facebook + LINE OA publish

```
Flow:
  1. Fetch promotion (facebook_copy, line_copy, channel)
  2. Resolve Facebook + LINE OA tokens from Vault
  3. If Facebook: POST /me/feed → store post URL
  4. If LINE OA: POST broadcast → set line_broadcast_sent_at
  5. promotions.status = 'live'
  6. Insert notification: "Promotion is live"
```

---

#### `approve-po`

```
Flow:
  1. Update purchase_orders (confirmed_qty, status='approved', approved_at)
  2. On stock receipt: call recalc_avg_cost_on_purchase → update avg_cost
  3. Insert notification: "PO approved — contact supplier"
```

---

#### `interbranch-stock` — read-only, queries view only

```
Flow:
  1. Validate Bearer token hash against interbranch_tokens
  2. Resolve store_id for this token
  3. Query tires_interbranch_view (physically cannot return prices)
  4. Return [{ brand, model, size, quantity }]
```

---

#### `send-invite` — from TireHub, kept for owner invite flow

```
Flow:
  1. Validate caller is owner (JWT role check)
  2. Insert user_invites row
  3. Call supabase.auth.admin.inviteUserByEmail
```

---

### Scheduled Functions (pg_cron via Vault key)

```sql
-- migration 24 — all schedules use Vault-stored service key
select cron.schedule('scout-daily',    '0 7 * * *',   ...);  -- SCOUT
select cron.schedule('hawk-reorder',   '0 */6 * * *', ...);  -- HAWK
select cron.schedule('atlas-weekly',   '0 8 * * 1',   ...);  -- ATLAS + RADAR + FINN
select cron.schedule('intel-oracle',   '0 9 * * 1',   ...);  -- ORACLE
select cron.schedule('intel-sage',     '10 9 * * 1',  ...);  -- SAGE  (+10 min)
select cron.schedule('intel-spark',    '20 9 * * 1',  ...);  -- SPARK (+20 min)
select cron.schedule('lens-deadstock', '0 9 * * 3',   ...);  -- LENS  Wednesday
```

Each function writes an `agent_runs` row at start and updates on completion.

---

#### `scout-daily` — SCOUT — 07:00 daily

```
1. agent_runs insert (status=running)
2. Query tires: near-threshold (qty < min×2), dead stock (>60d), healthy
3. Format LINE summary → line-push → owner
4. Insert notification; agent_runs update (success/failed)
```

---

#### `hawk-reorder` — HAWK — every 6 hours

```
1. agent_runs insert
2. Query tires where quantity < min_threshold
3. For each: if no pending PO → insert purchase_orders (recommended_qty = min×3)
4. Insert notification + LINE to owner
5. agent_runs update
```

---

#### `atlas-weekly` — ATLAS + RADAR + FINN — Monday 08:00

```
1. agent_runs insert
2. ATLAS: aggregate 7-day revenue, gross profit, margin %, top 5 tyres,
          delta vs prior 7 days → write weekly_summary to financials → LINE
3. RADAR: customers where last_visit > 180 days → segment='At-risk' → count to owner
4. FINN:  aggregate financials for period → P&L narrative (one Claude call)
5. agent_runs update
```

---

#### `intel-oracle` — ORACLE — Monday 09:00 (one Claude call)

```
1. agent_runs insert
2. Aggregate sales_log + financials (30/60/90 days)
3. ONE Claude call → insight report
4. Store in intelligence_reports (oracle_insight); record tokens_used
5. agent_runs update
```

---

#### `intel-sage` — SAGE — Monday 09:10 (one Claude call)

```
1. Aggregate 12-month monthly volumes
2. ONE Claude call → demand forecast
3. Store in intelligence_reports (sage_forecast)
4. agent_runs update
```

---

#### `intel-spark` — SPARK — Monday 09:20 (one Claude call)

```
1. Read ORACLE insight + SAGE forecast + FINN P&L + LENS dead-stock
2. ONE Claude call → 3 promotion proposals
   (margin guard: reject any option with negative gross margin)
3. Insert 3 rows into promotions (status=pending_approval)
4. Insert notification + LINE to owner: "3 proposals ready"
5. agent_runs update
```

---

#### `intel-pixel` — PIXEL — triggered on promotions.status → 'approved'

```
1. ONE Claude call → Facebook copy (100-150 words) + LINE copy (50-80 words)
2. Store in promotions.facebook_copy / line_copy
3. promotions.status = 'content_ready'
4. Insert notification: "Content ready for review"
5. agent_runs insert + update
```

---

#### `lens-deadstock` — LENS — Wednesday 09:00

```
1. agent_runs insert
2. Query tires where last_sold_at > 60 days AND quantity > 0
3. margin = (sell_price - avg_cost) / sell_price
   margin > 30% → suggest 10-15% price cut
   margin ≤ 30% → suggest service bundle
4. Insert notification + LINE to owner
5. Never modifies sell_price automatically
6. agent_runs update
```

---

## AI Agents — 19 Agents

| Agent | Zone | Name | Implemented as | Type | Trigger |
|-------|------|------|---------------|------|---------|
| MAX | Orch | The Coordinator | `record-sale` body | Pure code | Every sale |
| BOLT | A | The Stock Keeper | `record-sale` | Pure code | Sale saved |
| IRIS | A | The Memory Keeper | `record-sale` | Pure code | Sale saved |
| PING | A | The Alerter | `record-sale` | Pure code | Stock low |
| DOC | A | The Receipter | `record-sale` | Pure code | Sale saved |
| OTTO | A/D | The Bookkeeper | `record-sale` | Pure code | Sale saved |
| SCOUT | B | The Stock Reporter | `scout-daily` | Pure code | Daily 07:00 |
| HAWK | B | The Reorder Watcher | `hawk-reorder` | Pure code | Every 6h |
| RADAR | B | The Churn Hunter | `atlas-weekly` | Pure code | Monday |
| ATLAS | B | The Weekly Summarizer | `atlas-weekly` | Pure code | Monday 08:00 |
| LENS | B | The Pricing Optimizer | `lens-deadstock` | Pure code | Wednesday |
| ORACLE | C | The Data Analyst | `intel-oracle` | Claude API | Monday 09:00 |
| SAGE | C | The Demand Forecaster | `intel-sage` | Claude API | Monday 09:10 |
| SPARK | C | The Promo Planner | `intel-spark` | Claude API | Monday 09:20 |
| PIXEL | C | The Content Creator | `intel-pixel` | Claude API | On approval |
| FINN | C/D | The P&L Reporter | `atlas-weekly` | Claude API light | Monday + daily |
| OTTO | D | The Bookkeeper | `record-sale` | Pure code | Real-time |
| VERA | D | The Finance Alerter | DB trigger | Pure code | On financials insert |
| REX | E | The Car-Tyre Matcher | DB function | Pure code | Sales form input |
| TREND | E | The Trend Spotter | DB function | Pure code | Sales form load |

---

## Notification Triggers

```sql
-- Stock falls below threshold
create trigger notify_stock_low
  after update of quantity on tires for each row
  when (new.quantity < new.min_threshold and old.quantity >= old.min_threshold)
  execute function handle_stock_low_notification();

-- VERA: financial threshold breach
create trigger vera_financial_check
  after insert on financials for each row
  execute function handle_vera_threshold_check();
  -- checks: daily gross margin < owner-set % threshold
  -- checks: daily revenue < owner-set THB threshold
  -- if breached → insert notification + LINE push

-- Promotion and PO status changes
create trigger notify_promo_status
  after update of status on promotions for each row
  execute function handle_promo_status_notification();

create trigger notify_po_status
  after update of status on purchase_orders for each row
  execute function handle_po_status_notification();
```

---

## State Management & Custom Hooks

| Hook | Page | Source | What it does |
|------|------|--------|-------------|
| `useAuth` | Global | TireHub (patched) | user, profile, role, store — loading fix applied |
| `usePermissions` | Global | New | canViewCost, canViewFinancials, canApprove |
| `useSaleForm` | /sales | New | Form state, REX trigger, atomic save with null-session guard |
| `useREX(carModel)` | /sales | New | Queries rex_mappings top 3 |
| `useTrend(days)` | /sales | New | get_trending_tyres 30/60/90d |
| `useStockLookup` | /sales, /stock | New | Queries tires_staff_view |
| `useCustomers` | /customers, /crm | TireHub adapted | Search by plate/phone, full history |
| `useFinancials(period)` | /financials | New | P&L day/week/month |
| `usePromotions` | /promotions | New | Proposals list, approve/reject |
| `useContentApproval` | /content-approval | New | content_ready promos, publish trigger |
| `usePurchaseOrders` | /po-approval | New | PO drafts, approve with qty |
| `useIntelligenceReports` | /intelligence | New | ORACLE + SAGE history |
| `useDashboardStats` | /dashboard | New | Revenue, margin, alerts, agent health |
| `useAgentRuns` | /dashboard | New | Agent health panel from agent_runs |
| `useNotifications` | Global | TireHub adapted | Unread count, mark read |
| `useAuditLog` | /audit-log | TireHub kept | Stock change history |
| `useStoreStaff` | /staff | TireHub kept | List, add, remove, update staff |
| `useStaffRequests` | /staff | TireHub kept | Approve/reject join requests |
| `useInterbranchStock` | /interbranch | New | Token-scoped read-only stock |
| `useLineLink` | /settings | TireHub kept | Generate LINE link code |
| `useWebhookStatus` | /settings | TireHub kept | LINE webhook status |
| `useDebouncedValue` | Utility | TireHub kept | Debounce search inputs |
| `useMobile` | Utility | TireHub kept | Screen size detection |
| `useToast` | Utility | TireHub kept | Sonner toast system |

---

## Code Review Fixes — Applied

All 8 findings from the code review are addressed:

| # | Finding | Fix applied |
|---|---------|------------|
| 1 | Supabase PAT token committed in plaintext | **Revoke immediately.** `.claude/settings.local.json` added to `.gitignore`. All API tokens moved to Supabase Vault. |
| 2 | Self-order guard missing | Not applicable — marketplace and B2B orders removed entirely. DB constraint not needed. |
| 3 | Silent `staff_join_requests` failure | `Auth.tsx`: non-duplicate errors now toast + return. Join request failure is visible. |
| 4 | `handleAcceptDeal` stub | Not applicable — broadcast/offers feature removed. |
| 5 | Unhandled throw in StockComparisonDialog | Not applicable — `StockComparisonDialog` not in this project (no partnership/network feature). |
| 6 | Auth timer races with profile fetches | `useAuth`: each fetch path calls `setLoading(false)` in its own catch block. Timer remains as last-resort fallback only. |
| 7 | Approved-user redirect removed from Pending | `Pending.tsx`: mount-time `useEffect` restored — no more 10s wait. |
| 8 | `Bearer null` on expired session | All Edge Function calls: null-session guard added before header construction. Toast shown; function returns early. |

### Code patterns to apply consistently

**Auth loading (fix #6):**
```tsx
const fetchProfile = async (userId: string) => {
  try {
    // ...fetch logic
  } catch {
    setLoading(false); // always clear on error
  }
};
// Timer stays as last-resort backup only — not primary mechanism
```

**Session null guard (fix #8) — apply to every Edge Function call:**
```tsx
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  toast({ title: 'Session expired. Please sign in again.', variant: 'destructive' });
  return;
}
// safe to use session.access_token below
```

**Mount-time redirect (fix #7):**
```tsx
// Pending.tsx
useEffect(() => {
  if (!loading && isApproved) navigate('/dashboard');
}, [loading, isApproved]);
```

**Join request error handling (fix #3):**
```tsx
if (requestError && requestError.code !== '23505') {
  toast({ title: 'Failed to submit join request', variant: 'destructive' });
  return;
}
```

**Async error boundary in useEffect (generalised from fix #5):**
```tsx
useEffect(() => {
  fetchData().catch(err => {
    setLoading(false);
    toast({ title: 'Failed to load data', variant: 'destructive' });
  });
}, [dependency]);
```

---

## Permission System

### Three enforcement layers

1. **Database views** — restricted columns physically absent for staff/inter-branch
2. **RLS** — row isolation on every base table
3. **ProtectedRoute + usePermissions** — page and component gating in UI

### Permission matrix

| Feature | Owner | Staff | Inter-branch |
|---------|-------|-------|--------------|
| Stock quantity | ✓ | ✓ (view) | ✓ (view, read-only) |
| Selling price | ✓ | ✓ (view) | ✗ |
| avg_cost / cost | ✓ | ✗ not in view | ✗ |
| Gross margin / P&L | ✓ | ✗ | ✗ |
| Customer CRM | ✓ | ✓ | ✗ |
| Sales history | ✓ | own entries (view) | ✗ |
| REX / TREND recs | ✓ | ✓ | ✗ |
| Approve promo / PO / content | ✓ | ✗ | ✗ |
| Intelligence reports | ✓ | ✗ | ✗ |
| Audit log | ✓ | ✗ | ✗ |
| Staff management | ✓ | ✗ | ✗ |
| Settings | ✓ | own profile | ✗ |

---

## Owner Approval Gates (3 gates)

| Gate | Agent | Owner sees | Required action |
|------|-------|-----------|-----------------|
| Promotion approval | SPARK | 3 proposals: mechanic, target, estimated lift, margin impact | Select one → approve → PIXEL triggers |
| Content approval | PIXEL | Facebook draft + LINE draft side by side, editable | Review → Approve & Publish |
| PO approval | HAWK | SKU, recommended qty, supplier | Confirm qty → approve (contacts supplier manually) |

No agent publishes, orders, or messages a customer without explicit owner approval.

---

## Authentication Flows

```
Owner (invite-only):
  send-invite function → email link → user sets password
  → DB trigger: profile.status = 'approved', role = 'owner'

Staff:
  Signs up → searches store (stores_signup_search view)
  → join request → owner approves in /staff
  → profile.status = 'approved', role = 'staff'

Inter-branch:
  Owner generates token in /settings → token stored hashed
  → sibling uses in LINE bot (/stock command) or interbranch-stock endpoint
  → queries tires_interbranch_view only
```

---

## LINE Integration (from TireHub, kept + extended)

| Feature | How it works |
|---------|-------------|
| Staff stock query | `/stock 185/60R15` → tires_staff_view |
| Inter-branch query | `/stock 185/60R15` → tires_interbranch_view (role-branched) |
| Push notifications | line-push-notification (token from Vault) |
| Account linking | line_link_codes table → 6-digit code → link |
| OA broadcast | publish-promotion → Vault token → LINE OA API |
| Webhook setup | /settings LINE wizard from TireHub |
| Webhook status | useWebhookStatus from TireHub |

---

## Project Structure

```
tireshop/
├── src/
│   ├── pages/
│   │   ├── Auth.tsx              ← fix #3 applied
│   │   ├── Pending.tsx           ← fix #7 applied (mount redirect restored)
│   │   ├── Sales.tsx             ← main staff page
│   │   ├── Customers.tsx
│   │   ├── Stock.tsx             ← queries tires_staff_view
│   │   ├── Dashboard.tsx         ← owner, incl. agent health panel
│   │   ├── Financials.tsx
│   │   ├── StockManagement.tsx   ← owner, shows avg_cost + margin
│   │   ├── Promotions.tsx
│   │   ├── ContentApproval.tsx
│   │   ├── POApproval.tsx
│   │   ├── CRM.tsx
│   │   ├── Intelligence.tsx
│   │   ├── AuditLog.tsx          ← from TireHub
│   │   ├── Staff.tsx             ← fix #8 applied (Bearer null guard)
│   │   ├── Settings.tsx
│   │   ├── Interbranch.tsx
│   │   └── NotFound.tsx
│   ├── components/
│   │   ├── ui/                   ← 50 shadcn components (TireHub)
│   │   ├── layout/               ← Sidebar (role-aware), TopBar, ProtectedRoute
│   │   ├── sales/                ← SalesForm, StockTable, REXPanel, TRENDPanel, RecentSales
│   │   ├── dashboard/            ← MetricCards, RevenueChart, AlertsPanel,
│   │   │                            PendingApprovals, AgentHealthPanel
│   │   ├── promotions/           ← ProposalCard, ContentPreview, FacebookMockup
│   │   └── financials/           ← PLSummary, PLChart, PLTable
│   ├── hooks/                    ← 24 hooks (see table above)
│   ├── contexts/
│   │   ├── AuthContext.tsx        ← fix #6 applied (loading fix)
│   │   └── LanguageContext.tsx    ← TireHub EN/TH
│   ├── integrations/supabase/    ← client.ts, types.ts (regenerate after migrations)
│   └── lib/
│       ├── utils.ts
│       ├── translations.ts        ← TireHub EN/TH strings (extend for new pages)
│       └── excelParser.ts         ← TireHub bulk import
├── supabase/
│   ├── migrations/               ← 28 files (00–27)
│   └── functions/
│       ├── record-sale/
│       ├── line-webhook/
│       ├── line-push-notification/
│       ├── publish-promotion/
│       ├── approve-po/
│       ├── interbranch-stock/
│       ├── send-invite/          ← TireHub kept
│       ├── scout-daily/
│       ├── hawk-reorder/
│       ├── atlas-weekly/
│       ├── intel-oracle/
│       ├── intel-sage/
│       ├── intel-spark/
│       ├── intel-pixel/
│       └── lens-deadstock/
└── config/
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── .env.local                ← NEVER commit this
    ← .claude/settings.local.json added to .gitignore
```

---

## Cost Estimate

| Item | Estimated cost | Notes |
|------|---------------|-------|
| Supabase | Free – $25/month | Free: 500 MB DB, 2 GB storage, 500K fn invocations |
| LINE Messaging API | Free (200 push/mo) – ~1,500 THB/mo | Depends on alert volume |
| LINE OA | Free (500 msg/mo) – ~990 THB/mo | Promotion broadcasts |
| Facebook Graph API | Free | Standard Page publishing |
| Claude API | ~150–400 THB/month | 5 agents, 1 call each, weekly cadence |
| **Total** | **~3,000–6,000 THB/month** | Varies by LINE plan + Supabase tier |

---

## Build Plan — 4 Phases

### Phase 1 — Core sale flow (Week 1–2)
Goal: end-to-end sale with atomic stock deduction, CRM, receipt, financials.

- Migrations 00–15 (all tables, views, RLS, grants)
- Migrations 18–20 (atomic stock, costing, REX/TREND functions)
- Build `record-sale` with BOLT-first blocking order
- Port TireHub `/auth` with fix #3 (join request error handling)
- Port TireHub `useAuth` with fix #6 (loading fix)
- Restore `Pending.tsx` mount redirect (fix #7)
- Build `/sales` page querying tires_staff_view with REX + TREND panels
- **Test:** two simultaneous sales of same tyre → verify no overselling via atomic function
- **Test:** log in as staff → confirm `cost_price`/`avg_cost` absent from every API response (not just UI)

### Phase 2 — Scheduled agents + LINE (Week 3–4)
Goal: automated daily/weekly LINE updates. Every failure visible.

- Migrations 21–24 (triggers, VERA, Vault secrets, pg_cron)
- Build `scout-daily`, `hawk-reorder`, `atlas-weekly`, `lens-deadstock`
- Build `line-webhook` (with role-branched view queries) + `line-push-notification` (Vault)
- Add `agent_runs` logging to every scheduled function
- Port TireHub `/settings` LINE linking + webhook status
- Apply fix #8 (Bearer null guard) to all functions using session token
- **Test:** force low stock → verify HAWK draft + LINE alert + agent_runs success row
- **Test:** simulate Edge Function error → verify agent_runs failure row visible on dashboard

### Phase 3 — Financial layer + owner dashboard (Week 5–6)
Goal: live P&L, threshold alerts, staff provably cannot see costs.

- Build VERA trigger; FINN inside atlas-weekly
- Build `/dashboard` (metrics, VERA alerts, pending approvals, agent health from agent_runs)
- Build `/financials` (P&L with date range)
- Build `/stock-management` (avg_cost + margin per SKU, LENS flags)
- Build `/crm` (segment filter, customer history)
- Build `/po-approval` (HAWK approval flow, qty editable)
- Port TireHub `/audit-log` and `/staff` pages with fix #8
- **Test:** staff API call to financials endpoint → verify 0 rows returned (RLS blocks, not just UI)
- **Test:** approve-po → verify recalc_avg_cost_on_purchase runs correctly

### Phase 4 — Intelligence agents + recommendations + promotions (Week 7–9)
Goal: agents propose promotions, REX guides every sale, content is AI-generated.

- Build `intel-oracle`, `intel-sage`, `intel-spark` (staggered cron), `intel-pixel` (event trigger)
- Build `publish-promotion` (Vault tokens, Facebook + LINE OA)
- Build `interbranch-stock` + `send-invite`
- Build `/promotions`, `/content-approval`, `/intelligence`, `/interbranch`
- **Test:** full intelligence loop — trigger oracle → sage → spark staggered → owner approves proposal → pixel fires → owner approves content → verify Facebook post published + LINE OA sent → verify sales during promo tagged with promotion_id
- **Test:** check agent_runs durations → confirm no intel function exceeds 60s

---

## What Came From Where

| Component | Source |
|-----------|--------|
| React + Vite + TypeScript + Tailwind stack | TireHub (unchanged) |
| shadcn/ui 50 components | TireHub (unchanged) |
| Auth flow + invite system | TireHub (fixes #3, #6, #7, #8 applied) |
| LINE webhook + push + linking | TireHub (Vault token resolution added) |
| Audit log, staff management | TireHub (kept as-is) |
| stores_signup_search view | TireHub (kept) |
| Excel import (excelParser.ts) | TireHub (kept) |
| EN/TH translations | TireHub (extend for new pages) |
| Supabase Vault for secrets | New (fix #1) |
| Database views for column permissions | New (architecture fix) |
| Atomic stock deduction | New (race condition fix) |
| Weighted-average costing | New |
| agent_runs observability table | New |
| financials + P&L tables | New |
| promotions lifecycle | New |
| intelligence_reports table | New |
| rex_mappings + TREND | New |
| 19 AI agents (all zones) | New |
| 7 new Edge Functions | New |
| pg_cron scheduled jobs | New |
| All intelligence + financial pages | New |

---

*18 tables · 28 migrations · 15 Edge Functions · 24 custom hooks · 17 pages · 19 AI agents · 3 permission layers · 3 approval gates · 8 code review fixes applied*

---

## Claude API Prompts — Intelligence Agents

These are the system and user prompt structures passed to each Claude call. Keep prompts in a `/supabase/functions/_prompts/` directory and import them into each function.

### ORACLE — `prompts/oracle.ts`

```typescript
export const ORACLE_SYSTEM = `
You are ORACLE, a business data analyst for a tire retail shop.
You receive structured sales and financial data and produce a concise insight report.
Your output must be valid JSON matching the schema provided.
Do not include markdown, code fences, or any text outside the JSON object.
`;

export const oracleUserPrompt = (data: OracleInput) => `
Analyse the following tire shop performance data and return a JSON insight report.

DATA:
${JSON.stringify(data, null, 2)}

Return JSON with this exact structure:
{
  "summary": "2-3 sentence executive summary",
  "top_performers": [{ "tire_name": "", "revenue": 0, "units": 0, "margin_pct": 0 }],
  "underperformers": [{ "tire_name": "", "reason": "" }],
  "margin_trend": "improving | stable | declining",
  "revenue_vs_prior": { "change_pct": 0, "direction": "up | down | flat" },
  "recommendations": ["string", "string", "string"]
}
`;
```

---

### SAGE — `prompts/sage.ts`

```typescript
export const SAGE_SYSTEM = `
You are SAGE, a demand forecaster for a tire retail shop in Thailand.
You receive 12 months of historical monthly sales data and identify seasonal patterns.
Your output must be valid JSON. No markdown, no extra text.
`;

export const sageUserPrompt = (data: SageInput) => `
Forecast demand for the next 8 weeks based on this 12-month sales history.
Account for Thai seasonal patterns: rainy season (May–October), Songkran (April), New Year (December–January).

HISTORY:
${JSON.stringify(data, null, 2)}

Return JSON:
{
  "forecast_weeks": [
    { "week": "YYYY-WW", "expected_demand_index": 0.0, "note": "" }
  ],
  "seasonal_peaks": [{ "period": "", "description": "", "recommended_stock_increase_pct": 0 }],
  "slow_periods": [{ "period": "", "recommendation": "" }],
  "summary": "2-3 sentence forecast summary"
}
`;
```

---

### SPARK — `prompts/spark.ts`

```typescript
export const SPARK_SYSTEM = `
You are SPARK, a promotion planner for a tire retail shop.
You receive business performance data and propose exactly 3 promotion options.
Each option must produce a positive gross margin. Reject any option that does not.
Your output must be valid JSON. No markdown, no extra text.
`;

export const sparkUserPrompt = (data: SparkInput) => `
Propose 3 distinct promotion options based on the following business data.
Each option must be financially sound (positive gross margin required).

DATA:
${JSON.stringify(data, null, 2)}

Return JSON:
{
  "proposals": [
    {
      "title": "Short promotion title",
      "mechanic": "Full description e.g. Buy 4 tyres get free wheel balancing",
      "target_segment": "All | VIP | At-risk",
      "channel": "LINE OA | Facebook | Both",
      "suggested_duration_days": 7,
      "expected_revenue_lift_pct": 0,
      "margin_impact_pct": 0,
      "rationale": "Why this promotion makes sense given the data"
    }
  ]
}
`;
```

---

### PIXEL — `prompts/pixel.ts`

```typescript
export const PIXEL_SYSTEM = `
You are PIXEL, a marketing copywriter for a tire retail shop in Thailand.
Write engaging Thai-market promotional copy in a friendly, trustworthy tone.
Your output must be valid JSON. No markdown, no extra text.
`;

export const pixelUserPrompt = (promo: PixelInput) => `
Write promotional copy for the following approved promotion.

PROMOTION:
${JSON.stringify(promo, null, 2)}

Return JSON:
{
  "facebook_post": {
    "copy": "100-150 word Facebook post in Thai-friendly style. Include the offer, dates, and a call-to-action.",
    "hashtags": ["#hashtag1", "#hashtag2"]
  },
  "line_oa_message": {
    "copy": "50-80 word LINE message. Concise, clear offer, strong call-to-action."
  }
}
`;
```

---

### FINN — `prompts/finn.ts`

```typescript
export const FINN_SYSTEM = `
You are FINN, a financial reporter for a tire retail shop.
You receive aggregated P&L data and write a clear, concise narrative summary.
Highlight significant changes. Flag anything that needs the owner's attention.
Your output must be valid JSON. No markdown, no extra text.
`;

export const finnUserPrompt = (data: FinnInput) => `
Write a P&L narrative for the following financial data.

DATA:
${JSON.stringify(data, null, 2)}

Return JSON:
{
  "period_label": "e.g. Week 23, 2026",
  "headline": "One sentence: how did the business perform?",
  "revenue_commentary": "1-2 sentences on revenue",
  "margin_commentary": "1-2 sentences on gross margin",
  "profit_commentary": "1-2 sentences on net profit",
  "flags": ["Any items needing owner attention"],
  "comparison_note": "vs prior period in plain language"
}
`;
```

---

## TypeScript Types — Core Interfaces

Place these in `src/integrations/supabase/types.ts` alongside the auto-generated Supabase types.

```typescript
// Agent input/output types

export interface OracleInput {
  period_days: 30 | 60 | 90;
  sales_by_brand: Array<{ brand: string; revenue: number; units: number; margin_pct: number }>;
  revenue_current: number;
  revenue_prior: number;
  gross_margin_pct: number;
  dead_stock_items: Array<{ tire_name: string; days_since_sale: number; quantity: number }>;
}

export interface SageInput {
  monthly_volumes: Array<{ month: string; units: number; revenue: number }>;
  top_sizes: string[];
}

export interface SparkInput {
  oracle_insight: OracleInsightReport;
  sage_forecast: SageForecastReport;
  current_pnl: FinnReport;
  dead_stock: Array<{ tire_id: string; tire_name: string; margin_pct: number; suggestion: string }>;
  stock_levels: Array<{ tire_id: string; tire_name: string; quantity: number }>;
}

export interface PixelInput {
  title: string;
  mechanic: string;
  target_segment: string;
  channel: string;
  start_date: string;
  end_date: string;
}

export interface FinnInput {
  period: 'daily' | 'weekly' | 'monthly';
  period_label: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
  net_profit: number;
  revenue_prior?: number;
  gross_margin_pct_prior?: number;
}

// Permission helpers
export interface UserPermissions {
  canViewCost: boolean;
  canViewFinancials: boolean;
  canApprovePromotions: boolean;
  canApprovePOs: boolean;
  canApproveContent: boolean;
  canManageStaff: boolean;
  canViewIntelligence: boolean;
  isOwner: boolean;
  isStaff: boolean;
  isInterbranch: boolean;
}

// Agent run tracking
export type AgentName =
  | 'BOLT' | 'IRIS' | 'PING' | 'DOC' | 'OTTO'
  | 'SCOUT' | 'HAWK' | 'RADAR' | 'ATLAS' | 'LENS'
  | 'ORACLE' | 'SAGE' | 'SPARK' | 'PIXEL' | 'FINN'
  | 'VERA' | 'REX' | 'TREND';

export type AgentStatus = 'running' | 'success' | 'failed';
```

---

## Environment Variables

<!-- NOTE: message was truncated here — paste the remaining content to append -->
