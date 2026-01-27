import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Users, Store, Clock, Settings2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StoreStaffCard } from "@/components/staff/StoreStaffCard";
import { AddStaffDialog } from "@/components/staff/AddStaffDialog";
import { ChangeStoreRoleDialog } from "@/components/staff/ChangeStoreRoleDialog";
import { PermissionMatrixDialog, Permissions } from "@/components/staff/PermissionMatrixDialog";
import { StaffRequestCard } from "@/components/staff/StaffRequestCard";
import { useStoreStaff, StoreMember } from "@/hooks/useStoreStaff";
import { useStaffRequests } from "@/hooks/useStaffRequests";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export default function Staff() {
  const { store } = useAuth();
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const {
    storeMembers,
    isLoading,
    addMember,
    updateMemberRole,
    removeMember,
    isAddingMember,
    isUpdatingRole,
  } = useStoreStaff(debouncedSearch);

  const {
    requests,
    isLoading: requestsLoading,
    approveRequest,
    rejectRequest,
    isApproving,
    isRejecting,
  } = useStaffRequests();

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<StoreMember | null>(null);
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);

  const handleChangeRole = (member: StoreMember) => {
    setSelectedMember(member);
    setRoleDialogOpen(true);
  };

  const handleEditPermissions = (member: StoreMember) => {
    setSelectedMember(member);
    setPermissionsDialogOpen(true);
  };

  const handleRemove = (member: StoreMember) => {
    setSelectedMember(member);
    setRemoveDialogOpen(true);
  };

  const confirmRemove = () => {
    if (selectedMember) {
      removeMember({ memberId: selectedMember.id });
      setRemoveDialogOpen(false);
      setSelectedMember(null);
    }
  };

  const handleUpdatePermissions = async (memberId: string, permissions: Permissions) => {
    setIsUpdatingPermissions(true);
    try {
      const { error } = await supabase
        .from("store_members")
        .update({ permissions: permissions as unknown as null })
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Permissions updated",
        description: "Staff member permissions have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPermissions(false);
    }
  };

  if (!store) {
    return (
      <AppLayout>
        <div className="page-container">
          <div className="text-center py-12">
            <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No Store Found</h2>
            <p className="text-muted-foreground">
              You need to set up your store before managing staff.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="page-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Staff Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage staff members for {store.name}
              </p>
            </div>

            <div className="flex gap-3">
              {/* Search */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Add Staff Button */}
              <AddStaffDialog onAddMember={addMember} isLoading={isAddingMember} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card p-4 rounded-xl">
              <p className="text-2xl font-bold text-foreground">{storeMembers.length}</p>
              <p className="text-sm text-muted-foreground">Total Staff</p>
            </div>
            <div className="glass-card p-4 rounded-xl">
              <p className="text-2xl font-bold text-primary">
                {storeMembers.filter((m) => m.role === "manager").length}
              </p>
              <p className="text-sm text-muted-foreground">Managers</p>
            </div>
            <div className="glass-card p-4 rounded-xl">
              <p className="text-2xl font-bold text-warning">
                {requests.length}
              </p>
              <p className="text-sm text-muted-foreground">Pending Requests</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="staff" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="staff" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Staff
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Requests
                {requests.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                    {requests.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Staff Tab */}
            <TabsContent value="staff" className="mt-6">
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-40 rounded-xl" />
                  ))}
                </div>
              ) : storeMembers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No staff members yet</p>
                  <AddStaffDialog onAddMember={addMember} isLoading={isAddingMember} />
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {storeMembers.map((member) => (
                    <StoreStaffCard
                      key={member.id}
                      member={member}
                      onChangeRole={() => handleChangeRole(member)}
                      onRemove={() => handleRemove(member)}
                      onEditPermissions={() => handleEditPermissions(member)}
                      showPermissions
                    />
                  ))}
                </motion.div>
              )}
            </TabsContent>

            {/* Requests Tab */}
            <TabsContent value="requests" className="mt-6">
              {requestsLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-40 rounded-xl" />
                  ))}
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending requests</p>
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {requests.map((request) => (
                    <StaffRequestCard
                      key={request.id}
                      request={request}
                      onApprove={() => approveRequest({ requestId: request.id })}
                      onReject={() => rejectRequest({ requestId: request.id })}
                      isApproving={isApproving}
                      isRejecting={isRejecting}
                    />
                  ))}
                </motion.div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Change Role Dialog */}
      <ChangeStoreRoleDialog
        member={selectedMember}
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        onUpdateRole={updateMemberRole}
        isLoading={isUpdatingRole}
      />

      {/* Permissions Dialog */}
      <PermissionMatrixDialog
        member={selectedMember}
        open={permissionsDialogOpen}
        onOpenChange={setPermissionsDialogOpen}
        onUpdatePermissions={handleUpdatePermissions}
        isLoading={isUpdatingPermissions}
      />

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              {selectedMember?.profile?.full_name || selectedMember?.profile?.email} from your
              store? They will no longer have access to your store's inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
