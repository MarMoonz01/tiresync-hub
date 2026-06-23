import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useNotifications } from "@/hooks/useNotifications";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAuth } from "@/hooks/useAuth";
import {
  TrendingUp, ShoppingCart, Bell,
  Package, Wallet, Trophy, CheckSquare, Plus, ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

const baht = (n: number) => "฿" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

function StatCard({
  label, value, icon: Icon, tint = "primary", href,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tint?: "primary" | "emerald" | "amber" | "violet" | "sky" | "rose";
  href?: string;
}) {
  const tints: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    violet: "bg-violet-500/10 text-violet-600",
    sky: "bg-sky-500/10 text-sky-600",
    rose: "bg-rose-500/10 text-rose-600",
  };
  const card = (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-lg h-full">
      <div className="flex items-center justify-between mb-3">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tints[tint]}`}>
          <Icon className="w-5 h-5" />
        </span>
        {href && <ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
      </div>
      <p className="text-2xl font-extrabold tracking-tight tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground font-medium mt-1">{label}</p>
    </div>
  );
  return href ? <Link to={href} className="block">{card}</Link> : card;
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-bold text-[15px]">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function NeedsAttention() {
  const { data: notifications = [] } = useNotifications();
  const { data: pendingPOs = [] } = usePurchaseOrders("pending");
  const alerts = notifications.filter((n) => !n.is_read).slice(0, 4);

  return (
    <Panel title="รอการดำเนินการ">
      <div className="p-3 flex flex-col gap-2.5">
        {pendingPOs.length > 0 && (
          <Link to="/po-approval" className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-secondary/50 hover:border-primary hover:bg-primary/5 transition-colors">
            <span className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0"><CheckSquare className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold"><span className="tabular-nums">{pendingPOs.length}</span> ใบสั่งซื้อรออนุมัติ</p>
              <p className="text-[11px] text-muted-foreground">ใบสั่งซื้อ</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        )}
        {alerts.map((n) => (
          <div key={n.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-secondary/50">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Bell className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold truncate">{n.title}</p>
              {n.body && <p className="text-[11px] text-muted-foreground truncate">{n.body}</p>}
            </div>
          </div>
        ))}
        {pendingPOs.length === 0 && alerts.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">ไม่มีรายการรอดำเนินการ 🎉</p>
        )}
      </div>
    </Panel>
  );
}

export default function Dashboard() {
  const { data: stats } = useDashboardStats();
  const { data: pendingPOs = [] } = usePurchaseOrders("pending");
  const { profile, store } = useAuth();

  const hr = new Date().getHours();
  const greet = hr < 12 ? "อรุณสวัสดิ์" : hr < 18 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";
  const name = (profile?.full_name || profile?.email || "").split(" ")[0] || "เจ้าของร้าน";

  return (
    <div className="min-h-screen pb-8">
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
        {/* Greeting header */}
        <div className="flex items-end justify-between gap-4 flex-wrap pt-2">
          <div>
            <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">{greet}, {name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              ภาพรวมร้านวันนี้{store?.name ? ` · ${store.name}` : ""}
            </p>
          </div>
          <Link to="/sales" className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold shadow-soft hover:opacity-90 transition">
            <Plus className="w-4 h-4" /> เริ่มการขาย
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
          <StatCard label="รายได้เดือนนี้" value={baht(stats?.totalRevenue ?? 0)} icon={TrendingUp} tint="primary" href="/financials" />
          <StatCard label="กำไรขั้นต้น" value={baht(stats?.totalProfit ?? 0)} icon={Trophy} tint="emerald" href="/financials" />
          <StatCard label="รายการขาย" value={stats?.totalSales ?? 0} icon={ShoppingCart} tint="sky" href="/sales" />
          <StatCard label="สต็อกต่ำ" value={stats?.lowStockCount ?? 0} icon={Package} tint="amber" href="/stock" />
          <StatCard label="PO รออนุมัติ" value={pendingPOs.length} icon={CheckSquare} tint="violet" href="/po-approval" />
          <StatCard label="การแจ้งเตือน" value={stats?.unreadAlerts ?? 0} icon={Wallet} tint="rose" />
        </div>

        {/* Panels */}
        <NeedsAttention />
      </div>
    </div>
  );
}
