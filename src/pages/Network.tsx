import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Search, Store, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout/AppLayout";
import { StoreCard } from "@/components/network/StoreCard";
import { useNetworkStores } from "@/hooks/useNetworkStores";

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

export default function Network() {
  const { stores, loading, searchQuery, setSearchQuery } = useNetworkStores();
  const [localSearch, setLocalSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

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
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Partner Network</h1>
              <p className="text-muted-foreground mt-1">
                View stores in your trusted tire business network
              </p>
            </div>
          </motion.div>

          {/* Search */}
          <motion.div variants={itemVariants}>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search partner stores..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </motion.div>

          {/* Content */}
          {loading ? (
            <motion.div variants={itemVariants} className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </motion.div>
          ) : stores.length === 0 ? (
            <motion.div variants={itemVariants}>
              <Card className="glass-card">
                <CardContent className="py-16">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                      <Users className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">
                      {searchQuery ? "No stores found" : "Your Network is Growing"}
                    </h2>
                    <p className="text-muted-foreground max-w-md">
                      {searchQuery
                        ? "Try adjusting your search to find partner stores."
                        : "Partner stores will appear here once they join the network. Connect with trusted tire businesses to expand your reach."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {stores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </motion.div>
          )}

          {/* Stats */}
          {!loading && stores.length > 0 && (
            <motion.div variants={itemVariants} className="text-center text-sm text-muted-foreground">
              {stores.length} partner store{stores.length !== 1 ? "s" : ""} in your network
            </motion.div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
