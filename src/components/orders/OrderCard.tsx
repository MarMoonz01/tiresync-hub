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
  ChevronRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SellerOrder } from "@/hooks/useSellerOrders";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface OrderCardProps {
  order: SellerOrder;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  index?: number;
}

const statusConfig: Record<OrderStatus, { 
  label: string; 
  icon: typeof CheckCircle2; 
  color: string;
  bgColor: string;
}> = {
  interested: { 
    label: "New Interest", 
    icon: Clock, 
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  approved: { 
    label: "Approved", 
    icon: CheckCircle2, 
    color: "text-success",
    bgColor: "bg-success/10"
  },
  shipped: { 
    label: "Shipped", 
    icon: Truck, 
    color: "text-orange-600",
    bgColor: "bg-orange-100"
  },
  delivered: { 
    label: "Delivered", 
    icon: PackageCheck, 
    color: "text-emerald-600",
    bgColor: "bg-emerald-100"
  },
  cancelled: { 
    label: "Cancelled", 
    icon: XCircle, 
    color: "text-destructive",
    bgColor: "bg-destructive/10"
  },
};

const nextStatusMap: Partial<Record<OrderStatus, OrderStatus>> = {
  interested: "approved",
  approved: "shipped",
  shipped: "delivered",
};

export function OrderCard({ order, onStatusChange, index = 0 }: OrderCardProps) {
  const config = statusConfig[order.status];
  const StatusIcon = config.icon;
  const nextStatus = nextStatusMap[order.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
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
              {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
            </span>
          </div>

          <div className="p-4 space-y-4">
            {/* Buyer info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {order.buyer_store.logo_url ? (
                  <img 
                    src={order.buyer_store.logo_url}
                    alt={order.buyer_store.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <Store className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{order.buyer_store.name}</p>
                <p className="text-xs text-muted-foreground">Buyer</p>
              </div>
            </div>

            {/* Product info */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{order.tire.brand} {order.tire.model}</p>
                  <p className="text-sm text-muted-foreground">{order.tire.size}</p>
                </div>
                {order.unit_price && (
                  <p className="text-lg font-bold text-primary shrink-0">
                    ฿{order.unit_price.toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {order.tire_dot && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    DOT {order.tire_dot.dot_code}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  <Package className="w-3 h-3 mr-1" />
                  Qty: {order.quantity}
                </Badge>
              </div>
            </div>

            {/* Actions */}
            {order.status !== "delivered" && order.status !== "cancelled" && (
              <div className="flex gap-2">
                {nextStatus && (
                  <Button 
                    className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    onClick={() => onStatusChange(order.id, nextStatus)}
                  >
                    {nextStatus === "approved" && "Approve"}
                    {nextStatus === "shipped" && "Mark as Shipped"}
                    {nextStatus === "delivered" && "Mark as Delivered"}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                {order.status === "interested" && (
                  <Button 
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => onStatusChange(order.id, "cancelled")}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
