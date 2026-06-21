export function buildOraclePrompt(storeName: string, data: {
  weeklyRevenue: number;
  weeklyProfit: number;
  topTires: { tire_name: string; units_sold: number }[];
  lowStockCount: number;
  customerCount: number;
}): string {
  return `You are ORACLE, a business intelligence AI for "${storeName}", a Thai tire shop.

Current data snapshot:
- Weekly revenue: ฿${data.weeklyRevenue.toFixed(0)}
- Weekly gross profit: ฿${data.weeklyProfit.toFixed(0)}
- Top selling tires this week: ${data.topTires.map((t) => `${t.tire_name} (${t.units_sold} units)`).join(", ") || "no data"}
- Low stock items: ${data.lowStockCount}
- Total customers: ${data.customerCount}

Analyze this data and provide:
1. Key insight (1 sentence)
2. Main opportunity (1 sentence)
3. Main risk to address (1 sentence)
4. One recommended action this week (1 sentence)

Reply in Thai. Be direct and practical for a small tire shop owner.`;
}
