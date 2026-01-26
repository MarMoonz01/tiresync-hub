import { motion } from "framer-motion";
import { 
  Package,
  Store,
  Calendar,
  Tag
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NetworkTire } from "@/hooks/useNetworkTires";
import { cn } from "@/lib/utils";

interface NetworkTireCardProps {
  tire: NetworkTire;
  onInterested: (tire: NetworkTire) => void;
}

export function NetworkTireCard({ tire, onInterested }: NetworkTireCardProps) {
  const totalQuantity = tire.tire_dots?.reduce((sum, dot) => sum + dot.quantity, 0) || 0;
  const isLowStock = totalQuantity > 0 && totalQuantity <= 4;
  const isOutOfStock = totalQuantity === 0;

  // Get newest DOT code
  const newestDot = tire.tire_dots?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="glass-card overflow-hidden hover:shadow-lg transition-shadow">
        <CardContent className="p-0">
          <div className="p-4">
            {/* Store Info */}
            {tire.store && (
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  {tire.store.logo_url ? (
                    <img 
                      src={tire.store.logo_url} 
                      alt={tire.store.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <Store className="w-4 h-4 text-primary" />
                  )}
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {tire.store.name}
                </span>
              </div>
            )}

            {/* Tire Info */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">
                  {tire.brand} {tire.model}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {tire.size}
                  {tire.load_index && ` • ${tire.load_index}`}
                  {tire.speed_rating && tire.speed_rating}
                </p>
                
                {/* Price */}
                {tire.network_price && (
                  <p className="text-lg font-bold text-primary mt-2">
                    ฿{tire.network_price.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Stock Badge */}
              <div className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium",
                isOutOfStock 
                  ? "bg-destructive/10 text-destructive" 
                  : isLowStock 
                  ? "bg-warning/10 text-warning" 
                  : "bg-success/10 text-success"
              )}>
                <Package className="w-3.5 h-3.5" />
                {totalQuantity}
              </div>
            </div>

            {/* DOT Info */}
            {newestDot && (
              <div className="flex flex-wrap gap-2 mt-3">
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

            {/* Action */}
            <div className="mt-4 pt-3 border-t border-border/50">
              <Button 
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                onClick={() => onInterested(tire)}
                disabled={isOutOfStock}
              >
                {isOutOfStock ? "Out of Stock" : "I'm Interested"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
