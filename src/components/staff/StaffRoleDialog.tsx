import { useState } from "react";
import { X, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StaffMember } from "@/hooks/useStaff";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface StaffRoleDialogProps {
  staff: StaffMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddRole: (data: { userId: string; role: AppRole }) => void;
  onRemoveRole: (data: { roleId: string }) => void;
  isLoading?: boolean;
}

const allRoles: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
  { value: "store_member", label: "Store Member" },
  { value: "pending", label: "Pending" },
];

const roleColors: Record<string, string> = {
  admin: "bg-primary text-primary-foreground",
  moderator: "bg-accent text-accent-foreground",
  store_member: "bg-secondary text-secondary-foreground",
  pending: "bg-muted text-muted-foreground",
};

export function StaffRoleDialog({
  staff,
  open,
  onOpenChange,
  onAddRole,
  onRemoveRole,
  isLoading,
}: StaffRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");

  const existingRoles = staff?.roles.map((r) => r.role) || [];
  const availableRoles = allRoles.filter((r) => !existingRoles.includes(r.value));

  const handleAddRole = () => {
    if (staff && selectedRole) {
      onAddRole({ userId: staff.user_id, role: selectedRole });
      setSelectedRole("");
    }
  };

  const handleRemoveRole = (roleId: string) => {
    onRemoveRole({ roleId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage User Roles</DialogTitle>
          <DialogDescription>
            Add or remove roles for {staff?.full_name || staff?.email}
          </DialogDescription>
        </DialogHeader>

        {/* Current Roles */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Current Roles</p>
          <div className="flex flex-wrap gap-2">
            {staff?.roles.length ? (
              staff.roles.map((role) => (
                <Badge
                  key={role.id}
                  className={`${roleColors[role.role]} flex items-center gap-1`}
                >
                  {role.role.replace("_", " ")}
                  <button
                    onClick={() => handleRemoveRole(role.id)}
                    className="ml-1 hover:opacity-70"
                    disabled={isLoading}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No roles assigned</p>
            )}
          </div>
        </div>

        {/* Add Role */}
        {availableRoles.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Add Role</p>
            <div className="flex gap-2">
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as AppRole)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddRole}
                disabled={!selectedRole || isLoading}
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
