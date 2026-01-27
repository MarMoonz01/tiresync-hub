import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export function useLineLink() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile, refetchProfile } = useAuth();
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Check if user has LINE linked
  const isLinked = !!profile?.line_user_id;

  // Generate a random 6-character code
  const generateCode = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Create a link code
  const createLinkCodeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No user found");

      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Delete any existing codes for this user first
      await supabase
        .from("line_link_codes")
        .delete()
        .eq("user_id", user.id);

      // Create new code
      const { error } = await supabase
        .from("line_link_codes")
        .insert({
          user_id: user.id,
          code,
          expires_at: expiresAt.toISOString(),
        });

      if (error) throw error;

      return code;
    },
    onSuccess: (code) => {
      setGeneratedCode(code);
      toast({
        title: "Link code generated",
        description: `Send "${code}" to the LINE chatbot within 10 minutes.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unlink LINE account
  const unlinkMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No user found");

      const { error } = await supabase
        .from("profiles")
        .update({ line_user_id: null })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await refetchProfile();
      setGeneratedCode(null);
      toast({
        title: "LINE unlinked",
        description: "Your LINE account has been disconnected.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    isLinked,
    lineUserId: profile?.line_user_id,
    generatedCode,
    createLinkCode: createLinkCodeMutation.mutate,
    unlinkLine: unlinkMutation.mutate,
    isCreatingCode: createLinkCodeMutation.isPending,
    isUnlinking: unlinkMutation.isPending,
  };
}
