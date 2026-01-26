import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Filter, 
  Store, 
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  ShoppingBag
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { NetworkTireCard } from "@/components/marketplace/NetworkTireCard";
import { useNetworkTires, NetworkTire } from "@/hooks/useNetworkTires";
import { useToast } from "@/hooks/use-toast";

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

export default function Marketplace() {
  const {
    tires,
    loading,
    page,
    totalPages,
    totalCount,
    searchQuery,
    setSearchQuery,
    brandFilter,
    setBrandFilter,
    sizeFilter,
    setSizeFilter,
    brands,
    goToPage,
  } = useNetworkTires();
  const { toast } = useToast();

  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [selectedTire, setSelectedTire] = useState<NetworkTire | null>(null);
  const [interestDialogOpen, setInterestDialogOpen] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  const handleInterested = (tire: NetworkTire) => {
    setSelectedTire(tire);
    setInterestDialogOpen(true);
  };

  const confirmInterest = () => {
    if (selectedTire) {
      toast({
        title: "Interest Registered",
        description: `The store "${selectedTire.store?.name}" will be notified of your interest in ${selectedTire.brand} ${selectedTire.model}`,
      });
      setInterestDialogOpen(false);
      setSelectedTire(null);
    }
  };

  const clearFilters = () => {
    setLocalSearch("");
    setSearchQuery("");
    setBrandFilter("all");
    setSizeFilter("");
  };

  const hasActiveFilters = searchQuery || brandFilter !== "all" || sizeFilter;

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
              <h1 className="text-2xl font-bold text-foreground">Marketplace</h1>
              <p className="text-muted-foreground mt-1">
                {totalCount} shared tires from partner stores
              </p>
            </div>
          </motion.div>

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

                    <Input
                      placeholder="Filter by size..."
                      value={sizeFilter}
                      onChange={(e) => setSizeFilter(e.target.value)}
                      className="w-40"
                    />

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
                {searchQuery && (
                  <Badge variant="secondary">
                    Search: {searchQuery}
                    <button onClick={() => { setLocalSearch(""); setSearchQuery(""); }} className="ml-1">
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
                {sizeFilter && (
                  <Badge variant="secondary">
                    Size: {sizeFilter}
                    <button onClick={() => setSizeFilter("")} className="ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </motion.div>

          {/* Loading State */}
          {loading && (
            <motion.div variants={itemVariants} className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </motion.div>
          )}

          {/* Empty State */}
          {!loading && tires.length === 0 && (
            <motion.div variants={itemVariants}>
              <Card className="glass-card">
                <CardContent className="py-16">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                      {hasActiveFilters ? (
                        <Search className="w-10 h-10 text-muted-foreground" />
                      ) : (
                        <Store className="w-10 h-10 text-muted-foreground" />
                      )}
                    </div>
                    <h2 className="text-xl font-semibold mb-2">
                      {hasActiveFilters ? "No Results Found" : "No Shared Listings Yet"}
                    </h2>
                    <p className="text-muted-foreground max-w-md">
                      {hasActiveFilters 
                        ? "Try adjusting your filters or search terms"
                        : "When stores share their inventory with the network, you'll find them here. Share your own inventory to get started!"}
                    </p>
                    {hasActiveFilters && (
                      <Button variant="outline" className="mt-4" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Tire Grid */}
          {!loading && tires.length > 0 && (
            <motion.div 
              variants={itemVariants} 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {tires.map((tire) => (
                  <NetworkTireCard
                    key={tire.id}
                    tire={tire}
                    onInterested={handleInterested}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 pt-6">
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
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageNum)}
                      className="w-8 h-8 p-0"
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
            </motion.div>
          )}
        </motion.div>

        {/* Interest Dialog */}
        <Dialog open={interestDialogOpen} onOpenChange={setInterestDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Express Interest
              </DialogTitle>
              <DialogDescription>
                Let the seller know you're interested in this tire
              </DialogDescription>
            </DialogHeader>

            {selectedTire && (
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <p className="font-semibold">
                  {selectedTire.brand} {selectedTire.model}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedTire.size}
                </p>
                {selectedTire.network_price && (
                  <p className="text-lg font-bold text-primary">
                    ฿{selectedTire.network_price.toLocaleString()}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Sold by: {selectedTire.store?.name}
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setInterestDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={confirmInterest}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                Confirm Interest
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
