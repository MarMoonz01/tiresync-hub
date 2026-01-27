import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Store, Loader2, ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { WebhookSetupSection } from "@/components/store/WebhookSetupSection";

export default function StoreSetup() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [lineEnabled, setLineEnabled] = useState(false);
  const [lineChannelId, setLineChannelId] = useState("");
  const [lineChannelSecret, setLineChannelSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdStoreId, setCreatedStoreId] = useState<string | null>(null);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [resettingCredentials, setResettingCredentials] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, refetchStore } = useAuth();

  // Handle saving LINE credentials separately
  const handleSaveLineSettings = async () => {
    if (!createdStoreId) return;
    
    setSavingCredentials(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({
          line_channel_id: lineChannelId,
          line_channel_secret: lineChannelSecret,
        })
        .eq("id", createdStoreId);
      
      if (error) throw error;
      
      setCredentialsSaved(true);
      toast({
        title: "LINE credentials saved",
        description: "Now paste the Webhook URL in LINE Developers Console.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save credentials";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSavingCredentials(false);
    }
  };

  // Handle resetting LINE credentials
  const handleResetLineSettings = async () => {
    if (!createdStoreId) return;
    
    setResettingCredentials(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({
          line_channel_id: null,
          line_channel_secret: null,
          line_webhook_verified: false,
          line_webhook_verified_at: null,
        })
        .eq("id", createdStoreId);
      
      if (error) throw error;
      
      // Reset local state
      setLineChannelId("");
      setLineChannelSecret("");
      setCredentialsSaved(false);
      
      toast({
        title: "LINE settings reset",
        description: "You can now re-enter your credentials.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to reset credentials";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setResettingCredentials(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.from("stores").insert({
        owner_id: user.id,
        name,
        description: description || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
        line_enabled: lineEnabled,
        line_channel_id: lineEnabled ? lineChannelId || null : null,
        line_channel_secret: lineEnabled ? lineChannelSecret || null : null,
      }).select("id").single();

      if (error) throw error;

      // Store the created store ID for webhook status polling
      if (data?.id) {
        setCreatedStoreId(data.id);
      }

      await refetchStore();

      toast({
        title: "Store created!",
        description: lineEnabled 
          ? "Your store is created. Complete LINE setup to finish."
          : "Your store profile has been set up successfully.",
      });

      // If LINE is enabled, don't navigate immediately - let user complete setup
      if (!lineEnabled) {
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create store",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-lg"
      >
        <Link 
          to="/dashboard" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <Card className="glass-card border-0 shadow-xl">
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-lg"
            >
              <Store className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            <CardTitle className="text-xl">Set Up Your Store</CardTitle>
            <CardDescription>
              Create your store profile to start managing inventory
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Store Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter your store name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Tell us about your store..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Store address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Store email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* LINE Chatbot Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#00B900]/10 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-[#00B900]" />
                    </div>
                    <div>
                      <Label htmlFor="lineEnabled" className="font-medium">Enable LINE Chatbot</Label>
                      <p className="text-xs text-muted-foreground">Allow customers to search via LINE</p>
                    </div>
                  </div>
                  <Switch
                    id="lineEnabled"
                    checked={lineEnabled}
                    onCheckedChange={setLineEnabled}
                  />
                </div>

                {lineEnabled && createdStoreId && (
                  <WebhookSetupSection
                    storeId={createdStoreId}
                    lineChannelId={lineChannelId}
                    setLineChannelId={setLineChannelId}
                    lineChannelSecret={lineChannelSecret}
                    setLineChannelSecret={setLineChannelSecret}
                    credentialsSaved={credentialsSaved}
                    onSaveCredentials={handleSaveLineSettings}
                    onResetCredentials={handleResetLineSettings}
                    isSaving={savingCredentials}
                    isResetting={resettingCredentials}
                  />
                )}
              </div>

              {createdStoreId ? (
                <div className="space-y-3">
                  <div className="p-4 bg-success/10 rounded-lg border border-success/30 text-center">
                    <p className="text-sm text-success font-medium">✅ ร้านถูกสร้างเรียบร้อยแล้ว!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {lineEnabled ? "ตั้งค่า LINE เสร็จแล้วก็ไปหน้าแดชบอร์ดได้เลย" : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                    onClick={() => navigate("/dashboard")}
                  >
                    ไปที่แดชบอร์ด
                  </Button>
                </div>
              ) : (
                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                  disabled={loading || !name.trim()}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Create Store"
                  )}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
