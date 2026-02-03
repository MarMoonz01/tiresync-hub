import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MarketplaceProduct } from "@/hooks/useMarketplaceProducts";
import { CalendarClock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as DialogPrimitive from "@radix-ui/react-dialog";

interface ProductGroupDialogProps {
  product: MarketplaceProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductGroupDialog({ product, open, onOpenChange }: ProductGroupDialogProps) {
  const activeProduct = product; 

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="
        sm:max-w-3xl p-0 
        bg-transparent border-none shadow-none 
        !animate-none !transition-none 
        data-[state=open]:!animate-none data-[state=closed]:!animate-none 
        overflow-visible
      ">
        <AnimatePresence mode="wait">
            {activeProduct && (
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
                    className="bg-white dark:bg-card rounded-2xl shadow-2xl border border-border overflow-hidden relative flex flex-col max-h-[85vh]"
                >
                    {/* Custom Close Button */}
                    <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-2 bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 transition-colors backdrop-blur-sm cursor-pointer outline-none z-50 text-slate-500">
                        <X className="w-5 h-5" />
                    </DialogPrimitive.Close>

                    {/* Header */}
                    <DialogHeader className="p-6 pb-4 border-b bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                        <div className="flex items-start gap-5 pr-8">
                            <div className="h-20 w-20 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center border shadow-sm shrink-0">
                                <span className="text-2xl font-black text-slate-300 dark:text-slate-600 select-none">
                                    {activeProduct.brand.substring(0, 2).toUpperCase()}
                                </span>
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="bg-white dark:bg-slate-800 font-bold shadow-sm">
                                        {activeProduct.brand}
                                    </Badge>
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shadow-sm">
                                        {activeProduct.storeCount} Sellers
                                    </Badge>
                                </div>
                                <DialogTitle className="text-3xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100 leading-tight">
                                    {activeProduct.size}
                                </DialogTitle>
                                <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border shadow-sm">
                                        Model: <strong className="text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{activeProduct.model || "Standard"}</strong>
                                    </span>
                                    {(activeProduct.load_index || activeProduct.speed_rating) && (
                                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border shadow-sm">
                                            Index: <strong>{activeProduct.load_index}{activeProduct.speed_rating}</strong>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Content (Scrollable) */}
                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 sticky top-0 bg-white dark:bg-card z-10 py-1">
                                Available Sellers ({activeProduct.stores.length})
                            </h4>
                            
                            {/* List of Sellers */}
                            <div className="space-y-3">
                                {activeProduct.stores.map((storeData, index) => (
                                    <motion.div 
                                        key={`${storeData.store_id}-${index}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 + (index * 0.05) }}
                                        className="group flex flex-col sm:flex-row items-start sm:items-stretch bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 gap-4 hover:border-primary/50 hover:shadow-md transition-all relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-primary transition-colors" />
                                        
                                        {/* 1. Store Info */}
                                        <div className="flex items-center gap-3 sm:w-[25%] min-w-[180px] pl-2">
                                            <Avatar className="h-12 w-12 border bg-white shadow-sm">
                                                <AvatarImage src={storeData.store.logo_url || ""} />
                                                <AvatarFallback className="font-bold text-primary bg-primary/10">
                                                    {storeData.store.name.substring(0, 2)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-sm truncate leading-tight text-slate-900 dark:text-slate-100">
                                                    {storeData.store.name}
                                                </h4>
                                                <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1 font-medium">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Verified
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. DOT Inventory */}
                                        <div className="flex-1 min-w-0 border-l border-slate-100 dark:border-slate-800 pl-0 sm:pl-4 mt-2 sm:mt-0 w-full sm:w-auto">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
                                                <span className="text-xs font-medium text-muted-foreground">DOT Available:</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {storeData.tire_dots.map((dot) => (
                                                    <div key={dot.id} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 transition-colors cursor-default">
                                                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                                            {dot.dot_code}
                                                        </span>
                                                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-white dark:bg-black shadow-sm text-slate-500">
                                                            x{dot.quantity}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 3. Price Only (Removed Buy/Call Buttons) */}
                                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto sm:pl-4 sm:border-l border-slate-100 dark:border-slate-800 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0">
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                                    ฿{storeData.network_price?.toLocaleString() || "-"}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">
                                                    per unit
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </ScrollArea>
                </motion.div>
            )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}