import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ChevronDown, ExternalLink, Shield, Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLineLink } from "@/hooks/useLineLink";

const WEBHOOK_URL = `https://wqqaqafhpxytwbwykqbg.supabase.co/functions/v1/line-webhook`;

interface WebhookSetupSectionProps {
  lineChannelId: string;
  setLineChannelId: (value: string) => void;
  lineChannelSecret: string;
  setLineChannelSecret: (value: string) => void;
}

export function WebhookSetupSection({
  lineChannelId,
  setLineChannelId,
  lineChannelSecret,
  setLineChannelSecret,
}: WebhookSetupSectionProps) {
  const { t } = useLanguage();
  const [urlCopied, setUrlCopied] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const {
    isLinked,
    lineUserId,
    generatedCode,
    createLinkCode,
    isCreatingCode,
  } = useLineLink();

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(WEBHOOK_URL);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const [codeCopied, setCodeCopied] = useState(false);
  const handleCopyCode = async () => {
    if (generatedCode) {
      await navigator.clipboard.writeText(generatedCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const setupSteps = [
    t("lineSetupStep1"),
    t("lineSetupStep2"),
    t("lineSetupStep3"),
    t("lineSetupStep4"),
    t("lineSetupStep5"),
  ];

  return (
    <div className="space-y-4">
      {/* Webhook URL */}
      <div className="space-y-2">
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
      </div>

      {/* Setup Instructions Collapsible */}
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

      {/* Channel Credentials */}
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="lineChannelId">LINE Channel ID</Label>
          <Input
            id="lineChannelId"
            placeholder="Channel ID from LINE Developers"
            value={lineChannelId}
            onChange={(e) => setLineChannelId(e.target.value)}
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
          />
        </div>
      </div>

      {/* Owner Identity Verification */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{t("ownerVerification")}</p>
            <p className="text-xs text-muted-foreground">
              {t("ownerVerificationDesc")}
            </p>
          </div>
          <Badge variant={isLinked ? "default" : "secondary"}>
            {isLinked ? t("ownerVerified") : t("ownerNotVerified")}
          </Badge>
        </div>

        {isLinked ? (
          <div className="p-3 bg-success/10 rounded-lg border border-success/20">
            <p className="text-sm text-success font-medium flex items-center gap-2">
              <Check className="h-4 w-4" />
              {t("ownerVerified")}
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
              {lineUserId}
            </p>
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
                <p className="text-sm text-muted-foreground text-center">
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
                <p className="text-xs text-muted-foreground text-center">
                  Code expires in 10 minutes
                </p>
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
                  Generate New Code
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
                  className="w-full"
                  onClick={() => createLinkCode()}
                  disabled={isCreatingCode}
                >
                  {isCreatingCode ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="mr-2 h-4 w-4" />
                  )}
                  {t("verifyOwnerIdentity")}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
