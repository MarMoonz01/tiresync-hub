import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WebhookStatusResult {
  isVerified: boolean;
  verifiedAt: string | null;
  isChecking: boolean;
  checkNow: () => void;
}

export function useWebhookStatus(storeId: string | undefined): WebhookStatusResult {
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!storeId) return;
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("line_webhook_verified, line_webhook_verified_at")
        .eq("id", storeId)
        .maybeSingle();

      if (data) {
        setIsVerified(data.line_webhook_verified ?? false);
        setVerifiedAt(data.line_webhook_verified_at ?? null);
      }
    } catch (err) {
      console.error("Failed to check webhook status:", err);
    }
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;

    checkStatus();

    // ระบบ Real-time: รับรู้ทันทีที่ Webhook อัปเดตฐานข้อมูล
    const channel = supabase
      .channel(`public:stores:id=eq.${storeId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'stores', filter: `id=eq.${storeId}` },
        (payload) => {
          setIsVerified(payload.new.line_webhook_verified);
          setVerifiedAt(payload.new.line_webhook_verified_at);
        }
      )
      .subscribe();

    const intervalId = setInterval(() => {
      if (!isVerified) checkStatus();
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, [storeId, isVerified, checkStatus]);

  return { isVerified, verifiedAt, isChecking, checkNow: checkStatus };
}