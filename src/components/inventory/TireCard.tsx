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
          <div className="p-5"> {/* เพิ่ม Padding ให้ดูโปร่งขึ้น */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Brand & Model: ปรับให้ใหญ่ขึ้นเป็น text-base */}
                <h3 className="font-bold text-base md:text-lg text-foreground">
                  {tire.brand} {tire.model}
                </h3>
                {/* Size: ปรับเป็น text-sm อ่านง่าย */}
                <p className="text-sm text-muted-foreground mt-1 font-medium">
                  {tire.size}
                  {tire.load_index && ` • ${tire.load_index}`}
                  {tire.speed_rating && tire.speed_rating}
                </p>
                {/* Price: ปรับให้เด่นขึ้น */}
                {tire.price && (
                  <p className="text-base font-semibold text-primary mt-2">
                    ฿{tire.price.toLocaleString()}
                    {tire.network_price && (
                      <span className="text-muted-foreground text-xs ml-2 font-normal">
                        Net: ฿{tire.network_price.toLocaleString()}
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Stock Badge: ปรับขนาด Font และ Padding */}
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm",
                isOutOfStock 
                  ? "bg-destructive/10 text-destructive" 
                  : isLowStock 
                  ? "bg-warning/10 text-warning" 
                  : "bg-success/10 text-success"
              )}>
                {isOutOfStock ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Package className="w-4 h-4" />
                )}
                {totalQuantity}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="text-muted-foreground text-sm h-9 px-3 hover:bg-secondary/50"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    View {tire.tire_dots?.length || 0} DOTs
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2">
                {/* Share Toggle */}
                {canEdit && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 px-2">
                          {shareLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Share2 className={cn(
                              "w-4 h-4 transition-colors",
                              tire.is_shared ? "text-primary" : "text-muted-foreground"
                            )} />
                          )}
                          <Switch
                            checked={tire.is_shared}
                            onCheckedChange={handleToggleShare}
                            disabled={shareLoading}
                            className="data-[state=checked]:bg-primary"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="text-sm">
                        {tire.is_shared ? "Shared to Network" : "Share to Network"}
                      </TooltipContent>
                    </Tooltip>

                    <div className="w-px h-5 bg-border/50 mx-1" />
                  </>
                )}

                {/* Edit button: ขยายขนาด */}
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => onEdit(tire)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}

                {/* Delete button: ขยายขนาด */}
                {canDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Tire</AlertDialogTitle>
                        <AlertDialogDescription className="text-base">
                          Are you sure you want to delete <span className="font-semibold text-foreground">{tire.brand} {tire.model}</span>?
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

          {/* DOT Details Section */}
          {expanded && tire.tire_dots && tire.tire_dots.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border/30 bg-secondary/20"
            >
              <div className="p-4 space-y-3">
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
    <div className="flex items-center justify-between gap-4 p-3 bg-background rounded-xl border border-border/50 shadow-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          {/* DOT Code: ปรับเป็น text-sm และ font-mono เพื่อความชัดเจน */}
          <span className="font-mono text-sm md:text-base font-semibold text-foreground">
            {dot.dot_code}
          </span>
          {dot.promotion && (
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              {dot.promotion}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {canEdit ? (
          <>
            {/* ปุ่มลบ: ขยายขนาด */}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg border-input hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
              disabled={loading || dot.quantity === 0}
              onClick={() => dot.id && onQuantityChange(dot.id, -1)}
            >
              <Minus className="w-4 h-4" />
            </Button>

            {/* ตัวเลขจำนวน: ขยายให้ใหญ่เห็นชัดๆ (text-lg) */}
            <span className={cn(
              "w-8 text-center text-lg font-bold tabular-nums",
              isOut && "text-destructive",
              isLow && "text-warning",
              !isOut && !isLow && "text-foreground"
            )}>
              {dot.quantity}
            </span>

            {/* ปุ่มเพิ่ม: ขยายขนาด */}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg border-input hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
              disabled={loading}
              onClick={() => dot.id && onQuantityChange(dot.id, 1)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <span className={cn(
            "px-3 text-base font-semibold",
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