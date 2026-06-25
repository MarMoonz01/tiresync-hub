import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, Store,
  Check, KeyRound, Phone, MapPin, ChevronRight, ChevronLeft, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TireLogo } from "@/components/icons/TireLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";

type AuthMode = "signin" | "staff" | "store";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const urlMode = searchParams.get("mode");
  const { t } = useLanguage();

  const getInitialMode = (): AuthMode => {
    if (urlMode === "store") return "store";
    if (urlMode === "signup") return "staff";
    return "signin";
  };

  const [mode, setMode] = useState<AuthMode>(getInitialMode);
  const [storeStep, setStoreStep] = useState<1 | 2>(1);

  // Common
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Staff signup — join by store PIN
  const [pin, setPin] = useState("");

  // Store creation
  const [inviteCode, setInviteCode] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Password recovery (from email link)
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("type=invite")) {
      setRecoveryMode(true);
    }
  }, []);

  useEffect(() => {
    setMode(getInitialMode());
  }, [urlMode]);

  const resetForms = () => {
    setEmail(""); setPassword(""); setFullName(""); setConfirmPassword("");
    setPin(""); setInviteCode("");
    setStoreName(""); setStorePhone(""); setStoreAddress("");
    setStoreStep(1); setShowPassword(false);
  };

  const switchMode = (next: AuthMode) => { resetForms(); setMode(next); };

  // ── Forgot password ──────────────────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  // ── Set new password (recovery flow) ─────────────────────────────────────
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "At least 6 characters required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password set!", description: "Your password has been updated." });
      setRecoveryMode(false);
      window.history.replaceState(null, "", window.location.pathname);
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Sign in ──────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "ยินดีต้อนรับกลับมา!", description: "เข้าสู่ระบบสำเร็จแล้ว" });

      // Platform operators have no store — send them straight to the admin console.
      const { data: adminRow } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", data.user!.id)
        .maybeSingle();
      navigate(adminRow ? "/admin" : "/dashboard");
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Staff signup — join instantly with the store PIN ─────────────────────
  const handleStaffSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      toast({ title: "กรุณากรอกรหัสร้าน (PIN)", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Edge function (service role) validates the PIN and creates the account
      // already linked + approved — no signup race, no owner-approval wait.
      const { data, error } = await supabase.functions.invoke("join-store", {
        body: { email, password, fullName, pin: pin.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await supabase.auth.signInWithPassword({ email, password });

      toast({ title: "เข้าร่วมร้านสำเร็จ!", description: `ยินดีต้อนรับสู่ ${data?.store_name ?? "ร้านค้า"}` });
      navigate("/sales");
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.message || "มีบางอย่างผิดปกติ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Store creation: step 1 validate ──────────────────────────────────────
  const handleStoreNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      toast({ title: "กรุณากรอกรหัสเชิญ", variant: "destructive" });
      return;
    }
    if (!storeName.trim()) {
      toast({ title: "กรุณากรอกชื่อร้านค้า", variant: "destructive" });
      return;
    }
    setStoreStep(2);
  };

  // ── Store creation: step 2 submit ─────────────────────────────────────────
  const handleStoreCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "รหัสผ่านไม่ตรงกัน", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Uses edge function with service role so the user is never signed in during
      // registration — avoids auth state change race condition and multiple re-renders.
      const { data, error } = await supabase.functions.invoke("register-store", {
        body: { email, password, fullName, storeName, storePhone, storeAddress, inviteCode: inviteCode.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Valid invite code -> store is active immediately. Sign in and go.
      await supabase.auth.signInWithPassword({ email, password });

      toast({ title: "สร้างร้านค้าสำเร็จ!", description: `ยินดีต้อนรับสู่ ${storeName}` });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.message || "มีบางอย่างผิดปกติ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Recovery screen ──────────────────────────────────────────────────────
  if (recoveryMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-3 shadow-md">
              <KeyRound className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">Set New Password</h1>
            <p className="text-muted-foreground text-xs mt-1">Choose a strong password for your account</p>
          </div>
          <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm rounded-3xl overflow-hidden">
            <CardContent className="py-8 px-6">
              <form onSubmit={handleSetNewPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-pw" className="text-xs font-semibold ml-1">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="new-pw" type={showNewPassword ? "text" : "password"}
                      placeholder="At least 6 characters" value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10 h-11 rounded-xl" required minLength={6} />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-pw" className="text-xs font-semibold ml-1">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="confirm-pw" type={showNewPassword ? "text" : "password"}
                      placeholder="Repeat your password" value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="pl-10 h-11 rounded-xl" required />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl text-sm font-bold mt-2" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Set Password & Continue"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const tabLabels: Record<AuthMode, string> = {
    signin: "เข้าสู่ระบบ",
    staff: "สมัครพนักงาน",
    store: "สร้างร้านค้า",
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-4 right-4"><LanguageToggle /></div>
      <Link to="/" className="absolute top-4 left-4 flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /><span>{t("back")}</span>
      </Link>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-3 shadow-md">
            <TireLogo size={24} className="text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">BAANAKE</h1>
          <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-medium">Tire Business Network</p>
        </div>

        <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm rounded-3xl overflow-hidden">
          {/* Mode tabs */}
          <div className="flex border-b border-border">
            {(["signin", "staff", "store"] as AuthMode[]).map((m) => (
              <button key={m} type="button" onClick={() => switchMode(m)}
                className={`flex-1 py-3 text-[11px] font-semibold transition-colors ${
                  mode === m
                    ? "border-b-2 border-primary text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}>
                {tabLabels[m]}
              </button>
            ))}
          </div>

          <CardContent className="pt-6 pb-8">
            <AnimatePresence mode="wait">
              {/* ── SIGN IN ──────────────────────────────────────────────── */}
              {mode === "signin" && (
                <motion.form key="signin" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email-si" className="text-xs font-semibold ml-1">{t("email")}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="email-si" type="email" placeholder={t("enterEmail")} value={email}
                        onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11 rounded-xl" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-si" className="text-xs font-semibold ml-1">{t("password")}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="pw-si" type={showPassword ? "text" : "password"} placeholder={t("enterPassword")}
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-11 rounded-xl" required minLength={6} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-xl text-sm font-bold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-md mt-4" disabled={loading}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t("signIn")}
                  </Button>
                  <div className="text-center mt-2">
                    <button type="button"
                      onClick={() => { setShowForgotPassword(true); setResetSent(false); setResetEmail(""); }}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors">
                      ลืมรหัสผ่าน?
                    </button>
                  </div>
                </motion.form>
              )}

              {/* ── STAFF SIGNUP ─────────────────────────────────────────── */}
              {mode === "staff" && (
                <motion.form key="staff" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  onSubmit={handleStaffSignup} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName-st" className="text-xs font-semibold ml-1">{t("fullName")}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="fullName-st" type="text" placeholder={t("enterFullName")} value={fullName}
                        onChange={(e) => setFullName(e.target.value)} className="pl-10 h-11 rounded-xl" required />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="join-pin" className="text-xs font-semibold ml-1">
                      รหัสร้าน (PIN) <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="join-pin" type="text" placeholder="เช่น A1B2C3D4" value={pin}
                        onChange={(e) => setPin(e.target.value.toUpperCase())}
                        className="pl-10 h-11 rounded-xl tracking-widest font-mono" autoCapitalize="characters" required />
                    </div>
                    <p className="text-[10px] text-muted-foreground ml-1">ขอรหัสนี้จากเจ้าของร้านที่คุณต้องการเข้าร่วม</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email-st" className="text-xs font-semibold ml-1">{t("email")}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="email-st" type="email" placeholder={t("enterEmail")} value={email}
                        onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11 rounded-xl" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-st" className="text-xs font-semibold ml-1">{t("password")}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="pw-st" type={showPassword ? "text" : "password"} placeholder={t("enterPassword")}
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-11 rounded-xl" required minLength={6} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-xl text-sm font-bold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-md mt-4" disabled={loading}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "เข้าร่วมร้านค้า"}
                  </Button>
                </motion.form>
              )}

              {/* ── STORE CREATION ───────────────────────────────────────── */}
              {mode === "store" && (
                <motion.div key="store" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  className="space-y-4">
                  {/* Step progress */}
                  <div className="space-y-1">
                    <div className="flex gap-1.5">
                      <div className={`flex-1 h-1 rounded-full transition-colors duration-300 ${storeStep >= 1 ? "bg-primary" : "bg-muted"}`} />
                      <div className={`flex-1 h-1 rounded-full transition-colors duration-300 ${storeStep >= 2 ? "bg-primary" : "bg-muted"}`} />
                    </div>
                    <p className="text-[11px] text-muted-foreground text-center">
                      {storeStep === 1 ? "ขั้นตอนที่ 1/2 — ข้อมูลร้านค้า" : "ขั้นตอนที่ 2/2 — บัญชีเจ้าของร้าน"}
                    </p>
                  </div>

                  {/* Step 1: Store info */}
                  {storeStep === 1 && (
                    <form onSubmit={handleStoreNext} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="invite-code" className="text-xs font-semibold ml-1">
                          รหัสเชิญ <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="invite-code" type="text" placeholder="รหัสที่ได้รับจากทีมงาน" value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                            className="pl-10 h-11 rounded-xl tracking-widest font-mono" autoCapitalize="characters" required />
                        </div>
                        <p className="text-[10px] text-muted-foreground ml-1">ต้องมีรหัสเชิญเพื่อเปิดร้านใหม่ ติดต่อทีมงานเพื่อขอรหัส</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="store-name" className="text-xs font-semibold ml-1">
                          ชื่อร้านค้า <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="store-name" type="text" placeholder="ร้านยาง ABC" value={storeName}
                            onChange={(e) => setStoreName(e.target.value)} className="pl-10 h-11 rounded-xl" required />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="store-phone" className="text-xs font-semibold ml-1">
                          เบอร์โทรศัพท์ <span className="text-muted-foreground font-normal">(ไม่บังคับ)</span>
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="store-phone" type="tel" placeholder="08x-xxx-xxxx" value={storePhone}
                            onChange={(e) => setStorePhone(e.target.value)} className="pl-10 h-11 rounded-xl" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="store-address" className="text-xs font-semibold ml-1">
                          ที่อยู่ร้าน <span className="text-muted-foreground font-normal">(ไม่บังคับ)</span>
                        </Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="store-address" type="text" placeholder="ถนน, แขวง, เขต, จังหวัด" value={storeAddress}
                            onChange={(e) => setStoreAddress(e.target.value)} className="pl-10 h-11 rounded-xl" />
                        </div>
                      </div>
                      <Button type="submit" className="w-full h-12 rounded-xl text-sm font-bold mt-4 gap-2">
                        ถัดไป <ChevronRight className="w-4 h-4" />
                      </Button>
                    </form>
                  )}

                  {/* Step 2: Owner account */}
                  {storeStep === 2 && (
                    <form onSubmit={handleStoreCreate} className="space-y-4">
                      <button type="button" onClick={() => setStoreStep(1)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <ChevronLeft className="w-4 h-4" /> กลับแก้ไขข้อมูลร้าน
                      </button>

                      {/* Store name preview */}
                      <div className="flex items-center gap-3 p-3 bg-muted/60 rounded-xl border text-xs">
                        <Store className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="font-semibold text-foreground">{storeName}</p>
                          <p className="text-muted-foreground">เปิดใช้งานทันทีหลังสมัคร</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="fullName-ow" className="text-xs font-semibold ml-1">
                          {t("fullName")} <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="fullName-ow" type="text" placeholder={t("enterFullName")} value={fullName}
                            onChange={(e) => setFullName(e.target.value)} className="pl-10 h-11 rounded-xl" required />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email-ow" className="text-xs font-semibold ml-1">
                          {t("email")} <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="email-ow" type="email" placeholder={t("enterEmail")} value={email}
                            onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11 rounded-xl" required />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="pw-ow" className="text-xs font-semibold ml-1">
                          {t("password")} <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="pw-ow" type={showPassword ? "text" : "password"} placeholder={t("enterPassword")}
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 pr-10 h-11 rounded-xl" required minLength={6} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cpw-ow" className="text-xs font-semibold ml-1">
                          ยืนยันรหัสผ่าน <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="cpw-ow" type={showPassword ? "text" : "password"} placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                            className="pl-10 h-11 rounded-xl" required minLength={6} />
                        </div>
                      </div>
                      <Button type="submit"
                        className="w-full h-12 rounded-xl text-sm font-bold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-md mt-2"
                        disabled={loading}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "สร้างร้านค้า"}
                      </Button>
                    </form>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Forgot Password Modal */}
        <AnimatePresence>
          {showForgotPassword && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={(e) => e.target === e.currentTarget && setShowForgotPassword(false)}>
              <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
                className="bg-card rounded-3xl shadow-2xl p-6 w-full max-w-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">รีเซ็ตรหัสผ่าน</h3>
                    <p className="text-xs text-muted-foreground">เราจะส่งลิงก์ไปยังอีเมลของคุณ</p>
                  </div>
                </div>
                {resetSent ? (
                  <div className="text-center py-4 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="font-semibold text-sm">ส่งอีเมลแล้ว!</p>
                    <p className="text-xs text-muted-foreground">ตรวจสอบกล่องจดหมาย {resetEmail} แล้วคลิกลิงก์เพื่อรีเซ็ตรหัสผ่าน</p>
                    <Button className="w-full mt-2" onClick={() => setShowForgotPassword(false)}>ปิด</Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">อีเมลที่ลงทะเบียน</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="email" placeholder="your@email.com" value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)} className="pl-10 h-11 rounded-xl"
                          onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setShowForgotPassword(false)}>ยกเลิก</Button>
                      <Button className="flex-1" onClick={handleForgotPassword} disabled={resetLoading || !resetEmail.trim()}>
                        {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "ส่งลิงก์"}
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-[9px] text-muted-foreground mt-6 px-4">
          การดำเนินการต่อแสดงว่าคุณยอมรับ <span className="underline">เงื่อนไขการใช้บริการ</span> และ <span className="underline">นโยบายความเป็นส่วนตัว</span> ของเรา
        </p>
      </motion.div>
    </div>
  );
}
