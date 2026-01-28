import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { TireLogo } from "@/components/icons/TireLogo";

export function MobileHeader() {
  const { profile, isAdmin } = useAuth(); // ดึง isAdmin มาเช็คสิทธิ์

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  // กำหนด Link ปลายทาง: Admin ไป Settings, Staff ไป Profile (ถ้ามี) หรือ Dashboard
  const avatarLink = isAdmin ? "/settings" : "/dashboard";

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/50">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <TireLogo size={16} className="text-primary-foreground" />
          </div>
          <span className="font-semibold text-base">BAANAKE</span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Notification Button - Admin อาจเห็นแจ้งเตือนระบบ, Staff เห็นแจ้งเตือนสต็อก */}
          <Button variant="ghost" size="icon" className="relative h-9 w-9">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full pulse-dot" />
          </Button>
          
          {/* ปรับ Link ตามสิทธิ์ของผู้ใช้ */}
          <Link to={avatarLink}>
            <Avatar className="w-8 h-8 ring-2 ring-border/50">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}