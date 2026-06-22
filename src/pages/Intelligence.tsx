import { useIntelligenceReports, useRunOracle, useRunSpark } from "@/hooks/useIntelligenceReports";
import { Brain, Sparkles, RefreshCw, Globe } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

const agentMeta: Record<string, { icon: typeof Brain; tint: string }> = {
  ORACLE: { icon: Brain, tint: "bg-primary/10 text-primary" },
  SAGE: { icon: Globe, tint: "bg-violet-500/10 text-violet-600" },
  SPARK: { icon: Sparkles, tint: "bg-amber-500/10 text-amber-600" },
};

export default function Intelligence() {
  const { data: reports = [], isLoading } = useIntelligenceReports();
  const { mutate: runOracle, isPending: oraclePending } = useRunOracle();
  const { mutate: runSpark, isPending: sparkPending } = useRunSpark();

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap pt-2">
        <div>
          <h1 className="text-2xl md:text-[26px] font-extrabold tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" /> ข้อมูลเชิงลึก (AI)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">วิเคราะห์ด้วย Claude · ORACLE, SAGE, SPARK</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => runOracle()} disabled={oraclePending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-semibold hover:bg-secondary transition disabled:opacity-50">
            {oraclePending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} ORACLE
          </button>
          <button onClick={() => runSpark()} disabled={sparkPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3.5 py-2 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50">
            {sparkPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} SPARK
          </button>
        </div>
      </div>

      {isLoading && <p className="text-center text-muted-foreground py-8">กำลังโหลด...</p>}
      {!isLoading && reports.length === 0 && (
        <div className="text-center py-16 text-muted-foreground rounded-2xl border border-dashed border-border">
          <Brain className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">ยังไม่มีรายงาน</p>
          <p className="text-xs mt-1">กด ORACLE เพื่อสร้าง insight แรก</p>
        </div>
      )}

      {reports.map((report) => {
        const insight = String((report.content as Record<string, unknown>).insight ?? report.content.summary ?? JSON.stringify(report.content));
        const meta = agentMeta[report.agent] ?? agentMeta.ORACLE;
        const Icon = meta.icon;
        return (
          <div key={report.id} className="rounded-2xl border border-border bg-card shadow-soft p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.tint}`}><Icon className="w-5 h-5" /></span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-wide">{report.agent}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{report.report_type}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {report.tokens_used ? `${report.tokens_used.toLocaleString()} tokens · ` : ""}
                  {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: th })}
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{insight}</p>
          </div>
        );
      })}
    </div>
  );
}
