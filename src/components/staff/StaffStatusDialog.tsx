import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { StaffMember } from "@/hooks/useStaff";
import { Database } from "@/integrations/supabase/types";

type UserStatus = Database["public"]["Enums"]["user_status"];

interface StaffStatusDialogProps {
  staff: StaffMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (data: { userId: string; status: UserStatus }) => void;
  isLoading?: boolean;
}

const statusOptions: { value: UserStatus; label: string; description: string }[] = [
  { value: "pending", label: "Pending", description: "Awaiting approval" },
  { value: "approved", label: "Approved", description: "Full access granted" },
  { value: "rejected", label: "Rejected", description: "Access denied" },
  { value: "suspended", label: "Suspended", description: "Temporarily disabled" },
];

export function StaffStatusDialog({
  staff,
  open,
  onOpenChange,
  onUpdateStatus,
  isLoading,
}: StaffStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<UserStatus>(
    staff?.status || "pending"
  );

  const handleSubmit = () => {
    if (staff) {
      onUpdateStatus({ userId: staff.user_id, status: selectedStatus });
      onOpenChange(false);
    }
  };

  // Update selected status when staff changes
  if (staff && selectedStatus !== staff.status && open) {
    setSelectedStatus(staff.status);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change User Status</DialogTitle>
          <DialogDescription>
            Update the status for {staff?.full_name || staff?.email}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={selectedStatus}
          onValueChange={(value) => setSelectedStatus(value as UserStatus)}
          className="space-y-3"
        >
          {statusOptions.map((option) => (
            <div
              key={option.value}
              className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
              <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                <span className="font-medium">{option.label}</span>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
