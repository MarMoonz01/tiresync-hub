import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  CircleDot, 
  Store, 
  Search, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Upload,
  Users,
  UserCog,
  LogOut,
  BarChart3,
  ClipboardList
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { TireLogo } from "@/components/icons/TireLogo";
import { useLanguage } from "@/contexts/LanguageContext";
import { TranslationKey } from "@/lib/translations";

interface DesktopSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// เมนูพื้นฐานที่ทุกคน (Admin & Staff) เห็นเหมือนกัน
const baseNavItems: { icon: any; labelKey: TranslationKey; path: string }[] = [
  { icon: LayoutDashboard, labelKey: "dashboard", path: "/dashboard" },
  { icon: CircleDot, labelKey: "inventory", path: "/inventory" },
  { icon: Upload, labelKey: "import", path: "/import" },
  { icon: Store, labelKey: "myStore", path: "/store" },
  { icon: Search, labelKey: "marketplace", path: "/marketplace" },
  { icon: Users, labelKey: "network", path: "/network" },
];

// เมนูที่จำกัดเฉพาะ Admin (เจ้าของร้าน) เท่านั้น
const adminOnlyNavItems: { icon: any; labelKey: TranslationKey; path: string }[] = [
  { icon: BarChart3, labelKey: "salesReport", path: "/sales-report" },
  { icon: ClipboardList, labelKey: "auditLog", path: "/audit-log" },
  { icon: UserCog, labelKey: "staff", path: "/staff" },
];

const bottomNavItems: { icon: any; labelKey: TranslationKey; path: string }[] = [
  { icon: Settings, labelKey: "settings", path: "/settings" },
];

export function DesktopSidebar({ collapsed, onToggle }: DesktopSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, hasStore } = useAuth(); // isAdmin จะเป็น true เมื่อ user มีบทบาทเป็น admin
  const { t } = useLanguage();

  // สร้างรายการเมนูตามสิทธิ์การใช้งาน
  const navItems = [
    ...baseNavItems,
    // ถ้าเป็น Admin และมีร้านค้า ถึงจะแสดงเมนูรายงานและ Audit Log
    ...(isAdmin && hasStore ? adminOnlyNavItems : []),
    ...bottomNavItems,
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="bg-sidebar border-r border-sidebar-border flex flex-col h-screen sticky top-0"
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border/50">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <TireLogo size={20} className="text-primary-foreground" />
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-semibold text-lg text-sidebar-foreground uppercase tracking-wider"
            >
              BAANAKE
            </motion.span>
          )}
        </Link>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const label = t(item.labelKey);

          const linkContent = (
            <Link
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative group",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-primary" : "group-hover:scale-110 transition-transform")} />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm truncate"
                >
                  {label}
                </motion.span>
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.path}>{linkContent}</div>;
        })}
      </nav>

      {/* Footer Section */}
      <div className="p-3 border-t border-sidebar-border/50 space-y-1">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors w-full text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10",
                collapsed && "justify-center"
              )}
            >
              <LogOut className="w-5 h-5" />
              {!collapsed && <span className="text-sm font-medium">{t("logout")}</span>}
            </button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" className="bg-destructive text-destructive-foreground">{t("logout")}</TooltipContent>
          )}
        </Tooltip>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "w-full text-sidebar-foreground/40 hover:text-sidebar-foreground rounded-xl mt-2",
            collapsed ? "justify-center" : "justify-end"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>
    </motion.aside>
  );
}