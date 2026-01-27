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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, refetchStore } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("stores").insert({
        owner_id: user.id,
        name,
        description: description || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
        line_enabled: lineEnabled,
        line_channel_id: lineEnabled ? lineChannelId || null : null,
        line_channel_secret: lineEnabled ? lineChannelSecret || null : null,
      });

      if (error) throw error;

      await refetchStore();

      toast({
        title: "Store created!",
        description: "Your store profile has been set up successfully.",
      });

      navigate("/dashboard");
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

                {lineEnabled && (
                  <div className="space-y-3 pl-11">
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
                )}
              </div>

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
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
