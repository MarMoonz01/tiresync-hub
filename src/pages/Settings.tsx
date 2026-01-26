import { motion } from "framer-motion";
import { User, Store, Bell, Shield, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function Settings() {
  const { profile, store, isAdmin, isModerator, roles } = useAuth();
  const navigate = useNavigate();

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getRoleBadge = () => {
    if (isAdmin) return { label: "Admin", variant: "default" as const };
    if (isModerator) return { label: "Moderator", variant: "secondary" as const };
    const hasStoreMember = roles.some(r => r.role === "store_member");
    if (hasStoreMember) return { label: "Store Member", variant: "outline" as const };
    return { label: "Pending", variant: "outline" as const };
  };

  const roleBadge = getRoleBadge();

  const menuItems = [
    {
      icon: User,
      title: "Edit Profile",
      description: "Update your personal information",
      color: "text-primary",
      bgColor: "bg-primary/10",
      onClick: () => navigate("/profile"),
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Configure alert preferences",
      color: "text-accent",
      bgColor: "bg-accent/10",
      onClick: () => {},
    },
    {
      icon: Shield,
      title: "Security",
      description: "Password and security settings",
      color: "text-success",
      bgColor: "bg-success/10",
      onClick: () => {},
    },
  ];

  return (
    <AppLayout>
      <div className="page-container">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-5 max-w-lg mx-auto"
        >
          {/* Header */}
          <div>
            <h1 className="text-xl font-semibold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your account
            </p>
          </div>

          {/* Profile Card */}
          <Card className="border-0 shadow-soft bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 ring-2 ring-border/40">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">
                    {profile?.full_name || "User"}
                  </h3>
                  <p className="text-muted-foreground text-xs truncate">
                    {profile?.email}
                  </p>
                  <div className="flex gap-1.5 mt-1.5">
                    <Badge variant={roleBadge.variant} className="text-[10px] px-1.5 py-0">
                      {roleBadge.label}
                    </Badge>
                    <Badge 
                      variant={
                        profile?.status === "approved" 
                          ? "success" 
                          : profile?.status === "pending" 
                          ? "warning" 
                          : "destructive"
                      }
                      className="text-[10px] px-1.5 py-0"
                    >
                      {profile?.status || "pending"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Store Info */}
          {store && (
            <Card className="border-0 shadow-soft bg-card/60 backdrop-blur-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5" />
                  My Store
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <p className="font-medium text-sm">{store.name}</p>
                {store.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{store.description}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Menu Items */}
          <div className="space-y-2">
            {menuItems.map((item) => (
              <Card 
                key={item.title}
                className="border-0 shadow-soft bg-card/60 backdrop-blur-sm cursor-pointer hover:shadow-soft-lg transition-all"
                onClick={item.onClick}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${item.bgColor} flex items-center justify-center`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full text-center text-sm text-destructive hover:underline underline-offset-4 py-2"
          >
            Sign Out
          </button>
        </motion.div>
      </div>
    </AppLayout>
  );
}
