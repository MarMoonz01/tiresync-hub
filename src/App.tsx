import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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
const POApproval       = lazy(() => import("./pages/POApproval"));
const Promotions       = lazy(() => import("./pages/Promotions"));
const ContentApproval  = lazy(() => import("./pages/ContentApproval"));
const CRM              = lazy(() => import("./pages/CRM"));
const Intelligence     = lazy(() => import("./pages/Intelligence"));
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
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public */}
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/pending" element={<Pending />} />

                {/* Staff + owner */}
                <Route path="/sales" element={
                  <ProtectedRoute><Sales /></ProtectedRoute>
                } />
                <Route path="/stock" element={
                  <ProtectedRoute><Stock /></ProtectedRoute>
                } />
                <Route path="/customers" element={
                  <ProtectedRoute><Customers /></ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute><Settings /></ProtectedRoute>
                } />

                {/* Owner-only */}
                <Route path="/dashboard" element={
                  <ProtectedRoute ownerOnly><Dashboard /></ProtectedRoute>
                } />
                <Route path="/financials" element={
                  <ProtectedRoute ownerOnly><Financials /></ProtectedRoute>
                } />
                <Route path="/stock-management" element={
                  <ProtectedRoute ownerOnly><StockManagement /></ProtectedRoute>
                } />
                <Route path="/po-approval" element={
                  <ProtectedRoute ownerOnly><POApproval /></ProtectedRoute>
                } />
                <Route path="/promotions" element={
                  <ProtectedRoute ownerOnly><Promotions /></ProtectedRoute>
                } />
                <Route path="/content-approval" element={
                  <ProtectedRoute ownerOnly><ContentApproval /></ProtectedRoute>
                } />
                <Route path="/crm" element={
                  <ProtectedRoute ownerOnly><CRM /></ProtectedRoute>
                } />
                <Route path="/intelligence" element={
                  <ProtectedRoute ownerOnly><Intelligence /></ProtectedRoute>
                } />
                <Route path="/audit-log" element={
                  <ProtectedRoute ownerOnly><AuditLog /></ProtectedRoute>
                } />
                <Route path="/staff" element={
                  <ProtectedRoute ownerOnly><Staff /></ProtectedRoute>
                } />
                <Route path="/network" element={
                  <ProtectedRoute ownerOnly><Network /></ProtectedRoute>
                } />

                {/* Subscription paywall — must stay reachable while inactive */}
                <Route path="/billing" element={
                  <ProtectedRoute skipSubscriptionGate><Billing /></ProtectedRoute>
                } />

                {/* Interbranch-only */}
                <Route path="/interbranch" element={
                  <ProtectedRoute interbranchOnly><Interbranch /></ProtectedRoute>
                } />

                {/* Platform-admin only (hidden) */}
                <Route path="/admin" element={
                  <ProtectedRoute adminOnly><Admin /></ProtectedRoute>
                } />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
