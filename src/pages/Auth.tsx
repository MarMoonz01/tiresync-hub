import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, Store, Users, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TireLogo } from "@/components/icons/TireLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type UserType = "owner" | "staff";

interface StoreOption {
  id: string;
  name: string;
  address?: string | null;
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const { t } = useLanguage();
  
  const [isLogin, setIsLogin] = useState(mode !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // New fields for role selection
  const [userType, setUserType] = useState<UserType>("owner");
  const [storeSearch, setStoreSearch] = useState("");
  const [availableStores, setAvailableStores] = useState<StoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [searchingStores, setSearchingStores] = useState(false);

  // Update form mode when URL changes
  useEffect(() => {
    setIsLogin(mode !== "signup");
  }, [mode]);

  // Search stores when user types
  useEffect(() => {
    const searchStores = async () => {
      if (storeSearch.length < 2 || selectedStoreId) {
        if (!selectedStoreId) setAvailableStores([]);
        return;
      }

      setSearchingStores(true);
      try {
        // ค้นหาจากตาราง stores (ตรวจสอบ RLS Policy ให้เปิดเป็น Public read สำหรับเบื้องต้น)
        const { data, error } = await supabase
          .from("stores")
          .select("id, name, address")
          .ilike("name", `%${storeSearch}%`)
          .limit(5);

        if (!error && data) {
          setAvailableStores(data);
        }
      } catch (err) {
        console.error("Error searching stores:", err);
      } finally {
        setSearchingStores(false);
      }
    };

    const debounce = setTimeout(searchStores, 300);
    return () => clearTimeout(debounce);
  }, [storeSearch, selectedStoreId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "ยินดีต้อนรับกลับมา!",
          description: "เข้าสู่ระบบสำเร็จแล้ว",
        });
        navigate("/dashboard");
      } else {
        // Validate staff signup
        if (userType === "staff" && !selectedStoreId) {
          throw new Error("กรุณาเลือกร้านค้าที่ต้องการเข้าร่วม");
        }

        const { data: authData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              user_type: userType,
            },
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) throw error;

        // If staff, create a join request
        if (userType === "staff" && authData.user) {
          const { error: requestError } = await supabase
            .from("staff_join_requests")
            .insert({
              user_id: authData.user.id,
              store_id: selectedStoreId,
            });

          if (requestError && requestError.code !== "23505") {
            console.error("Error creating join request:", requestError);
          }
        }

        toast({
          title: "สร้างบัญชีสำเร็จ!",
          description: userType === "owner" 
            ? "บัญชีของคุณอยู่ระหว่างการรออนุมัติ"
            : "ส่งคำขอเข้าร่วมร้านค้าแล้ว กรุณารอเจ้าของร้านอนุมัติ",
        });
        navigate("/pending");
      }
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "มีบางอย่างผิดปกติ",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <Link
        to="/"
        className="absolute top-4 left-4 flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t("back")}</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-3 shadow-md">
            <TireLogo size={24} className="text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">BAANAKE</h1>
          <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-medium">Tire Business Network</p>
        </div>

        <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm rounded-3xl overflow-hidden">
          <CardHeader className="text-center pb-2 pt-8">
            <CardTitle className="text-xl font-bold">
              {isLogin ? t("welcomeBack") : t("createAccount")}
            </CardTitle>
            <CardDescription className="text-sm">
              {isLogin ? t("signInToAccess") : t("joinNetwork")}
            </CardDescription>
          </CardHeader>

          <CardContent className="pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {/* User Type Selection */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold ml-1">เลือกประเภทผู้ใช้งาน</Label>
                      <RadioGroup
                        value={userType}
                        onValueChange={(value) => {
                          setUserType(value as UserType);
                          setSelectedStoreId("");
                          setStoreSearch("");
                        }}
                        className="grid grid-cols-2 gap-3"
                      >
                        <Label
                          htmlFor="owner"
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 cursor-pointer transition-all",
                            userType === "owner" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-muted hover:border-muted-foreground/30"
                          )}
                        >
                          <RadioGroupItem value="owner" id="owner" className="sr-only" />
                          <Store className={cn("w-6 h-6", userType === "owner" ? "text-primary" : "text-muted-foreground")} />
                          <span className="text-xs font-bold">เจ้าของร้าน</span>
                        </Label>
                        <Label
                          htmlFor="staff"
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 cursor-pointer transition-all",
                            userType === "staff" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-muted hover:border-muted-foreground/30"
                          )}
                        >
                          <RadioGroupItem value="staff" id="staff" className="sr-only" />
                          <Users className={cn("w-6 h-6", userType === "staff" ? "text-primary" : "text-muted-foreground")} />
                          <span className="text-xs font-bold">พนักงาน</span>
                        </Label>
                      </RadioGroup>
                    </div>

                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="text-xs font-semibold ml-1">{t("fullName")}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="fullName"
                          type="text"
                          placeholder={t("enterFullName")}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-10 h-11 rounded-xl"
                          required={!isLogin}
                        />
                      </div>
                    </div>

                    {/* Store Selection for Staff - พิมพ์แล้วขึ้น Profile Card */}
                    {userType === "staff" && (
                      <div className="space-y-3 pt-1">
                        <Label htmlFor="storeSearch" className="text-xs font-semibold ml-1">ค้นหาร้านค้าที่ต้องการเข้าร่วม</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="storeSearch"
                            type="text"
                            placeholder="พิมพ์ชื่อร้านค้า..."
                            value={storeSearch}
                            onChange={(e) => {
                              setStoreSearch(e.target.value);
                              setSelectedStoreId("");
                            }}
                            className="pl-10 h-11 rounded-xl"
                          />
                        </div>

                        {searchingStores && (
                          <div className="flex items-center gap-2 px-2 py-1">
                            <Loader2 className="w-3 h-3 animate-spin text-primary" />
                            <span className="text-[10px] text-muted-foreground">กำลังค้นหา...</span>
                          </div>
                        )}

                        {/* Profile Cards Results */}
                        <div className="space-y-2">
                          {availableStores.length > 0 && !selectedStoreId && (
                            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                              {availableStores.map((store) => (
                                <button
                                  key={store.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedStoreId(store.id);
                                    setStoreSearch(store.name);
                                  }}
                                  className="w-full p-4 bg-white rounded-2xl border-2 border-primary/10 flex items-center gap-4 text-left hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm"
                                >
                                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                                    <Store className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                    <div className="text-sm font-bold text-primary truncate leading-none mb-1">{store.name}</div>
                                    <div className="text-[10px] text-muted-foreground truncate italic">{store.address || "ไม่ระบุที่อยู่"}</div>
                                  </div>
                                  <div className="w-5 h-5 rounded-full border-2 border-primary/20 flex-shrink-0" />
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Selected Card */}
                          {selectedStoreId && (
                            <div className="p-4 bg-green-50 rounded-2xl border-2 border-green-500 flex items-center gap-4 animate-in zoom-in-95 duration-200">
                              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white flex-shrink-0">
                                <Check className="w-6 h-6" />
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <div className="text-sm font-bold text-green-700 truncate">{storeSearch}</div>
                                <div className="text-[10px] text-green-600 font-medium">ยืนยันการเข้าร่วมร้านนี้แล้ว</div>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => { setSelectedStoreId(""); setStoreSearch(""); }}
                                className="text-[10px] text-muted-foreground underline"
                              >
                                เปลี่ยน
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold ml-1">{t("email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("enterEmail")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold ml-1">{t("password")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("enterPassword")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 rounded-xl"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-sm font-bold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all shadow-md mt-4"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isLogin ? (
                  t("signIn")
                ) : (
                  t("createAccount")
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setSelectedStoreId("");
                  setStoreSearch("");
                }}
                className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                {isLogin ? (
                  <>ยังไม่มีบัญชี? <span className="text-primary font-bold ml-1">ลงทะเบียนที่นี่</span></>
                ) : (
                  <>มีบัญชีอยู่แล้ว? <span className="text-primary font-bold ml-1">เข้าสู่ระบบ</span></>
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-[9px] text-muted-foreground mt-6 px-4">
          การดำเนินการต่อแสดงว่าคุณยอมรับ <span className="underline">เงื่อนไขการใช้บริการ</span> และ <span className="underline">นโยบายความเป็นส่วนตัว</span> ของเรา
        </p>
      </motion.div>
    </div>
  );
}