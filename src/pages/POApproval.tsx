import { useState } from "react";
import { usePurchaseOrders, useApprovePO, PurchaseOrder } from "@/hooks/usePurchaseOrders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckSquare, Check, X, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  received: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

function POCard({ po }: { po: PurchaseOrder }) {
  const { mutate: approve, isPending } = useApprovePO();

  return (
    <div className="rounded-lg border border-border p-4 bg-card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{po.tire_name}</p>
          {po.supplier && <p className="text-sm text-muted-foreground">ซัพพลายเออร์: {po.supplier}</p>}
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[po.status]}`}>
          {po.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">จำนวน</p>
          <p className="font-medium">{po.qty_requested} เส้น</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">ราคาต่อเส้น</p>
          <p className="font-medium">{po.unit_cost ? `฿${po.unit_cost.toLocaleString()}` : "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">รวม</p>
          <p className="font-medium">{po.total_cost ? `฿${po.total_cost.toLocaleString()}` : "—"}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {po.agent && <Badge variant="secondary" className="mr-2 text-[10px]">{po.agent}</Badge>}
          {formatDistanceToNow(new Date(po.created_at), { addSuffix: true, locale: th })}
        </p>
        {po.status === "pending" && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => approve({ id: po.id, action: "rejected" })}
              disabled={isPending}
            >
              <X className="w-3.5 h-3.5 mr-1" /> ปฏิเสธ
            </Button>
            <Button
              size="sm"
              onClick={() => approve({ id: po.id, action: "approved" })}
              disabled={isPending}
            >
              <Check className="w-3.5 h-3.5 mr-1" /> อนุมัติ
            </Button>
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
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 md:px-6 py-4 flex items-center gap-3">
        <CheckSquare className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">อนุมัติสั่งซื้อ</h1>
        {pendingCount > 0 && (
          <Badge className="ml-auto">{pendingCount} รออนุมัติ</Badge>
        )}
      </header>

      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="pending" className="flex-1">รออนุมัติ</TabsTrigger>
            <TabsTrigger value="approved" className="flex-1">อนุมัติแล้ว</TabsTrigger>
            <TabsTrigger value="all" className="flex-1">ทั้งหมด</TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            {isLoading && <p className="text-center text-muted-foreground py-8">กำลังโหลด...</p>}
            {!isLoading && pos.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>ไม่มีใบสั่งซื้อ</p>
              </div>
            )}
            <div className="space-y-3">
              {pos.map((po) => <POCard key={po.id} po={po} />)}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
