import { motion } from "framer-motion";
import { MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StaffMember } from "@/hooks/useStaff";

interface StaffCardProps {
  staff: StaffMember;
  onChangeStatus: () => void;
  onManageRoles: () => void;
}

const statusColors: Record<string, string> = {
  approved: "bg-success/10 text-success border-success/30",
  pending: "bg-warning/10 text-warning border-warning/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  suspended: "bg-muted text-muted-foreground border-muted",
};

const roleColors: Record<string, string> = {
  admin: "bg-primary text-primary-foreground",
  moderator: "bg-accent text-accent-foreground",
  store_member: "bg-secondary text-secondary-foreground",
  pending: "bg-muted text-muted-foreground",
};

export function StaffCard({ staff, onChangeStatus, onManageRoles }: StaffCardProps) {
  const initials = staff.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || staff.email[0].toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="glass-card h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage src={staff.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {staff.full_name || "Unnamed User"}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {staff.email}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onChangeStatus}>
                  Change Status
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onManageRoles}>
                  Manage Roles
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {/* Status Badge */}
            <Badge 
              variant="outline" 
              className={statusColors[staff.status] || statusColors.pending}
            >
              {staff.status}
            </Badge>
            
            {/* Role Badges */}
            {staff.roles.length > 0 ? (
              staff.roles.map((role) => (
                <Badge 
                  key={role.id} 
                  className={roleColors[role.role] || roleColors.pending}
                >
                  {role.role.replace("_", " ")}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                No roles
              </Badge>
            )}
          </div>

          {staff.phone && (
            <p className="mt-3 text-sm text-muted-foreground">
              📞 {staff.phone}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
