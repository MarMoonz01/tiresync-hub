// ────────────────────────────────────────────────────────────────────────────
// Sale business rules — pure functions.
//
// These mirror the authoritative logic in the `record_sale_txn` Postgres
// function (supabase/migrations/20260610000025_atomic_sale.sql). The DB is the
// source of truth at runtime; these exist so the same rules are usable in the UI
// (totals preview, low-stock count) AND are unit-testable. Keep them in sync.
// ────────────────────────────────────────────────────────────────────────────

export const VIP_THRESHOLD = 50000;

/** Total charged to the customer: tires + add-on services. */
export function computeTotalRevenue(
  sellPrice: number,
  quantity: number,
  serviceTotal = 0
): number {
  return sellPrice * quantity + serviceTotal;
}

/** Profit after cost of goods sold. Services have no COGS here. */
export function computeGrossProfit(
  totalRevenue: number,
  avgCost: number,
  quantity: number
): number {
  return totalRevenue - avgCost * quantity;
}

/** Customer tier from lifetime spend. */
export function customerSegment(totalSpend: number): "VIP" | "Regular" {
  return totalSpend >= VIP_THRESHOLD ? "VIP" : "Regular";
}

/** Whether remaining stock is at/below the reorder threshold. */
export function isLowStock(quantityAfter: number, minThreshold: number): boolean {
  return quantityAfter < minThreshold;
}
