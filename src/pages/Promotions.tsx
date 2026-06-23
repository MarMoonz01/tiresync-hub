import { useState } from "react";
import { usePromotions, useApprovePromotion, usePublishPromotion } from "@/hooks/usePromotions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Check, X, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

const statusTone: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  pending_approval: "bg-amber-500/10 text-amber-600",
  approved: "bg-emerald-500/10 text-emerald-600",
  published: "bg-primary/10 text-primary",
  rejected: "bg-rose-500/10 text-rose-600",
};

export default function Promotions() {
  const [tab, setTab] = useState("pending_approval");
  const { data: promotions = [], isLoading } = usePromotions(tab !== "all" ? tab : undefined);
  const { mutate: approve, isPending: approving } = useApprovePromotion();
  const { mutate: publish, isPending: publishing } = usePublishPromotion();

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div className="pt-2">
        <h1 className="text-2xl md:text-[26px] font-extrabold tracking-tight flex items-center gap-2">
          <Star className="w-6 h-6 text-primary" /> โปรโมชัน
        </h1>
        <p className="text-sm text-muted-foreground mt-1">จัดการแคมเปญและส่วนลด</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-3 rounded-xl">
          <TabsTrigger value="pending_approval" className="rounded-lg">รออนุมัติ</TabsTrigger>
          <TabsTrigger value="approved" className="rounded-lg">อนุมัติแล้ว</TabsTrigger>
          <TabsTrigger value="all" className="rounded-lg">ทั้งหมด</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-5">
          {isLoading && <p className="text-center text-muted-foreground py-8">กำลังโหลด...</p>}
          {!isLoading && promotions.length === 0 && (
            <div className="text-center py-16 text-muted-foreground rounded-2xl border border-dashed border-border">
              <Star className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-semibold">ไม่มีโปรโมชัน</p>
            </div>
          )}
          <div className="space-y-3">
            {promotions.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-card shadow-soft p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{p.title}</p>
                    {p.body_text && <p className="text-sm text-muted-foreground mt-1">{p.body_text}</p>}
                  </div>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusTone[p.status] ?? "bg-secondary text-muted-foreground"}`}>{p.status}</span>
                </div>

                {(p.facebook_copy || p.line_copy) && (
                  <div className="space-y-2">
                    {p.facebook_copy && (
                      <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs">
                        <p className="font-bold text-primary mb-1">Facebook</p><p>{p.facebook_copy}</p>
                      </div>
                    )}
                    {p.line_copy && (
                      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3 text-xs">
                        <p className="font-bold text-emerald-600 mb-1">LINE</p><p>{p.line_copy}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.agent && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{p.agent}</span>}
                    {p.discount_pct && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600">-{p.discount_pct}%</span>}
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: th })}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {p.status === "pending_approval" && (
                      <>
                        <Button size="sm" variant="outline" className="rounded-lg text-rose-600 border-rose-200" onClick={() => approve({ id: p.id, action: "rejected" })} disabled={approving}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" className="rounded-lg" onClick={() => approve({ id: p.id, action: "approved" })} disabled={approving}>
                          <Check className="w-3.5 h-3.5 mr-1" /> อนุมัติ
                        </Button>
                      </>
                    )}
                    {p.status === "approved" && (
                      <Button size="sm" className="rounded-lg" onClick={() => publish(p.id)} disabled={publishing}>
                        <Send className="w-3.5 h-3.5 mr-1" /> เผยแพร่
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
