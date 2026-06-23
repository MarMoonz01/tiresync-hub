import { useState } from "react";
import { usePurchaseOrders, useApprovePO, PurchaseOrder } from "@/hooks/usePurchaseOrders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckSquare, Check, X, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

const baht = (n: number | null | undefined) => (n ? "฿" + n.toLocaleString("en-US") : "—");

const statusTone: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600",
  approved: "bg-emerald-500/10 text-emerald-600",
  rejected: "bg-rose-500/10 text-rose-600",
  received: "bg-primary/10 text-primary",
};

function POCard({ po }: { po: PurchaseOrder }) {
  const { mutate: approve, isPending } = useApprovePO();
  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-secondary text-muted-foreground flex items-center justify-center shrink-0"><Package className="w-5 h-5" /></span>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{po.tire_name}</p>
          {po.supplier && <p className="text-sm text-muted-foreground">ซัพพลายเออร์: {po.supplier}</p>}
        </div>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${statusTone[po.status]}`}>{po.status}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div><p className="text-[11px] text-muted-foreground">จำนวน</p><p className="font-bold tabular-nums">{po.qty_requested} เส้น</p></div>
        <div><p className="text-[11px] text-muted-foreground">ราคาต่อเส้น</p><p className="font-bold tabular-nums">{baht(po.unit_cost)}</p></div>
        <div><p className="text-[11px] text-muted-foreground">รวม</p><p className="font-bold tabular-nums">{baht(po.total_cost)}</p></div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          {po.agent && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{po.agent}</span>}
          {formatDistanceToNow(new Date(po.created_at), { addSuffix: true, locale: th })}
        </p>
        {po.status === "pending" && (
          <div className="flex gap-2">
            <button onClick={() => approve({ id: po.id, action: "rejected" })} disabled={isPending}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition disabled:opacity-50">
              <X className="w-3.5 h-3.5" /> ปฏิเสธ
            </button>
            <button onClick={() => approve({ id: po.id, action: "approved" })} disabled={isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold hover:opacity-90 transition disabled:opacity-50">
              <Check className="w-3.5 h-3.5" /> อนุมัติ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function POApprovalPage() {
  const [tab, setTab] = useState("pending");
  const { data: pos = [], isLoading } = usePurchaseOrders(tab !== "all" ? tab : undefined);
  const pendingCount = pos.filter((p) => p.status === "pending").length;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-end justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl md:text-[26px] font-extrabold tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-primary" /> อนุมัติสั่งซื้อ
          </h1>
          <p className="text-sm text-muted-foreground mt-1">ใบสั่งซื้อจาก AI และพนักงาน</p>
        </div>
        {pendingCount > 0 && (
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600">{pendingCount} รออนุมัติ</span>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-3 rounded-xl">
          <TabsTrigger value="pending" className="rounded-lg">รออนุมัติ</TabsTrigger>
          <TabsTrigger value="approved" className="rounded-lg">อนุมัติแล้ว</TabsTrigger>
          <TabsTrigger value="all" className="rounded-lg">ทั้งหมด</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-5">
          {isLoading && <p className="text-center text-muted-foreground py-8">กำลังโหลด...</p>}
          {!isLoading && pos.length === 0 && (
            <div className="text-center py-16 text-muted-foreground rounded-2xl border border-dashed border-border">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-semibold">ไม่มีใบสั่งซื้อ</p>
            </div>
          )}
          <div className="space-y-3">{pos.map((po) => <POCard key={po.id} po={po} />)}</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
