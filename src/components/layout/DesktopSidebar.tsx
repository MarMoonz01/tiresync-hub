import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  CircleDot,
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCog,
  LogOut,
  ClipboardList,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Package,
  GitBranch,
  Network,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { TireLogo } from "@/components/icons/TireLogo";
import { useLanguage } from "@/contexts/LanguageContext";
import { TranslationKey } from "@/lib/translations";

interface NavItem {
  icon: React.ElementType;
  labelKey: TranslationKey;
  path: string;
}

interface DesktopSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// Staff + owner
const staffNavItems: NavItem[] = [
  { icon: ShoppingCart, labelKey: "sales", path: "/sales" },
  { icon: CircleDot, labelKey: "stock", path: "/stock" },
  { icon: Users, labelKey: "customers", path: "/customers" },
];

// Owner-only
const ownerNavItems: NavItem[] = [
  { icon: LayoutDashboard, labelKey: "dashboard", path: "/dashboard" },
  { icon: TrendingUp, labelKey: "financials", path: "/financials" },
  { icon: Package, labelKey: "stockManagement", path: "/stock-management" },
  { icon: DollarSign, labelKey: "crm", path: "/crm" },
  { icon: Network, labelKey: "network", path: "/network" },
  { icon: ClipboardList, labelKey: "auditLog", path: "/audit-log" },
  { icon: UserCog, labelKey: "staff", path: "/staff" },
];

// Interbranch-only
const interbranchNavItems: NavItem[] = [
  { icon: GitBranch, labelKey: "interbranch", path: "/interbranch" },
];

const bottomNavItems: NavItem[] = [
  { icon: Settings, labelKey: "settings", path: "/settings" },
];

export function DesktopSidebar({ collapsed, onToggle }: DesktopSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOwner, isInterbranch, profile, store, role } = useAuth();
  const { t, language } = useLanguage();

  const displayName = profile?.full_name || profile?.email || "ผู้ใช้";
  const initial = (profile?.full_name || profile?.email || "?").charAt(0).toUpperCase();
  const roleLabel = role === "owner" ? "เจ้าของร้าน" : role === "staff" ? "พนักงาน" : role === "interbranch" ? "สาขา" : "";

  const navSections: { label: string; items: NavItem[] }[] = [
    { label: language === "th" ? "งานประจำวัน" : "DAILY OPS", items: isInterbranch ? interbranchNavItems : staffNavItems },
    ...(isOwner ? [{ label: language === "th" ? "สำหรับเจ้าของร้าน" : "OWNER", items: ownerNavItems }] : []),
    { label: "", items: bottomNavItems },
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
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border/50">
        <Link to="/sales" className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.6)] shrink-0">
            <TireLogo size={20} className="text-white" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="min-w-0"
            >
              <div className="font-extrabold text-lg text-sidebar-foreground tracking-tight leading-none">BAANAKE</div>
              {store?.name && (
                <div className="text-[10px] font-semibold text-sidebar-foreground/50 tracking-wide truncate max-w-[150px] mt-0.5">
                  {store.name}
                </div>
              )}
            </motion.div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto custom-scrollbar">
        {navSections.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-5" : ""}>
            {!collapsed && section.label && (
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
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
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm truncate">
                        {label}
                      </motion.span>
                    )}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.path} delayDuration={0}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">{label}</TooltipContent>
                    </Tooltip>
                  );
                }

                return <div key={item.path}>{linkContent}</div>;
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border/50 space-y-1">
        {/* Profile */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              to="/settings"
              className={cn(
                "flex items-center gap-3 px-2 py-2 rounded-xl transition-colors hover:bg-sidebar-accent mb-1",
                collapsed && "justify-center"
              )}
            >
              <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  : initial}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate">{displayName}</p>
                  <p className="text-[11px] text-sidebar-foreground/60 truncate">
                    {roleLabel}{store?.name ? ` · ${store.name}` : ""}
                  </p>
                </div>
              )}
            </Link>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" className="font-medium">
              {displayName}{roleLabel ? ` · ${roleLabel}` : ""}
            </TooltipContent>
          )}
        </Tooltip>

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
            <TooltipContent side="right" className="bg-destructive text-destructive-foreground">
              {t("logout")}
            </TooltipContent>
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
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
    </motion.aside>
  );
}
