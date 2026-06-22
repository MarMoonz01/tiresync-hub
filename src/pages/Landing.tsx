import { useNavigate } from "react-router-dom";
import {
  ShoppingCart, BarChart3, Users, Brain, CheckCircle2, ArrowRight,
  Shield, Bell, CircleDot, Sparkles, Network,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const features: { icon: LucideIcon; title: string; desc: string; tint: string }[] = [
  { icon: ShoppingCart, title: "POS ขายยาง", desc: "บันทึกการขาย ตัดสต็อกอัตโนมัติ รองรับบริการเสริม", tint: "primary" },
  { icon: BarChart3, title: "ข้อมูลการเงิน", desc: "P&L รายวัน กำไร/ขาดทุน ต้นทุนเฉลี่ยแบบถ่วงน้ำหนัก", tint: "emerald" },
  { icon: Users, title: "CRM ลูกค้า", desc: "ติดตามลูกค้า VIP ประวัติรถ ทะเบียน ยอดซื้อสะสม", tint: "violet" },
  { icon: Network, title: "เครือข่ายร้านค้า", desc: "เชื่อมต่อร้านพันธมิตร แชร์สต็อกเฉพาะที่อนุญาต", tint: "sky" },
  { icon: Bell, title: "แจ้งเตือนอัจฉริยะ", desc: "สต็อกต่ำ ใบสั่งซื้ออัตโนมัติ แจ้งเตือนผ่าน LINE", tint: "amber" },
  { icon: Shield, title: "ระบบสิทธิ์", desc: "Owner / Staff แยกการมองเห็นข้อมูลด้วย RLS", tint: "rose" },
];

const tints: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600",
  violet: "bg-violet-500/10 text-violet-600",
  sky: "bg-sky-500/10 text-sky-600",
  amber: "bg-amber-500/10 text-amber-600",
  rose: "bg-rose-500/10 text-rose-600",
};

const highlights = [
  "บันทึกการขายภายใน 10 วินาที",
  "สต็อกอัพเดทแบบ real-time",
  "เครือข่ายหลายร้าน",
  "เชื่อมต่อ LINE OA",
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/70 backdrop-blur border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-soft">
              <CircleDot className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight">BAANAKE</span>
          </div>
          <button
            onClick={() => navigate("/auth")}
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary transition"
          >
            เข้าสู่ระบบ
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-16 pb-10 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 mb-5">
          <Sparkles className="w-3.5 h-3.5" /> AI-Powered Tire Retail System
        </span>
        <h1 className="text-4xl md:text-[3.25rem] font-extrabold tracking-tight leading-[1.08] mb-4">
          ระบบจัดการร้านยาง<br />
          <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">ขับเคลื่อนด้วย AI</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8 leading-relaxed">
          POS · สต็อก · การเงิน · CRM · เครือข่ายร้านค้า — ครบในระบบเดียว เชื่อมต่อ LINE OA ได้ทันที
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-9">
          <button
            onClick={() => navigate("/auth?mode=store")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold shadow-soft hover:opacity-90 transition"
          >
            เริ่มใช้งานฟรี <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate("/auth")}
            className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold hover:bg-secondary transition"
          >
            เข้าสู่ระบบ
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {highlights.map((h) => (
            <div key={h} className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> {h}
            </div>
          ))}
        </div>
      </section>

      {/* AI agents highlight */}
      <section className="max-w-5xl mx-auto px-4 pb-4">
        <div className="rounded-2xl border border-border bg-card shadow-soft p-6 md:p-7 flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
          <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-white flex items-center justify-center shrink-0 shadow-soft">
            <Brain className="w-7 h-7" />
          </span>
          <div className="flex-1">
            <h2 className="text-xl font-extrabold tracking-tight">AI agents ทำงานเบื้องหลัง 24 ชม.</h2>
            <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
              ORACLE วิเคราะห์ยอดขาย · SPARK สร้างโปรโมชัน · HAWK เฝ้าสต็อกและสั่งซื้อ — อัตโนมัติทุกวัน
            </p>
          </div>
          <div className="text-center shrink-0">
            <div className="text-3xl font-extrabold text-primary tabular-nums">19</div>
            <div className="text-[11px] text-muted-foreground font-medium">agents / ร้าน</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-lg">
              <span className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${tints[f.tint]}`}>
                <f.icon className="w-5 h-5" />
              </span>
              <h3 className="font-bold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60">
        <div className="max-w-3xl mx-auto px-4 py-14 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3">พร้อมเริ่มใช้งานแล้วหรือยัง?</h2>
          <p className="text-muted-foreground mb-7">สมัครฟรี สร้างร้านแรกได้เลย — มีรหัสเชิญจากแอดมิน</p>
          <button
            onClick={() => navigate("/auth?mode=store")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-7 py-3.5 text-sm font-semibold shadow-soft hover:opacity-90 transition"
          >
            สมัครและสร้างร้านค้า <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} BAANAKE · Tire Retail & AI Platform
      </footer>
    </div>
  );
}
