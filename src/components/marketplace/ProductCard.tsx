import { motion } from "framer-motion";
import { Package, Store, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketplaceProduct } from "@/hooks/useMarketplaceProducts";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: MarketplaceProduct;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const isLowStock = product.totalQuantity > 0 && product.totalQuantity <= 4;
  const isOutOfStock = product.totalQuantity === 0;

  // Format price display
  const priceDisplay = () => {
    if (product.minPrice === null) return null;
    if (product.minPrice === product.maxPrice) {
      return `฿${product.minPrice.toLocaleString()}`;
    }
    return `฿${product.minPrice.toLocaleString()} - ฿${product.maxPrice?.toLocaleString()}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className="glass-card overflow-hidden hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-primary/20"
        onClick={onClick}
      >
        <CardContent className="p-4">
          {/* Tire Info */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-lg">
                {product.brand}
              </h3>
              {product.model && (
                <p className="text-sm text-muted-foreground">
                  {product.model}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {product.size}
                {product.load_index && ` • ${product.load_index}`}
                {product.speed_rating && product.speed_rating}
              </p>
            </div>

            {/* Stock Badge */}
            <div className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium shrink-0",
              isOutOfStock 
                ? "bg-destructive/10 text-destructive" 
                : isLowStock 
                ? "bg-warning/10 text-warning" 
                : "bg-success/10 text-success"
            )}>
              <Package className="w-3.5 h-3.5" />
              {product.totalQuantity}
            </div>
          </div>

          {/* Price */}
          {priceDisplay() && (
            <p className="text-lg font-bold text-primary mt-3">
              {priceDisplay()}
            </p>
          )}

          {/* Store count badge */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
            <Badge variant="secondary" className="text-xs">
              <Store className="w-3 h-3 mr-1" />
              {product.storeCount} {product.storeCount === 1 ? "store" : "stores"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Tap to view details
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
