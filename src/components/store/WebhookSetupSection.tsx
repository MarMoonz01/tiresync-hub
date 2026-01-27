import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ChevronDown, ExternalLink, Lock, Unlock, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWebhookStatus } from "@/hooks/useWebhookStatus";
import { WebhookConnectionStatus } from "@/components/store/WebhookConnectionStatus";
import { OwnerVerificationSection } from "@/components/store/OwnerVerificationSection";

const WEBHOOK_URL = `https://wqqaqafhpxytwbwykqbg.supabase.co/functions/v1/line-webhook`;

interface WebhookSetupSectionProps {
  storeId?: string;
  lineChannelId: string;
  setLineChannelId: (value: string) => void;
  lineChannelSecret: string;
  setLineChannelSecret: (value: string) => void;
  credentialsSaved: boolean;
  onSaveCredentials: () => void;
  isSaving: boolean;
}

export function WebhookSetupSection({
  storeId,
  lineChannelId,
  setLineChannelId,
  lineChannelSecret,
  setLineChannelSecret,
  credentialsSaved,
  onSaveCredentials,
  isSaving,
}: WebhookSetupSectionProps) {
  const { t } = useLanguage();
  const [urlCopied, setUrlCopied] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  
  const { isVerified, isChecking } = useWebhookStatus(storeId);
  const hasCredentials = !!(lineChannelId && lineChannelSecret);
  const canSaveCredentials = hasCredentials && !credentialsSaved && storeId;

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(WEBHOOK_URL);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const setupSteps = [
    t("lineSetupStep1"),
    t("lineSetupStep2"),
    t("lineSetupStep3"),
    t("lineSetupStep4"),
    t("lineSetupStep5"),
  ];

  return (
    <div className="space-y-6">
      {/* Phase 1: Connect LINE Channel */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            credentialsSaved 
              ? "bg-success text-success-foreground" 
              : "bg-primary text-primary-foreground"
          }`}>
            {credentialsSaved ? <Check className="w-3 h-3" /> : "1"}
          </div>
          <h4 className="font-medium text-sm">{t("phase1Title")}</h4>
          {credentialsSaved && (
            <span className="text-xs text-success ml-auto">{t("lineSettingsSaved")}</span>
          )}
        </div>

        {/* Channel Credentials */}
        <div className="space-y-3 pl-8">
          <div className="space-y-2">
            <Label htmlFor="lineChannelId">LINE Channel ID</Label>
            <Input
              id="lineChannelId"
              placeholder="Channel ID from LINE Developers"
              value={lineChannelId}
              onChange={(e) => setLineChannelId(e.target.value)}
              disabled={credentialsSaved}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lineChannelSecret">LINE Channel Secret</Label>
            <Input
              id="lineChannelSecret"
              type="password"
              placeholder="Channel Secret from LINE Developers"
              value={lineChannelSecret}
              onChange={(e) => setLineChannelSecret(e.target.value)}
              disabled={credentialsSaved}
            />
          </div>

          {/* Save Credentials Button - Show only before credentials are saved */}
          {!credentialsSaved && (
            <div className="space-y-3">
              <Button
                type="button"
                onClick={onSaveCredentials}
                disabled={!canSaveCredentials || isSaving}
                className="w-full"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isSaving ? t("savingLineSettings") : t("saveLineSettings")}
              </Button>
              
              {/* Webhook URL Hidden Notice */}
              <div className="p-3 bg-muted/50 rounded-lg border border-dashed border-border/50 text-center">
                <Lock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {t("webhookUrlHidden")}
                </p>
              </div>
            </div>
          )}

          {/* Webhook URL - Only show after credentials are saved */}
          {credentialsSaved && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2"
            >
              <Label>{t("webhookUrl")}</Label>
              <div className="flex gap-2">
                <Input
                  value={WEBHOOK_URL}
                  readOnly
                  className="font-mono text-xs bg-muted"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyUrl}
                  className="shrink-0"
                >
                  {urlCopied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {urlCopied && (
                <p className="text-xs text-success">{t("urlCopied")}</p>
              )}
            </motion.div>
          )}

          {/* Setup Instructions Collapsible - Only show after credentials saved */}
          {credentialsSaved && (
            <Collapsible open={instructionsOpen} onOpenChange={setInstructionsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-between px-3 py-2 h-auto"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <ExternalLink className="h-4 w-4" />
                    {t("lineSetupInstructions")}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${instructionsOpen ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  {setupSteps.map((step, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Connection Status - Only show after credentials saved */}
          {credentialsSaved && (
            <WebhookConnectionStatus
              isVerified={isVerified}
              isChecking={isChecking}
              hasCredentials={hasCredentials}
            />
          )}
        </div>
      </div>

      {/* Phase 2: Owner Identity Verification */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            isVerified 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          }`}>
            {isVerified ? "2" : <Lock className="w-3 h-3" />}
          </div>
          <h4 className={`font-medium text-sm ${!isVerified ? "text-muted-foreground" : ""}`}>
            {t("phase2Title")}
          </h4>
          {isVerified && (
            <Unlock className="w-4 h-4 text-success ml-auto" />
          )}
        </div>

        {isVerified ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
            className="pl-8"
          >
            <OwnerVerificationSection />
          </motion.div>
        ) : (
          <div className="pl-8">
            <div className="p-4 bg-muted/30 rounded-lg border border-dashed border-border/50">
              <p className="text-sm text-muted-foreground text-center">
                🔒 {t("phase2Locked")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
