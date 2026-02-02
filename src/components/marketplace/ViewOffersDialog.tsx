import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Phone, MessageCircle, CheckCircle2, User, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BroadcastOffer } from "@/types/broadcast";
import { motion, AnimatePresence } from "framer-motion";
import * as DialogPrimitive from "@radix-ui/react-dialog";

interface ViewOffersDialogProps {
  requestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewOffersDialog({ requestId, open, onOpenChange }: ViewOffersDialogProps) {
  const [offers, setOffers] = useState<BroadcastOffer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (requestId && open) {
      fetchOffers();
    }
  }, [requestId, open]);

  const fetchOffers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('broadcast_offers')
      .select(`
        *,
        stores (name, logo_url, phone, address)
      `)
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOffers(data as any);
    }
    setLoading(false);
  };

  const handleAcceptDeal = async (offerId: string) => {
      console.log("Accept deal:", offerId);
      // TODO: Logic สร้าง Order
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 🔥 KEY FIX: ปิด Animation เดิมของ Shadcn ทิ้ง (!animate-none) และทำให้พื้นหลังใส */}
      <DialogContent className="
        sm:max-w-xl p-0 
        bg-transparent border-none shadow-none 
        !animate-none !transition-none 
        data-[state=open]:!animate-none data-[state=closed]:!animate-none 
        [&>button]:hidden overflow-visible
      ">
        
        {/* ใช้ Framer Motion สร้าง Card ที่เด้งดึ๋ง */}
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ 
                type: "spring", 
                stiffness: 450, 
                damping: 25, 
                mass: 0.6 
            }}
            className="bg-white dark:bg-card rounded-2xl shadow-2xl border relative overflow-hidden"
        >
            {/* Custom Close Button */}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-2 bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 transition-colors backdrop-blur-sm cursor-pointer outline-none ring-0 z-50">
                <X className="w-5 h-5 text-slate-500" />
            </DialogPrimitive.Close>

            <DialogHeader className="p-6 pb-2 border-b border-border/40">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    📋 Received Offers
                    {offers.length > 0 && (
                        <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {offers.length}
                        </Badge>
                    )}
                </DialogTitle>
            </DialogHeader>

            <ScrollArea className="h-[60vh] bg-slate-50/50 dark:bg-black/20">
                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                            <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
                            <p className="text-sm font-medium">Fetching offers...</p>
                        </div>
                    ) : offers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-card/50">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <User className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">No offers yet</h3>
                            <p className="text-slate-500 text-sm mt-1 max-w-[200px]">
                                Check back later or try updating your request urgency.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <AnimatePresence mode="popLayout">
                                {offers.map((offer, index) => (
                                    <motion.div
                                        key={offer.id}
                                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ 
                                            delay: index * 0.1, // Stagger effect (เรียงกันขึ้นมาทีละอัน)
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 20
                                        }}
                                        className="group relative bg-white dark:bg-card border border-border/60 hover:border-primary/50 transition-all rounded-xl p-5 shadow-sm hover:shadow-md"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-700 shadow-sm">
                                                    <AvatarImage src={offer.stores?.logo_url || ""} />
                                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                        {offer.stores?.name?.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-tight">
                                                        {offer.stores?.name || "Unknown Store"}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                        {new Date(offer.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                                                    ฿{offer.price.toLocaleString()}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Per Unit</p>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-sm space-y-1.5 mb-4 border border-slate-100 dark:border-slate-700/50">
                                            {offer.tire_dot && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground text-xs font-medium uppercase">DOT / Year</span>
                                                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{offer.tire_dot}</span>
                                                </div>
                                            )}
                                            {offer.notes && (
                                                <div className="flex justify-between items-start gap-4">
                                                    <span className="text-muted-foreground text-xs font-medium uppercase mt-0.5">Note</span>
                                                    <span className="text-right text-slate-700 dark:text-slate-300 leading-snug">{offer.notes}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-3">
                                            {offer.stores?.phone && (
                                                <Button variant="outline" size="sm" className="flex-1 gap-2 border-slate-200 hover:bg-slate-50 dark:border-slate-700" onClick={() => window.location.href = `tel:${offer.stores?.phone}`}>
                                                    <Phone className="w-4 h-4 text-slate-500" /> Call
                                                </Button>
                                            )}
                                            <Button size="sm" className="flex-[2] gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 dark:shadow-none" onClick={() => handleAcceptDeal(offer.id)}>
                                                <CheckCircle2 className="w-4 h-4" /> Accept Deal
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}