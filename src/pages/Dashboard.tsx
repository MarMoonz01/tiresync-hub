import { useAgentRuns } from "@/hooks/useAgentRuns";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useNotifications } from "@/hooks/useNotifications";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import {
  LayoutDashboard, CheckCircle, AlertCircle, Clock,
  TrendingUp, ShoppingCart, AlertTriangle, Bell,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { Link } from "react-router-dom";

function MetricCard({ label, value, color, href }: { label: string; value: string | number; color: string; href?: string }) {
  const content = (
    <div className="rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
  return href ? <Link to={href}>{content}</Link> : content;
}

function AgentHealthPanel() {
  const { data: runs = [], isLoading } = useAgentRuns(30);

  const latestByAgent = runs.reduce<Record<string, (typeof runs)[0]>>((acc, run) => {
    if (!acc[run.agent] || run.created_at > acc[run.agent].created_at) acc[run.agent] = run;
    return acc;
  }, {});

  const agents = Object.values(latestByAgent);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border">
        <p className="font-semibold text-sm">AI Agent Health</p>
      </div>
      {isLoading && <p className="p-4 text-sm text-muted-foreground">กำลังโหลด...</p>}
      {!isLoading && agents.length === 0 && (
        <p className="p-4 text-sm text-muted-foreground">ยังไม่มีข้อมูล — agents จะแสดงหลัง cron แรกทำงาน</p>
      )}
      <div className="divide-y divide-border">
        {agents.map((run) => (
          <div key={run.id} className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {run.status === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : run.status === "error" ? (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium">{run.agent}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[220px]">{run.summary ?? "—"}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground whitespace-nowrap ml-2">
              {formatDistanceToNow(new Date(run.created_at), { addSuffix: true, locale: th })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsPanel() {
  const { data: notifications = [] } = useNotifications();
  const alerts = notifications.filter((n) => !n.is_read).slice(0, 5);

  if (alerts.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10">
      <div className="px-4 py-3 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
        <Bell className="w-4 h-4 text-amber-600" />
        <p className="font-semibold text-sm text-amber-800 dark:text-amber-400">การแจ้งเตือน ({alerts.length})</p>
      </div>
      <div className="divide-y divide-amber-200 dark:divide-amber-800">
        {alerts.map((n) => (
          <div key={n.id} className="px-4 py-3">
            <p className="text-sm font-medium">{n.title}</p>
            {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats } = useDashboardStats();
  const { data: pendingPOs = [] } = usePurchaseOrders("pending");

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 md:px-6 py-4 flex items-center gap-3">
        <LayoutDashboard className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">แดชบอร์ด</h1>
      </header>

      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard
            label="รายได้เดือนนี้"
            value={`฿${(stats?.totalRevenue ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`}
            color="text-emerald-600"
            href="/financials"
          />
          <MetricCard
            label="กำไรขั้นต้น"
            value={`฿${(stats?.totalProfit ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`}
            color={(stats?.totalProfit ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}
            href="/financials"
          />
          <MetricCard
            label="รายการขาย"
            value={stats?.totalSales ?? 0}
            color="text-primary"
            href="/sales"
          />
          <MetricCard
            label="สต็อกต่ำ"
            value={stats?.lowStockCount ?? 0}
            color={(stats?.lowStockCount ?? 0) > 0 ? "text-amber-600" : "text-muted-foreground"}
            href="/stock"
          />
          <MetricCard
            label="PO รออนุมัติ"
            value={pendingPOs.length}
            color={pendingPOs.length > 0 ? "text-amber-600" : "text-muted-foreground"}
            href="/po-approval"
          />
          <MetricCard
            label="การแจ้งเตือน"
            value={stats?.unreadAlerts ?? 0}
            color="text-muted-foreground"
          />
        </div>

        <AlertsPanel />
        <AgentHealthPanel />
      </div>
    </div>
  );
}
