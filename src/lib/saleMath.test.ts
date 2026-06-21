import { describe, it, expect } from "vitest";
import {
  computeTotalRevenue,
  computeGrossProfit,
  customerSegment,
  isLowStock,
  VIP_THRESHOLD,
} from "./saleMath";

describe("computeTotalRevenue", () => {
  it("multiplies price by quantity and adds services", () => {
    expect(computeTotalRevenue(2000, 4, 550)).toBe(8550);
  });
  it("defaults service total to zero", () => {
    expect(computeTotalRevenue(2000, 4)).toBe(8000);
  });
  it("handles a single unit with no services", () => {
    expect(computeTotalRevenue(2500, 1)).toBe(2500);
  });
});

describe("computeGrossProfit", () => {
  it("subtracts COGS (avg_cost * qty) from revenue", () => {
    // revenue 8000, cost 1500*4 = 6000 -> profit 2000
    expect(computeGrossProfit(8000, 1500, 4)).toBe(2000);
  });
  it("can be negative when sold below cost", () => {
    expect(computeGrossProfit(1000, 1500, 1)).toBe(-500);
  });
  it("treats services (revenue beyond tires) as pure margin", () => {
    // revenue includes 550 service; cost only on tires
    expect(computeGrossProfit(8550, 1500, 4)).toBe(2550);
  });
});

describe("customerSegment", () => {
  it("is Regular below the VIP threshold", () => {
    expect(customerSegment(VIP_THRESHOLD - 1)).toBe("Regular");
  });
  it("is VIP at exactly the threshold", () => {
    expect(customerSegment(VIP_THRESHOLD)).toBe("VIP");
  });
  it("is VIP above the threshold", () => {
    expect(customerSegment(120000)).toBe("VIP");
  });
});

describe("isLowStock", () => {
  it("is true strictly below threshold", () => {
    expect(isLowStock(2, 3)).toBe(true);
  });
  it("is false exactly at threshold (matches the alert rule)", () => {
    expect(isLowStock(3, 3)).toBe(false);
  });
  it("is false above threshold", () => {
    expect(isLowStock(10, 3)).toBe(false);
  });
  it("flags zero stock", () => {
    expect(isLowStock(0, 1)).toBe(true);
  });
});
