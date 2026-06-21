import { useState } from "react";
import { useCustomers } from "@/hooks/useCustomers";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Phone, Car } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

const segmentColors: Record<string, string> = {
  VIP: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  Regular: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function Customers() {
  const [search, setSearch] = useState("");
  const { data: customers = [], isLoading } = useCustomers(search);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 md:px-6 py-4 flex items-center gap-3">
        <Users className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">ลูกค้า</h1>
        <Badge variant="secondary" className="ml-auto">{customers.length}</Badge>
      </header>

      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="ค้นหาชื่อ, เบอร์โทร, ทะเบียน"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading && <p className="text-center text-muted-foreground py-8">กำลังโหลด...</p>}

        <div className="space-y-3">
          {customers.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {c.phone && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </span>
                    )}
                    {c.plate_number && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Car className="w-3 h-3" /> {c.plate_number}
                      </span>
                    )}
                  </div>
                </div>
                {c.segment && (
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${segmentColors[c.segment] ?? "bg-muted text-muted-foreground"}`}>
                    {c.segment}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">ยอดซื้อรวม</p>
                  <p className="font-semibold text-primary">฿{c.total_spend.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">เข้ามาแล้ว</p>
                  <p className="font-medium">{c.visit_count} ครั้ง</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ล่าสุด</p>
                  <p className="font-medium text-xs">
                    {c.last_visit
                      ? formatDistanceToNow(new Date(c.last_visit), { addSuffix: true, locale: th })
                      : "—"}
                  </p>
                </div>
              </div>

              {(c.car_model || c.preferred_brand) && (
                <div className="flex gap-2 flex-wrap">
                  {c.car_model && <Badge variant="outline" className="text-xs">{c.car_model}</Badge>}
                  {c.preferred_brand && <Badge variant="secondary" className="text-xs">{c.preferred_brand}</Badge>}
                </div>
              )}
            </div>
          ))}

          {!isLoading && customers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>ยังไม่มีลูกค้า</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
