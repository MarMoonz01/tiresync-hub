import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Package, Info, X } from "lucide-react";
import { motion } from "framer-motion";

export function StoreProductDetailDialog({
  product,
  open,
  onOpenChange,
}: {
  product: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!product && !open) return null;
  const safeProduct = product || {}; 
  const totalStock = safeProduct.tire_dots?.reduce((sum: any, dot: any) => sum + dot.quantity, 0) || 0;
  const productName = `${safeProduct.brand} ${safeProduct.model || ''} ${safeProduct.size}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* FIX ความกระตุก:
         1. ใช้ data-[state=open]:!animate-none เพื่อบังคับปิด Animation ของ Shadcn ทุกกรณี
         2. ตั้ง bg-transparent เพื่อไม่ให้เห็นกล่องขาวแวบขึ้นมาก่อน
      */}
      <DialogContent className="
        max-w-4xl p-0 
        bg-transparent border-none shadow-none 
        !animate-none !transition-none 
        data-[state=open]:!animate-none data-[state=closed]:!animate-none 
        [&>button]:hidden overflow-visible
      ">
        
        {/* ใช้ motion.div ตัวเดียวคุมทั้งหมด เพื่อความลื่นไหลระดับ GPU */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 350,   // ความเด้ง (ค่าสูง = เด้งเร็วแบบ App มือถือ)
            damping: 25,      // ความหนืด (ค่านี้ช่วยให้หยุดนิ่งแบบไม่สั่น)
            mass: 0.5         // น้ำหนักเบา ขยับไว
          }}
          style={{ willChange: "transform, opacity" }} // บังคับใช้ GPU render
          className="bg-white dark:bg-card shadow-2xl rounded-2xl overflow-hidden relative flex flex-col max-h-[85vh]"
        >
            {/* Custom Close Button */}
            <DialogClose className="absolute right-4 top-4 z-50 rounded-full p-2 bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 transition-colors backdrop-blur-sm cursor-pointer outline-none ring-0">
                <X className="w-5 h-5 text-slate-500" />
            </DialogClose>

            <div className="p-8 overflow-y-auto custom-scrollbar">
                {/* Header Section */}
                <div className="mb-8 space-y-4">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-slate-200 uppercase tracking-wider">
                            {safeProduct.brand}
                        </Badge>
                        {safeProduct.is_shared && (
                            <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-none text-xs font-medium px-2.5 py-0.5">
                                Shared Network
                            </Badge>
                        )}
                    </div>
                    
                    <div>
                        <DialogTitle className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
                            {productName}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 mt-2 font-mono text-sm">
                            SKU: {safeProduct.id}
                        </DialogDescription>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                    
                    {/* Left Column: Summary & Price */}
                    <div className="md:col-span-5 space-y-6">
                        <div className="bg-slate-50/80 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors hover:bg-slate-50/90">
                            <div className="flex gap-3 mb-4">
                                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Product Summary</h4>
                                    <p className="text-slate-500 text-sm leading-relaxed">
                                        {safeProduct.brand} {safeProduct.model} tire sized {safeProduct.size}.
                                    </p>
                                </div>
                            </div>

                            <Separator className="bg-slate-200 dark:bg-slate-700 my-4" />

                            <div className="space-y-5">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-slate-500 font-medium">Price (Network)</span>
                                    <span className="text-3xl font-extrabold text-blue-600">
                                        {safeProduct.network_price ? `฿${safeProduct.network_price.toLocaleString()}` : "N/A"}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center bg-white dark:bg-black/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Package className="w-4 h-4" />
                                        <span className="font-medium">Total Stock</span>
                                    </div>
                                    <span className={`font-bold ${totalStock > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        {totalStock} units
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Specs & DOTs */}
                    <div className="md:col-span-7 space-y-8">
                        {/* Specifications */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Specifications</h4>
                            <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Size</p>
                                    <p className="font-semibold text-slate-900 dark:text-white text-lg">{safeProduct.size}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Load/Speed</p>
                                    <p className="font-semibold text-slate-900 dark:text-white text-lg">
                                        {safeProduct.load_index}{safeProduct.speed_rating || '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Pattern/Model</p>
                                    <p className="font-semibold text-slate-900 dark:text-white text-base break-words">
                                        {safeProduct.model || '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Type</p>
                                    <p className="font-semibold text-slate-900 dark:text-white text-base">
                                        {safeProduct.type || 'Radial'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-slate-100 dark:bg-slate-800" />

                        {/* Available DOTs */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Available DOTs
                            </h4>
                            {safeProduct.tire_dots && safeProduct.tire_dots.length > 0 ? (
                              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                <Table>
                                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                    <TableRow className="hover:bg-transparent border-b border-slate-200 dark:border-slate-800">
                                      <TableHead className="h-10 text-xs font-semibold text-slate-500 pl-6">DOT (Year/Week)</TableHead>
                                      <TableHead className="h-10 text-right text-xs font-semibold text-slate-500 pr-6">Qty</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {safeProduct.tire_dots.map((dot: any) => (
                                      <TableRow key={dot.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                        <TableCell className="font-mono text-sm pl-6 py-3 font-medium text-slate-700 dark:text-slate-300">
                                            {dot.dot_code || 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right text-sm pr-6 py-3 font-semibold text-slate-900 dark:text-white">
                                            {dot.quantity}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No specific DOT data available.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}