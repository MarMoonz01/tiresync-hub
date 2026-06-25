import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { OperatorProvider } from "@/hooks/useOperator";
import { OperatorGate } from "@/components/auth/OperatorGate";
import { Skeleton } from "@/components/ui/skeleton";

// Public
const Landing      = lazy(() => import("./pages/Landing"));
const Auth         = lazy(() => import("./pages/Auth"));
const Pending      = lazy(() => import("./pages/Pending"));
const NotFound     = lazy(() => import("./pages/NotFound"));

// Staff + owner
const Sales        = lazy(() => import("./pages/Sales"));
const Stock        = lazy(() => import("./pages/Stock"));
const Customers    = lazy(() => import("./pages/Customers"));
const Settings     = lazy(() => import("./pages/Settings"));

// Owner-only
const Dashboard        = lazy(() => import("./pages/Dashboard"));
const Financials       = lazy(() => import("./pages/Financials"));
const StockManagement  = lazy(() => import("./pages/StockManagement"));
const StockSheet       = lazy(() => import("./pages/StockSheet"));
const CRM              = lazy(() => import("./pages/CRM"));
const AuditLog         = lazy(() => import("./pages/AuditLog"));
const Staff            = lazy(() => import("./pages/Staff"));

// Interbranch-only
const Interbranch  = lazy(() => import("./pages/Interbranch"));

// Owner-only — network link management
const Network      = lazy(() => import("./pages/Network"));

// Subscription paywall (reachable when the store's subscription is inactive)
const Billing      = lazy(() => import("./pages/Billing"));

// Platform-admin only
const Admin        = lazy(() => import("./pages/Admin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

function PageLoader() {
  return (
    <div className="flex flex-col gap-4 p-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <OperatorProvider>
            <OperatorGate>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public */}
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/pending" element={<Pending />} />

                {/* Staff + owner (all wrapped in the AppLayout shell: sidebar + topbar) */}
                <Route path="/sales" element={
                  <ProtectedRoute><AppLayout><Sales /></AppLayout></ProtectedRoute>
                } />
                <Route path="/stock" element={
                  <ProtectedRoute><AppLayout><Stock /></AppLayout></ProtectedRoute>
                } />
                <Route path="/customers" element={
                  <ProtectedRoute><AppLayout><Customers /></AppLayout></ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>
                } />

                {/* Owner-only */}
                <Route path="/dashboard" element={
                  <ProtectedRoute ownerOnly><AppLayout><Dashboard /></AppLayout></ProtectedRoute>
                } />
                <Route path="/financials" element={
                  <ProtectedRoute ownerOnly><AppLayout><Financials /></AppLayout></ProtectedRoute>
                } />
                <Route path="/stock-management" element={
                  <ProtectedRoute ownerOnly><AppLayout><StockManagement /></AppLayout></ProtectedRoute>
                } />
                <Route path="/stock-sheet" element={
                  <ProtectedRoute ownerOnly><AppLayout><StockSheet /></AppLayout></ProtectedRoute>
                } />
                <Route path="/crm" element={
                  <ProtectedRoute ownerOnly><AppLayout><CRM /></AppLayout></ProtectedRoute>
                } />
                <Route path="/audit-log" element={
                  <ProtectedRoute ownerOnly><AppLayout><AuditLog /></AppLayout></ProtectedRoute>
                } />
                <Route path="/staff" element={
                  <ProtectedRoute ownerOnly><AppLayout><Staff /></AppLayout></ProtectedRoute>
                } />
                <Route path="/network" element={
                  <ProtectedRoute ownerOnly><AppLayout><Network /></AppLayout></ProtectedRoute>
                } />

                {/* Subscription paywall — standalone (no shell) so it stays reachable while inactive */}
                <Route path="/billing" element={
                  <ProtectedRoute skipSubscriptionGate><Billing /></ProtectedRoute>
                } />

                {/* Interbranch-only */}
                <Route path="/interbranch" element={
                  <ProtectedRoute interbranchOnly><AppLayout><Interbranch /></AppLayout></ProtectedRoute>
                } />

                {/* Platform-admin only (hidden) */}
                <Route path="/admin" element={
                  <ProtectedRoute adminOnly><Admin /></ProtectedRoute>
                } />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </OperatorGate>
            </OperatorProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
