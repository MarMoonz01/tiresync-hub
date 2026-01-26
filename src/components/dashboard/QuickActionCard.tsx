import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface QuickActionCardProps {
  to: string;
  icon: LucideIcon;
  label: string;
  bgColor: string;
  hoverBgColor: string;
  iconColor: string;
}

export function QuickActionCard({
  to,
  icon: Icon,
  label,
  bgColor,
  iconColor,
}: QuickActionCardProps) {
  return (
    <Link to={to}>
      <Card className="border-0 shadow-soft bg-card/60 backdrop-blur-sm hover:shadow-soft-lg transition-all duration-200 cursor-pointer group">
        <CardContent className="p-4 flex flex-col items-center text-center gap-2">
          <div
            className={`w-11 h-11 rounded-xl ${bgColor} flex items-center justify-center transition-transform duration-200 group-hover:scale-105`}
          >
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <span className="text-sm font-medium text-foreground/80">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
