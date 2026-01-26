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
  hoverBgColor,
  iconColor,
}: QuickActionCardProps) {
  return (
    <Link to={to}>
      <Card className="glass-card hover-scale cursor-pointer group">
        <CardContent className="p-4 flex flex-col items-center text-center gap-2">
          <div
            className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center group-hover:${hoverBgColor} transition-colors`}
          >
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <span className="text-sm font-medium">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
