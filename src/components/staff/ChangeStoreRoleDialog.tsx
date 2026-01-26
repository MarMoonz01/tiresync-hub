import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StoreMember } from "@/hooks/useStoreStaff";

interface ChangeStoreRoleDialogProps {
  member: StoreMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateRole: (data: { memberId: string; role: string }) => void;
  isLoading?: boolean;
}

const storeRoles = [
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
  { value: "sales", label: "Sales" },
];

export function ChangeStoreRoleDialog({
  member,
  open,
  onOpenChange,
  onUpdateRole,
  isLoading,
}: ChangeStoreRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState(member?.role || "staff");

  const handleSubmit = () => {
    if (member && selectedRole) {
      onUpdateRole({ memberId: member.id, role: selectedRole });
      onOpenChange(false);
    }
  };

  // Update selected role when member changes
  if (member && member.role !== selectedRole && !open) {
    setSelectedRole(member.role);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Store Role</DialogTitle>
          <DialogDescription>
            Update the role for {member?.profile?.full_name || member?.profile?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Store Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {storeRoles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
