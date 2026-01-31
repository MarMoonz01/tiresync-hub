import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Phone, Store, Calendar, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// --- Motion Components (ชุดเดียวกับ Compare Stock เพื่อความลื่นไหล) ---
const MotionDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    asChild
    className={cn("fixed inset-0 z-50 bg-black/60 backdrop-blur-sm", className)}
    {...props}
  >
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    />
  </DialogPrimitive.Overlay>
));
MotionDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const MotionDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <MotionDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      asChild
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[90%] max-w-md bg-background shadow-2xl rounded-2xl overflow-hidden p-0 border border-border",
        className
      )}
      {...props}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: "-45%", x: "-50%" }}
        animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
        exit={{ opacity: 0, scale: 0.95, y: "-45%", x: "-50%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        {children}
      </motion.div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
MotionDialogContent.displayName = DialogPrimitive.Content.displayName;

// --- Interfaces ---
interface StoreDetailsDialogProps {
  store: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StoreDetailsDialog({ store, open, onOpenChange }: StoreDetailsDialogProps) {
  // ถ้าไม่มีข้อมูล store ให้ return null ไปเลย (กัน Error)
  if (!store && !open) return null;

  // เตรียมข้อมูล
  const initials = store?.name?.substring(0, 2).toUpperCase() || "ST";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence mode="wait">
        {open && store && (
          <MotionDialogContent>
            {/* Close Button */}
            <div className="absolute right-4 top-4 z-10">
               <DialogPrimitive.Close className="rounded-full p-1.5 bg-background/50 hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
               </DialogPrimitive.Close>
            </div>

            {/* Content Container */}
            <div className="flex flex-col">
              
              {/* Header / Banner Area */}
              <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-transparent p-6 pb-8 flex flex-col items-center text-center relative">
                 {/* Logo */}
                <div className="relative mb-3">
                    <div className="h-24 w-24 rounded-2xl border-4 border-background bg-white p-1 shadow-lg overflow-hidden">
                        <Avatar className="h-full w-full rounded-xl">
                        <AvatarImage src={store.logo_url} className="object-cover" />
                        <AvatarFallback className="text-2xl bg-primary/5 text-primary font-bold">
                            {initials}
                        </AvatarFallback>
                        </Avatar>
                    </div>
                    {store.is_active && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: "spring" }}
                          className="absolute -bottom-2 -right-2 bg-green-100 text-green-700 border-2 border-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center shadow-sm uppercase tracking-wider"
                        >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                        </motion.div>
                    )}
                </div>

                {/* Name & Since */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                    <h2 className="text-2xl font-bold leading-tight px-4">{store.name}</h2>
                    {store.since && (
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center justify-center gap-1.5 bg-background/50 py-0.5 px-2 rounded-full mx-auto w-fit border border-border/50">
                            <Calendar className="w-3 h-3" />
                            Partner since {format(new Date(store.since), 'MMM yyyy')}
                        </p>
                    )}
                </motion.div>
              </div>

              {/* Info Details Section */}
              <div className="p-6 space-y-4">
                <motion.div 
                  className="space-y-4 bg-muted/20 p-5 rounded-xl border border-border/50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                    {/* Address */}
                    <div className="flex items-start gap-3.5">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg shrink-0">
                             <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-sm pt-0.5">
                            <span className="font-semibold block mb-0.5 text-foreground">Address</span>
                            <span className="text-muted-foreground leading-relaxed block">
                                {store.address || "No address provided"}
                            </span>
                        </div>
                    </div>

                    <div className="h-px bg-border/50 w-full" />

                    {/* Phone */}
                    <div className="flex items-center gap-3.5">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg shrink-0">
                             <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="text-sm">
                            <span className="font-semibold block mb-0.5 text-foreground">Phone</span>
                            <span className="text-muted-foreground">
                                {store.phone ? (
                                    <a href={`tel:${store.phone}`} className="hover:text-primary hover:underline font-medium transition-colors">
                                      {store.phone}
                                    </a>
                                ) : "No phone number"}
                            </span>
                        </div>
                    </div>

                    <div className="h-px bg-border/50 w-full" />

                    {/* Description */}
                    <div className="flex items-start gap-3.5">
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg shrink-0">
                             <Store className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="text-sm pt-0.5">
                            <span className="font-semibold block mb-0.5 text-foreground">About</span>
                            <span className="text-muted-foreground leading-relaxed block">
                                {store.description || "No description available for this store."}
                            </span>
                        </div>
                    </div>
                </motion.div>
              </div>
            </div>
          </MotionDialogContent>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}