import { motion } from "framer-motion";
import { User, Store, Bell, Shield, LogOut, Globe, MessageCircle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LineSettingsCard } from "@/components/store/LineSettingsCard";

export default function Settings() {
  const { profile, store, isAdmin, isModerator, roles, storeMembership } = useAuth();
  const { isOwner, isAdmin: isSystemAdmin } = usePermissions();
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
    if (isOwner) return { label: "Store Owner", variant: "default" as const };
    if (storeMembership?.role) {
      const roleName = storeMembership.role.charAt(0).toUpperCase() + storeMembership.role.slice(1);
      let variant: "default" | "secondary" | "outline" = "outline";
      switch (storeMembership.role.toLowerCase()) {
        case 'manager': variant = "default"; break;
        case 'sales': variant = "secondary"; break;
        default: variant = "outline";
      }
      return { label: roleName, variant };
    }
    if (isAdmin) return { label: "System Admin", variant: "destructive" as const };
    if (isModerator) return { label: "Moderator", variant: "secondary" as const };
    return { label: "User", variant: "outline" as const };
  };

  const roleBadge = getRoleBadge();

  const accountMenuItems = [
    {
      icon: User,
      title: "Edit Profile",
      description: "Update personal details",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      onClick: () => navigate("/profile"),
    },
    {
      icon: Shield,
      title: "Security",
      description: "Password & authentication",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      onClick: () => {}, 
    },
  ];

  return (
    <AppLayout>
      <div className="page-container">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 max-w-2xl mx-auto"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Manage your preferences and store settings</p>
          </div>

          {/* Profile Section */}
          <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-background shadow-sm">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">
                    {profile?.full_name || "User"}
                  </h3>
                  <p className="text-muted-foreground text-sm truncate">
                    {profile?.email}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={roleBadge.variant} className="px-2 py-0.5 text-xs">
                      {roleBadge.label}
                    </Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/profile")}>
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Store Settings */}
          {(store && (isOwner || isSystemAdmin)) && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Store Settings
              </h2>
              
              <Card 
                className="cursor-pointer hover:bg-accent/5 transition-colors border-0 shadow-sm"
                onClick={() => navigate("/store")}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Store className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{store.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {store.address || "No address set"}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
                </CardContent>
              </Card>

              {/* ✅ ตรงนี้ครับที่เปลี่ยน: ส่ง line_channel_access_token เข้าไป */}
              <LineSettingsCard 
                lineEnabled={store.line_enabled || false}
                // ถ้าใน useAuth ยังไม่ได้แก้ Type ให้ใช้ as any เพื่อ bypass (ถ้าคุณไม่อยากแก้ไฟล์อื่น)
                lineChannelAccessToken={(store as any).line_channel_access_token || ""} 
                lineChannelSecret={store.line_channel_secret || ""}
              />
            </div>
          )}

          {/* Preferences */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Preferences
            </h2>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0 divide-y">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Globe className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Language</p>
                      <p className="text-xs text-muted-foreground">Select your preferred language</p>
                    </div>
                  </div>
                  <LanguageToggle />
                </div>

                <div className="flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Notifications</p>
                      <p className="text-xs text-muted-foreground">Manage app notifications (Coming Soon)</p>
                    </div>
                  </div>
                  <Switch disabled />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Account
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {accountMenuItems.map((item) => (
                <Card 
                  key={item.title}
                  className="cursor-pointer hover:shadow-md transition-all border-0 shadow-sm"
                  onClick={item.onClick}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <Button 
              variant="destructive" 
              className="w-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-4">
              TireSync Hub v1.0.0
            </p>
          </div>

        </motion.div>
      </div>
    </AppLayout>
  );
}