import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, 
  Loader2,
  Clock,
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
  Inbox
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { InterestCard } from "@/components/interests/InterestCard";
import { useBuyerInterests } from "@/hooks/useBuyerInterests";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const statusTabs: { value: OrderStatus | "all"; label: string; icon: typeof Clock }[] = [
  { value: "all", label: "All", icon: Heart },
  { value: "interested", label: "Pending", icon: Clock },
  { value: "approved", label: "Approved", icon: CheckCircle2 },
  { value: "shipped", label: "Shipped", icon: Truck },
  { value: "delivered", label: "Delivered", icon: PackageCheck },
  { value: "cancelled", label: "Cancelled", icon: XCircle },
];

export default function MyInterests() {
  const { 
    interests, 
    loading, 
    statusFilter, 
    setStatusFilter,
    cancelInterest 
  } = useBuyerInterests();

  // Count interests by status
  const statusCounts = interests.reduce((acc, interest) => {
    acc[interest.status] = (acc[interest.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pendingCount = statusCounts["interested"] || 0;

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
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">My Interests</h1>
                <p className="text-muted-foreground">
                  {pendingCount > 0 
                    ? `${pendingCount} pending interest${pendingCount > 1 ? "s" : ""}`
                    : "Track your product interests"}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Status Tabs */}
          <motion.div variants={itemVariants}>
            <Tabs 
              value={statusFilter} 
              onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}
              className="w-full"
            >
              <TabsList className="w-full grid grid-cols-3 md:grid-cols-6 h-auto gap-1 bg-muted/50 p-1">
                {statusTabs.map((tab) => {
                  const Icon = tab.icon;
                  const count = tab.value === "all" 
                    ? interests.length 
                    : statusCounts[tab.value] || 0;
                  
                  return (
                    <TabsTrigger 
                      key={tab.value} 
                      value={tab.value}
                      className="flex items-center gap-1.5 py-2 px-3 data-[state=active]:bg-background"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      {count > 0 && (
                        <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          {count}
                        </span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </motion.div>

          {/* Loading State */}
          {loading && (
            <motion.div variants={itemVariants} className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </motion.div>
          )}

          {/* Empty State */}
          {!loading && interests.length === 0 && (
            <motion.div variants={itemVariants}>
              <Card className="glass-card">
                <CardContent className="py-16">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                      <Inbox className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">
                      {statusFilter === "all" 
                        ? "No Interests Yet" 
                        : `No ${statusFilter} interests`}
                    </h2>
                    <p className="text-muted-foreground max-w-md">
                      {statusFilter === "all"
                        ? "When you express interest in products from the marketplace, they'll appear here."
                        : "Try selecting a different status filter."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Interests List */}
          {!loading && interests.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-4">
              <AnimatePresence mode="popLayout">
                {interests.map((interest, index) => (
                  <InterestCard
                    key={interest.id}
                    interest={interest}
                    onCancel={cancelInterest}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
