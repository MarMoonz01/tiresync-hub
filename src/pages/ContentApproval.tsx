import { usePromotions, useApprovePromotion, useGenerateContent, usePublishPromotion } from "@/hooks/usePromotions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileCheck, Check, X, Send, RefreshCw } from "lucide-react";

export default function ContentApproval() {
  const { data: promotions = [], isLoading } = usePromotions("pending_approval");
  const { mutate: approve, isPending: approving } = useApprovePromotion();
  const { mutate: genContent, isPending: generating } = useGenerateContent();
  const { mutate: publish, isPending: publishing } = usePublishPromotion();

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 md:px-6 py-4 flex items-center gap-3">
        <FileCheck className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">อนุมัติโพสต์</h1>
        {promotions.length > 0 && <Badge className="ml-auto">{promotions.length} รออนุมัติ</Badge>}
      </header>

      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        {isLoading && <p className="text-center text-muted-foreground py-8">กำลังโหลด...</p>}
        {!isLoading && promotions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>ไม่มีโพสต์รออนุมัติ</p>
          </div>
        )}

        {promotions.map((p) => (
          <div key={p.id} className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <p className="font-semibold">{p.title}</p>
                {p.discount_pct && <Badge variant="outline" className="text-xs mt-1">-{p.discount_pct}%</Badge>}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200"
                  onClick={() => approve({ id: p.id, action: "rejected" })}
                  disabled={approving}
                >
                  <X className="w-3.5 h-3.5 mr-1" /> ปฏิเสธ
                </Button>
                <Button
                  size="sm"
                  onClick={() => approve({ id: p.id, action: "approved" })}
                  disabled={approving}
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> อนุมัติ
                </Button>
              </div>
            </div>

            <div className="p-4 grid md:grid-cols-2 gap-4">
              {/* Facebook preview */}
              <div>
                <p className="text-xs font-semibold text-blue-600 mb-2">📘 Facebook</p>
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 min-h-[100px] text-sm">
                  {p.facebook_copy ?? (
                    <div className="flex flex-col items-center justify-center h-20 gap-2 text-muted-foreground">
                      <p className="text-xs">ยังไม่มี content</p>
                      <Button size="sm" variant="outline" onClick={() => genContent(p.id)} disabled={generating}>
                        {generating ? <RefreshCw className="w-3 h-3 animate-spin" /> : "สร้าง Content"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* LINE preview */}
              <div>
                <p className="text-xs font-semibold text-green-600 mb-2">💚 LINE OA</p>
                <div className="rounded-lg border border-green-200 bg-green-50/50 p-3 min-h-[100px] text-sm">
                  {p.line_copy ?? <span className="text-muted-foreground text-xs">ยังไม่มี content</span>}
                </div>
              </div>
            </div>

            {p.facebook_copy && (
              <div className="px-4 pb-4">
                <Button className="w-full" onClick={() => publish(p.id)} disabled={publishing}>
                  <Send className="w-3.5 h-3.5 mr-2" /> อนุมัติและเผยแพร่ทันที
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
