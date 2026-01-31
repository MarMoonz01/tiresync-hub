import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X, Store, ArrowRightLeft, Eye, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NetworkStore } from "@/hooks/useNetworkStores";

// --- Custom Motion Components (ถอดแบบมาจาก Alert Dialog ที่คุณชอบ) ---

const MotionDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    asChild
    className={cn("fixed inset-0 z-50 bg-black/40 backdrop-blur-md", className)}
    {...props}
  >
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
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
        "fixed left-[50%] top-[50%] z-50 grid w-[95%] max-w-md gap-6 border bg-background/95 p-0 shadow-2xl backdrop-blur-xl sm:rounded-2xl overflow-hidden",
        className
      )}
      {...props}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, x: "-50%", y: "-45%" }}
        animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
        exit={{ opacity: 0, scale: 0.92, x: "-50%", y: "-45%" }}
        transition={{
          type: "spring",
          damping: 28,
          stiffness: 320,
        }}
      >
        {children}
      </motion.div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
MotionDialogContent.displayName = DialogPrimitive.Content.displayName;

// --- Main Component ---

interface PartnerRequestDialogProps {
  store: NetworkStore | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendRequest: (storeId: string) => void;
  loading?: boolean;
}

export function PartnerRequestDialog({
  store,
  open,
  onOpenChange,
  onSendRequest,
  loading = false,
}: PartnerRequestDialogProps) {
  // ถ้าไม่มี store หรือไม่ได้เปิด ให้ return null ไปเลยเพื่อให้ AnimatePresence ทำงานถูกต้องจากฝั่ง Parent (ถ้ามี)
  // แต่ในเคส Radix Dialog เราใช้ `open` prop ควบคุมการ render ภายใน Root

  const initials = store?.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence mode="wait">
        {open && store && (
          <MotionDialogContent>
            {/* Close Button */}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>

            {/* Header / Banner Area */}
            <div className="flex flex-col items-center text-center pt-8 pb-4 px-6 bg-gradient-to-b from-primary/5 to-background">
              {/* Store Logo with Glow Effect */}
              <div className="relative mb-4 group cursor-default">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full group-hover:bg-primary/30 transition-all duration-500" />
                <Avatar className="w-24 h-24 border-4 border-background relative shadow-xl transform group-hover:scale-105 transition-transform duration-300">
                  <AvatarImage src={store.logo_url || undefined} alt={store.name} />
                  <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                
                {/* Status Badge Decoration */}
                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1.5 rounded-full border-4 border-background shadow-sm">
                   <Store className="w-3.5 h-3.5" />
                </div>
              </div>

              <DialogPrimitive.Title className="text-2xl font-bold tracking-tight text-foreground">
                {store.name}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-muted-foreground mt-2 text-sm max-w-[80%] mx-auto">
                Connect to unlock partnership features and grow together.
              </DialogPrimitive.Description>
            </div>

            {/* Content / Benefits Area */}
            <div className="px-6 pb-2 space-y-4">
               <div className="bg-muted/40 p-5 rounded-xl border border-border/50 space-y-4">
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary rounded-full"/>
                  Partnership Benefits
                </h4>
                
                <ul className="space-y-4">
                  <li className="flex gap-3 text-sm group">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-medium text-foreground block">View Real-time Stock</span>
                      <span className="text-muted-foreground text-xs leading-relaxed">
                        Access their live inventory availability instantly.
                      </span>
                    </div>
                  </li>
                  
                  <li className="flex gap-3 text-sm group">
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-medium text-foreground block">Compare Inventory</span>
                      <span className="text-muted-foreground text-xs leading-relaxed">
                        Side-by-side comparison to find stock gaps.
                      </span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer / Actions */}
            <div className="p-6 pt-2 flex flex-col sm:flex-row gap-3">
              <DialogPrimitive.Close asChild>
                <Button 
                  variant="outline" 
                  className="w-full sm:w-1/3 rounded-xl border-border/60 hover:bg-secondary/80 h-11"
                >
                  Cancel
                </Button>
              </DialogPrimitive.Close>
              
              <Button 
                onClick={() => onSendRequest(store.id)} 
                disabled={loading}
                className="w-full sm:w-2/3 rounded-xl h-11 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {loading ? (
                  <>Sending Request...</>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Send Partnership Request
                  </>
                )}
              </Button>
            </div>
          </MotionDialogContent>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}