import { useNavigate } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { InstallAppButton } from "@/components/InstallAppButton";
import {
  ShoppingCart, BarChart3, Users, CheckCircle2, ArrowRight, Shield,
  Layers, Network, MessageCircle, TrendingUp, Trophy, Lock, Zap, Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const tints: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600",
  violet: "bg-violet-500/10 text-violet-600",
  sky: "bg-sky-500/10 text-sky-600",
  amber: "bg-amber-500/10 text-amber-600",
  rose: "bg-rose-500/10 text-rose-600",
};

const features: { icon: LucideIcon; title: string; desc: string; tint: string; badge?: string }[] = [
  { icon: ShoppingCart, title: "POS ขายยาง", desc: "บันทึกการขายภายใน 10 วินาที ตัดสต็อกอัตโนมัติ รองรับบริการเสริมและค่าแรง", tint: "primary" },
  { icon: Layers, title: "สต็อกแบบ DOT", desc: "ติดตามยางตามรหัส DOT สูงสุด 4 ล็อตต่อรุ่น เหมือนชีตที่คุณใช้อยู่ — แม่นยำทุกเส้น", tint: "violet", badge: "ใหม่" },
  { icon: BarChart3, title: "การเงิน & กำไร", desc: "งบกำไรขาดทุนรายวัน ต้นทุนเฉลี่ยถ่วงน้ำหนัก เห็นกำไรจริงทุกบิล", tint: "emerald" },
  { icon: Users, title: "CRM ลูกค้า", desc: "ฐานข้อมูลลูกค้า ประวัติรถ ทะเบียน ยอดซื้อสะสม และกลุ่มลูกค้า VIP", tint: "sky" },
  { icon: Network, title: "เครือข่ายหลายสาขา", desc: "เชื่อมร้านพันธมิตร แชร์สต็อกเฉพาะที่อนุญาต ปิดข้อมูลคู่แข่งด้วย RLS", tint: "amber" },
  { icon: MessageCircle, title: "เชื่อมต่อ LINE OA", desc: "แจ้งเตือนและตอบลูกค้าผ่าน LINE Official Account ได้ทันที", tint: "rose" },
];

const steps = [
  { n: "1", title: "ตั้งค่าร้าน", desc: "สร้างร้าน เพิ่มพนักงาน กำหนดสิทธิ์การเข้าถึงข้อมูล" },
  { n: "2", title: "นำเข้าสต็อก", desc: "เพิ่มยางพร้อมรหัส DOT — รองรับสูงสุด 4 ล็อตต่อรุ่น" },
  { n: "3", title: "ขายและติดตาม", desc: "บันทึกการขาย ดูการเงิน CRM และรายงานแบบเรียลไทม์" },
];

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-br from-primary to-violet-500 bg-clip-text text-transparent tabular-nums">{value}</div>
      <div className="text-[11px] md:text-xs text-muted-foreground font-medium mt-1">{label}</div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-background/70 backdrop-blur-md border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-soft">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="leading-none">
              <div className="font-extrabold text-lg tracking-tight">BAANAKE</div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Tire Business Suite</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <span className="hidden sm:inline-flex"><InstallAppButton /></span>
            <button onClick={() => navigate("/auth")}
              className="hidden sm:inline-flex rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary transition">
              เข้าสู่ระบบ
            </button>
            <button onClick={() => navigate("/auth?mode=store")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow-soft hover:opacity-90 transition">
              เริ่มใช้งาน <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative">
        <div className="absolute inset-0 -z-10" style={{ background: "radial-gradient(900px 420px at 75% -5%, hsl(221 83% 53% / 0.12), transparent 60%), radial-gradient(700px 360px at 10% 10%, hsl(262 83% 58% / 0.08), transparent 55%)" }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 md:pt-20 pb-12 grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* left */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 mb-5">
              <Star className="w-3.5 h-3.5" /> ระบบจัดการร้านยางครบวงจร
            </span>
            <h1 className="text-[2.1rem] sm:text-5xl font-extrabold tracking-tight leading-[1.07] mb-5">
              บริหารร้านยาง<br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">ทั้งระบบในที่เดียว</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
              POS · สต็อกแบบ DOT · การเงิน · CRM · เครือข่ายหลายสาขา — ออกแบบมาเพื่อร้านยางไทยโดยเฉพาะ พร้อมเชื่อมต่อ LINE OA
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
              <button onClick={() => navigate("/auth?mode=store")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3.5 text-sm font-bold shadow-soft hover:opacity-90 transition">
                เริ่มใช้งานฟรี <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => navigate("/auth")}
                className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-bold hover:bg-secondary transition">
                เข้าสู่ระบบ
              </button>
            </div>
            <div className="flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2">
              {["ใช้งานง่าย ไม่ต้องอบรม", "ข้อมูลปลอดภัยด้วย RLS", "รองรับหลายสาขา"].map((h) => (
                <div key={h} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> {h}
                </div>
              ))}
            </div>
          </div>

          {/* right — product preview mockup */}
          <div className="relative">
            <div className="rounded-3xl border border-border bg-card shadow-soft-lg p-4 sm:p-5 rotate-[0.5deg]">
              <div className="flex items-center gap-2 mb-4 px-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 text-[11px] text-muted-foreground font-medium">แดชบอร์ดร้าน · วันนี้</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  { icon: TrendingUp, label: "รายได้เดือนนี้", value: "฿1,108,000", tint: "primary", up: "+12%" },
                  { icon: Trophy, label: "กำไรขั้นต้น", value: "฿338,000", tint: "emerald", up: "+8%" },
                ].map((k) => (
                  <div key={k.label} className="rounded-2xl border border-border bg-background/60 p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${tints[k.tint]}`}><k.icon className="w-4 h-4" /></span>
                      <span className="text-[10px] font-bold text-emerald-600">{k.up}</span>
                    </div>
                    <div className="text-lg font-extrabold tabular-nums">{k.value}</div>
                    <div className="text-[10px] text-muted-foreground">{k.label}</div>
                    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className={`w-full h-5 mt-2 ${k.tint === "emerald" ? "text-emerald-500" : "text-primary"}`}>
                      <path d="M0 18 L15 14 L30 16 L45 9 L60 11 L75 5 L100 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold">สต็อก DOT</span>
                  <span className="text-[10px] text-muted-foreground">4 ล็อต/รุ่น</span>
                </div>
                {[
                  { s: "185/65R15", b: "Michelin XM2+", dots: ["1426", "0726"], q: "12" },
                  { s: "195/55R16", b: "BFGoodrich", dots: ["1526"], q: "6" },
                ].map((r) => (
                  <div key={r.s} className="flex items-center gap-2 py-1.5 text-xs border-t border-border/60 first:border-0">
                    <span className="font-mono font-semibold w-20 shrink-0">{r.s}</span>
                    <span className="text-muted-foreground flex-1 truncate">{r.b}</span>
                    <span className="flex gap-1">{r.dots.map((d) => <span key={d} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{d}</span>)}</span>
                    <span className="font-bold tabular-nums w-8 text-right">{r.q}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 rounded-2xl border border-border bg-card shadow-soft px-4 py-2.5 flex items-center gap-2 hidden sm:flex">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><Zap className="w-4 h-4" /></span>
              <div><div className="text-xs font-bold leading-none">ขายเสร็จใน 10 วิ</div><div className="text-[10px] text-muted-foreground mt-0.5">ตัดสต็อกอัตโนมัติ</div></div>
            </div>
          </div>
        </div>

        {/* stats band */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
          <div className="rounded-2xl border border-border bg-card shadow-soft grid grid-cols-2 md:grid-cols-4 gap-6 px-6 py-6">
            <Stat value="10 วิ" label="ต่อการบันทึกขาย" />
            <Stat value="4 DOT" label="ต่อรุ่นยาง" />
            <Stat value="Real-time" label="อัปเดตสต็อก" />
            <Stat value="หลายสาขา" label="เครือข่ายร้านค้า" />
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">ทุกอย่างที่ร้านยางต้องใช้</h2>
          <p className="text-muted-foreground mt-2">เครื่องมือครบชุดในระบบเดียว — ไม่ต้องสลับหลายแอป</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-lg">
              <div className="flex items-center justify-between mb-4">
                <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${tints[f.tint]}`}><f.icon className="w-5 h-5" /></span>
                {f.badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600">{f.badge}</span>}
              </div>
              <h3 className="font-bold mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-secondary/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">เริ่มต้นใน 3 ขั้นตอน</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {steps.map((s, i) => (
              <div key={s.n} className="relative rounded-2xl border border-border bg-card p-6 shadow-soft">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white flex items-center justify-center font-extrabold mb-4">{s.n}</span>
                <h3 className="font-bold mb-1.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                {i < steps.length - 1 && <ArrowRight className="hidden md:block absolute top-1/2 -right-3 w-5 h-5 text-muted-foreground/40" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security highlight ──────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="rounded-3xl border border-border bg-card shadow-soft overflow-hidden grid md:grid-cols-[1.2fr_1fr]">
          <div className="p-8 md:p-10">
            <span className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5"><Lock className="w-6 h-6" /></span>
            <h2 className="text-2xl font-extrabold tracking-tight mb-3">ข้อมูลของคุณ ปลอดภัยและเป็นส่วนตัว</h2>
            <p className="text-muted-foreground leading-relaxed mb-5">
              ทุกร้านแยกข้อมูลออกจากกันด้วย Row-Level Security ระดับฐานข้อมูล — เจ้าของและพนักงานเห็นข้อมูลตามสิทธิ์ที่กำหนด และไม่มีใครเห็นข้อมูลของร้านอื่น
            </p>
            <div className="space-y-2.5">
              {["แยกข้อมูลแต่ละร้านด้วย RLS", "สิทธิ์เจ้าของ / พนักงาน แยกการมองเห็นต้นทุน", "เครือข่ายแชร์สต็อกเฉพาะที่อนุญาตเท่านั้น"].map((t) => (
                <div key={t} className="flex items-center gap-2.5 text-sm font-medium"><CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" /> {t}</div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-primary/10 via-violet-500/5 to-transparent p-8 md:p-10 flex items-center justify-center border-t md:border-t-0 md:border-l border-border">
            <Shield className="w-28 h-28 text-primary/30" strokeWidth={1.25} />
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-16">
        <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-primary to-violet-600 text-white px-8 py-14 text-center shadow-soft-lg">
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-3">พร้อมยกระดับร้านยางของคุณแล้วหรือยัง?</h2>
          <p className="text-white/85 mb-8 max-w-xl mx-auto">เริ่มใช้งานฟรีวันนี้ — สร้างร้านแรกของคุณได้ในไม่กี่นาที</p>
          <button onClick={() => navigate("/auth?mode=store")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-primary px-7 py-3.5 text-sm font-bold hover:bg-white/90 transition shadow-lg">
            เริ่มใช้งานฟรี <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center"><Trophy className="w-4 h-4 text-white" /></div>
            <span className="font-extrabold tracking-tight">BAANAKE</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} BAANAKE · ระบบจัดการร้านยางครบวงจร</p>
        </div>
      </footer>
    </div>
  );
}
