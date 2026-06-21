export function buildFinnPrompt(storeName: string, data: {
  weeklyRevenue: number;
  weeklyProfit: number;
  weeklyCogs: number;
  weekLabel: string;
  prevWeekRevenue?: number;
}): string {
  const growthText = data.prevWeekRevenue
    ? `Previous week revenue: ฿${data.prevWeekRevenue.toFixed(0)} (${data.weeklyRevenue > data.prevWeekRevenue ? "+" : ""}${((( data.weeklyRevenue - data.prevWeekRevenue) / data.prevWeekRevenue) * 100).toFixed(1)}% change)`
    : "No previous week data available";

  const marginPct = data.weeklyRevenue > 0
    ? ((data.weeklyProfit / data.weeklyRevenue) * 100).toFixed(1)
    : "0";

  return `You are FINN, a financial health AI for "${storeName}", a Thai tire shop.

Week ${data.weekLabel} financials:
- Revenue: ฿${data.weeklyRevenue.toFixed(0)}
- COGS: ฿${data.weeklyCogs.toFixed(0)}
- Gross profit: ฿${data.weeklyProfit.toFixed(0)} (${marginPct}% margin)
${growthText}

Provide a brief Thai-language P&L commentary (2-3 sentences):
1. How did this week perform?
2. Is the margin healthy for a tire shop? (industry benchmark: 20-35%)
3. One financial recommendation

Be direct and practical. Reply in Thai.`;
}
