import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Store, 
  Package, 
  Calendar, 
  Tag,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2
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
import { useOrders } from "@/hooks/useOrders";
import { cn } from "@/lib/utils";

interface ProductDetailDialogProps {
  product: MarketplaceProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailDialog({ 
  product, 
  open, 
  onOpenChange,
}: ProductDetailDialogProps) {
  const { createOrder, loading: orderLoading } = useOrders();
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());
  const [interestedItems, setInterestedItems] = useState<Set<string>>(new Set());
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!product) return null;

  const toggleStoreExpand = (storeId: string) => {
    setExpandedStores(prev => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
      }
      return next;
    });
  };

  const handleInterested = async (storeEntry: ProductStore, dot?: { id: string; quantity: number }) => {
    const itemKey = dot ? `${storeEntry.id}-${dot.id}` : storeEntry.id;
    setProcessingId(itemKey);

    const result = await createOrder({
      sellerStoreId: storeEntry.store_id,
      tireId: storeEntry.id,
      tireDotId: dot?.id,
      quantity: dot?.quantity || 1,
      unitPrice: storeEntry.network_price || undefined,
    });

    if (result) {
      setInterestedItems(prev => new Set(prev).add(itemKey));
    }
    setProcessingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <DialogHeader className="p-6 pb-4">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <DialogTitle className="text-xl font-bold">
                {product.brand} {product.model}
              </DialogTitle>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <DialogDescription className="text-base">
                {product.size}
                {product.load_index && ` • ${product.load_index}`}
                {product.speed_rating && product.speed_rating}
              </DialogDescription>
            </motion.div>
          </DialogHeader>

          <div className="px-6 pb-2">
            <motion.div 
              className="flex items-center gap-2 text-sm text-muted-foreground mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <Store className="w-4 h-4" />
              <span>
                Available at {product.storeCount} {product.storeCount === 1 ? "store" : "stores"}
              </span>
              <span className="mx-2">•</span>
              <Package className="w-4 h-4" />
              <span>{product.totalQuantity} total in stock</span>
            </motion.div>

            <Separator className="mb-4" />

            <motion.h4 
              className="font-medium mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              Select a store & DOT to express interest:
            </motion.h4>
          </div>

          <ScrollArea className="max-h-[50vh] px-6 pb-6">
            <div className="space-y-3 pr-2">
              <AnimatePresence mode="popLayout">
                {product.stores.map((storeEntry, index) => {
                  const storeQuantity = storeEntry.tire_dots.reduce(
                    (sum, d) => sum + d.quantity, 0
                  );
                  const isOutOfStock = storeQuantity === 0;
                  const isLowStock = storeQuantity > 0 && storeQuantity <= 4;
                  const isExpanded = expandedStores.has(storeEntry.id);
                  const dotsWithStock = storeEntry.tire_dots.filter(d => d.quantity > 0);

                  return (
                    <motion.div 
                      key={storeEntry.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ 
                        delay: index * 0.08,
                        duration: 0.3,
                        ease: "easeOut"
                      }}
                      className="rounded-xl border border-border bg-card overflow-hidden"
                    >
                      {/* Store header - clickable to expand */}
                      <motion.button
                        onClick={() => toggleStoreExpand(storeEntry.id)}
                        className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                        whileHover={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                          {storeEntry.store.logo_url ? (
                            <img 
                              src={storeEntry.store.logo_url}
                              alt={storeEntry.store.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <Store className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-semibold truncate">
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
                          "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium shrink-0",
                          isOutOfStock 
                            ? "bg-destructive/10 text-destructive" 
                            : isLowStock 
                            ? "bg-warning/10 text-warning" 
                            : "bg-success/10 text-success"
                        )}>
                          <Package className="w-4 h-4" />
                          {storeQuantity}
                        </div>

                        {/* Expand icon */}
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        </motion.div>
                      </motion.button>

                      {/* Expandable DOT list */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
                              {dotsWithStock.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-2">
                                  No stock available
                                </p>
                              ) : (
                                dotsWithStock.map((dot, dotIndex) => {
                                  const itemKey = `${storeEntry.id}-${dot.id}`;
                                  const isInterested = interestedItems.has(itemKey);
                                  const isProcessing = processingId === itemKey;

                                  return (
                                    <motion.div
                                      key={dot.id}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: dotIndex * 0.05, duration: 0.2 }}
                                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 gap-3"
                                    >
                                      <div className="flex items-center gap-2 flex-wrap flex-1">
                                        <Badge variant="outline" className="text-xs font-mono">
                                          <Calendar className="w-3 h-3 mr-1" />
                                          DOT {dot.dot_code}
                                        </Badge>
                                        <Badge 
                                          variant="secondary" 
                                          className={cn(
                                            "text-xs",
                                            dot.quantity <= 4 ? "bg-warning/10 text-warning" : ""
                                          )}
                                        >
                                          <Package className="w-3 h-3 mr-1" />
                                          {dot.quantity} pcs
                                        </Badge>
                                        {dot.promotion && (
                                          <Badge className="text-xs bg-accent/10 text-accent border-accent/20">
                                            <Tag className="w-3 h-3 mr-1" />
                                            {dot.promotion}
                                          </Badge>
                                        )}
                                      </div>

                                      <Button 
                                        size="sm"
                                        onClick={() => handleInterested(storeEntry, dot)}
                                        disabled={isInterested || isProcessing || orderLoading}
                                        className={cn(
                                          "shrink-0 transition-all",
                                          isInterested 
                                            ? "bg-success hover:bg-success text-success-foreground" 
                                            : "bg-gradient-to-r from-primary to-accent hover:opacity-90"
                                        )}
                                      >
                                        {isProcessing ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : isInterested ? (
                                          <>
                                            <CheckCircle2 className="w-4 h-4 mr-1" />
                                            Sent
                                          </>
                                        ) : (
                                          <>
                                            <ShoppingBag className="w-4 h-4 mr-1" />
                                            Interested
                                          </>
                                        )}
                                      </Button>
                                    </motion.div>
                                  );
                                })
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
