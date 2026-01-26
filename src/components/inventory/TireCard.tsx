import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Minus, 
  Plus, 
  Edit2, 
  Trash2, 
  Share2, 
  Package,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tire, TireDot } from "@/hooks/useTires";
import { cn } from "@/lib/utils";

interface TireCardProps {
  tire: Tire;
  onEdit: (tire: Tire) => void;
  onDelete: (tireId: string) => void;
  onQuantityChange: (dotId: string, change: number) => void;
}

export function TireCard({ tire, onEdit, onDelete, onQuantityChange }: TireCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const totalQuantity = tire.tire_dots?.reduce((sum, dot) => sum + dot.quantity, 0) || 0;
  const isLowStock = totalQuantity > 0 && totalQuantity <= 4;
  const isOutOfStock = totalQuantity === 0;

  const handleQuantityChange = async (dotId: string, change: number) => {
    setLoading(dotId);
    try {
      await onQuantityChange(dotId, change);
    } finally {
      setLoading(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className={cn(
        "glass-card overflow-hidden transition-all",
        isOutOfStock && "border-destructive/30",
        isLowStock && "border-warning/30"
      )}>
        <CardContent className="p-0">
          {/* Main Info */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground truncate">
                    {tire.brand} {tire.model}
                  </h3>
                  {tire.is_shared && (
                    <Badge variant="secondary" className="text-xs">
                      <Share2 className="w-3 h-3 mr-1" />
                      Shared
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {tire.size}
                  {tire.load_index && ` • ${tire.load_index}`}
                  {tire.speed_rating && tire.speed_rating}
                </p>
                {tire.price && (
                  <p className="text-sm font-medium text-primary mt-1">
                    ฿{tire.price.toLocaleString()}
                    {tire.network_price && (
                      <span className="text-muted-foreground ml-2">
                        Network: ฿{tire.network_price.toLocaleString()}
                      </span>
                    )}
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
                {isOutOfStock ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <Package className="w-3.5 h-3.5" />
                )}
                {totalQuantity}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="text-muted-foreground"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Hide DOT Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    {tire.tire_dots?.length || 0} DOT Codes
                  </>
                )}
              </Button>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(tire)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Tire</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {tire.brand} {tire.model} ({tire.size})?
                        This will also delete all DOT codes and stock history.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(tire.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>

          {/* DOT Details */}
          {expanded && tire.tire_dots && tire.tire_dots.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border/50 bg-muted/30"
            >
              <div className="p-4 space-y-3">
                {tire.tire_dots.map((dot) => (
                  <DotRow
                    key={dot.id}
                    dot={dot}
                    loading={loading === dot.id}
                    onQuantityChange={handleQuantityChange}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface DotRowProps {
  dot: TireDot;
  loading: boolean;
  onQuantityChange: (dotId: string, change: number) => void;
}

function DotRow({ dot, loading, onQuantityChange }: DotRowProps) {
  const isLow = dot.quantity > 0 && dot.quantity <= 2;
  const isOut = dot.quantity === 0;

  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-background rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium">{dot.dot_code}</span>
          {dot.promotion && (
            <Badge variant="outline" className="text-xs">
              {dot.promotion}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={loading || dot.quantity === 0}
          onClick={() => dot.id && onQuantityChange(dot.id, -1)}
        >
          <Minus className="w-4 h-4" />
        </Button>

        <span className={cn(
          "w-10 text-center font-semibold",
          isOut && "text-destructive",
          isLow && "text-warning"
        )}>
          {dot.quantity}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={loading}
          onClick={() => dot.id && onQuantityChange(dot.id, 1)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
