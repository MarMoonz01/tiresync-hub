import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { WebhookSetupSection } from "@/components/store/WebhookSetupSection";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/**
 * Owner-facing LINE webhook integration: holds the channel credentials state,
 * persists them to the stores table, and renders the WebhookSetupSection
 * (webhook URL, copy, verification status).
 */
export function LineIntegrationCard() {
  const { store, refetchStore } = useAuth();
  const { toast } = useToast();
  const s = store as unknown as {
    line_enabled?: boolean;
    line_channel_access_token?: string | null;
    line_channel_secret?: string | null;
  } | null;

  const [enabled, setEnabled] = useState(!!s?.line_enabled);
  const [token, setToken] = useState(s?.line_channel_access_token ?? "");
  const [secret, setSecret] = useState(s?.line_channel_secret ?? "");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const credentialsSaved = !!(s?.line_channel_access_token && s?.line_channel_secret);

  const save = async () => {
    if (!store?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({ line_enabled: true, line_channel_access_token: token, line_channel_secret: secret })
        .eq("id", store.id);
      if (error) throw error;
      setEnabled(true);
      await refetchStore?.();
      toast({ title: "บันทึก LINE credentials แล้ว", description: "นำ Webhook URL ไปตั้งค่าใน LINE Developers Console ได้เลย" });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!store?.id) return;
    setResetting(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({ line_enabled: false, line_channel_access_token: null, line_channel_secret: null })
        .eq("id", store.id);
      if (error) throw error;
      setToken(""); setSecret(""); setEnabled(false);
      await refetchStore?.();
      toast({ title: "ล้างการเชื่อมต่อ LINE แล้ว" });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-[#06C755]/10 text-[#06C755] flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[15px]">LINE Webhook</h3>
          <p className="text-xs text-muted-foreground">เชื่อมต่อ LINE OA เพื่อรับ–ส่งข้อความอัตโนมัติ</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      {enabled && (
        <div className="p-5">
          <WebhookSetupSection
            storeId={store?.id}
            lineChannelAccessToken={token}
            setLineChannelAccessToken={setToken}
            lineChannelSecret={secret}
            setLineChannelSecret={setSecret}
            credentialsSaved={credentialsSaved}
            onSaveCredentials={save}
            onResetCredentials={reset}
            isSaving={saving}
            isResetting={resetting}
          />
        </div>
      )}
    </div>
  );
}
