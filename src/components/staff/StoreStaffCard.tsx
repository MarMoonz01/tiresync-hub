import { motion } from "framer-motion";
import { MoreVertical, UserX, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StoreMember } from "@/hooks/useStoreStaff";

interface StoreStaffCardProps {
  member: StoreMember;
  onChangeRole: () => void;
  onRemove: () => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const roleColors: Record<string, string> = {
  manager: "bg-primary text-primary-foreground",
  staff: "bg-secondary text-secondary-foreground",
  sales: "bg-accent text-accent-foreground",
};

export function StoreStaffCard({ member, onChangeRole, onRemove }: StoreStaffCardProps) {
  const profile = member.profile;
  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : profile?.email?.[0]?.toUpperCase() || "?";

  return (
    <motion.div
      variants={itemVariants}
      className="glass-card p-4 rounded-xl hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || "User"} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">
              {profile?.full_name || "Unknown User"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {profile?.email || "No email"}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onChangeRole}>
              <Shield className="h-4 w-4 mr-2" />
              Change Role
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRemove} className="text-destructive">
              <UserX className="h-4 w-4 mr-2" />
              Remove from Store
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Badge className={roleColors[member.role] || "bg-muted text-muted-foreground"}>
          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
        </Badge>
        {profile?.status && (
          <Badge
            variant="outline"
            className={
              profile.status === "approved"
                ? "border-success text-success"
                : profile.status === "pending"
                ? "border-warning text-warning"
                : "border-destructive text-destructive"
            }
          >
            {profile.status}
          </Badge>
        )}
      </div>

      {profile?.phone && (
        <p className="mt-2 text-sm text-muted-foreground">{profile.phone}</p>
      )}
    </motion.div>
  );
}
