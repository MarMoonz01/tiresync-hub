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
  ChevronUp,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tire, TireDot } from "@/hooks/useTires";
import { cn } from "@/lib/utils";

interface TireCardProps {
  tire: Tire;
  onEdit: (tire: Tire) => void;
  onDelete: (tireId: string) => void;
  onQuantityChange: (dotId: string, change: number) => void;
  onToggleShare: (tireId: string, isShared: boolean) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function TireCard({ 
  tire, 
  onEdit, 
  onDelete, 
  onQuantityChange, 
  onToggleShare,
  canEdit = true,
  canDelete = true,
}: TireCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  const totalQuantity = tire.tire_dots?.reduce((sum, dot) => sum + dot.quantity, 0) || 0;
  const isLowStock = totalQuantity > 0 && totalQuantity <= 4;
  const isOutOfStock = totalQuantity === 0;

  const handleToggleShare = async () => {
    setShareLoading(true);
    try {
      await onToggleShare(tire.id, !tire.is_shared);
    } finally {
      setShareLoading(false);
    }
  };

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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <Card className={cn(
        "overflow-hidden border-0 shadow-soft bg-card/60 backdrop-blur-sm transition-all",
        isOutOfStock && "ring-1 ring-destructive/20",
        isLowStock && "ring-1 ring-warning/20"
      )}>
        <CardContent className="p-0">
          {/* Main Info */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-foreground">
                  {tire.brand} {tire.model}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tire.size}
                  {tire.load_index && ` • ${tire.load_index}`}
                  {tire.speed_rating && tire.speed_rating}
                </p>
                {tire.price && (
                  <p className="text-sm font-medium text-primary mt-1">
                    ฿{tire.price.toLocaleString()}
                    {tire.network_price && (
                      <span className="text-muted-foreground text-xs ml-2">
                        Net: ฿{tire.network_price.toLocaleString()}
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Stock Badge */}
              <div className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                isOutOfStock 
                  ? "bg-destructive/10 text-destructive" 
                  : isLowStock 
                  ? "bg-warning/10 text-warning" 
                  : "bg-success/10 text-success"
              )}>
                {isOutOfStock ? (
                  <AlertTriangle className="w-3 h-3" />
                ) : (
                  <Package className="w-3 h-3" />
                )}
                {totalQuantity}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="text-muted-foreground text-xs h-8 px-2"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 mr-1" />
                    {tire.tire_dots?.length || 0} DOTs
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2">
                {/* Share Toggle - only show if user can edit */}
                {canEdit && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5">
                          {shareLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                          ) : (
                            <Share2 className={cn(
                              "w-3.5 h-3.5 transition-colors",
                              tire.is_shared ? "text-primary" : "text-muted-foreground"
                            )} />
                          )}
                          <Switch
                            checked={tire.is_shared}
                            onCheckedChange={handleToggleShare}
                            disabled={shareLoading}
                            className="scale-75 data-[state=checked]:bg-primary"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        {tire.is_shared ? "Shared" : "Share to Network"}
                      </TooltipContent>
                    </Tooltip>

                    <div className="w-px h-4 bg-border/50" />
                  </>
                )}

                {/* Edit button - only show if user can edit */}
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(tire)}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                )}

                {/* Delete button - only show if user can delete */}
                {canDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Tire</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {tire.brand} {tire.model} ({tire.size})?
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
                )}
              </div>
            </div>
          </div>

          {/* DOT Details */}
          {expanded && tire.tire_dots && tire.tire_dots.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border/30 bg-secondary/30"
            >
              <div className="p-3 space-y-2">
                {tire.tire_dots.map((dot) => (
                  <DotRow
                    key={dot.id}
                    dot={dot}
                    loading={loading === dot.id}
                    onQuantityChange={handleQuantityChange}
                    canEdit={canEdit}
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
  canEdit?: boolean;
}

function DotRow({ dot, loading, onQuantityChange, canEdit = true }: DotRowProps) {
  const isLow = dot.quantity > 0 && dot.quantity <= 2;
  const isOut = dot.quantity === 0;

  return (
    <div className="flex items-center justify-between gap-3 p-2.5 bg-background rounded-xl">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium">{dot.dot_code}</span>
          {dot.promotion && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {dot.promotion}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {canEdit ? (
          <>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={loading || dot.quantity === 0}
              onClick={() => dot.id && onQuantityChange(dot.id, -1)}
            >
              <Minus className="w-3 h-3" />
            </Button>

            <span className={cn(
              "w-8 text-center text-sm font-medium",
              isOut && "text-destructive",
              isLow && "text-warning"
            )}>
              {dot.quantity}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={loading}
              onClick={() => dot.id && onQuantityChange(dot.id, 1)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </>
        ) : (
          <span className={cn(
            "px-3 text-sm font-medium",
            isOut && "text-destructive",
            isLow && "text-warning"
          )}>
            {dot.quantity} pcs
          </span>
        )}
      </div>
    </div>
  );
}
