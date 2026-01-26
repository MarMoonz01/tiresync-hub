import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DailyMovement {
  date: string;
  sales: number;
  additions: number;
}

interface StockMovementChartProps {
  data: DailyMovement[];
}

export function StockMovementChart({ data }: StockMovementChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.2 }}
    >
      <Card className="border-0 shadow-soft bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Stock Movement</CardTitle>
          <p className="text-xs text-muted-foreground">Last 14 days</p>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--destructive))"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--destructive))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="additionsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--success))"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--success))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                  opacity={0.5}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px -2px rgba(0,0,0,0.08)",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "0.75rem", fontSize: "11px" }}
                  formatter={(value) => (
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>{value}</span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="additions"
                  name="Stock Added"
                  stroke="hsl(var(--success))"
                  fill="url(#additionsGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  name="Sold/Removed"
                  stroke="hsl(var(--destructive))"
                  fill="url(#salesGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
