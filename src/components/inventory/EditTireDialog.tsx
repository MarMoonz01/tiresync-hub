import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Save, Loader2, Plus, Trash2, Tag, AlertCircle, Coins
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tire, useTires, TireFormData } from "@/hooks/useTires";
import { useToast } from "@/hooks/use-toast";

// --- Animation (เหมือนเดิม) ---
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const contentVariants = {
  hidden: { opacity: 0, scale: 0.95, x: "-50%", y: "-40%" },
  visible: {
    opacity: 1, scale: 1, x: "-50%", y: "-50%",
    transition: { type: "spring" as const, stiffness: 300, damping: 25 }
  },
  exit: { opacity: 0, scale: 0.95, x: "-50%", y: "-40%", transition: { duration: 0.2 } },
};

interface EditTireDialogProps {
  tire: Tire | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditTireDialog({ tire, open, onOpenChange, onSuccess }: EditTireDialogProps) {
  const { updateTire } = useTires(); // ใช้ updateTire ตัวใหญ่ที่แก้ได้ทุกอย่าง
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Form States
  const [price, setPrice] = useState("");
  const [networkPrice, setNetworkPrice] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [dots, setDots] = useState<{ code: string, qty: string, promo: string }[]>([]);

  // Load Data
  useEffect(() => {
    if (tire) {
      setPrice(tire.price?.toString() || "");
      setNetworkPrice(tire.network_price?.toString() || "");
      setIsShared(tire.is_shared || false);
      setDots(
        tire.tire_dots && tire.tire_dots.length > 0
          ? tire.tire_dots.map(d => ({
            code: d.dot_code,
            qty: d.quantity.toString(),
            promo: d.promotion || ""
          }))
          : [{ code: "", qty: "0", promo: "" }]
      );
    }
  }, [tire]);

  // Handlers
  const handleDotChange = (index: number, field: string, value: string) => {
    const newDots = [...dots];
    (newDots[index] as any)[field] = value;
    setDots(newDots);
  };

  const addDotRow = () => {
    setDots([...dots, { code: "", qty: "0", promo: "" }]);
  };

  const removeDotRow = (index: number) => {
    if (dots.length > 1) {
      setDots(dots.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    if (!tire) return;
    setIsSaving(true);

    try {
      // เตรียมข้อมูลสำหรับ updateTire (เหมือนในหน้า Edit เก่า)
      const formData: TireFormData = {
        size: tire.size, // ค่าเดิม
        brand: tire.brand, // ค่าเดิม
        model: tire.model || "", // ค่าเดิม
        load_index: tire.load_index || "",
        speed_rating: tire.speed_rating || "",
        price: price,
        network_price: networkPrice,
        is_shared: isShared,
        // กรอง DOT ที่ว่างเปล่าออก
        dots: dots.filter(d => d.code.trim() !== "").map(d => ({
          dot_code: d.code,
          quantity: d.qty,
          promotion: d.promo
        }))
      };

      await updateTire(tire.id, formData);

      toast({ title: "Success", description: "Tire updated successfully" });
      onSuccess();
      onOpenChange(false);

    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to update tire", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!tire) return null;

  return (
    <AnimatePresence>
      {open && (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay asChild>
              <motion.div variants={overlayVariants} initial="hidden" animate="visible" exit="hidden" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild>
              <motion.div
                variants={contentVariants} initial="hidden" animate="visible" exit="exit"
                className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg gap-4 border bg-background p-0 shadow-lg duration-200 sm:rounded-lg overflow-hidden max-h-[90vh] flex flex-col"
              >
                {/* Header (Locked Info) */}
                <div className="bg-muted/30 p-6 pb-4 border-b shrink-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight">{tire.brand} {tire.model}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-sm font-mono bg-background">{tire.size}</Badge>
                        {tire.load_index && <span className="text-xs text-muted-foreground">Load: {tire.load_index}{tire.speed_rating}</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2" onClick={() => onOpenChange(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-4 text-xs text-muted-foreground bg-blue-50/50 p-2 rounded border border-blue-100/50">
                    <AlertCircle className="w-3.5 h-3.5 text-blue-500 mt-0.5" />
                    <span>Editing stock & pricing. Spec details are managed in Master Catalog.</span>
                  </div>
                </div>

                {/* Scrollable Content */}
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-6">

                    {/* 1. Pricing Section (2 Types) */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                        <Coins className="w-4 h-4" /> Pricing
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Retail Price</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">฿</span>
                            <Input
                              type="number"
                              className="pl-7"
                              value={price}
                              onChange={e => setPrice(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Network/Wholesale</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">฿</span>
                            <Input
                              type="number"
                              className="pl-7"
                              value={networkPrice}
                              onChange={e => setNetworkPrice(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
                        <div className="space-y-0.5">
                          <Label className="text-sm">Share to Network</Label>
                          <p className="text-xs text-muted-foreground">Visible to other stores</p>
                        </div>
                        <Switch checked={isShared} onCheckedChange={setIsShared} />
                      </div>
                    </div>

                    {/* 2. Stock Section (Unlimited DOTs) */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                          <Tag className="w-4 h-4" /> Inventory & DOTs
                        </h3>
                        <Button variant="outline" size="sm" onClick={addDotRow} className="h-7 text-xs">
                          <Plus className="w-3 h-3 mr-1" /> Add DOT
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {dots.map((dot, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="p-3 bg-muted/20 rounded-lg border space-y-3"
                          >
                            <div className="flex gap-3">
                              <div className="flex-1 space-y-1">
                                <Label className="text-[10px] text-muted-foreground uppercase">DOT Code</Label>
                                <Input
                                  placeholder="e.g. 2423"
                                  value={dot.code}
                                  onChange={e => handleDotChange(idx, 'code', e.target.value)}
                                  className="h-8 font-mono"
                                />
                              </div>
                              <div className="w-24 space-y-1">
                                <Label className="text-[10px] text-muted-foreground uppercase">Qty</Label>
                                <Input
                                  type="number"
                                  value={dot.qty}
                                  onChange={e => handleDotChange(idx, 'qty', e.target.value)}
                                  className="h-8 text-center"
                                />
                              </div>
                              {dots.length > 1 && (
                                <div className="flex items-end pb-0.5">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeDotRow(idx)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase">Promotion (Optional)</Label>
                              <Input
                                placeholder="e.g. Buy 3 Get 1"
                                value={dot.promo}
                                onChange={e => handleDotChange(idx, 'promo', e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                  </div>
                </ScrollArea>

                {/* Footer */}
                <div className="p-6 pt-2 border-t shrink-0 flex justify-end gap-2 bg-background">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={isSaving} className="min-w-[100px]">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save
                  </Button>
                </div>

              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </AnimatePresence>
  );
}