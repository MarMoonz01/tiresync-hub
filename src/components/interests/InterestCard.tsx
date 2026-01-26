import { motion } from "framer-motion";
import { 
  Store, 
  Package, 
  Calendar, 
  Clock,
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BuyerInterest } from "@/hooks/useBuyerInterests";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface InterestCardProps {
  interest: BuyerInterest;
  onCancel: (orderId: string) => void;
  index?: number;
}

const statusConfig: Record<OrderStatus, { 
  label: string; 
  icon: typeof CheckCircle2; 
  color: string;
  bgColor: string;
  description: string;
}> = {
  interested: { 
    label: "Pending", 
    icon: Clock, 
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    description: "Waiting for seller approval"
  },
  approved: { 
    label: "Approved", 
    icon: CheckCircle2, 
    color: "text-success",
    bgColor: "bg-success/10",
    description: "Seller has approved your interest"
  },
  shipped: { 
    label: "Shipped", 
    icon: Truck, 
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    description: "Your order is on the way"
  },
  delivered: { 
    label: "Delivered", 
    icon: PackageCheck, 
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    description: "Order completed successfully"
  },
  cancelled: { 
    label: "Cancelled", 
    icon: XCircle, 
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    description: "This interest was cancelled"
  },
};

export function InterestCard({ interest, onCancel, index = 0 }: InterestCardProps) {
  const config = statusConfig[interest.status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      layout
    >
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          {/* Status bar */}
          <div className={cn("px-4 py-2 flex items-center gap-2", config.bgColor)}>
            <StatusIcon className={cn("w-4 h-4", config.color)} />
            <span className={cn("text-sm font-medium", config.color)}>
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {formatDistanceToNow(new Date(interest.created_at), { addSuffix: true })}
            </span>
          </div>

          <div className="p-4 space-y-4">
            {/* Seller info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {interest.seller_store.logo_url ? (
                  <img 
                    src={interest.seller_store.logo_url}
                    alt={interest.seller_store.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <Store className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{interest.seller_store.name}</p>
                <p className="text-xs text-muted-foreground">Seller</p>
              </div>
            </div>

            {/* Product info */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{interest.tire.brand} {interest.tire.model}</p>
                  <p className="text-sm text-muted-foreground">{interest.tire.size}</p>
                </div>
                {interest.unit_price && (
                  <p className="text-lg font-bold text-primary shrink-0">
                    ฿{interest.unit_price.toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {interest.tire_dot && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    DOT {interest.tire_dot.dot_code}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  <Package className="w-3 h-3 mr-1" />
                  Qty: {interest.quantity}
                </Badge>
              </div>

              {/* Status description */}
              <p className="text-xs text-muted-foreground pt-1">
                {config.description}
              </p>
            </div>

            {/* Actions - only show cancel for pending interests */}
            {interest.status === "interested" && (
              <Button 
                variant="outline"
                className="w-full text-destructive hover:bg-destructive/10"
                onClick={() => onCancel(interest.id)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Interest
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
