import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Shield, Loader2, Link2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLineLink } from "@/hooks/useLineLink";

export function OwnerVerificationSection() {
  const { t } = useLanguage();
  const {
    isLinked,
    lineUserId,
    generatedCode,
    createLinkCode,
    isCreatingCode,
  } = useLineLink();

  const [codeCopied, setCodeCopied] = useState(false);
  
  const handleCopyCode = async () => {
    if (generatedCode) {
      await navigator.clipboard.writeText(generatedCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Crown className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{t("ownerVerification")}</p>
          <p className="text-xs text-muted-foreground">
            {t("ownerVerificationDesc")}
          </p>
        </div>
        <Badge variant={isLinked ? "default" : "secondary"} className={isLinked ? "bg-amber-500" : ""}>
          {isLinked ? `👑 ${t("ownerVerified")}` : t("ownerNotVerified")}
        </Badge>
      </div>

      {isLinked ? (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-lg border border-amber-500/20">
          <p className="text-sm text-amber-600 font-medium flex items-center gap-2">
            <Crown className="h-4 w-4" />
            👑 เจ้าของร้านยืนยันแล้ว!
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
            LINE ID: {lineUserId}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">✅ จัดการสต็อกทั้งหมด</Badge>
            <Badge variant="outline" className="text-xs">✅ อนุมัติพนักงาน</Badge>
            <Badge variant="outline" className="text-xs">✅ รับแจ้งเตือน</Badge>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {generatedCode ? (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <div className="p-4 bg-muted/50 rounded-lg border text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  {t("sendCodeToShop")}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-bold tracking-widest font-mono text-primary">
                    {generatedCode}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyCode}
                    className="h-8 w-8"
                  >
                    {codeCopied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  ⏰ รหัสหมดอายุใน 10 นาที
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => createLinkCode()}
                disabled={isCreatingCode}
              >
                {isCreatingCode && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                สร้างรหัสใหม่
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button
                type="button"
                variant="outline"
                className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                onClick={() => createLinkCode()}
                disabled={isCreatingCode}
              >
                {isCreatingCode ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Crown className="mr-2 h-4 w-4" />
                )}
                {t("verifyOwnerIdentity")}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
