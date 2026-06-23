import { useState } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { Input } from "@/components/ui/input";
import { Search, HeartHandshake, Crown, Users, TrendingUp } from "lucide-react";

const baht = (n: number) => "฿" + (n ?? 0).toLocaleString("en-US");

function StatCard({ icon: Icon, label, value, tint }: { icon: typeof Crown; label: string; value: string; tint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tint}`}><Icon className="w-5 h-5" /></span>
      <p className="text-2xl font-extrabold tracking-tight tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground font-medium mt-1">{label}</p>
    </div>
  );
}

export default function CRM() {
  const [search, setSearch] = useState("");
  const { data: customers = [], isLoading } = useCustomers(search);

  const vip = customers.filter((c) => c.segment === "VIP");
  const totalRevenue = customers.reduce((s, c) => s + c.total_spend, 0);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="pt-2">
        <h1 className="text-2xl md:text-[26px] font-extrabold tracking-tight flex items-center gap-2">
          <HeartHandshake className="w-6 h-6 text-primary" /> CRM — ลูกค้าสัมพันธ์
        </h1>
        <p className="text-sm text-muted-foreground mt-1">กลุ่มลูกค้า · ยอดสะสม · การกลับมาซื้อ</p>
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        <StatCard icon={Crown} label="ลูกค้า VIP" value={vip.length.toLocaleString()} tint="bg-violet-500/10 text-violet-600" />
        <StatCard icon={Users} label="ลูกค้าทั้งหมด" value={customers.length.toLocaleString()} tint="bg-primary/10 text-primary" />
        <StatCard icon={TrendingUp} label="ยอดขายสะสม" value={baht(totalRevenue)} tint="bg-emerald-500/10 text-emerald-600" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9 rounded-xl bg-secondary/60" placeholder="ค้นหาชื่อ, เบอร์โทร, ทะเบียน" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {[["ชื่อ", "left", ""], ["ทะเบียน", "left", "hidden md:table-cell"], ["ยอดซื้อ", "right", ""], ["ครั้ง", "right", ""], ["กลุ่ม", "right", "hidden md:table-cell"]].map(([h, a, x]) => (
                  <th key={h} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-${a} ${x}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">กำลังโหลด...</td></tr>}
              {!isLoading && customers.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">ไม่พบลูกค้า</td></tr>}
              {customers.map((c) => {
                const isVip = c.segment === "VIP";
                return (
                  <tr key={c.id} className={`hover:bg-secondary/40 transition-colors ${isVip ? "bg-violet-500/5" : ""}`}>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold">{c.name}</p>
                      {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{c.plate_number ?? "—"}</td>
                    <td className="px-4 py-3.5 text-right font-bold tabular-nums">{baht(c.total_spend)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{c.visit_count}</td>
                    <td className="px-4 py-3.5 text-right hidden md:table-cell">
                      {c.segment && (
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${isVip ? "bg-violet-500/10 text-violet-600" : "bg-secondary text-muted-foreground"}`}>{c.segment}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
