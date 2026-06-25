import { ReactNode, useCallback, useEffect, useState } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOperator, Operator } from "@/hooks/useOperator";
import { PinPad } from "./PinPad";
import { TireLogo } from "@/components/icons/TireLogo";
import { ChevronLeft, LogOut, Loader2 } from "lucide-react";

const sb = supabase as unknown as SupabaseClient;

interface StaffRow {
  id: string;
  full_name: string | null;
  email: string;
  role: string | null;
  permissions: Record<string, unknown> | null;
}

const initialsOf = (s: StaffRow) =>
  (s.full_name || s.email || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const pinOf = (s: StaffRow) => {
  const p = s.permissions?.pin;
  return typeof p === "string" && p.length === 4 ? p : null;
};

/**
 * Operator lock — prototype-style PIN screen layered on the real Supabase session.
 * The device signs in once; staff then tap their profile + 4-digit PIN to become the
 * active operator. PINs live (owner-managed) in profiles.permissions.pin.
 */
export function OperatorGate({ children }: { children: ReactNode }) {
  const { user, store, isApproved, isPlatformAdmin, loading } = useAuth();
  const { operator, setOperator } = useOperator();

  const gateActive = !loading && !!user && isApproved && !!store && !isPlatformAdmin;

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [fetching, setFetching] = useState(false);
  const [sel, setSel] = useState<StaffRow | null>(null);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [stage, setStage] = useState<"enter" | "set" | "confirm">("enter");
  const [err, setErr] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!gateActive || operator || !store) return;
    let cancelled = false;
    (async () => {
      setFetching(true);
      const { data } = await sb
        .from("profiles")
        .select("id, full_name, email, role, permissions")
        .eq("store_id", store.id)
        .eq("status", "approved");
      if (!cancelled) {
        setStaff((data as StaffRow[]) ?? []);
        setFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [gateActive, operator, store]);

  const pick = (s: StaffRow) => {
    setSel(s);
    setPin(""); setConfirm(""); setErr(false);
    setStage(pinOf(s) ? "enter" : "set");
  };

  const commit = useCallback(async (s: StaffRow) => {
    const op: Operator = {
      id: s.id,
      name: (s.full_name || s.email).split(" ")[0],
      role: s.role || "staff",
      initials: initialsOf(s),
    };
    setOperator(op);
  }, [setOperator]);

  const saveNewPin = async (s: StaffRow, value: string) => {
    setSaving(true);
    const { error } = await sb
      .from("profiles")
      .update({ permissions: { ...(s.permissions ?? {}), pin: value } })
      .eq("id", s.id);
    setSaving(false);
    if (error) { setErr(true); setStage("set"); setPin(""); setConfirm(""); return; }
    commit(s);
  };

  const onDigit = (d: string) => {
    if (!sel) return;
    setErr(false);
    if (stage === "enter") {
      const next = (pin + d).slice(0, 4);
      setPin(next);
      if (next.length === 4) {
        setTimeout(() => {
          if (next === pinOf(sel)) commit(sel);
          else { setErr(true); setPin(""); }
        }, 160);
      }
    } else if (stage === "set") {
      const next = (pin + d).slice(0, 4);
      setPin(next);
      if (next.length === 4) setTimeout(() => setStage("confirm"), 170);
    } else {
      const next = (confirm + d).slice(0, 4);
      setConfirm(next);
      if (next.length === 4) {
        setTimeout(() => {
          if (next === pin) saveNewPin(sel, next);
          else { setErr(true); setConfirm(""); setPin(""); setStage("set"); }
        }, 180);
      }
    }
  };

  const onDelete = () => {
    if (stage === "confirm") setConfirm((p) => p.slice(0, -1));
    else setPin((p) => p.slice(0, -1));
  };

  if (!gateActive || operator) return <>{children}</>;

  const tone = (role: string | null) =>
    role === "owner" ? "from-primary to-sky-500" : "from-violet-500 to-fuchsia-500";

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "radial-gradient(1100px 600px at 50% -10%, hsl(221 83% 53% / 0.10), transparent 60%), hsl(var(--background))" }}>
      <div className="w-full max-w-[440px] text-center">
        {/* brand */}
        <div className="flex flex-col items-center gap-3 mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-sky-500 text-white flex items-center justify-center shadow-lg">
            <TireLogo size={30} className="text-white" />
          </div>
          <div>
            <div className="text-xl font-extrabold tracking-tight">BAANAKE</div>
            <div className="text-xs font-semibold text-muted-foreground">{store?.name}</div>
          </div>
        </div>

        {!sel ? (
          /* profile picker */
          <div className="rounded-2xl border border-border bg-card shadow-soft p-6">
            <h2 className="text-lg font-bold">เลือกผู้ใช้งาน</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-5">แตะโปรไฟล์เพื่อกรอกรหัส PIN</p>
            {fetching ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto my-6" />
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
                {staff.map((u) => (
                  <button key={u.id} onClick={() => pick(u)}
                    className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-border bg-secondary/40 hover:border-primary hover:-translate-y-0.5 transition">
                    <span className={`w-12 h-12 rounded-full bg-gradient-to-br ${tone(u.role)} text-white flex items-center justify-center font-bold`}>{initialsOf(u)}</span>
                    <span>
                      <span className="block text-sm font-bold">{(u.full_name || u.email).split(" ")[0]}</span>
                      <span className="block text-[10px] text-muted-foreground">{u.role === "owner" ? "เจ้าของร้าน" : "พนักงาน"}</span>
                    </span>
                  </button>
                ))}
                {staff.length === 0 && <p className="col-span-full text-sm text-muted-foreground py-4">ไม่พบผู้ใช้งาน</p>}
              </div>
            )}
          </div>
        ) : (
          /* keypad */
          <div className="rounded-2xl border border-border bg-card shadow-soft p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className={`w-11 h-11 rounded-full bg-gradient-to-br ${tone(sel.role)} text-white flex items-center justify-center font-bold`}>{initialsOf(sel)}</span>
              <div className="text-left flex-1">
                <div className="text-[11px] font-semibold text-muted-foreground">
                  {stage === "enter" ? "กรอกรหัส PIN" : stage === "set" ? "ตั้งรหัส PIN ใหม่ (4 หลัก)" : "ยืนยันรหัส PIN"}
                </div>
                <div className="text-[15px] font-bold">{(sel.full_name || sel.email).split(" ")[0]}</div>
              </div>
              <button onClick={() => { setSel(null); setPin(""); setConfirm(""); setErr(false); }}
                className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-secondary">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
            <div className="h-4 mb-1">
              {err && <span className="text-xs font-semibold text-rose-600">{stage === "confirm" || stage === "set" ? "รหัสไม่ตรงกัน ลองใหม่" : "รหัส PIN ไม่ถูกต้อง"}</span>}
              {saving && <span className="text-xs text-muted-foreground">กำลังบันทึก...</span>}
            </div>
            <PinPad pin={stage === "confirm" ? confirm : pin} onDigit={onDigit} onDelete={onDelete} err={err} />
          </div>
        )}

        {/* sign out of the device session */}
        <button onClick={async () => { setOperator(null); await supabase.auth.signOut(); }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mt-5 transition">
          <LogOut className="w-3.5 h-3.5" /> ออกจากระบบอุปกรณ์
        </button>
      </div>
    </div>
  );
}
