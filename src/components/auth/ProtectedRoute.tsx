import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireApproval?: boolean;
  requireAdmin?: boolean;
  requireStore?: boolean;
  ownerOnly?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireApproval = true,
  requireAdmin = false,
  requireStore = false,
  ownerOnly = false,
}: ProtectedRouteProps) {
  const { user, loading, isApproved, isAdmin, hasStore, isOwner, isStaff, storeMembership } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If user is pending and requireApproval is true
  if (requireApproval && !isApproved && !isAdmin) {
    return <Navigate to="/pending" replace />;
  }

  // If admin access is required
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // If this route is for owners only (e.g., /store/setup)
  if (ownerOnly && isStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  // If store is required
  if (requireStore) {
    // Owner without store → go to setup
    if (!hasStore && !isStaff) {
      return <Navigate to="/store/setup" replace />;
    }
    // Staff without approved membership → go to pending
    if (isStaff && !storeMembership?.is_approved) {
      return <Navigate to="/pending" replace />;
    }
  }

  return <>{children}</>;
}
