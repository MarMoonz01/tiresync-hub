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

    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("line_webhook_verified, line_webhook_verified_at")
        .eq("id", storeId)
        .maybeSingle();

      if (error) {
        console.error("Error checking webhook status:", error);
        return;
      }

      if (data) {
        setIsVerified(data.line_webhook_verified ?? false);
        setVerifiedAt(data.line_webhook_verified_at ?? null);
      }
    } catch (err) {
      console.error("Failed to check webhook status:", err);
    } finally {
      setIsChecking(false);
    }
  }, [storeId]);

  // Initial check and polling while not verified
  useEffect(() => {
    if (!storeId) return;

    // Check immediately
    checkStatus();

    // Poll every 3 seconds while not verified
    const intervalId = setInterval(() => {
      if (!isVerified) {
        checkStatus();
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [storeId, isVerified, checkStatus]);

  return {
    isVerified,
    verifiedAt,
    isChecking,
    checkNow: checkStatus,
  };
}
