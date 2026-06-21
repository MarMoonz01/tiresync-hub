import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart, BarChart3, Users, Brain,
  CheckCircle2, ArrowRight, Zap, Shield, Bell
} from "lucide-react";

const features = [
  { icon: ShoppingCart, title: "POS ขายยาง", desc: "บันทึกการขาย ตัดสต็อกอัตโนมัติ รองรับบริการเสริม", color: "text-blue-500" },
  { icon: BarChart3, title: "ข้อมูลการเงิน", desc: "P&L รายวัน กำไร/ขาดทุน ต้นทุนเฉลี่ยแบบถ่วงน้ำหนัก", color: "text-emerald-500" },
  { icon: Users, title: "CRM ลูกค้า", desc: "ติดตามลูกค้า VIP ประวัติรถ ทะเบียน ยอดซื้อสะสม", color: "text-purple-500" },
  { icon: Bell, title: "แจ้งเตือนอัจฉริยะ", desc: "สต็อกต่ำ ใบสั่งซื้ออัตโนมัติ แจ้งเตือนผ่าน LINE", color: "text-orange-500" },
  { icon: Brain, title: "AI Agents", desc: "ORACLE วิเคราะห์ยอดขาย SPARK สร้างโปรโมชัน", color: "text-pink-500" },
  { icon: Shield, title: "ระบบสิทธิ์", desc: "Owner / Staff / Interbranch แยกการมองเห็นข้อมูล", color: "text-slate-500" },
];

const highlights = [
  "บันทึกการขายภายใน 10 วินาที",
  "สต็อกอัพเดทแบบ real-time",
  "รองรับหลายสาขา",
  "เชื่อมต่อ LINE OA",
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">TireHub</span>
          </div>
          <Button size="sm" onClick={() => navigate("/auth")}>
            เข้าสู่ระบบ
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
        <Badge variant="secondary" className="mb-4 text-xs">
          AI-Powered Tire Retail System
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
          ระบบจัดการร้านยาง<br />
          <span className="text-primary">ขับเคลื่อนด้วย AI</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
          POS · สต็อก · การเงิน · CRM · ใบสั่งซื้อ · โปรโมชัน<br />
          ครบในระบบเดียว เชื่อมต่อ LINE OA ได้ทันที
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Button size="lg" onClick={() => navigate("/auth?mode=store")} className="gap-2">
            เริ่มใช้งานฟรี <ArrowRight className="w-4 h-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
            เข้าสู่ระบบ
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {highlights.map((h) => (
            <div key={h} className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              {h}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-5 hover:shadow-sm transition-shadow"
            >
              <f.icon className={`w-8 h-8 mb-3 ${f.color}`} />
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold mb-3">พร้อมเริ่มใช้งานแล้วหรือยัง?</h2>
          <p className="text-muted-foreground mb-6">สมัครฟรี สร้างร้านแรกได้เลย</p>
          <Button size="lg" onClick={() => navigate("/auth?mode=store")} className="gap-2">
            สมัครและสร้างร้านค้า <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
