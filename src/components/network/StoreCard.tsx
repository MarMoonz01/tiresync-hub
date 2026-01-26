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
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="glass-card h-full cursor-pointer hover:border-primary/30 transition-colors">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <Avatar className="w-14 h-14 rounded-xl border-2 border-border">
              <AvatarImage src={store.logo_url || undefined} alt={store.name} />
              <AvatarFallback className="rounded-xl bg-muted text-muted-foreground font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">
                  {store.name}
                </h3>
                <Badge variant="secondary" className="text-xs shrink-0">
                  Partner
                </Badge>
              </div>

              {store.description ? (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {store.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground/60 italic">
                  No description available
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Store className="w-3.5 h-3.5" />
              <span>Active Partner</span>
            </div>
            <span className="text-xs text-muted-foreground">
              Since {new Date(store.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
