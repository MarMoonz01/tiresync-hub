export function buildSparkPrompt(storeName: string, data: {
  deadstockTires: { tire_name: string; qty: number; days_no_sale: number }[];
  topTires: { tire_name: string; units_sold: number }[];
  currentMonth: number;
}): string {
  const deadstockText = data.deadstockTires.length > 0
    ? data.deadstockTires.map((t) => `- ${t.tire_name}: ${t.qty} units, ${t.days_no_sale} days without sale`).join("\n")
    : "None";

  const topText = data.topTires.slice(0, 5).map((t) => `- ${t.tire_name}: ${t.units_sold} units sold`).join("\n");

  return `You are SPARK, a promotions AI for "${storeName}", a Thai tire shop.

Deadstock (slow-moving inventory):
${deadstockText}

Best sellers this month:
${topText}

Current month: ${data.currentMonth}

Create 2 promotion proposals to clear deadstock or drive sales:
For each proposal provide:
- Title (short, catchy in Thai)
- Description (2-3 sentences in Thai)
- Target tire(s)
- Suggested discount percentage
- Duration (days)
- Suggested Facebook post hook sentence (Thai)
- Suggested LINE message (Thai, max 100 chars)

Format as JSON array with fields: title, description, target_tires, discount_pct, duration_days, facebook_hook, line_message`;
}
