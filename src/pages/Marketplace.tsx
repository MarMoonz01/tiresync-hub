import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Filter, 
  Store, 
  Loader2,
  X,
  ChevronLeft,
  ChevronRight
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
import { AppLayout } from "@/components/layout/AppLayout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { ProductDetailDialog } from "@/components/marketplace/ProductDetailDialog";
import { useMarketplaceProducts, MarketplaceProduct } from "@/hooks/useMarketplaceProducts";
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

export default function Marketplace() {
  // Local search state for immediate input response
  const [localSearch, setLocalSearch] = useState("");
  const [localSizeFilter, setLocalSizeFilter] = useState("");
  
  // Debounce the search values
  const debouncedSearch = useDebouncedValue(localSearch, 400);
  const debouncedSizeFilter = useDebouncedValue(localSizeFilter, 400);

  const {
    products,
    loading,
    page,
    totalPages,
    totalCount,
    setSearchQuery,
    brandFilter,
    setBrandFilter,
    setSizeFilter,
    brands,
    goToPage,
  } = useMarketplaceProducts();

  // Sync debounced values with hook
  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  useEffect(() => {
    setSizeFilter(debouncedSizeFilter);
  }, [debouncedSizeFilter, setSizeFilter]);

  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const handleProductClick = (product: MarketplaceProduct) => {
    setSelectedProduct(product);
    setDetailDialogOpen(true);
  };

  const clearFilters = () => {
    setLocalSearch("");
    setLocalSizeFilter("");
    setBrandFilter("all");
  };

  const hasActiveFilters = debouncedSearch || brandFilter !== "all" || debouncedSizeFilter;

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
                {totalCount} products from partner stores
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
                      value={localSizeFilter}
                      onChange={(e) => setLocalSizeFilter(e.target.value)}
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
                {debouncedSizeFilter && (
                  <Badge variant="secondary">
                    Size: {debouncedSizeFilter}
                    <button onClick={() => setLocalSizeFilter("")} className="ml-1">
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
          {!loading && products.length === 0 && (
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
                      {hasActiveFilters ? "No Results Found" : "No Products Yet"}
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

          {!loading && products.length > 0 && (
            <motion.div 
              variants={itemVariants} 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {products.map((product, index) => (
                  <ProductCard
                    key={product.productKey}
                    product={product}
                    onClick={() => handleProductClick(product)}
                    index={index}
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

        {/* Product Detail Dialog */}
        <ProductDetailDialog
          product={selectedProduct}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
        />
      </div>
    </AppLayout>
  );
}
