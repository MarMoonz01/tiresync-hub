import { motion } from "framer-motion";
import { 
  CircleDot, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  Package,
  Plus,
  Upload,
  ArrowRight,
  ShoppingCart,
  XCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { StockMovementChart } from "@/components/dashboard/StockMovementChart";
import { RecentActivityList } from "@/components/dashboard/RecentActivityList";

export default function Dashboard() {
  const { profile, store, isStaff } = useAuth();
  const { canAdd } = usePermissions();
  const { loading, tireStats, salesStats, dailyMovements, recentLogs } = useDashboardStats();

  const stats = [
    {
      title: "Total Tires",
      value: tireStats.totalTires,
      icon: CircleDot,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Stock",
      value: tireStats.totalStock,
      icon: Package,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Low Stock",
      value: tireStats.lowStockCount,
      icon: AlertTriangle,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Out of Stock",
      value: tireStats.outOfStockCount,
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  const salesMetrics = [
    {
      title: "This Month Sales",
      value: salesStats.thisMonth,
      icon: ShoppingCart,
      color: "text-success",
      bgColor: "bg-success/10",
      trend: salesStats.percentChange !== 0 ? {
        value: salesStats.percentChange,
        isPositive: salesStats.percentChange > 0,
      } : undefined,
    },
    {
      title: "Last Month Sales",
      value: salesStats.lastMonth,
      icon: salesStats.percentChange >= 0 ? TrendingUp : TrendingDown,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
  ];

  // Filter quick actions based on permissions
  const quickActions = [
    // Add Tire - only if user can add
    ...(canAdd ? [{
      to: "/inventory/add",
      icon: Plus,
      label: "Add Tire",
      bgColor: "bg-primary/10",
      hoverBgColor: "bg-primary/20",
      iconColor: "text-primary",
    }] : []),
    // Import - only if user can add
    ...(canAdd ? [{
      to: "/import",
      icon: Upload,
      label: "Import",
      bgColor: "bg-accent/10",
      hoverBgColor: "bg-accent/20",
      iconColor: "text-accent",
    }] : []),
    // Inventory - always visible
    {
      to: "/inventory",
      icon: CircleDot,
      label: "Inventory",
      bgColor: "bg-success/10",
      hoverBgColor: "bg-success/20",
      iconColor: "text-success",
    },
    // Marketplace - always visible
    {
      to: "/marketplace",
      icon: Package,
      label: "Market",
      bgColor: "bg-warning/10",
      hoverBgColor: "bg-warning/20",
      iconColor: "text-warning",
    },
  ];

  return (
    <AppLayout>
      <div className="page-container">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Header */}
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Welcome, {profile?.full_name?.split(" ")[0] || "there"} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {store 
                ? (isStaff ? `Staff at ${store.name}` : `Managing ${store.name}`)
                : "Set up your store to start"}
            </p>
          </div>

          {/* Store Setup CTA - only show for non-staff users without a store */}
          {!store && !isStaff && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-0 shadow-soft bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">Set Up Your Store</h3>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Create your store profile to start managing inventory
                      </p>
                    </div>
                    <Link to="/store/setup">
                      <Button size="sm">
                        Get Started
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Inventory Stats Grid */}
          <div>
            <p className="section-header mb-3">Inventory</p>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stats.map((stat, index) => (
                  <StatCard
                    key={stat.title}
                    title={stat.title}
                    value={stat.value}
                    icon={stat.icon}
                    color={stat.color}
                    bgColor={stat.bgColor}
                    delay={index * 0.03}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sales Stats */}
          <div>
            <p className="section-header mb-3">Sales</p>
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {salesMetrics.map((stat, index) => (
                  <StatCard
                    key={stat.title}
                    title={stat.title}
                    value={stat.value}
                    icon={stat.icon}
                    color={stat.color}
                    bgColor={stat.bgColor}
                    trend={stat.trend}
                    delay={index * 0.03}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <p className="section-header mb-3">Quick Actions</p>
            <div className="grid grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <QuickActionCard key={action.to} {...action} />
              ))}
            </div>
          </div>

          {/* Charts & Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {loading ? (
              <>
                <Skeleton className="h-[320px] rounded-2xl" />
                <Skeleton className="h-[320px] rounded-2xl" />
              </>
            ) : (
              <>
                <StockMovementChart data={dailyMovements} />
                <RecentActivityList logs={recentLogs} />
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
