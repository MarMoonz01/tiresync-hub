import { useState, useMemo } from "react";
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
import { useWebhookStatus } from "@/hooks/useWebhookStatus";

export default function StoreSetup() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [lineEnabled, setLineEnabled] = useState(false);
  const [lineChannelAccessToken, setLineChannelAccessToken] = useState(""); 
  const [lineChannelSecret, setLineChannelSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdStoreId, setCreatedStoreId] = useState<string | null>(null);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [resettingCredentials, setResettingCredentials] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, refetchStore, profile, refetchProfile } = useAuth();
  
  // ตรวจสอบสถานะ Webhook แบบ Real-time จาก Hook ที่เราปรับปรุง
  const { isVerified: isWebhookVerified } = useWebhookStatus(createdStoreId || undefined);

  // เงื่อนไขปุ่มเสร็จสิ้น: ถ้าเปิด LINE ต้องได้รับ Verified หรือถ้าปิด LINE ก็ผ่านได้เลย
  const canFinish = useMemo(() => {
    if (!lineEnabled) return true;
    return isWebhookVerified; 
  }, [lineEnabled, isWebhookVerified]);

  // ระบบบันทึก Credentials ของ LINE
  const handleSaveLineSettings = async () => {
    if (!createdStoreId) return;
    setSavingCredentials(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({
          line_channel_access_token: lineChannelAccessToken,
          line_channel_secret: lineChannelSecret,
        })
        .eq("id", createdStoreId);
      
      if (error) throw error;
      setCredentialsSaved(true);
      toast({ 
        title: "บันทึกข้อมูล LINE สำเร็จ", 
        description: "ระบบพร้อมสำหรับการยืนยันตัวตนผ่าน LINE OA แล้ว" 
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSavingCredentials(false);
    }
  };

  // ระบบ Reset Credentials (ยังคงไว้ตามคำขอ)
  const handleResetLineSettings = async () => {
    if (!createdStoreId) return;
    setResettingCredentials(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({
          line_channel_access_token: null,
          line_channel_secret: null,
          line_webhook_verified: false,
          line_webhook_verified_at: null,
        })
        .eq("id", createdStoreId);
      
      if (error) throw error;
      setLineChannelAccessToken("");
      setLineChannelSecret("");
      setCredentialsSaved(false);
      toast({ title: "รีเซ็ตค่าเรียบร้อย", description: "ข้อมูลการเชื่อมต่อ LINE ถูกลบแล้ว" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      }).select("id").single();

      if (error) throw error;
      if (data?.id) setCreatedStoreId(data.id);
      
      await refetchStore();
      toast({ title: "สร้างโปรไฟล์สำเร็จ", description: "กรุณาตั้งค่า LINE ต่อเพื่อใช้งานแชทบอท" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDone = async () => {
    if (lineEnabled && createdStoreId) {
      try {
        // เรียก Edge Function ส่งข้อความยินดีต้อนรับ
        await supabase.functions.invoke('line-webhook', {
          body: { 
            action: 'send_welcome',
            storeId: createdStoreId,
            lineUserId: profile?.line_user_id,
            storeName: name
          }
        });
      } catch (err) {
        console.error("Welcome message failed", err);
      }
    }

    // โหลดข้อมูลล่าสุดเพื่อให้แอปได้รับสิทธิ์ Admin และ Store ID ใหม่
    await refetchStore();
    await refetchProfile();

    toast({ title: "สำเร็จ!", description: "ยินดีต้อนรับเข้าสู่ระบบจัดการร้านค้าของคุณ" });
    
    // ย้ายไปหน้าแดชบอร์ดทันที
    setTimeout(() => {
      navigate("/dashboard");
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> กลับไปหน้าแดชบอร์ด
        </Link>
        <Card className="glass-card border-0 shadow-xl shadow-primary/5">
          <CardHeader className="text-center pb-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-lg">
              <Store className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            <CardTitle className="text-xl">Store Setup</CardTitle>
            <CardDescription>สร้างโปรไฟล์ร้านค้าเพื่อเริ่มจัดการสต็อกยางของคุณ</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อร้านค้า *</Label>
                <Input id="name" placeholder="ระบุชื่อร้านค้า" value={name} onChange={(e) => setName(e.target.value)} required disabled={!!createdStoreId} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">รายละเอียด/ที่อยู่</Label>
                <Textarea id="description" placeholder="ระบุที่ตั้งหรือรายละเอียดร้าน..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} disabled={!!createdStoreId} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!!createdStoreId} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">อีเมล</Label>
                  <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!createdStoreId} />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-4 h-4 text-[#00B900]" />
                    <Label htmlFor="lineEnabled">เปิดใช้งาน LINE Chatbot</Label>
                  </div>
                  <Switch id="lineEnabled" checked={lineEnabled} onCheckedChange={setLineEnabled} disabled={!!createdStoreId} />
                </div>
                
                {lineEnabled && createdStoreId && (
                  <WebhookSetupSection
                    storeId={createdStoreId}
                    lineChannelAccessToken={lineChannelAccessToken}
                    setLineChannelAccessToken={setLineChannelAccessToken}
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
                <div className="space-y-3 pt-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                    <p className="text-sm text-green-700 font-medium">✅ โปรไฟล์ร้านค้าพร้อมใช้งาน!</p>
                  </div>
                  <Button
                    type="button"
                    className={`w-full h-11 transition-all shadow-md ${canFinish ? "bg-gradient-to-r from-primary to-accent hover:opacity-90" : "bg-muted text-muted-foreground"}`}
                    disabled={!canFinish}
                    onClick={handleDone}
                  >
                    {canFinish ? "สร้างร้านค้าสำเร็จ" : "รอการยืนยันตัวตนใน LINE..."}
                  </Button>
                </div>
              ) : (
                <Button type="submit" className="w-full h-11 bg-gradient-to-r from-primary to-accent shadow-md" disabled={loading || !name.trim()}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "บันทึกข้อมูลพื้นฐาน"}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}