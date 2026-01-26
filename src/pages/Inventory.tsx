import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Search, 
  Filter, 
  Upload,
  CircleDot,
  Package,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppLayout } from "@/components/layout/AppLayout";
import { TireCard } from "@/components/inventory/TireCard";
import { useAuth } from "@/hooks/useAuth";
import { useTires, Tire } from "@/hooks/useTires";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Inventory() {
  const { store } = useAuth();
  const { 
    tires, 
    loading, 
    deleteTire, 
    updateDotQuantity,
    page,
    setPage,
    totalPages,
    totalCount,
    searchQuery,
    setSearchQuery,
    brandFilter,
    setBrandFilter,
    stockFilter,
    setStockFilter,
    toggleShare
  } = useTires();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  
  // Debounce the search value
  const debouncedSearch = useDebouncedValue(localSearch, 400);

  // Sync debounced search with hook
  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  // Get unique brands for filter (from current page - could be improved with separate query)
  const brands = useMemo(() => {
    const uniqueBrands = [...new Set(tires.map((t) => t.brand))];
    return uniqueBrands.sort();
  }, [tires]);

  // Stats from current page (for display)
  const stats = useMemo(() => {
    const totalStock = tires.reduce(
      (sum, t) => sum + (t.tire_dots?.reduce((s, d) => s + d.quantity, 0) || 0),
      0
    );
    const outOfStock = tires.filter(
      (t) => (t.tire_dots?.reduce((s, d) => s + d.quantity, 0) || 0) === 0
    ).length;
    const lowStock = tires.filter((t) => {
      const qty = t.tire_dots?.reduce((s, d) => s + d.quantity, 0) || 0;
      return qty > 0 && qty <= 4;
    }).length;

    return { totalTires: totalCount, totalStock, outOfStock, lowStock };
  }, [tires, totalCount]);

  const handleEdit = (tire: Tire) => {
    navigate(`/inventory/edit/${tire.id}`);
  };

  const handleDelete = async (tireId: string) => {
    try {
      await deleteTire(tireId);
      toast({
        title: "Tire deleted",
        description: "The tire has been removed from your inventory",
      });
    } catch (error) {
      console.error("Error deleting tire:", error);
      toast({
        title: "Error",
        description: "Failed to delete tire",
        variant: "destructive",
      });
    }
  };

  const handleQuantityChange = async (dotId: string, change: number) => {
    try {
      await updateDotQuantity(dotId, change);
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    }
  };

  const handleToggleShare = async (tireId: string, isShared: boolean) => {
    try {
      await toggleShare(tireId, isShared);
      toast({
        title: isShared ? "Shared to Network" : "Removed from Network",
        description: isShared 
          ? "This tire is now visible to other stores" 
          : "This tire is now private",
      });
    } catch (error) {
      console.error("Error toggling share:", error);
      toast({
        title: "Error",
        description: "Failed to update sharing status",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setLocalSearch("");
    setBrandFilter("all");
    setStockFilter("all");
  };

  const hasActiveFilters = debouncedSearch || brandFilter !== "all" || stockFilter !== "all";

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

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

  if (loading) {
    return (
      <AppLayout>
        <div className="page-container">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
                {stats.totalTires} tires • {stats.totalStock} in stock
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

          {/* Stats Cards */}
          {tires.length > 0 && (
            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-foreground">{stats.totalTires}</div>
                  <div className="text-sm text-muted-foreground">Total Tires</div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-success">{stats.totalStock}</div>
                  <div className="text-sm text-muted-foreground">In Stock</div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-warning">{stats.lowStock}</div>
                  <div className="text-sm text-muted-foreground">Low Stock</div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-destructive">{stats.outOfStock}</div>
                  <div className="text-sm text-muted-foreground">Out of Stock</div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Search & Filter */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by brand, size, model..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-primary/10" : ""}
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            {/* Filter Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-lg">
                    <Select value={brandFilter} onValueChange={setBrandFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Brand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Brands</SelectItem>
                        {brands.map((brand) => (
                          <SelectItem key={brand} value={brand}>
                            {brand}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={stockFilter} onValueChange={setStockFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Stock Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stock</SelectItem>
                        <SelectItem value="in">In Stock (5+)</SelectItem>
                        <SelectItem value="low">Low Stock (1-4)</SelectItem>
                        <SelectItem value="out">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="w-4 h-4 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active filter badges */}
            {hasActiveFilters && !showFilters && (
              <div className="flex flex-wrap gap-2">
                {debouncedSearch && (
                  <Badge variant="secondary">
                    Search: {debouncedSearch}
                    <button onClick={() => setLocalSearch("")} className="ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {brandFilter !== "all" && (
                  <Badge variant="secondary">
                    Brand: {brandFilter}
                    <button onClick={() => setBrandFilter("all")} className="ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {stockFilter !== "all" && (
                  <Badge variant="secondary">
                    Stock: {stockFilter}
                    <button onClick={() => setStockFilter("all")} className="ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </motion.div>

          {/* Tire List */}
          {tires.length === 0 && !hasActiveFilters ? (
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
          ) : tires.length === 0 ? (
            <motion.div variants={itemVariants}>
              <Card className="glass-card">
                <CardContent className="py-12">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      No tires match your filters
                    </p>
                    <Button variant="outline" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="space-y-3">
              <AnimatePresence mode="popLayout">
                {tires.map((tire) => (
                  <TireCard
                    key={tire.id}
                    tire={tire}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onQuantityChange={handleQuantityChange}
                    onToggleShare={handleToggleShare}
                  />
                ))}
              </AnimatePresence>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "ghost"}
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          className="w-9"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  
                  <span className="text-sm text-muted-foreground ml-2">
                    Page {page} of {totalPages}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
