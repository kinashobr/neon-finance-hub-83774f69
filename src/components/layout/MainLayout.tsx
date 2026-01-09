import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent) => {
      setSidebarCollapsed(e.detail);
    };

    window.addEventListener("sidebar-toggle", handleSidebarToggle as EventListener);
    
    return () => {
      window.removeEventListener("sidebar-toggle", handleSidebarToggle as EventListener);
    };
  }, []);

  return (
    <div className="min-h-screen surface transition-colors duration-300">
      <Sidebar />
      <main
        className={cn(
          "min-h-screen p-3 md:p-6 transition-all duration-300",
          // Mobile: top padding for fixed header + bottom padding for bottom nav
          "pt-[calc(3.5rem+0.75rem)] pb-16 md:pt-6 md:pb-6",
          // Desktop: left margin baseada no estado da sidebar
          "ml-0",
          sidebarCollapsed ? "md:ml-16" : "md:ml-64",
        )}
      >
        <div className="max-w-[min(1400px,95vw)] mx-auto space-y-6 md:space-y-8">
          {children}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
