import { motion } from "framer-motion";
import { MoreVertical, UserX, Shield, Settings2, Eye, Plus, Edit, Trash2, MessageCircle } from "lucide-react";
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
  onEditPermissions?: () => void;
  showPermissions?: boolean;
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export function StoreStaffCard({ 
  member, 
  onChangeRole, 
  onRemove, 
  onEditPermissions,
  showPermissions = false 
}: StoreStaffCardProps) {
  const profile = member.profile;
  const permissions = member.permissions;
  
  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : profile?.email?.[0]?.toUpperCase() || "?";

  // Get permission badges
  const getPermissionBadges = () => {
    if (!permissions) return null;

    const badges: { icon: React.ReactNode; label: string; active: boolean }[] = [
      { icon: <Eye className="w-3 h-3" />, label: "View", active: permissions.web?.view ?? true },
      { icon: <Plus className="w-3 h-3" />, label: "Add", active: permissions.web?.add ?? false },
      { icon: <Edit className="w-3 h-3" />, label: "Edit", active: permissions.web?.edit ?? false },
      { icon: <Trash2 className="w-3 h-3" />, label: "Delete", active: permissions.web?.delete ?? false },
      { icon: <MessageCircle className="w-3 h-3" />, label: "LINE", active: permissions.line?.adjust ?? false },
    ];

    return badges.filter(b => b.active);
  };

  const activeBadges = getPermissionBadges();

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
            {onEditPermissions && (
              <DropdownMenuItem onClick={onEditPermissions}>
                <Settings2 className="h-4 w-4 mr-2" />
                Edit Permissions
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRemove} className="text-destructive">
              <UserX className="h-4 w-4 mr-2" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px] capitalize">
          {member.role}
        </Badge>
        {!member.is_approved && (
          <Badge variant="warning" className="text-[10px]">
            Pending Approval
          </Badge>
        )}
        {profile?.status && member.is_approved && (
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

      {/* Permission badges */}
      {showPermissions && activeBadges && activeBadges.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {activeBadges.map((badge, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="text-[10px] px-1.5 py-0.5 flex items-center gap-1"
            >
              {badge.icon}
              {badge.label}
            </Badge>
          ))}
        </div>
      )}

      {profile?.phone && (
        <p className="mt-2 text-xs text-muted-foreground">{profile.phone}</p>
      )}
    </motion.div>
  );
}
