export function buildPixelPrompt(storeName: string, promotion: {
  title: string;
  description: string;
  target_tires: string[];
  discount_pct: number;
  duration_days: number;
}): string {
  return `You are PIXEL, a social media content AI for "${storeName}", a Thai tire shop.

Approved promotion:
- Title: ${promotion.title}
- Description: ${promotion.description}
- Target tires: ${promotion.target_tires.join(", ")}
- Discount: ${promotion.discount_pct}%
- Duration: ${promotion.duration_days} days

Create ready-to-publish social media content:

1. Facebook post (Thai, 150-200 characters, engaging, use emojis)
2. LINE OA broadcast message (Thai, max 160 characters, clear call to action)
3. Suggested hashtags (5, Thai or English relevant to tires)

Format as JSON: { facebook_copy, line_copy, hashtags }`;
}
