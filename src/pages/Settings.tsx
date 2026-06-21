import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Globe, Bell, LogOut } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  owner: "Store Owner",
  staff: "Staff",
  interbranch: "Interbranch",
};

export default function Settings() {
  const { profile, store, role, isOwner } = useAuth();
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

  return (
    <AppLayout>
      <div className="page-container">
        <div className="space-y-6 max-w-2xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your preferences</p>
          </div>

          {/* Profile */}
          <Card className="border-0 shadow-sm bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-background shadow-sm">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{profile?.full_name || "User"}</h3>
                  <p className="text-muted-foreground text-sm truncate">{profile?.email}</p>
                  {role && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {ROLE_LABELS[role] ?? role}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Store info (owner only) */}
          {store && isOwner && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">ร้านค้า</p>
                <p className="font-medium">{store.name}</p>
                {store.address && <p className="text-sm text-muted-foreground">{store.address}</p>}
              </CardContent>
            </Card>
          )}

          {/* Preferences */}
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
                    <p className="text-xs text-muted-foreground">Coming soon</p>
                  </div>
                </div>
                <Switch disabled />
              </div>
            </CardContent>
          </Card>

          <div className="pt-2">
            <Button
              variant="destructive"
              className="w-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
