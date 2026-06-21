import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  CircleDot,
  Users,
  Settings,
  ShoppingCart,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export function MobileBottomNav() {
  const location = useLocation();
  const { isOwner, isInterbranch } = useAuth();

  const navItems = isInterbranch
    ? [
        { icon: GitBranch, label: "Interbranch", path: "/interbranch" },
        { icon: Settings, label: "Settings", path: "/settings" },
      ]
    : [
        { icon: ShoppingCart, label: "Sales", path: "/sales" },
        { icon: CircleDot, label: "Stock", path: "/stock" },
        { icon: Users, label: "Customers", path: "/customers" },
        ...(isOwner
          ? [{ icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" }]
          : []),
        { icon: Settings, label: "Settings", path: "/settings" },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/40 pb-safe shadow-[0_-5px_30px_-15px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <motion.div whileTap={{ scale: 0.9 }} className="relative p-1">
                <Icon className="w-5 h-5" />
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveTab"
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.div>
              <span className={cn("text-[10px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
