import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
            <Route path="/import" element={
              <ProtectedRoute><Import /></ProtectedRoute>
            } />
            <Route path="/store" element={
              <ProtectedRoute><MyStore /></ProtectedRoute>
            } />
            <Route path="/store/setup" element={
              <ProtectedRoute requireApproval={false}><StoreSetup /></ProtectedRoute>
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
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
