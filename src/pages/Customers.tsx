import { useState } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { Input } from "@/components/ui/input";
import { Search, Users, Phone, CircleDot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th as thLocale } from "date-fns/locale";

const baht = (n: number) => "฿" + (n ?? 0).toLocaleString("en-US");
const initials = (name: string) => (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const segTone: Record<string, { badge: string; ring: string }> = {
  VIP: { badge: "bg-violet-500/10 text-violet-600", ring: "from-violet-500 to-fuchsia-500" },
  Regular: { badge: "bg-primary/10 text-primary", ring: "from-primary to-sky-500" },
  "At-risk": { badge: "bg-rose-500/10 text-rose-600", ring: "from-rose-500 to-orange-500" },
};

export default function Customers() {
  const [search, setSearch] = useState("");
  const [seg, setSeg] = useState("all");
  const { data: customers = [], isLoading } = useCustomers(search);

  const segments = [...new Set(customers.map((c) => c.segment).filter(Boolean))] as string[];
  const rows = seg === "all" ? customers : customers.filter((c) => c.segment === seg);

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-end justify-between gap-4 flex-wrap pt-2">
          <div>
            <h1 className="text-2xl md:text-[26px] font-extrabold tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> ลูกค้า
            </h1>
            <p className="text-sm text-muted-foreground mt-1">ฐานข้อมูลลูกค้า · IRIS &amp; RADAR</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-extrabold tabular-nums">{customers.length}</div>
            <div className="text-[11px] text-muted-foreground">รายชื่อ</div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 rounded-xl bg-secondary/60" placeholder="ค้นหาชื่อ, เบอร์โทร, ทะเบียน"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {segments.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {["all", ...segments].map((s) => (
              <button key={s} onClick={() => setSeg(s)}
                className={`text-sm font-semibold px-3.5 py-1.5 rounded-xl border transition ${seg === s ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-secondary"}`}>
                {s === "all" ? "ทั้งหมด" : s}
                <span className="ml-1.5 opacity-60 tabular-nums">{s === "all" ? customers.length : customers.filter((c) => c.segment === s).length}</span>
              </button>
            ))}
          </div>
        )}

        {isLoading && <p className="text-center text-muted-foreground py-8">กำลังโหลด...</p>}

        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {rows.map((c) => {
            const tone = segTone[c.segment ?? ""] ?? { badge: "bg-secondary text-muted-foreground", ring: "from-slate-400 to-slate-500" };
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${tone.ring} text-white flex items-center justify-center font-bold text-sm shrink-0`}>
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">{c.name}</p>
                    {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</p>}
                  </div>
                  {c.segment && <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${tone.badge}`}>{c.segment}</span>}
                </div>

                <div className="flex justify-between border-t border-border pt-3">
                  <div><div className="font-extrabold text-base tabular-nums">{baht(c.total_spend)}</div><div className="text-[10px] text-muted-foreground">ยอดสะสม</div></div>
                  <div className="text-center"><div className="font-extrabold text-base tabular-nums">{c.visit_count}</div><div className="text-[10px] text-muted-foreground">ครั้ง</div></div>
                  <div className="text-right"><div className="font-bold text-xs">{c.last_visit ? formatDistanceToNow(new Date(c.last_visit), { addSuffix: true, locale: thLocale }) : "—"}</div><div className="text-[10px] text-muted-foreground">ล่าสุด</div></div>
                </div>

                {(c.car_model || c.plate_number) && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-3 mt-3 border-t border-border">
                    <CircleDot className="w-3.5 h-3.5" /> {c.car_model || "—"}{c.plate_number ? ` · ${c.plate_number}` : ""}
                  </div>
                )}
              </div>
            );
          })}

          {!isLoading && rows.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>ยังไม่มีลูกค้า</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
