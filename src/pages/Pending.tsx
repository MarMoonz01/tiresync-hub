import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TireLogo } from "@/components/icons/TireLogo";

export default function Pending() {
  const { user, isApproved, loading, refetchProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    
    if (!loading && isApproved) {
      navigate("/dashboard");
    }
  }, [user, isApproved, loading, navigate]);

  const handleRefresh = async () => {
    await refetchProfile();
    if (isApproved) {
      navigate("/dashboard");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-warning/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-lg">
            <TireLogo size={36} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">BAANAKE</h1>
        </div>

        <Card className="glass-card border-0 shadow-xl">
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4"
            >
              <Clock className="w-8 h-8 text-warning" />
            </motion.div>
            <CardTitle className="text-xl">Account Pending Approval</CardTitle>
            <CardDescription className="text-base">
              Your account is being reviewed by our team. You'll be notified once approved.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">What happens next?</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Our moderators will review your application
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  This usually takes 24-48 hours
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  You'll receive access once approved
                </li>
              </ul>
            </div>

            <Button
              onClick={handleRefresh}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Status
            </Button>

            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
