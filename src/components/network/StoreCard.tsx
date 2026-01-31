import { MapPin, Phone, Store as StoreIcon, CheckCircle2, ArrowRightLeft, ExternalLink } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NetworkStore } from "@/hooks/useNetworkStores";

interface StoreCardProps {
  store: NetworkStore;
  variant?: "default" | "compact";
  onClick?: () => void;
  onCompare?: () => void; // ✅ เพิ่ม Props นี้
}

export function StoreCard({ store, variant = "default", onClick, onCompare }: StoreCardProps) {
  const initials = store.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const gradientIndex = store.name.length % 3;
  const gradients = [
    "from-blue-600 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-red-600",
  ];
  const bannerGradient = gradients[gradientIndex];

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden border-border/50 bg-background transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full flex flex-col",
        variant === "compact" ? "max-w-sm" : ""
      )}
      onClick={onClick} // คลิกที่การ์ดเพื่อดูรายละเอียด (ถ้ามี)
    >
      {/* 1. Header Banner */}
      <div className={cn("h-24 w-full bg-gradient-to-r opacity-90 transition-opacity group-hover:opacity-100", bannerGradient)} />

      {/* 2. Store Info & Avatar */}
      <CardHeader className="relative px-6 pb-2 pt-0 flex-grow-0">
        <div className="flex justify-between items-start">
          <div className="-mt-12 rounded-2xl border-4 border-background bg-background p-1 shadow-sm">
            <Avatar className="h-20 w-20 rounded-xl">
              <AvatarImage src={store.logo_url || undefined} alt={store.name} className="object-cover" />
              <AvatarFallback className="rounded-xl bg-primary/10 text-xl font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {store.is_active && (
            <Badge variant="secondary" className="mt-4 bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200 shadow-sm gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified
            </Badge>
          )}
        </div>

        <div className="mt-4 space-y-1">
          <h3 className="font-bold text-xl leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {store.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {store.description || "Professional tire and auto service center."}
          </p>
        </div>
      </CardHeader>

      {/* 3. Details */}
      <CardContent className="px-6 py-4 space-y-3 flex-grow">
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary/70" />
          <span className="line-clamp-2 leading-relaxed">
            {store.address || "Location not specified"}
          </span>
        </div>
        
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Phone className="w-4 h-4 shrink-0 text-primary/70" />
          <span className="font-medium">
            {store.phone || "No contact number"}
          </span>
        </div>
      </CardContent>

      {/* 4. Footer Actions (แก้จุดนี้) */}
      <CardFooter className="px-6 pb-6 pt-0 mt-auto grid grid-cols-2 gap-3">
        {/* ปุ่ม View Store (ซ้าย) */}
        <Button 
          variant="outline" 
          className="w-full border-dashed border-primary/30 hover:bg-primary/5 hover:border-primary/50 text-primary"
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
          }}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View
        </Button>

        {/* ปุ่ม Compare Stock (ขวา - หรือเต็มหากไม่มี View) */}
        {onCompare ? (
          <Button 
            className="w-full bg-primary hover:bg-primary/90 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              onCompare();
            }}
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Compare
          </Button>
        ) : (
          // ถ้าไม่มีปุ่ม Compare ให้ปุ่ม View เต็มช่อง
           <div className="hidden" /> 
           // (จริงๆ Logic นี้ปรับได้ แต่เพื่อความง่าย ให้ปุ่ม View อยู่ซ้ายเสมอ ถ้าไม่มี Compare ก็จะแหว่งไปหน่อย หรือจะแก้ class grid ก็ได้ครับ)
        )}
      </CardFooter>
      
      {/* ถ้าไม่มี Compare ให้ปุ่ม View เต็มความกว้าง (Optional CSS Tweaks) */}
      <style>{`
        .group:not(:has(button:nth-child(2))) button:nth-child(1) {
            grid-column: span 2;
        }
      `}</style>
    </Card>
  );
}