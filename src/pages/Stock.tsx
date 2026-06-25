import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStockLookup } from "@/hooks/useStockLookup";
import { Search, CircleDot } from "lucide-react";

const baht = (n: number) => "฿" + (n ?? 0).toLocaleString("en-US");

function Mini({ label, value, tone }: { label: string; value: string | number; tone?: "amber" | "default" }) {
  return (
    <div className="text-right">
      <div className={`text-lg font-extrabold tabular-nums ${tone === "amber" ? "text-amber-600" : ""}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

export default function Stock() {
  const [search, setSearch] = useState("");
  const { data: items = [], isLoading } = useStockLookup(search);

  const totalUnits = items.reduce((a, i) => a + (i.quantity ?? 0), 0);
  const lowCount = items.filter((i) => i.quantity <= i.min_threshold).length;

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
        {/* Page head */}
        <div className="flex items-end justify-between gap-4 flex-wrap pt-2">
          <div>
            <h1 className="text-2xl md:text-[26px] font-extrabold tracking-tight flex items-center gap-2">
              <CircleDot className="w-6 h-6 text-primary" /> สต็อกยาง
            </h1>
            <p className="text-sm text-muted-foreground mt-1">ยางคงเหลือในร้าน — ค้นหาและตรวจสอบจำนวน</p>
          </div>
          <div className="flex items-center gap-6">
            <Mini label="SKU ทั้งหมด" value={items.length} />
            <Mini label="เส้นคงเหลือ" value={totalUnits} />
            <Mini label="สต็อกต่ำ" value={lowCount} tone="amber" />
          </div>
        </div>

        {/* Card: search + table */}
        <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 bg-secondary/60 border-border rounded-xl"
                placeholder="ค้นหา เช่น Bridgestone, 195/65R15"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["ยาง", "ขนาด", "ราคาขาย", "สถานะ", "คงเหลือ"].map((h, i) => (
                    <th key={h} className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${i >= 2 ? "text-right" : "text-left"} ${i === 1 ? "hidden md:table-cell" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => {
                  const st = item.quantity === 0 ? "out" : item.quantity <= item.min_threshold ? "low" : "ok";
                  return (
                    <tr key={item.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold">{item.brand} {item.model}</p>
                        <p className="text-xs text-muted-foreground md:hidden tabular-nums">{item.size}</p>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground tabular-nums hidden md:table-cell">{item.size}</td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{baht(item.sell_price)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Badge
                          variant="outline"
                          className={
                            st === "out" ? "border-transparent bg-rose-500/10 text-rose-600"
                            : st === "low" ? "border-transparent bg-amber-500/10 text-amber-600"
                            : "border-transparent bg-emerald-500/10 text-emerald-600"
                          }
                        >
                          {st === "out" ? "หมด" : st === "low" ? "ใกล้หมด" : "พอขาย"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold tabular-nums">
                        <span className={st === "out" ? "text-rose-600" : st === "low" ? "text-amber-600" : ""}>{item.quantity}</span>
                      </td>
                    </tr>
                  );
                })}
                {isLoading && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">กำลังโหลด...</td></tr>
                )}
                {!isLoading && items.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">ไม่พบยาง</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
