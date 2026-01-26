import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Plus, 
  Search, 
  Filter, 
  Upload,
  CircleDot,
  Package
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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

export default function Inventory() {
  const { store } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  if (!store) {
    return (
      <AppLayout>
        <div className="page-container">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <CircleDot className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Store Found</h2>
            <p className="text-muted-foreground mb-6">
              Create your store profile to start managing inventory
            </p>
            <Link to="/store/setup">
              <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                Set Up Store
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

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
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Tire Vault</h1>
              <p className="text-muted-foreground mt-1">
                Manage your tire inventory
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/import">
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </Link>
              <Link to="/inventory/add">
                <Button size="sm" className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tire
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Search & Filter */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by brand, size, model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </motion.div>

          {/* Empty State */}
          <motion.div variants={itemVariants}>
            <Card className="glass-card">
              <CardContent className="py-16">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                    <Package className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">No Tires Yet</h2>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Start building your inventory by adding tires manually or importing from Excel
                  </p>
                  <div className="flex gap-3">
                    <Link to="/import">
                      <Button variant="outline">
                        <Upload className="w-4 h-4 mr-2" />
                        Import Excel
                      </Button>
                    </Link>
                    <Link to="/inventory/add">
                      <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Tire
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
