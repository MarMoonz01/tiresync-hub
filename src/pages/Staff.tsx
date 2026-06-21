import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Users, Store, Clock, UserPlus, Loader2, KeyRound, Copy, RefreshCw, Check } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
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

  // ── Invite Staff state ─────────────────────────────────────────────────────
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  // ── Store join PIN ─────────────────────────────────────────────────────────
  const [pinCode, setPinCode] = useState<string | null>(store?.join_code ?? null);
  const [pinCopied, setPinCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const displayPin = pinCode ?? store?.join_code ?? null;

  const copyPin = () => {
    if (!displayPin) return;
    navigator.clipboard.writeText(displayPin);
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 1500);
  };

  const regeneratePin = async () => {
    setRegenerating(true);
    try {
      const { data, error } = await supabase.rpc("regenerate_store_join_code");
      if (error) throw error;
      setPinCode(data as string);
      toast({ title: "สร้างรหัสใหม่แล้ว", description: "รหัสเดิมใช้ไม่ได้อีกต่อไป" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Failed to regenerate", variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  const handleInviteStaff = async () => {
    if (!inviteEmail.trim() || !store?.id) return;
    setInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Fix #8: guard against missing session
      if (!session) {
        toast({ title: "Session expired. Please sign in again.", variant: "destructive" });
        setInviting(false);
        return;
      }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ email: inviteEmail.trim(), role: 'staff', store_id: store.id }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Invite failed');
      toast({ title: 'Invite sent', description: `${inviteEmail.trim()} will receive an email to join ${store.name}.` });
      setInviteEmail("");
      setInviteOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Failed to send invite', variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

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
      // memberId is the profile PK; owners can update their store's staff profiles via RLS.
      const { error } = await supabase
        .from("profiles")
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

              {/* Invite by email (new users) */}
              <Button onClick={() => setInviteOpen(true)} variant="outline" className="gap-2 shrink-0">
                <UserPlus className="w-4 h-4" />
                Invite
              </Button>

              {/* Add existing user */}
              <AddStaffDialog onAddMember={addMember} isLoading={isAddingMember} />
            </div>
          </div>

          {/* Store join PIN — share with staff so they can join instantly */}
          <div className="glass-card p-4 rounded-xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">รหัสร้าน (PIN) สำหรับพนักงาน</p>
                <p className="text-xs text-muted-foreground">ให้พนักงานกรอกรหัสนี้ตอนสมัครเพื่อเข้าร่วมร้านทันที</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="px-4 py-2 rounded-lg bg-muted font-mono text-lg font-bold tracking-widest text-primary">
                {displayPin ?? "—"}
              </code>
              <Button variant="outline" size="icon" onClick={copyPin} disabled={!displayPin} title="คัดลอก">
                {pinCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={regeneratePin} disabled={regenerating} title="สร้างรหัสใหม่">
                <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
              </Button>
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

      {/* Invite Staff by Email Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Invite Staff by Email
            </DialogTitle>
            <DialogDescription>
              Enter their email address. They'll receive an invite link, set a password, and be automatically added to <strong>{store?.name}</strong> — no approval wait.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="staff-invite-email">Email address</Label>
            <Input
              id="staff-invite-email"
              type="email"
              placeholder="staff@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInviteStaff()}
              disabled={inviting}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>
              Cancel
            </Button>
            <Button onClick={handleInviteStaff} disabled={inviting || !inviteEmail.trim()} className="gap-2">
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
