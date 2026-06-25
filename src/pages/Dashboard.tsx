import { useNotifications } from "@/hooks/useNotifications";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useDashboardTrend } from "@/hooks/useDashboardTrend";
import { useAuth } from "@/hooks/useAuth";
import { Sparkline } from "@/components/ui/Sparkline";
import {
  TrendingUp, ShoppingCart, Bell, Package, Trophy, Zap, Plus, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

const baht = (n: number) => "฿" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

const tints: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600",
  violet: "bg-violet-500/10 text-violet-600",
  sky: "bg-sky-500/10 text-sky-600",
  amber: "bg-amber-500/10 text-amber-600",
  rose: "bg-rose-500/10 text-rose-600",
};
const sparkColor: Record<string, string> = {
  primary: "text-primary",
  emerald: "text-emerald-500",
  violet: "text-violet-500",
  sky: "text-sky-500",
};

function BigStat({
  label, value, icon: Icon, tint, delta, series, href,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tint: "primary" | "emerald" | "violet" | "sky";
  delta?: number;
  series?: number[];
  href?: string;
}) {
  const up = (delta ?? 0) >= 0;
  const card = (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-lg h-full">
      <div className="flex items-center justify-between mb-3">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tints[tint]}`}><Icon className="w-5 h-5" /></span>
        {delta !== undefined && delta !== 0 && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${up ? "text-emerald-600" : "text-rose-600"}`}>
            {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold tracking-tight tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground font-medium mt-1">{label}</p>
      {series && series.some((v) => v > 0) && (
        <div className={`mt-3 ${sparkColor[tint]}`}><Sparkline data={series} /></div>
      )}
    </div>
  );
  return href ? <Link to={href} className="block h-full">{card}</Link> : card;
}

function MiniStat({ label, value, icon: Icon, tint, href }: { label: string; value: string | number; icon: LucideIcon; tint: string; href?: string }) {
  const card = (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-lg flex items-center gap-3 h-full">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tints[tint]}`}><Icon className="w-5 h-5" /></span>
      <div>
        <p className="text-xl font-extrabold tabular-nums leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
  return href ? <Link to={href} className="block h-full">{card}</Link> : card;
}

function NeedsAttention() {
  const { data: notifications = [] } = useNotifications();
  const alerts = notifications.filter((n) => !n.is_read).slice(0, 5);
  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
      <div className="px-5 py-4 border-b border-border"><h3 className="font-bold text-[15px]">รอการดำเนินการ</h3></div>
      <div className="p-3 flex flex-col gap-2.5">
        {alerts.map((n) => (
          <div key={n.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-secondary/50">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Bell className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold truncate">{n.title}</p>
              {n.body && <p className="text-[11px] text-muted-foreground truncate">{n.body}</p>}
            </div>
          </div>
        ))}
        {alerts.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">ไม่มีรายการรอดำเนินการ 🎉</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats } = useDashboardStats();
  const { data: trend } = useDashboardTrend();
  const { profile, store } = useAuth();

  const hr = new Date().getHours();
  const greet = hr < 12 ? "อรุณสวัสดิ์" : hr < 18 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";
  const name = (profile?.full_name || profile?.email || "").split(" ")[0] || "เจ้าของร้าน";
  const margin = (stats?.totalRevenue ?? 0) > 0 ? (((stats?.totalProfit ?? 0) / (stats!.totalRevenue)) * 100).toFixed(1) : "0";

  return (
    <div className="min-h-screen pb-8">
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
        {/* Greeting header */}
        <div className="flex items-end justify-between gap-4 flex-wrap pt-2">
          <div>
            <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">{greet}, {name}</h1>
            <p className="text-sm text-muted-foreground mt-1">ภาพรวมร้านวันนี้{store?.name ? ` · ${store.name}` : ""}</p>
          </div>
          <Link to="/sales" className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold shadow-soft hover:opacity-90 transition">
            <Plus className="w-4 h-4" /> เริ่มการขาย
          </Link>
        </div>

        {/* Headline KPIs with sparklines */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <BigStat label="รายได้เดือนนี้" value={baht(stats?.totalRevenue ?? 0)} icon={TrendingUp} tint="primary" delta={trend?.delta.revenue} series={trend?.revenue} href="/financials" />
          <BigStat label="กำไรขั้นต้น" value={baht(stats?.totalProfit ?? 0)} icon={Trophy} tint="emerald" delta={trend?.delta.profit} series={trend?.profit} href="/financials" />
          <BigStat label="อัตรากำไร" value={`${margin}%`} icon={Zap} tint="violet" delta={trend?.delta.margin} series={trend?.margin} />
          <BigStat label="รายการขาย" value={String(stats?.totalSales ?? 0)} icon={ShoppingCart} tint="sky" delta={trend?.delta.sales} series={trend?.sales} href="/sales" />
        </div>

        {/* Secondary + needs attention */}
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-4">
          <div className="grid grid-cols-2 gap-3.5 content-start">
            <MiniStat label="สต็อกต่ำ" value={stats?.lowStockCount ?? 0} icon={Package} tint="amber" href="/stock" />
            <MiniStat label="การแจ้งเตือน" value={stats?.unreadAlerts ?? 0} icon={Bell} tint="rose" />
          </div>
          <NeedsAttention />
        </div>
      </div>
    </div>
  );
}
