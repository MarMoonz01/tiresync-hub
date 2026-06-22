import { useState } from "react";
import { useFinancials } from "@/hooks/useFinancials";
import { TrendingUp, Truck, Trophy, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const money = (n: number | null | undefined) => "฿" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

function StatCard({ label, value, icon: Icon, tint }: { label: string; value: string; icon: LucideIcon; tint: string }) {
  const tints: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    violet: "bg-violet-500/10 text-violet-600",
    primary: "bg-primary/10 text-primary",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tints[tint]}`}><Icon className="w-5 h-5" /></span>
      <p className="text-2xl font-extrabold tracking-tight tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground font-medium mt-1">{label}</p>
    </div>
  );
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
    <div className="min-h-screen pb-8">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-end justify-between gap-4 flex-wrap pt-2">
          <div>
            <h1 className="text-2xl md:text-[26px] font-extrabold tracking-tight flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" /> การเงิน
            </h1>
            <p className="text-sm text-muted-foreground mt-1">งบกำไรขาดทุน · รายเดือน</p>
          </div>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="text-sm border border-border rounded-xl px-3 py-2 bg-card font-medium"
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <StatCard label="รายได้รวม" value={money(totalRevenue)} icon={TrendingUp} tint="emerald" />
          <StatCard label="ต้นทุน (COGS)" value={money(totalCogs)} icon={Truck} tint="amber" />
          <StatCard label="กำไรขั้นต้น" value={money(totalProfit)} icon={Trophy} tint={totalProfit >= 0 ? "emerald" : "violet"} />
          <StatCard label="อัตรากำไร" value={`${marginPct}%`} icon={Zap} tint="primary" />
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-bold text-[15px]">งบกำไรขาดทุน</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["วันที่", "ประเภท", "รายได้", "กำไร"].map((h, i) => (
                    <th key={h} className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${i >= 2 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && <tr><td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">กำลังโหลด...</td></tr>}
                {!isLoading && rows.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">ไม่มีข้อมูลในเดือนนี้</td></tr>}
                {rows.map((row) => {
                  const profit = row.gross_profit ?? 0;
                  const tone = row.type === "sale" ? "bg-emerald-500/10 text-emerald-600" : row.type === "expense" ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600";
                  return (
                    <tr key={row.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="px-5 py-3.5 text-muted-foreground tabular-nums">{row.period_day ?? "—"}</td>
                      <td className="px-5 py-3.5"><span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${tone}`}>{row.type}</span></td>
                      <td className="px-5 py-3.5 text-right tabular-nums">{row.revenue ? money(row.revenue) : "—"}</td>
                      <td className={`px-5 py-3.5 text-right font-bold tabular-nums ${profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {profit < 0 ? "−" : ""}{money(Math.abs(profit))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
