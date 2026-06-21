export function buildSagePrompt(storeName: string, data: {
  salesHistory: { tire_name: string; units_sold: number; period: string }[];
  seasonMonth: number;
}): string {
  const salesText = data.salesHistory.length > 0
    ? data.salesHistory.map((s) => `${s.period}: ${s.tire_name} — ${s.units_sold} units`).join("\n")
    : "No sales history available yet";

  return `You are SAGE, a demand forecasting AI for "${storeName}", a Thai tire shop.

8-week sales history:
${salesText}

Current month: ${data.seasonMonth} (1=Jan, 12=Dec)

Provide a demand forecast for the next 4 weeks:
1. Top 3 tire sizes/brands likely to sell well (based on history + Thai seasonal patterns)
2. Recommended reorder quantities for each
3. One seasonal factor to watch (e.g., Songkran travel, rainy season, New Year road trips)

Reply in Thai. Be concise and actionable.`;
}
