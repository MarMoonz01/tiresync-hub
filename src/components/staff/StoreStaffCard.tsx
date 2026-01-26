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
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
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
      className="p-4 rounded-2xl border-0 shadow-soft bg-card/60 backdrop-blur-sm hover:shadow-soft-lg transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || "User"} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-sm text-foreground truncate">
              {profile?.full_name || "Unknown User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
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
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] capitalize">
          {member.role}
        </Badge>
        {profile?.status && (
          <Badge
            variant={
              profile.status === "approved"
                ? "success"
                : profile.status === "pending"
                ? "warning"
                : "destructive"
            }
            className="text-[10px]"
          >
            {profile.status}
          </Badge>
        )}
      </div>

      {profile?.phone && (
        <p className="mt-2 text-xs text-muted-foreground">{profile.phone}</p>
      )}
    </motion.div>
  );
}
