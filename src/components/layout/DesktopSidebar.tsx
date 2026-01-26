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
  LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface DesktopSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const baseNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: CircleDot, label: "Tire Vault", path: "/inventory" },
  { icon: Upload, label: "Import", path: "/import" },
  { icon: Store, label: "My Store", path: "/store" },
  { icon: Search, label: "Marketplace", path: "/marketplace" },
  { icon: Users, label: "Network", path: "/network" },
];

const adminNavItems = [
  { icon: UserCog, label: "Staff", path: "/staff" },
];

const bottomNavItems = [
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function DesktopSidebar({ collapsed, onToggle }: DesktopSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // Build nav items based on role
  const navItems = [
    ...baseNavItems,
    ...(isAdmin ? adminNavItems : []),
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
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border/50">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <CircleDot className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-semibold text-lg text-sidebar-foreground"
            >
              TireVault
            </motion.span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          const linkContent = (
            <Link
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative",
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
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm"
                >
                  {item.label}
                </motion.span>
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.path}>{linkContent}</div>;
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border/50 space-y-1">
        {/* Logout Button */}
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
              {!collapsed && <span className="text-sm">Logout</span>}
            </button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">Logout</TooltipContent>
          )}
        </Tooltip>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "w-full text-sidebar-foreground/40 hover:text-sidebar-foreground rounded-xl",
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
