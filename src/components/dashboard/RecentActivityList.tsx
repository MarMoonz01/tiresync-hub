import { motion } from "framer-motion";
import { format } from "date-fns";
import { ArrowDownCircle, ArrowUpCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StockLog {
  id: string;
  action: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  created_at: string;
  notes: string | null;
}

interface RecentActivityListProps {
  logs: StockLog[];
}

export function RecentActivityList({ logs }: RecentActivityListProps) {
  if (logs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No recent activity</p>
              <p className="text-sm text-muted-foreground mt-1">
                Stock changes will appear here
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[320px] px-6">
            <div className="space-y-3 py-2">
              {logs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      log.action === "remove"
                        ? "bg-destructive/10"
                        : "bg-success/10"
                    }`}
                  >
                    {log.action === "remove" ? (
                      <ArrowDownCircle className="w-5 h-5 text-destructive" />
                    ) : (
                      <ArrowUpCircle className="w-5 h-5 text-success" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {log.action === "remove" ? "Stock Removed" : "Stock Added"}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          log.action === "remove"
                            ? "text-destructive border-destructive/30"
                            : "text-success border-success/30"
                        }
                      >
                        {log.action === "remove" ? "-" : "+"}
                        {Math.abs(log.quantity_change)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.quantity_before} → {log.quantity_after} units
                    </p>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {log.notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(log.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
