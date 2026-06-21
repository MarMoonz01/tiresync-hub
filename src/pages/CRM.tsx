import { useState } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, DollarSign, Crown, Users } from "lucide-react";

export default function CRM() {
  const [search, setSearch] = useState("");
  const { data: customers = [], isLoading } = useCustomers(search);

  const vip = customers.filter((c) => c.segment === "VIP");
  const regular = customers.filter((c) => c.segment !== "VIP");
  const totalRevenue = customers.reduce((s, c) => s + c.total_spend, 0);

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 md:px-6 py-4 flex items-center gap-3">
        <DollarSign className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">CRM — ลูกค้าสัมพันธ์</h1>
      </header>

      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Crown className="w-3 h-3 text-purple-500" /> VIP</p>
            <p className="text-2xl font-bold mt-1 text-purple-600">{vip.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> ลูกค้าทั้งหมด</p>
            <p className="text-2xl font-bold mt-1">{customers.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">ยอดขายสะสม</p>
            <p className="text-xl font-bold mt-1 text-emerald-600">฿{totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="ค้นหาชื่อ, เบอร์โทร, ทะเบียน"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">ชื่อ</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">ทะเบียน</th>
                <th className="text-right px-4 py-3 font-medium">ยอดซื้อ</th>
                <th className="text-right px-4 py-3 font-medium">ครั้ง</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Segment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">กำลังโหลด...</td></tr>
              )}
              {customers.map((c) => (
                <tr key={c.id} className={c.segment === "VIP" ? "bg-purple-50/30 dark:bg-purple-900/10" : ""}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.name}</p>
                    {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.plate_number ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-primary">฿{c.total_spend.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{c.visit_count}</td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    {c.segment && (
                      <Badge variant={c.segment === "VIP" ? "default" : "secondary"} className="text-xs">
                        {c.segment}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoading && customers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">ไม่พบลูกค้า</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
