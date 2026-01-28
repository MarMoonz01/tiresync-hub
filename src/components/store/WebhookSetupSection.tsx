import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ChevronDown, ExternalLink, Lock, Unlock, Loader2, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWebhookStatus } from "@/hooks/useWebhookStatus";
import { WebhookConnectionStatus } from "@/components/store/WebhookConnectionStatus";
import { OwnerVerificationSection } from "@/components/store/OwnerVerificationSection";

const WEBHOOK_URL = `https://rvtrwlcxdfnenqspagug.supabase.co/functions/v1/line-webhook`;

interface WebhookSetupSectionProps {
  storeId?: string;
  lineChannelAccessToken: string;
  setLineChannelAccessToken: (value: string) => void;
  lineChannelSecret: string;
  setLineChannelSecret: (value: string) => void;
  credentialsSaved: boolean;
  onSaveCredentials: () => void;
  onResetCredentials: () => void;
  isSaving: boolean;
  isResetting?: boolean;
}

export function WebhookSetupSection({
  storeId,
  lineChannelAccessToken,
  setLineChannelAccessToken,
  lineChannelSecret,
  setLineChannelSecret,
  credentialsSaved,
  onSaveCredentials,
  onResetCredentials,
  isSaving,
  isResetting = false,
}: WebhookSetupSectionProps) {
  const { t } = useLanguage();
  const [urlCopied, setUrlCopied] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  
  const { isVerified, isChecking } = useWebhookStatus(storeId);
  const hasCredentials = !!(lineChannelAccessToken && lineChannelSecret);
  const canSaveCredentials = hasCredentials && !credentialsSaved && storeId;

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(WEBHOOK_URL);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            credentialsSaved ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"
          }`}>
            {credentialsSaved ? <Check className="w-3 h-3" /> : "1"}
          </div>
          <h4 className="font-medium text-sm">{t("phase1Title")}</h4>
          {credentialsSaved && (
            <div className="flex items-center gap-2 ml-auto">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onResetCredentials}
                disabled={isResetting}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                {isResetting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                {t("resetLineSettings")}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-3 pl-8">
          <div className="space-y-2">
            <Label htmlFor="lineChannelAccessToken">LINE Channel Access Token</Label>
            <Input 
              id="lineChannelAccessToken" 
              placeholder="Channel Access Token from LINE Developers"
              value={lineChannelAccessToken} 
              onChange={(e) => setLineChannelAccessToken(e.target.value)} 
              disabled={credentialsSaved} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lineChannelSecret">LINE Channel Secret</Label>
            <Input id="lineChannelSecret" type="password" placeholder="Channel Secret from LINE Developers" value={lineChannelSecret} onChange={(e) => setLineChannelSecret(e.target.value)} disabled={credentialsSaved} />
          </div>

          {!credentialsSaved && (
            <Button type="button" onClick={onSaveCredentials} disabled={!canSaveCredentials || isSaving} className="w-full">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t("saveLineSettings")}
            </Button>
          )}

          {credentialsSaved && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
              <Label>{t("webhookUrl")}</Label>
              <div className="flex gap-2">
                <Input value={WEBHOOK_URL} readOnly className="font-mono text-xs bg-muted" />
                <Button type="button" variant="outline" size="icon" onClick={handleCopyUrl} className="shrink-0 h-9 w-9">
                  {urlCopied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <WebhookConnectionStatus isVerified={isVerified} isChecking={isChecking} hasCredentials={hasCredentials} />
            </motion.div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            isVerified ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            {isVerified ? "2" : <Lock className="w-3 h-3" />}
          </div>
          <h4 className={`font-medium text-sm ${!isVerified ? "text-muted-foreground" : ""}`}>{t("phase2Title")}</h4>
        </div>
        <div className="pl-8">
          {isVerified ? <OwnerVerificationSection /> : <div className="p-4 bg-muted/30 rounded-lg border border-dashed text-center text-sm text-muted-foreground">🔒 {t("phase2Locked")}</div>}
        </div>
      </div>
    </div>
  );
}