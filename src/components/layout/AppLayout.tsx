import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileHeader } from "./MobileHeader"; // อันนี้อาจจะไม่จำเป็นแล้วถ้าใช้ TopNavbar ใน Mobile ด้วย
import { MobileBottomNav } from "./MobileBottomNav";
import { TopNavbar } from "./TopNavbar"; // <--- Import มาใหม่

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // สำหรับเปิดปิด Sidebar ใน Mobile (ถ้ามี)

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* 1. Sidebar (ซ้ายสุด) - ซ่อนใน Mobile */}
      {!isMobile && (
        <DesktopSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      )}

      {/* 2. Main Content Area (ขวา) */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        
        {/* A. Top Navbar (บนสุดของฝั่งขวา) */}
        {/* ใน Mobile เราอาจจะใช้ TopNavbar นี้แทน MobileHeader เดิมก็ได้ หรือจะใช้คู่กันตาม design */}
        <TopNavbar onMenuClick={() => setMobileMenuOpen(true)} />

        {/* B. เนื้อหาหลักของหน้า */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-24 md:pb-6 relative scroll-smooth">
          <div className="mx-auto max-w-7xl animate-in fade-in duration-300 slide-in-from-bottom-2">
            {children}
          </div>
        </main>
      </div>

      {/* 3. Mobile Navigation (ล่างสุด - เฉพาะ Mobile) */}
      {isMobile && <MobileBottomNav />}
    </div>
  );
}