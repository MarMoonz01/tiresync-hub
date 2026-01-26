import { motion } from "framer-motion";
import { 
  CircleDot, 
  TrendingUp, 
  AlertTriangle, 
  Package,
  Plus,
  Upload,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";

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

  const stats = [
    {
      title: "Total Tires",
      value: "0",
      icon: CircleDot,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Stock",
      value: "0",
      icon: Package,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Low Stock",
      value: "0",
      icon: AlertTriangle,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "This Month",
      value: "฿0",
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
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

          {/* Quick Actions */}
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

          {/* Stats Grid */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {stats.map((stat) => (
              <Card key={stat.title} className="glass-card hover-scale">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <h2 className="font-semibold text-lg mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/inventory/add">
                <Card className="glass-card hover-scale cursor-pointer group">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Plus className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Add Tire</span>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/import">
                <Card className="glass-card hover-scale cursor-pointer group">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                      <Upload className="w-6 h-6 text-accent" />
                    </div>
                    <span className="text-sm font-medium">Import Excel</span>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/inventory">
                <Card className="glass-card hover-scale cursor-pointer group">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                      <CircleDot className="w-6 h-6 text-success" />
                    </div>
                    <span className="text-sm font-medium">View Inventory</span>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/marketplace">
                <Card className="glass-card hover-scale cursor-pointer group">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
                      <Package className="w-6 h-6 text-warning" />
                    </div>
                    <span className="text-sm font-medium">Marketplace</span>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </motion.div>

          {/* Empty State for Recent Activity */}
          <motion.div variants={itemVariants}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No recent activity</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start by adding tires to your inventory
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
