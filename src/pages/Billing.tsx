import { useNavigate } from "react-router-dom";
import { CreditCard, AlertTriangle, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

export default function Billing() {
  const navigate = useNavigate();
  const { subscription, subscriptionActive, isOwner, store } = useAuth();
  const { language } = useLanguage();
  const th = language === "th";

  // If a recheck finds the subscription active again, bounce back into the app.
  if (subscriptionActive) {
    navigate("/", { replace: true });
    return null;
  }

  const reason = (() => {
    if (!subscription) return th ? "ไม่พบข้อมูลการสมัครสมาชิก" : "No subscription on file.";
    if (subscription.status === "past_due") return th ? "ค้างชำระ" : "Payment past due.";
    if (subscription.status === "canceled") return th ? "ยกเลิกแล้ว" : "Subscription canceled.";
    if (subscription.plan === "suspended") return th ? "ถูกระงับการใช้งาน" : "Account suspended.";
    if (subscription.plan === "trial") return th ? "ทดลองใช้งานหมดอายุแล้ว" : "Your free trial has ended.";
    return th ? "การสมัครสมาชิกไม่พร้อมใช้งาน" : "Subscription inactive.";
  })();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardContent className="p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-xl font-bold">{th ? "ต้องต่ออายุการใช้งาน" : "Subscription required"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {store?.name ? `${store.name} · ` : ""}{reason}
            </p>
          </div>

          {subscription && (
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                {subscription.plan}
              </Badge>
              <Badge variant={subscription.status === "active" ? "default" : "destructive"}>
                {subscription.status}
              </Badge>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {isOwner
              ? th
                ? "กรุณาติดต่อผู้ดูแลระบบ BAANAKE เพื่อเปิดใช้งานบัญชีร้านของคุณอีกครั้ง"
                : "Please contact your BAANAKE administrator to reactivate your store."
              : th
                ? "กรุณาแจ้งเจ้าของร้านเพื่อต่ออายุการใช้งาน"
                : "Please ask your store owner to renew the subscription."}
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" className="gap-2" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4" /> {th ? "ตรวจสอบสถานะอีกครั้ง" : "Recheck status"}
            </Button>
            <Button
              variant="ghost"
              className="gap-2 text-muted-foreground"
              onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}
            >
              <LogOut className="w-4 h-4" /> {th ? "ออกจากระบบ" : "Sign out"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
