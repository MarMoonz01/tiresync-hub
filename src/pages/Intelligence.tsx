import { useIntelligenceReports, useRunOracle, useRunSpark } from "@/hooks/useIntelligenceReports";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

export default function Intelligence() {
  const { data: reports = [], isLoading } = useIntelligenceReports();
  const { mutate: runOracle, isPending: oraclePending } = useRunOracle();
  const { mutate: runSpark, isPending: sparkPending } = useRunSpark();

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 md:px-6 py-4 flex items-center gap-3">
        <Brain className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">ข้อมูลเชิงลึก (AI)</h1>
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => runOracle()}
            disabled={oraclePending}
          >
            {oraclePending ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Brain className="w-3.5 h-3.5 mr-1" />}
            ORACLE
          </Button>
          <Button
            size="sm"
            onClick={() => runSpark()}
            disabled={sparkPending}
          >
            {sparkPending ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
            SPARK
          </Button>
        </div>
      </header>

      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-3">
        {isLoading && <p className="text-center text-muted-foreground py-8">กำลังโหลด...</p>}
        {!isLoading && reports.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Brain className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>ยังไม่มีรายงาน</p>
            <p className="text-xs mt-1">กด ORACLE เพื่อสร้าง insight แรก</p>
          </div>
        )}

        {reports.map((report) => {
          const insight = String((report.content as Record<string, unknown>).insight ?? report.content.summary ?? JSON.stringify(report.content));
          return (
            <div key={report.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{report.agent}</Badge>
                <span className="text-xs text-muted-foreground">{report.report_type}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: th })}
                </span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{insight}</p>
              {report.tokens_used && (
                <p className="text-xs text-muted-foreground">{report.tokens_used.toLocaleString()} tokens</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
