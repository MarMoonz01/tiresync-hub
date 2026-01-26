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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

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

  return (
    <AppLayout>
      <div className="page-container">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6 max-w-2xl mx-auto"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your account and preferences
            </p>
          </motion.div>

          {/* Profile Card */}
          <motion.div variants={itemVariants}>
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {profile?.full_name || "User"}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {profile?.email}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                      <Badge 
                        variant="outline" 
                        className={
                          profile?.status === "approved" 
                            ? "status-approved" 
                            : profile?.status === "pending" 
                            ? "status-pending" 
                            : "status-rejected"
                        }
                      >
                        {profile?.status || "pending"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Store Info */}
          {store && (
            <motion.div variants={itemVariants}>
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Store className="w-4 h-4 text-primary" />
                    My Store
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">{store.name}</p>
                    {store.description && (
                      <p className="text-sm text-muted-foreground">{store.description}</p>
                    )}
                    {store.address && (
                      <p className="text-sm text-muted-foreground">{store.address}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Settings Menu */}
          <motion.div variants={itemVariants} className="space-y-2">
            <Card 
              className="glass-card hover-scale cursor-pointer"
              onClick={() => navigate("/profile")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Edit Profile</p>
                  <p className="text-sm text-muted-foreground">Update your personal information</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card hover-scale cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Notifications</p>
                  <p className="text-sm text-muted-foreground">Configure alert preferences</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card hover-scale cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Security</p>
                  <p className="text-sm text-muted-foreground">Change password and security settings</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Logout */}
          <motion.div variants={itemVariants}>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
