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
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { StockMovementChart } from "@/components/dashboard/StockMovementChart";
import { RecentActivityList } from "@/components/dashboard/RecentActivityList";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { profile, store } = useAuth();
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

  const quickActions = [
    {
      to: "/inventory/add",
      icon: Plus,
      label: "Add Tire",
      bgColor: "bg-primary/10",
      hoverBgColor: "bg-primary/20",
      iconColor: "text-primary",
    },
    {
      to: "/import",
      icon: Upload,
      label: "Import Excel",
      bgColor: "bg-accent/10",
      hoverBgColor: "bg-accent/20",
      iconColor: "text-accent",
    },
    {
      to: "/inventory",
      icon: CircleDot,
      label: "View Inventory",
      bgColor: "bg-success/10",
      hoverBgColor: "bg-success/20",
      iconColor: "text-success",
    },
    {
      to: "/marketplace",
      icon: Package,
      label: "Marketplace",
      bgColor: "bg-warning/10",
      hoverBgColor: "bg-warning/20",
      iconColor: "text-warning",
    },
  ];

  return (
    <AppLayout>
      <div className="page-container">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {profile?.full_name?.split(" ")[0] || "there"}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {store 
                ? `Managing inventory for ${store.name}` 
                : "Set up your store to start managing inventory"}
            </p>
          </motion.div>

          {/* Store Setup CTA */}
          {!store && (
            <motion.div variants={itemVariants}>
              <Card className="glass-card border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">Set Up Your Store</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        Create your store profile to start managing your tire inventory
                      </p>
                    </div>
                    <Link to="/store/setup">
                      <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                        Get Started
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Inventory Stats Grid */}
          <motion.div variants={itemVariants}>
            <h2 className="font-semibold text-lg mb-4">Inventory Overview</h2>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                  <StatCard
                    key={stat.title}
                    title={stat.title}
                    value={stat.value}
                    icon={stat.icon}
                    color={stat.color}
                    bgColor={stat.bgColor}
                    delay={index * 0.05}
                  />
                ))}
              </div>
            )}
          </motion.div>

          {/* Sales Stats */}
          <motion.div variants={itemVariants}>
            <h2 className="font-semibold text-lg mb-4">Sales Performance</h2>
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {salesMetrics.map((stat, index) => (
                  <StatCard
                    key={stat.title}
                    title={stat.title}
                    value={stat.value}
                    icon={stat.icon}
                    color={stat.color}
                    bgColor={stat.bgColor}
                    trend={stat.trend}
                    delay={index * 0.05}
                  />
                ))}
              </div>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <h2 className="font-semibold text-lg mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <QuickActionCard key={action.to} {...action} />
              ))}
            </div>
          </motion.div>

          {/* Charts & Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stock Movement Chart */}
            {loading ? (
              <Skeleton className="h-[380px] rounded-lg" />
            ) : (
              <StockMovementChart data={dailyMovements} />
            )}

            {/* Recent Activity */}
            {loading ? (
              <Skeleton className="h-[380px] rounded-lg" />
            ) : (
              <RecentActivityList logs={recentLogs} />
            )}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
