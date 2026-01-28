import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  CircleDot, 
  Search, 
  Settings 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export function MobileBottomNav() {
  const location = useLocation();
  const { isOwner, isAdmin } = useAuth();

  // Filter menu items based on user role
  // Only owners and system admins can see admin settings
  const canAccessAdmin = isOwner || isAdmin;

  const navItems = [
    { icon: LayoutDashboard, label: "Home", path: "/dashboard", show: true },
    { icon: CircleDot, label: "Tires", path: "/inventory", show: true },
    { icon: Search, label: "Market", path: "/marketplace", show: true },
    // Show Admin/Settings only for store owners and system admins
    { icon: Settings, label: "Admin", path: "/settings", show: canAccessAdmin },
  ].filter(item => item.show);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/50 pb-safe">
      <div className="flex items-center justify-around h-14">
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
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative p-1"
              >
                <Icon className="w-5 h-5" />
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveTab"
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.div>
              <span className={cn(
                "text-[10px] font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}