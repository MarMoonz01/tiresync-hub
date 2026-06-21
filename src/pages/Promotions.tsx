import { useState } from "react";
import { usePromotions, useApprovePromotion, useGenerateContent, usePublishPromotion } from "@/hooks/usePromotions";
import { useRunSpark } from "@/hooks/useIntelligenceReports";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Sparkles, Check, X, Eye, Send, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  published: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
};

export default function Promotions() {
  const [tab, setTab] = useState("pending_approval");
  const { data: promotions = [], isLoading } = usePromotions(tab !== "all" ? tab : undefined);
  const { mutate: approve, isPending: approving } = useApprovePromotion();
  const { mutate: genContent, isPending: generating } = useGenerateContent();
  const { mutate: publish, isPending: publishing } = usePublishPromotion();
  const { mutate: runSpark, isPending: sparkPending } = useRunSpark();

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 md:px-6 py-4 flex items-center gap-3">
        <Star className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">โปรโมชัน</h1>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => runSpark()} disabled={sparkPending}>
          {sparkPending ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
          SPARK
        </Button>
      </header>

      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="pending_approval" className="flex-1">รออนุมัติ</TabsTrigger>
            <TabsTrigger value="approved" className="flex-1">อนุมัติแล้ว</TabsTrigger>
            <TabsTrigger value="all" className="flex-1">ทั้งหมด</TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            {isLoading && <p className="text-center text-muted-foreground py-8">กำลังโหลด...</p>}
            {!isLoading && promotions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>ไม่มีโปรโมชัน</p>
              </div>
            )}
            <div className="space-y-3">
              {promotions.map((p) => (
                <div key={p.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{p.title}</p>
                      {p.body_text && <p className="text-sm text-muted-foreground mt-1">{p.body_text}</p>}
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${statusColors[p.status] ?? "bg-muted text-muted-foreground"}`}>
                      {p.status}
                    </span>
                  </div>

                  {(p.facebook_copy || p.line_copy) && (
                    <div className="space-y-2">
                      {p.facebook_copy && (
                        <div className="rounded border border-blue-200 bg-blue-50/50 p-2 text-xs">
                          <p className="font-medium text-blue-700 mb-1">Facebook</p>
                          <p>{p.facebook_copy}</p>
                        </div>
                      )}
                      {p.line_copy && (
                        <div className="rounded border border-green-200 bg-green-50/50 p-2 text-xs">
                          <p className="font-medium text-green-700 mb-1">LINE</p>
                          <p>{p.line_copy}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {p.agent && <Badge variant="secondary" className="text-[10px]">{p.agent}</Badge>}
                      {p.discount_pct && <Badge variant="outline" className="text-[10px]">-{p.discount_pct}%</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: th })}
                      </span>
                    </div>

                    <div className="flex gap-1.5">
                      {p.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => genContent(p.id)} disabled={generating}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> สร้าง Content
                        </Button>
                      )}
                      {p.status === "pending_approval" && (
                        <>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => approve({ id: p.id, action: "rejected" })} disabled={approving}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" onClick={() => approve({ id: p.id, action: "approved" })} disabled={approving}>
                            <Check className="w-3.5 h-3.5 mr-1" /> อนุมัติ
                          </Button>
                        </>
                      )}
                      {p.status === "approved" && (
                        <Button size="sm" onClick={() => publish(p.id)} disabled={publishing}>
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
    </div>
  );
}
