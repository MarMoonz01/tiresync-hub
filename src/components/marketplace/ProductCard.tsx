import { motion } from "framer-motion";
import { Package, Store, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarketplaceProduct } from "@/hooks/useMarketplaceProducts";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: MarketplaceProduct;
  onClick: () => void;
  index?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (tireId: string) => void;
}

export function ProductCard({ product, onClick, index = 0, isFavorite = false, onToggleFavorite }: ProductCardProps) {
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
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ 
        scale: 1.03,
        y: -4,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ 
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
      layout
    >
      <Card 
        className="glass-card overflow-hidden cursor-pointer border-2 border-transparent hover:border-primary/30 hover:shadow-xl transition-shadow duration-300"
        onClick={onClick}
      >
        <CardContent className="p-4">
          {/* Favorite button */}
          {onToggleFavorite && (
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(product.stores[0]?.id || "");
                }}
              >
                <Heart
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isFavorite
                      ? "fill-destructive text-destructive"
                      : "text-muted-foreground hover:text-destructive"
                  )}
                />
              </Button>
            </div>
          )}

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
            <motion.div 
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium shrink-0",
                isOutOfStock 
                  ? "bg-destructive/10 text-destructive" 
                  : isLowStock 
                  ? "bg-warning/10 text-warning" 
                  : "bg-success/10 text-success"
              )}
              whileHover={{ scale: 1.05 }}
            >
              <Package className="w-3.5 h-3.5" />
              {product.totalQuantity}
            </motion.div>
          </div>

          {/* Price */}
          {priceDisplay() && (
            <motion.p 
              className="text-lg font-bold text-primary mt-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {priceDisplay()}
            </motion.p>
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
