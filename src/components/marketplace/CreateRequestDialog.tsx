import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useBroadcast } from "@/hooks/useBroadcast";
import { Loader2, Plus, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export function CreateRequestDialog({ onPosted }: { onPosted: () => void }) {
  const { createRequest, loading } = useBroadcast();
  const [open, setOpen] = useState(false);
  
  // ✅ เพิ่ม field brand และ model
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    width: "", 
    ratio: "", 
    diameter: "", 
    quantity: "1", 
    notes: "", 
    urgency: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // สร้าง Title อัตโนมัติจากข้อมูลที่กรอก
    const autoTitle = formData.brand 
      ? `Wanted: ${formData.brand} ${formData.width}/${formData.ratio} R${formData.diameter}`
      : `Wanted: ${formData.width}/${formData.ratio} R${formData.diameter}`;

    await createRequest({
        ...formData,
        title: autoTitle // ส่ง Title ที่เจนฯ แล้วไปด้วย
    });
    
    setOpen(false);
    setFormData({ brand: "", model: "", width: "", ratio: "", diameter: "", quantity: "1", notes: "", urgency: false });
    onPosted();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 shadow-md hover:shadow-lg">
          <Plus className="w-4 h-4 mr-2" />
          Post Request
        </Button>
      </DialogTrigger>
      
      {/* Animation ปิดทิ้ง เพื่อใช้ Framer Motion */}
      <DialogContent className="
        sm:max-w-[500px] p-0 
        bg-transparent border-none shadow-none 
        !animate-none !transition-none 
        data-[state=open]:!animate-none data-[state=closed]:!animate-none 
        [&>button]:hidden overflow-visible
      ">
        
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 25, mass: 0.5 }}
            className="bg-background p-6 rounded-2xl shadow-xl border relative overflow-hidden"
        >
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 hover:bg-muted focus:outline-none">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </DialogPrimitive.Close>

            <DialogHeader className="mb-5">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    📢 Post Tire Request
                </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* --- Row 1: Brand & Model (เพิ่มใหม่) --- */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Brand</Label>
                        <Input 
                            placeholder="e.g. Michelin" 
                            value={formData.brand} 
                            onChange={e => setFormData({...formData, brand: e.target.value})} 
                            className="bg-muted/30 focus:bg-background"
                            autoFocus
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Model (Optional)</Label>
                        <Input 
                            placeholder="e.g. Primacy 4" 
                            value={formData.model} 
                            onChange={e => setFormData({...formData, model: e.target.value})} 
                            className="bg-muted/30 focus:bg-background"
                        />
                    </div>
                </div>

                {/* --- Row 2: Size Spec --- */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Width</Label>
                        <Input 
                            placeholder="215" 
                            className="font-medium text-center bg-muted/30 focus:bg-background"
                            value={formData.width} 
                            onChange={e => setFormData({...formData, width: e.target.value})} 
                            required 
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ratio</Label>
                        <Input 
                            placeholder="55" 
                            className="font-medium text-center bg-muted/30 focus:bg-background"
                            value={formData.ratio} 
                            onChange={e => setFormData({...formData, ratio: e.target.value})} 
                            required 
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Rim</Label>
                        <Input 
                            placeholder="17" 
                            className="font-medium text-center bg-muted/30 focus:bg-background"
                            value={formData.diameter} 
                            onChange={e => setFormData({...formData, diameter: e.target.value})} 
                            required 
                        />
                    </div>
                </div>
                
                {/* --- Row 3: Quantity & Urgency --- */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quantity</Label>
                        <Input 
                            type="number" 
                            min="1" 
                            className="font-medium bg-muted/30 focus:bg-background"
                            value={formData.quantity} 
                            onChange={e => setFormData({...formData, quantity: e.target.value})} 
                            required 
                        />
                    </div>
                    
                    <div className="flex items-end">
                        <div className={`flex items-center justify-between px-3 py-2.5 border rounded-md w-full transition-all duration-300 ${formData.urgency ? 'bg-red-50 border-red-200 dark:bg-red-900/20' : 'bg-muted/30 border-transparent'}`}>
                            <Label htmlFor="urgent" className={`cursor-pointer text-sm font-semibold transition-colors ${formData.urgency ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                                {formData.urgency ? "Urgent! 🔥" : "Urgent?"}
                            </Label>
                            <Switch 
                                id="urgent" 
                                checked={formData.urgency} 
                                onCheckedChange={c => setFormData({...formData, urgency: c})} 
                                className="data-[state=checked]:bg-red-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Additional Notes</Label>
                    <Textarea 
                        placeholder="Specific DOT year? New or Used condition?" 
                        value={formData.notes} 
                        onChange={e => setFormData({...formData, notes: e.target.value})} 
                        className="resize-none h-20 bg-muted/30 focus:bg-background"
                    />
                </div>

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11 text-base font-semibold shadow-md active:scale-[0.98] transition-all" disabled={loading}>
                    {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : "Post Request Now"}
                </Button>
            </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}