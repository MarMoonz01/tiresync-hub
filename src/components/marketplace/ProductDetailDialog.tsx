import { 
  Store, 
  Package, 
  Calendar, 
  Tag,
  ShoppingBag
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MarketplaceProduct, ProductStore } from "@/hooks/useMarketplaceProducts";
import { cn } from "@/lib/utils";

interface ProductDetailDialogProps {
  product: MarketplaceProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInterested: (product: MarketplaceProduct, store: ProductStore) => void;
}

export function ProductDetailDialog({ 
  product, 
  open, 
  onOpenChange,
  onInterested 
}: ProductDetailDialogProps) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {product.brand} {product.model}
          </DialogTitle>
          <DialogDescription className="text-base">
            {product.size}
            {product.load_index && ` • ${product.load_index}`}
            {product.speed_rating && product.speed_rating}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Store className="w-4 h-4" />
            <span>
              Available at {product.storeCount} {product.storeCount === 1 ? "store" : "stores"}
            </span>
            <span className="mx-2">•</span>
            <Package className="w-4 h-4" />
            <span>{product.totalQuantity} total in stock</span>
          </div>

          <Separator className="mb-4" />

          <h4 className="font-medium mb-3">Select a store to express interest:</h4>

          <ScrollArea className="max-h-[40vh]">
            <div className="space-y-3 pr-4">
              {product.stores.map((storeEntry) => {
                const storeQuantity = storeEntry.tire_dots.reduce(
                  (sum, d) => sum + d.quantity, 0
                );
                const isOutOfStock = storeQuantity === 0;
                const isLowStock = storeQuantity > 0 && storeQuantity <= 4;

                // Get newest DOT
                const newestDot = storeEntry.tire_dots[0];

                return (
                  <div 
                    key={storeEntry.id}
                    className="p-4 rounded-lg border border-border bg-muted/30"
                  >
                    {/* Store header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {storeEntry.store.logo_url ? (
                          <img 
                            src={storeEntry.store.logo_url}
                            alt={storeEntry.store.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <Store className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {storeEntry.store.name}
                        </p>
                        {storeEntry.network_price && (
                          <p className="text-lg font-bold text-primary">
                            ฿{storeEntry.network_price.toLocaleString()}
                          </p>
                        )}
                      </div>
                      
                      {/* Stock badge */}
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        isOutOfStock 
                          ? "bg-destructive/10 text-destructive" 
                          : isLowStock 
                          ? "bg-warning/10 text-warning" 
                          : "bg-success/10 text-success"
                      )}>
                        <Package className="w-3 h-3" />
                        {storeQuantity}
                      </div>
                    </div>

                    {/* DOT info */}
                    {newestDot && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          DOT {newestDot.dot_code}
                        </Badge>
                        {newestDot.promotion && (
                          <Badge variant="secondary" className="text-xs">
                            <Tag className="w-3 h-3 mr-1" />
                            {newestDot.promotion}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Action button */}
                    <Button 
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                      size="sm"
                      onClick={() => onInterested(product, storeEntry)}
                      disabled={isOutOfStock}
                    >
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      {isOutOfStock ? "Out of Stock" : "I'm Interested"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
