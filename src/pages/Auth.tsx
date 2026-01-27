import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, Store, Users, Search } from "lucide-react";
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

type UserType = "owner" | "staff";

interface StoreOption {
  id: string;
  name: string;
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
  const [storeCode, setStoreCode] = useState("");
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
      if (storeSearch.length < 2) {
        setAvailableStores([]);
        return;
      }

      setSearchingStores(true);
      try {
        const { data, error } = await supabase
          .from("stores_public")
          .select("id, name")
          .ilike("name", `%${storeSearch}%`)
          .eq("is_active", true)
          .limit(5);

        if (!error && data) {
          setAvailableStores(data.filter((s): s is StoreOption => s.id !== null && s.name !== null));
        }
      } catch (err) {
        console.error("Error searching stores:", err);
      } finally {
        setSearchingStores(false);
      }
    };

    const debounce = setTimeout(searchStores, 300);
    return () => clearTimeout(debounce);
  }, [storeSearch]);

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
          title: "Welcome back!",
          description: "You've successfully logged in.",
        });
        navigate("/dashboard");
      } else {
        // Validate staff signup
        if (userType === "staff" && !selectedStoreId) {
          throw new Error("Please select a store to join");
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
          title: "Account created!",
          description: userType === "owner" 
            ? "Your account is pending approval. We'll notify you when you're approved."
            : "Your request to join the store has been sent. The store owner will review your application.",
        });
        navigate("/pending");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      {/* Back Button */}
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
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-3 shadow-sm"
          >
            <TireLogo size={24} className="text-primary-foreground" />
          </motion.div>
          <h1 className="text-xl font-semibold text-foreground">BAANAKE</h1>
          <p className="text-muted-foreground text-xs">Tire Business Network</p>
        </div>

        <Card className="border-0 shadow-soft-lg bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2 pt-6">
            <CardTitle className="text-lg font-semibold">
              {isLogin ? t("welcomeBack") : t("createAccount")}
            </CardTitle>
            <CardDescription className="text-xs">
              {isLogin ? t("signInToAccess") : t("joinNetwork")}
            </CardDescription>
          </CardHeader>

          <CardContent className="pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <>
                    {/* User Type Selection */}
                    <motion.div
                      key="userType"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                    >
                      <Label className="text-xs">I am a...</Label>
                      <RadioGroup
                        value={userType}
                        onValueChange={(value) => setUserType(value as UserType)}
                        className="grid grid-cols-2 gap-3"
                      >
                        <Label
                          htmlFor="owner"
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            userType === "owner"
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-muted-foreground/30"
                          }`}
                        >
                          <RadioGroupItem value="owner" id="owner" className="sr-only" />
                          <Store className="w-5 h-5" />
                          <span className="text-sm font-medium">Store Owner</span>
                        </Label>
                        <Label
                          htmlFor="staff"
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            userType === "staff"
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-muted-foreground/30"
                          }`}
                        >
                          <RadioGroupItem value="staff" id="staff" className="sr-only" />
                          <Users className="w-5 h-5" />
                          <span className="text-sm font-medium">Staff Member</span>
                        </Label>
                      </RadioGroup>
                    </motion.div>

                    {/* Full Name */}
                    <motion.div
                      key="fullName"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-1.5"
                    >
                      <Label htmlFor="fullName" className="text-xs">{t("fullName")}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="fullName"
                          type="text"
                          placeholder={t("enterFullName")}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-10"
                          required={!isLogin}
                        />
                      </div>
                    </motion.div>

                    {/* Store Selection for Staff */}
                    {userType === "staff" && (
                      <motion.div
                        key="storeSelection"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-1.5"
                      >
                        <Label htmlFor="storeSearch" className="text-xs">Select Store to Join</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="storeSearch"
                            type="text"
                            placeholder="Search stores..."
                            value={storeSearch}
                            onChange={(e) => {
                              setStoreSearch(e.target.value);
                              setSelectedStoreId("");
                            }}
                            className="pl-10"
                          />
                        </div>
                        {searchingStores && (
                          <p className="text-xs text-muted-foreground">Searching...</p>
                        )}
                        {availableStores.length > 0 && !selectedStoreId && (
                          <div className="border rounded-lg divide-y bg-card">
                            {availableStores.map((store) => (
                              <button
                                key={store.id}
                                type="button"
                                onClick={() => {
                                  setSelectedStoreId(store.id);
                                  setStoreSearch(store.name);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                              >
                                {store.name}
                              </button>
                            ))}
                          </div>
                        )}
                        {selectedStoreId && (
                          <p className="text-xs text-success">Store selected ✓</p>
                        )}
                      </motion.div>
                    )}
                  </>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">{t("email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("enterEmail")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">{t("password")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("enterPassword")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isLogin ? (
                  t("signIn")
                ) : (
                  t("createAccount")
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
              >
                {isLogin ? t("noAccount") : t("hasAccount")}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground mt-4">
          {t("termsAgreement")}
        </p>
      </motion.div>
    </div>
  );
}
