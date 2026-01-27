import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { StoreMember } from "@/hooks/useStoreStaff";

interface Permissions {
  web: {
    view: boolean;
    add: boolean;
    edit: boolean;
    delete: boolean;
  };
  line: {
    view: boolean;
    adjust: boolean;
  };
}

interface PermissionMatrixDialogProps {
  member: StoreMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdatePermissions: (memberId: string, permissions: Permissions) => void;
  isLoading?: boolean;
}

const defaultPermissions: Permissions = {
  web: { view: true, add: false, edit: false, delete: false },
  line: { view: true, adjust: false },
};

export function PermissionMatrixDialog({
  member,
  open,
  onOpenChange,
  onUpdatePermissions,
  isLoading,
}: PermissionMatrixDialogProps) {
  const [permissions, setPermissions] = useState<Permissions>(defaultPermissions);

  useEffect(() => {
    if (member?.permissions) {
      const memberPerms = member.permissions as unknown as Permissions;
      setPermissions({
        web: {
          view: memberPerms?.web?.view ?? true,
          add: memberPerms?.web?.add ?? false,
          edit: memberPerms?.web?.edit ?? false,
          delete: memberPerms?.web?.delete ?? false,
        },
        line: {
          view: memberPerms?.line?.view ?? true,
          adjust: memberPerms?.line?.adjust ?? false,
        },
      });
    } else {
      setPermissions(defaultPermissions);
    }
  }, [member]);

  const handleSubmit = () => {
    if (member) {
      onUpdatePermissions(member.id, permissions);
      onOpenChange(false);
    }
  };

  const updateWebPermission = (key: keyof Permissions["web"], value: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      web: { ...prev.web, [key]: value },
    }));
  };

  const updateLinePermission = (key: keyof Permissions["line"], value: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      line: { ...prev.line, [key]: value },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Permissions</DialogTitle>
          <DialogDescription>
            Set permissions for {member?.profile?.full_name || member?.profile?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Web Permissions */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Web Access</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="web-view"
                  checked={permissions.web.view}
                  onCheckedChange={(checked) => updateWebPermission("view", !!checked)}
                  disabled // View is always on
                />
                <Label htmlFor="web-view" className="text-sm">View Inventory</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="web-add"
                  checked={permissions.web.add}
                  onCheckedChange={(checked) => updateWebPermission("add", !!checked)}
                />
                <Label htmlFor="web-add" className="text-sm">Add Tires</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="web-edit"
                  checked={permissions.web.edit}
                  onCheckedChange={(checked) => updateWebPermission("edit", !!checked)}
                />
                <Label htmlFor="web-edit" className="text-sm">Edit Tires</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="web-delete"
                  checked={permissions.web.delete}
                  onCheckedChange={(checked) => updateWebPermission("delete", !!checked)}
                />
                <Label htmlFor="web-delete" className="text-sm">Delete Tires</Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* LINE Permissions */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">LINE Chatbot</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="line-view"
                  checked={permissions.line.view}
                  onCheckedChange={(checked) => updateLinePermission("view", !!checked)}
                />
                <Label htmlFor="line-view" className="text-sm">View Stock</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="line-adjust"
                  checked={permissions.line.adjust}
                  onCheckedChange={(checked) => updateLinePermission("adjust", !!checked)}
                />
                <Label htmlFor="line-adjust" className="text-sm">Adjust Stock</Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { Permissions };
