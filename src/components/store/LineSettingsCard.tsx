import { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LineSettingsCardProps {
  lineEnabled?: boolean;
  lineChannelId?: string;
  lineChannelSecret?: string;
  onUpdate?: () => void;
}

export function LineSettingsCard({
  lineEnabled: initialEnabled = false,
  lineChannelId: initialChannelId = "",
  lineChannelSecret: initialSecret = "",
  onUpdate,
}: LineSettingsCardProps) {
  const { store, refetchStore } = useAuth();
  const { toast } = useToast();

  const [lineEnabled, setLineEnabled] = useState(initialEnabled);
  const [lineChannelId, setLineChannelId] = useState(initialChannelId);
  const [lineChannelSecret, setLineChannelSecret] = useState(initialSecret);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!store?.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({
          line_enabled: lineEnabled,
          line_channel_id: lineEnabled ? lineChannelId : null,
          line_channel_secret: lineEnabled ? lineChannelSecret : null,
        })
        .eq("id", store.id);

      if (error) throw error;

      await refetchStore();
      onUpdate?.();

      toast({
        title: "LINE settings saved",
        description: lineEnabled
          ? "LINE chatbot is now enabled for your store."
          : "LINE chatbot has been disabled.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
            <CardTitle className="text-base">LINE Chatbot</CardTitle>
            <CardDescription>
              Enable LINE integration for your store
            </CardDescription>
          </div>
          <Switch
            checked={lineEnabled}
            onCheckedChange={setLineEnabled}
          />
        </div>
      </CardHeader>
      {lineEnabled && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channelId">Channel ID</Label>
            <Input
              id="channelId"
              placeholder="Enter LINE Channel ID"
              value={lineChannelId}
              onChange={(e) => setLineChannelId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="channelSecret">Channel Secret</Label>
            <Input
              id="channelSecret"
              type="password"
              placeholder="Enter LINE Channel Secret"
              value={lineChannelSecret}
              onChange={(e) => setLineChannelSecret(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Get these from the LINE Developers Console
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save LINE Settings
          </Button>
        </CardContent>
      )}
      {!lineEnabled && (
        <CardContent>
          <Button
            onClick={handleSave}
            variant="outline"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save Changes
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
