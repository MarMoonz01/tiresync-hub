import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, RefreshCw, LogOut, CheckCircle, Loader2, Store, User, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TireLogo } from "@/components/icons/TireLogo";

export default function Pending() {
  const { user, profile, store, loading, refetchProfile, isApproved, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(false);
  const [approved, setApproved] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [appliedStoreName, setAppliedStoreName] = useState<string | null>(null);

  // Redirect if not signed in
  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  // Platform admins have no store and never need approval — bounce to the console.
  useEffect(() => {
    if (!loading && isPlatformAdmin) navigate("/admin");
  }, [loading, isPlatformAdmin, navigate]);

  // Redirect immediately if already approved
  useEffect(() => {
    if (!loading && isApproved) navigate("/sales");
  }, [loading, isApproved, navigate]);

  // For staff (role=null, no store_id yet): fetch the store they applied to
  useEffect(() => {
    if (!user || profile?.store_id) return;
    // A not-yet-approved staff member can't read `stores` under RLS, so resolve
    // the store_id from their join request, then look up the name via the public
    // stores_signup_search view (granted to authenticated/anon).
    (async () => {
      const { data: req } = await supabase
        .from("staff_join_requests")
        .select("store_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!req?.store_id) return;

      const { data: store } = await supabase
        .from("stores_signup_search")
        .select("name")
        .eq("id", req.store_id)
        .maybeSingle();

      if (store?.name) setAppliedStoreName(store.name);
    })();
  }, [user, profile?.store_id]);

  const checkStatus = useCallback(async (): Promise<boolean> => {
    await refetchProfile();
    if (!user) return false;
    const { data } = await supabase
      .from("profiles")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();
    return data?.status === "approved";
  }, [user, refetchProfile]);

  const handleRefresh = async () => {
    setChecking(true);
    try {
      const nowApproved = await checkStatus();
      setLastChecked(new Date());
      if (nowApproved) {
        setApproved(true);
        setTimeout(() => navigate("/sales"), 2000);
      }
    } finally {
      setChecking(false);
    }
  };

  // Auto-poll every 10 s
  useEffect(() => {
    if (!user || approved) return;
    const interval = setInterval(async () => {
      const nowApproved = await checkStatus();
      setLastChecked(new Date());
      if (nowApproved) {
        setApproved(true);
        setTimeout(() => navigate("/sales"), 2000);
        clearInterval(interval);
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [user, approved, checkStatus, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const isOwner = profile?.role === "owner";
  const displayStoreName = store?.name ?? appliedStoreName;

  // ── Approved ─────────────────────────────────────────────────────────────
  if (approved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex flex-col items-center gap-6 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 15 }}
            className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center"
          >
            <CheckCircle className="w-12 h-12 text-green-600" />
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">อนุมัติแล้ว!</h2>
            <p className="text-muted-foreground text-sm">กำลังพาคุณเข้าสู่ระบบ...</p>
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </motion.div>
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Timeline steps ────────────────────────────────────────────────────────
  const steps = isOwner
    ? [
        { icon: User,        label: "สร้างบัญชีเจ้าของร้านแล้ว",                             done: true,  active: false },
        { icon: Store,       label: displayStoreName ? `ร้าน "${displayStoreName}" รอผู้ดูแลระบบอนุมัติ` : "รอผู้ดูแลระบบอนุมัติ", done: false, active: true },
        { icon: ShieldCheck, label: "เข้าใช้งานระบบได้เลย",                                  done: false, active: false },
      ]
    : [
        { icon: User,        label: "สร้างบัญชีพนักงานแล้ว",                                                                         done: true,  active: false },
        { icon: Store,       label: displayStoreName ? `รอเจ้าของ "${displayStoreName}" อนุมัติ` : "รอเจ้าของร้านอนุมัติ",          done: false, active: true },
        { icon: ShieldCheck, label: "เข้าใช้งานร้านได้เลย",                                                                          done: false, active: false },
      ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-3 shadow-md">
            <TireLogo size={30} className="text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">BAANAKE</h1>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="pt-8 pb-6 space-y-6">
            {/* Status icon + heading */}
            <div className="flex flex-col items-center gap-3 text-center">
              <motion.div
                animate={{ rotate: [0, 6, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center"
              >
                <Clock className="w-8 h-8 text-amber-600" />
              </motion.div>
              <div>
                <h2 className="text-lg font-bold">รอการอนุมัติ</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {isOwner
                    ? "ผู้ดูแลระบบจะตรวจสอบข้อมูลร้านของคุณ"
                    : "เจ้าของร้านจะตรวจสอบคำขอเข้าร่วมของคุณ"}
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-0">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  {/* Left: icon + connector line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.done   ? "bg-green-100 text-green-600" :
                      step.active ? "bg-amber-100 text-amber-600" :
                                    "bg-muted text-muted-foreground"
                    }`}>
                      {step.done ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : step.active ? (
                        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                          <Clock className="w-4 h-4" />
                        </motion.div>
                      ) : (
                        <step.icon className="w-4 h-4" />
                      )}
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`w-0.5 h-6 my-1 rounded-full ${step.done ? "bg-green-200" : "bg-border"}`} />
                    )}
                  </div>

                  {/* Right: label */}
                  <p className={`text-sm pt-1.5 pb-4 leading-snug ${
                    step.done   ? "text-green-700 font-medium" :
                    step.active ? "text-amber-700 font-medium" :
                                  "text-muted-foreground"
                  }`}>
                    {step.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Auto-check pulse */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <motion.div
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-primary"
              />
              <span>
                ตรวจสอบอัตโนมัติทุก 10 วินาที
                {lastChecked && (
                  <> · {lastChecked.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</>
                )}
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button onClick={handleRefresh} variant="outline" className="w-full" disabled={checking}>
                {checking
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />กำลังตรวจสอบ...</>
                  : <><RefreshCw className="w-4 h-4 mr-2" />ตรวจสอบสถานะ</>}
              </Button>
              <Button onClick={handleLogout} variant="ghost" className="w-full text-muted-foreground hover:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />ออกจากระบบ
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
