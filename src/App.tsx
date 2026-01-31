import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Pending from "./pages/Pending";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import AddTire from "./pages/AddTire";
import EditTire from "./pages/EditTire";
import Import from "./pages/Import";
import MyStore from "./pages/MyStore";
import StoreSetup from "./pages/StoreSetup";
import Marketplace from "./pages/Marketplace";
import Network from "./pages/Network";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Staff from "./pages/Staff";
import SalesReport from "./pages/SalesReport";
import AuditLog from "./pages/AuditLog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pending" element={<Pending />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              } />
              <Route path="/inventory" element={
                <ProtectedRoute><Inventory /></ProtectedRoute>
              } />
              <Route path="/inventory/add" element={
                <ProtectedRoute><AddTire /></ProtectedRoute>
              } />
              <Route path="/inventory/edit/:id" element={
                <ProtectedRoute><EditTire /></ProtectedRoute>
              } />
              {/* หน้า Import ให้เฉพาะ Owner เข้าได้ */}
              <Route path="/import" element={
                <ProtectedRoute ownerOnly><Import /></ProtectedRoute>
              } />
              
              {/* ✅ แก้ไขตรงนี้: เพิ่ม ownerOnly เพื่อให้เฉพาะเจ้าของร้านเข้าหน้า My Store ได้ */}
              <Route path="/store" element={
                <ProtectedRoute ownerOnly><MyStore /></ProtectedRoute>
              } />
              
              <Route path="/store/setup" element={
                <ProtectedRoute requireApproval={false} ownerOnly><StoreSetup /></ProtectedRoute>
              } />
              <Route path="/marketplace" element={
                <ProtectedRoute><Marketplace /></ProtectedRoute>
              } />
              <Route path="/network" element={
                <ProtectedRoute><Network /></ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute><Settings /></ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute><Profile /></ProtectedRoute>
              } />
              <Route path="/staff" element={
                <ProtectedRoute requireAdmin><Staff /></ProtectedRoute>
              } />
              <Route path="/sales-report" element={
                <ProtectedRoute requireStore><SalesReport /></ProtectedRoute>
              } />
              <Route path="/audit-log" element={
                <ProtectedRoute requireStore><AuditLog /></ProtectedRoute>
              } />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;