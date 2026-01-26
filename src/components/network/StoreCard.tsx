import { motion } from "framer-motion";
import { Store, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { NetworkStore } from "@/hooks/useNetworkStores";

interface StoreCardProps {
  store: NetworkStore;
}

export function StoreCard({ store }: StoreCardProps) {
  const initials = store.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
    >
      <Card className="h-full cursor-pointer border-0 shadow-soft bg-card/60 backdrop-blur-sm hover:shadow-soft-lg transition-all">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-11 h-11 rounded-xl border border-border/40">
              <AvatarImage src={store.logo_url || undefined} alt={store.name} />
              <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-medium text-sm text-foreground truncate">
                  {store.name}
                </h3>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Partner
                </Badge>
              </div>

              {store.description ? (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {store.description}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic">
                  No description
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Store className="w-3 h-3" />
              <span>Active</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Since {new Date(store.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
