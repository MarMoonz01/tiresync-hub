import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  delay?: number;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  trend,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="glass-card hover-scale">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center`}
            >
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold">{value}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{title}</p>
                {trend && (
                  <span
                    className={`text-xs font-medium ${
                      trend.isPositive ? "text-success" : "text-destructive"
                    }`}
                  >
                    {trend.isPositive ? "+" : ""}
                    {trend.value}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
