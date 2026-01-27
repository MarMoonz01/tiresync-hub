import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Link2, Unlink, Copy, Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLineLink } from "@/hooks/useLineLink";

export function LineIntegrationCard() {
  const {
    isLinked,
    lineUserId,
    generatedCode,
    createLinkCode,
    unlinkLine,
    isCreatingCode,
    isUnlinking,
  } = useLineLink();

  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00B900]/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-[#00B900]" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">LINE Integration</CardTitle>
            <CardDescription>
              Connect your LINE account for chatbot access
            </CardDescription>
          </div>
          <Badge variant={isLinked ? "default" : "secondary"}>
            {isLinked ? "Connected" : "Not Connected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLinked ? (
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">LINE User ID</p>
              <p className="font-mono text-sm truncate">{lineUserId}</p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => unlinkLine()}
              disabled={isUnlinking}
            >
              {isUnlinking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Unlink className="mr-2 h-4 w-4" />
              )}
              Disconnect LINE
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {generatedCode ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <p className="text-sm text-muted-foreground text-center">
                  Send this code to the LINE chatbot:
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-bold tracking-widest font-mono text-primary">
                    {generatedCode}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyCode}
                    className="h-8 w-8"
                  >
                    {copied ? (
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
                  variant="outline"
                  className="w-full"
                  onClick={() => createLinkCode()}
                  disabled={isCreatingCode}
                >
                  {isCreatingCode ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Generate New Code
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Link your LINE account to receive notifications and control inventory via chat.
                </p>
                <Button
                  className="w-full"
                  onClick={() => createLinkCode()}
                  disabled={isCreatingCode}
                >
                  {isCreatingCode ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="mr-2 h-4 w-4" />
                  )}
                  Link LINE Account
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
