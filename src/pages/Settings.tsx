import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Settings as SettingsIcon, Globe, Bell, LogOut, Building2, BadgeCheck } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  owner: "เจ้าของร้าน",
  staff: "พนักงาน",
  interbranch: "สาขา",
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border"><h3 className="font-bold text-[15px]">{title}</h3></div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { profile, store, role, isOwner } = useAuth();
  const navigate = useNavigate();

  const initials = profile?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div className="pt-2">
        <h1 className="text-2xl md:text-[26px] font-extrabold tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" /> ตั้งค่า
        </h1>
        <p className="text-sm text-muted-foreground mt-1">บัญชี ร้านค้า และการแสดงผล</p>
      </div>

      {/* Profile */}
      <Panel title="โปรไฟล์">
        <div className="p-5 flex items-center gap-4">
          <Avatar className="w-14 h-14">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base truncate">{profile?.full_name || "User"}</p>
            <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
          </div>
          {role && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
              <BadgeCheck className="w-3.5 h-3.5" /> {ROLE_LABELS[role] ?? role}
            </span>
          )}
        </div>
      </Panel>

      {/* Store (owner) */}
      {store && isOwner && (
        <Panel title="ข้อมูลร้าน">
          <div className="p-5 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-secondary text-muted-foreground flex items-center justify-center shrink-0"><Building2 className="w-5 h-5" /></span>
            <div>
              <p className="font-semibold">{store.name}</p>
              {store.address && <p className="text-sm text-muted-foreground">{store.address}</p>}
            </div>
          </div>
        </Panel>
      )}

      {/* Preferences */}
      <Panel title="การแสดงผล">
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center"><Globe className="w-4.5 h-4.5" /></span>
              <div>
                <p className="font-semibold text-sm">ภาษา</p>
                <p className="text-xs text-muted-foreground">เลือกภาษาที่ต้องการ</p>
              </div>
            </div>
            <LanguageToggle />
          </div>
          <div className="flex items-center justify-between p-4 opacity-50">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center"><Bell className="w-4.5 h-4.5" /></span>
              <div>
                <p className="font-semibold text-sm">การแจ้งเตือน</p>
                <p className="text-xs text-muted-foreground">เร็วๆ นี้</p>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <button
        onClick={handleLogout}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-600 px-4 py-3 text-sm font-semibold hover:bg-rose-500/10 transition"
      >
        <LogOut className="w-4 h-4" /> ออกจากระบบ
      </button>
    </div>
  );
}
