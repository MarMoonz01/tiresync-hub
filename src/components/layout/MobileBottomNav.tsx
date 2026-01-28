import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  CircleDot, 
  Search, 
  Menu,
  Settings 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth"; // ดึง useAuth มาใช้เช็คสิทธิ์

// กำหนด Interface เพื่อรับค่าจาก AppLayout
interface MobileBottomNavProps {
  userRole?: string | null;
}

export function MobileBottomNav({ userRole }: MobileBottomNavProps) {
  const location = useLocation();
  const { isAdmin } = useAuth(); // เช็คว่าเป็น Admin หรือไม่

  // กรองรายการเมนูตามบทบาทผู้ใช้
  const navItems = [
    { icon: LayoutDashboard, label: "Home", path: "/dashboard", show: true },
    { icon: CircleDot, label: "Tires", path: "/inventory", show: true },
    { icon: Search, label: "Market", path: "/marketplace", show: true },
    // แสดงเมนู More/Settings เฉพาะ Admin เท่านั้น
    { icon: Settings, label: "Admin", path: "/settings", show: isAdmin },
  ].filter(item => item.show); // กรองเอาเฉพาะรายการที่อนุญาตให้เห็น

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