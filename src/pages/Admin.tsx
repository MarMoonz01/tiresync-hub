import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, Store as StoreIcon, Users, Ticket, BarChart3, Copy, Check,
  Plus, Trash2, Power, Loader2, LogOut, RefreshCw, CreditCard, Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";

function codeStatus(c: { used_at: string | null; expires_at: string | null }) {
  if (c.used_at) return { label: "ใช้แล้ว", variant: "secondary" as const };
  if (c.expires_at && new Date(c.expires_at) < new Date()) return { label: "หมดอายุ", variant: "outline" as const };
  return { label: "พร้อมใช้", variant: "default" as const };
}

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    metrics, codes, stores, users, subscriptions, agentUsage,
    generateCode, revokeCode, setStoreActive, setUserStatus, setSubscription,
  } = useAdmin();

  const storeName = (id: string | null) =>
    stores.data?.find((s) => s.id === id)?.name ?? (id ? id.slice(0, 8) : "—");

  const [note, setNote] = useState("");
  const [expiresDays, setExpiresDays] = useState(30);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleGenerate = async () => {
    const code = await generateCode.mutateAsync({ note, expiresDays });
    setLastCode(code);
    setNote("");
    toast({ title: "สร้างรหัสเชิญแล้ว", description: code });
  };

  const m = metrics.data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold leading-none">Admin Console</p>
              <p className="text-[10px] text-muted-foreground">Platform operator</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>กลับแอป</Button>
            <Button variant="outline" size="sm" className="gap-1.5"
              onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}>
              <LogOut className="w-3.5 h-3.5" /> ออก
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full max-w-3xl grid-cols-3 sm:grid-cols-6">
            <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="w-4 h-4" />ภาพรวม</TabsTrigger>
            <TabsTrigger value="codes" className="gap-1.5"><Ticket className="w-4 h-4" />รหัสเชิญ</TabsTrigger>
            <TabsTrigger value="stores" className="gap-1.5"><StoreIcon className="w-4 h-4" />ร้านค้า</TabsTrigger>
            <TabsTrigger value="subs" className="gap-1.5"><CreditCard className="w-4 h-4" />สมาชิก</TabsTrigger>
            <TabsTrigger value="usage" className="gap-1.5"><Cpu className="w-4 h-4" />ต้นทุน AI</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><Users className="w-4 h-4" />ผู้ใช้</TabsTrigger>
          </TabsList>

          {/* ── Overview ─────────────────────────────────────────────────── */}
          <TabsContent value="overview" className="mt-6">
            {metrics.isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mt-10" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Metric label="ร้านค้าทั้งหมด" value={m?.total_stores ?? 0} />
                <Metric label="ร้านที่เปิดใช้งาน" value={m?.active_stores ?? 0} accent />
                <Metric label="ผู้ใช้ทั้งหมด" value={m?.total_users ?? 0} />
                <Metric label="รหัสเชิญที่ว่าง" value={m?.unused_codes ?? 0} />
                <Metric label="เจ้าของร้าน" value={m?.total_owners ?? 0} />
                <Metric label="พนักงาน" value={m?.total_staff ?? 0} />
                <Metric label="ยอดขาย (ครั้ง)" value={m?.total_sales ?? 0} />
                <Metric label="รายได้รวม" value={`฿${(m?.total_revenue ?? 0).toLocaleString()}`} accent />
              </div>
            )}
          </TabsContent>

          {/* ── Invite codes ─────────────────────────────────────────────── */}
          <TabsContent value="codes" className="mt-6 space-y-5">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <p className="font-semibold text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-primary" />สร้างรหัสเชิญใหม่</p>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">หมายเหตุ (ชื่อร้าน/ธุรกิจ)</Label>
                    <Input placeholder="เช่น ร้านยางสมชาย" value={note} onChange={(e) => setNote(e.target.value)} />
                  </div>
                  <div className="w-28 space-y-1.5">
                    <Label className="text-xs">หมดอายุ (วัน)</Label>
                    <Input type="number" min={1} value={expiresDays} onChange={(e) => setExpiresDays(Number(e.target.value) || 30)} />
                  </div>
                  <Button onClick={handleGenerate} disabled={generateCode.isPending} className="gap-1.5">
                    {generateCode.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    สร้างรหัส
                  </Button>
                </div>
                {lastCode && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <span className="text-xs text-muted-foreground">รหัสใหม่:</span>
                    <code className="font-mono text-lg font-bold tracking-widest text-primary">{lastCode}</code>
                    <Button size="icon" variant="ghost" onClick={() => copy(lastCode)}>
                      {copied === lastCode ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-2">
              {codes.data?.map((c) => {
                const st = codeStatus(c);
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                    <code className="font-mono font-bold tracking-widest text-sm">{c.code}</code>
                    <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                    <span className="text-xs text-muted-foreground flex-1 truncate">{c.note ?? "—"}</span>
                    {!c.used_at && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => copy(c.code)} title="คัดลอก">
                          {copied === c.code ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => revokeCode.mutate(c.id)} title="ยกเลิก">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
              {codes.data?.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีรหัสเชิญ</p>}
            </div>
          </TabsContent>

          {/* ── Stores ───────────────────────────────────────────────────── */}
          <TabsContent value="stores" className="mt-6 space-y-2">
            {stores.data?.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    PIN: <code className="font-mono">{s.join_code ?? "—"}</code>
                    {s.phone ? ` · ${s.phone}` : ""}
                  </p>
                </div>
                <Badge variant={s.is_active ? "default" : "outline"} className="text-[10px]">
                  {s.is_active ? "เปิด" : "ปิด"}
                </Badge>
                <Button size="sm" variant={s.is_active ? "outline" : "default"} className="gap-1.5"
                  onClick={() => setStoreActive.mutate({ id: s.id, active: !s.is_active })}>
                  <Power className="w-3.5 h-3.5" />
                  {s.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                </Button>
              </div>
            ))}
            {stores.data?.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีร้านค้า</p>}
          </TabsContent>

          {/* ── Subscriptions ────────────────────────────────────────────── */}
          <TabsContent value="subs" className="mt-6 space-y-2">
            {subscriptions.isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mt-10" />
            ) : (
              <>
                {subscriptions.data?.map((sub) => {
                  const trialOver = sub.plan === "trial" && sub.trial_ends_at && new Date(sub.trial_ends_at) < new Date();
                  const active = sub.status === "active" && sub.plan !== "suspended" && !trialOver;
                  return (
                    <div key={sub.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{storeName(sub.store_id)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {sub.plan}{sub.trial_ends_at ? ` · trial ends ${sub.trial_ends_at.slice(0, 10)}` : ""}
                        </p>
                      </div>
                      <Badge variant={active ? "default" : "destructive"} className="text-[10px]">{sub.status}</Badge>
                      <Button size="sm" variant={active ? "outline" : "default"} className="gap-1.5"
                        onClick={() => setSubscription.mutate({ storeId: sub.store_id, active: !active })}>
                        <Power className="w-3.5 h-3.5" />
                        {active ? "ระงับ" : "เปิดใช้งาน"}
                      </Button>
                    </div>
                  );
                })}
                {subscriptions.data?.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีข้อมูลสมาชิก</p>}
              </>
            )}
          </TabsContent>

          {/* ── Agent usage / AI cost ────────────────────────────────────── */}
          <TabsContent value="usage" className="mt-6 space-y-2">
            {agentUsage.isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mt-10" />
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">ร้านค้า</th>
                      <th className="text-right px-4 py-3 font-medium">โทเคน</th>
                      <th className="text-right px-4 py-3 font-medium">เรียก</th>
                      <th className="text-right px-4 py-3 font-medium">ต้นทุน (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(agentUsage.data ?? []).map((r, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 font-medium">{r.store_name ?? storeName(r.store_id)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{Number(r.total_tokens).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{Number(r.call_count).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-primary">${Number(r.total_cost_usd).toFixed(4)}</td>
                      </tr>
                    ))}
                    {(agentUsage.data ?? []).length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">ยังไม่มีการใช้งาน AI</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── Users ────────────────────────────────────────────────────── */}
          <TabsContent value="users" className="mt-6 space-y-2">
            {users.data?.map((u) => {
              const suspended = u.status === "suspended";
              return (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{u.full_name || u.email}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{u.role ?? "—"}</Badge>
                  <Badge variant={u.status === "approved" ? "default" : suspended ? "destructive" : "outline"} className="text-[10px]">
                    {u.status}
                  </Badge>
                  <Button size="sm" variant="outline" className="gap-1.5"
                    onClick={() => setUserStatus.mutate({ id: u.id, status: suspended ? "approved" : "suspended" })}>
                    {suspended ? <RefreshCw className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                    {suspended ? "คืนสิทธิ์" : "ระงับ"}
                  </Button>
                </div>
              );
            })}
            {users.data?.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีผู้ใช้</p>}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <p className={`text-2xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
