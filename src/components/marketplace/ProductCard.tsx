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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: 0.2,
        delay: index * 0.03,
      }}
      whileHover={{ y: -2 }}
      layout
    >
      <Card 
        className="overflow-hidden cursor-pointer border-0 shadow-soft bg-card/60 backdrop-blur-sm hover:shadow-soft-lg transition-all"
        onClick={onClick}
      >
        <CardContent className="p-4">
          {/* Header with favorite */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground">
                {product.brand}
              </h3>
              {product.model && (
                <p className="text-xs text-muted-foreground truncate">
                  {product.model}
                </p>
              )}
            </div>
            
            {onToggleFavorite && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 -mr-1 -mt-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(product.stores[0]?.id || "");
                }}
              >
                <Heart
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isFavorite
                      ? "fill-destructive text-destructive"
                      : "text-muted-foreground"
                  )}
                />
              </Button>
            )}
          </div>

          {/* Size info */}
          <p className="text-xs text-muted-foreground mb-3">
            {product.size}
            {product.load_index && ` • ${product.load_index}`}
            {product.speed_rating && product.speed_rating}
          </p>

          {/* Price and stock */}
          <div className="flex items-end justify-between">
            {priceDisplay() && (
              <p className="text-base font-bold text-primary">
                {priceDisplay()}
              </p>
            )}
            
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium",
              isOutOfStock 
                ? "bg-destructive/10 text-destructive" 
                : isLowStock 
                ? "bg-warning/10 text-warning" 
                : "bg-success/10 text-success"
            )}>
              <Package className="w-3 h-3" />
              {product.totalQuantity}
            </div>
          </div>

          {/* Store count */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              <Store className="w-2.5 h-2.5 mr-1" />
              {product.storeCount} {product.storeCount === 1 ? "store" : "stores"}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              Tap for details
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
