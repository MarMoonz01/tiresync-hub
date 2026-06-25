import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  ownerOnly?: boolean;
  interbranchOnly?: boolean;
  adminOnly?: boolean;
  /** Set on the /billing route so it stays reachable when the subscription is inactive. */
  skipSubscriptionGate?: boolean;
}

export function ProtectedRoute({
  children,
  ownerOnly = false,
  interbranchOnly = false,
  adminOnly = false,
  skipSubscriptionGate = false,
}: ProtectedRouteProps) {
  const {
    user, isApproved, isOwner, isInterbranch, isPlatformAdmin,
    store, subscriptionActive, loading,
  } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to="/auth" replace />;

  // Platform-admin routes: only the operator. Admins don't need a store or an
  // approved store-profile, so skip the approval/role/subscription gates entirely.
  if (adminOnly) {
    return isPlatformAdmin ? <>{children}</> : <Navigate to="/" replace />;
  }

  if (!isApproved) return <Navigate to="/pending" replace />;

  // Tenant subscription gate (paywall UX — data isolation is still enforced by RLS).
  // Platform admins are exempt; the /billing route opts out so it stays reachable.
  if (!skipSubscriptionGate && !isPlatformAdmin && store && !subscriptionActive) {
    return <Navigate to="/billing" replace />;
  }

  if (ownerOnly && !isOwner) return <Navigate to="/sales" replace />;
  if (interbranchOnly && !isInterbranch) return <Navigate to="/sales" replace />;

  // Interbranch users are locked to /interbranch unless the route explicitly allows them
  if (isInterbranch && !interbranchOnly) return <Navigate to="/interbranch" replace />;

  return <>{children}</>;
}

export default ProtectedRoute;
