import { usePromotions, useApprovePromotion, usePublishPromotion } from "@/hooks/usePromotions";
import { Button } from "@/components/ui/button";
import { FileCheck, Check, X, Send } from "lucide-react";

export default function ContentApproval() {
  const { data: promotions = [], isLoading } = usePromotions("pending_approval");
  const { mutate: approve, isPending: approving } = useApprovePromotion();
  const { mutate: publish, isPending: publishing } = usePublishPromotion();

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-end justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl md:text-[26px] font-extrabold tracking-tight flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-primary" /> อนุมัติโพสต์
          </h1>
          <p className="text-sm text-muted-foreground mt-1">ตรวจคอนเทนต์ก่อนเผยแพร่ Facebook / LINE</p>
        </div>
        {promotions.length > 0 && (
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600">{promotions.length} รออนุมัติ</span>
        )}
      </div>

      {isLoading && <p className="text-center text-muted-foreground py-8">กำลังโหลด...</p>}
      {!isLoading && promotions.length === 0 && (
        <div className="text-center py-16 text-muted-foreground rounded-2xl border border-dashed border-border">
          <FileCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">ไม่มีโพสต์รออนุมัติ</p>
        </div>
      )}

      {promotions.map((p) => (
        <div key={p.id} className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
            <div>
              <p className="font-bold">{p.title}</p>
              {p.discount_pct && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 mt-1 inline-block">-{p.discount_pct}%</span>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-lg text-rose-600 border-rose-200" onClick={() => approve({ id: p.id, action: "rejected" })} disabled={approving}>
                <X className="w-3.5 h-3.5 mr-1" /> ปฏิเสธ
              </Button>
              <Button size="sm" className="rounded-lg" onClick={() => approve({ id: p.id, action: "approved" })} disabled={approving}>
                <Check className="w-3.5 h-3.5 mr-1" /> อนุมัติ
              </Button>
            </div>
          </div>

          <div className="p-5 grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-primary mb-2">📘 Facebook</p>
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 min-h-[100px] text-sm">
                {p.facebook_copy ?? <span className="text-muted-foreground text-xs">ยังไม่มี content</span>}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600 mb-2">💚 LINE OA</p>
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3 min-h-[100px] text-sm">
                {p.line_copy ?? <span className="text-muted-foreground text-xs">ยังไม่มี content</span>}
              </div>
            </div>
          </div>

          {p.facebook_copy && (
            <div className="px-5 pb-5">
              <Button className="w-full rounded-xl" onClick={() => publish(p.id)} disabled={publishing}>
                <Send className="w-3.5 h-3.5 mr-2" /> อนุมัติและเผยแพร่ทันที
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
