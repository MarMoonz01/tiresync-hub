import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";

interface WebhookConnectionStatusProps {
  isVerified: boolean;
  isChecking: boolean;
  hasCredentials: boolean;
}

export function WebhookConnectionStatus({
  isVerified,
  isChecking,
  hasCredentials,
}: WebhookConnectionStatusProps) {
  const { t } = useLanguage();

  if (isVerified) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 bg-gradient-to-r from-success/10 to-emerald-500/10 rounded-lg border border-success/30"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-success flex items-center gap-2">
              🟢 {t("webhookConnected")}
            </p>
            <p className="text-xs text-muted-foreground">
              LINE พร้อมรับข้อความแล้ว
            </p>
          </div>
          <Badge variant="success" className="bg-success/20 text-success border-success/30">
            ✓ Connected
          </Badge>
        </div>
      </motion.div>
    );
  }

  if (!hasCredentials) {
    return (
      <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <WifiOff className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              {t("webhookStatus")}
            </p>
            <p className="text-xs text-muted-foreground">
              กรอก Channel ID และ Secret ก่อน
            </p>
          </div>
          <Badge variant="secondary">
            Not Started
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          {isChecking ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <Wifi className="w-5 h-5 text-primary animate-pulse" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium flex items-center gap-2">
            ⏳ {t("webhookWaiting")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("webhookTestInstructions")}
          </p>
        </div>
        <Badge variant="outline" className="animate-pulse">
          Waiting...
        </Badge>
      </div>
      <div className="space-y-2">
        <Progress value={undefined} className="h-1" />
        <p className="text-[11px] text-muted-foreground text-center">
          รอสัญญาณจาก LINE Developers Console...
        </p>
      </div>
    </div>
  );
}
