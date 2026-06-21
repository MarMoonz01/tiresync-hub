import { useState } from "react";
import { useFinancials } from "@/hooks/useFinancials";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

function formatMoney(n: number | null | undefined) {
  return `฿${(n ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

export default function Financials() {
  const [period, setPeriod] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const { data: rows = [], isLoading } = useFinancials(period);

  const sales = rows.filter((r) => r.type === "sale");
  const totalRevenue = sales.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const totalCogs = sales.reduce((s, r) => s + (r.cogs ?? 0), 0);
  const totalProfit = sales.reduce((s, r) => s + (r.gross_profit ?? 0), 0);
  const marginPct = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0";

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 md:px-6 py-4 flex items-center gap-3">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">การเงิน</h1>
        <div className="ml-auto">
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
          />
        </div>
      </header>

      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "รายได้รวม", value: formatMoney(totalRevenue), color: "text-emerald-600" },
            { label: "ต้นทุน (COGS)", value: formatMoney(totalCogs), color: "text-amber-600" },
            { label: "กำไรขั้นต้น", value: formatMoney(totalProfit), color: totalProfit >= 0 ? "text-emerald-600" : "text-red-600" },
            { label: "อัตรากำไร", value: `${marginPct}%`, color: "text-primary" },
          ].map((card) => (
            <div key={card.label} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className={`text-xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Transaction table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">วันที่</th>
                <th className="text-left px-4 py-3 font-medium">ประเภท</th>
                <th className="text-right px-4 py-3 font-medium">รายได้</th>
                <th className="text-right px-4 py-3 font-medium">กำไร</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">กำลังโหลด...</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">ไม่มีข้อมูลในเดือนนี้</td></tr>
              )}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-muted-foreground">{row.period_day ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{row.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">{formatMoney(row.revenue)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${(row.gross_profit ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {(row.gross_profit ?? 0) >= 0 ? (
                      <span className="inline-flex items-center gap-1"><TrendingUp className="w-3 h-3" />{formatMoney(row.gross_profit)}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1"><TrendingDown className="w-3 h-3" />{formatMoney(row.gross_profit)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
