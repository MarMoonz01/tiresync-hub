import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Users } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { StaffCard } from "@/components/staff/StaffCard";
import { StaffStatusDialog } from "@/components/staff/StaffStatusDialog";
import { StaffRoleDialog } from "@/components/staff/StaffRoleDialog";
import { useStaff, StaffMember } from "@/hooks/useStaff";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  
  const {
    staffMembers,
    isLoading,
    updateStatus,
    addRole,
    removeRole,
    isUpdatingStatus,
    isUpdatingRoles,
  } = useStaff(debouncedSearch);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  const handleChangeStatus = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setStatusDialogOpen(true);
  };

  const handleManageRoles = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setRoleDialogOpen(true);
  };

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
                Manage all users and their permissions
              </p>
            </div>
            
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-xl">
              <p className="text-2xl font-bold text-foreground">{staffMembers.length}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
            <div className="glass-card p-4 rounded-xl">
              <p className="text-2xl font-bold text-success">
                {staffMembers.filter((s) => s.status === "approved").length}
              </p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
            <div className="glass-card p-4 rounded-xl">
              <p className="text-2xl font-bold text-warning">
                {staffMembers.filter((s) => s.status === "pending").length}
              </p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <div className="glass-card p-4 rounded-xl">
              <p className="text-2xl font-bold text-primary">
                {staffMembers.filter((s) => s.roles.some((r) => r.role === "admin")).length}
              </p>
              <p className="text-sm text-muted-foreground">Admins</p>
            </div>
          </div>

          {/* Staff Grid */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : staffMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {staffMembers.map((staff) => (
                <StaffCard
                  key={staff.id}
                  staff={staff}
                  onChangeStatus={() => handleChangeStatus(staff)}
                  onManageRoles={() => handleManageRoles(staff)}
                />
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Dialogs */}
      <StaffStatusDialog
        staff={selectedStaff}
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        onUpdateStatus={updateStatus}
        isLoading={isUpdatingStatus}
      />

      <StaffRoleDialog
        staff={selectedStaff}
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        onAddRole={addRole}
        onRemoveRole={removeRole}
        isLoading={isUpdatingRoles}
      />
    </AppLayout>
  );
}
