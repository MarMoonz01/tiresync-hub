import { useAuth, Permissions } from "@/hooks/useAuth";

export function usePermissions() {
  const { permissions, isOwner, isAdmin } = useAuth();

  // Owners and system admins have full permissions
  const hasFullAccess = isOwner || isAdmin;

  return {
    // Web permissions
    canView: hasFullAccess || permissions?.web?.view || false,
    canAdd: hasFullAccess || permissions?.web?.add || false,
    canEdit: hasFullAccess || permissions?.web?.edit || false,
    canDelete: hasFullAccess || permissions?.web?.delete || false,
    
    // LINE permissions
    canViewLine: hasFullAccess || permissions?.line?.view || false,
    canAdjustLine: hasFullAccess || permissions?.line?.adjust || false,
    
    // Helper for checking if user has any store access
    hasStoreAccess: hasFullAccess || permissions?.web?.view || false,
    
    // Raw permissions object
    permissions,
    
    // Role indicators
    isOwner,
    isAdmin,
    hasFullAccess,
  };
}

export type { Permissions };
