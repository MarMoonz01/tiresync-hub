import { ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth"; // นำเข้า useAuth
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileHeader } from "./MobileHeader";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const { role } = useAuth(); // ดึง role ออกมา (admin หรือ staff)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {!isMobile && (
        <DesktopSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
          userRole={role} // ส่ง role ไปที่ DesktopSidebar
        />
      )}

      <div className="flex-1 flex flex-col min-h-screen">
        {isMobile && <MobileHeader />}

        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`flex-1 ${isMobile ? 'pb-20' : ''}`}
        >
          {children}
        </motion.main>

        {isMobile && <MobileBottomNav userRole={role} />} {/* ส่ง role ไปที่ Mobile Nav */}
      </div>
    </div>
  );
}