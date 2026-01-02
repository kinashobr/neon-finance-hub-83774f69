import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
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
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Sidebar />
      <main
        className={cn(
          "min-h-screen p-3 md:p-6 transition-all duration-300",
          // Mobile: no left margin, add top padding for fixed header
          "pt-[calc(3.5rem+0.75rem)] md:pt-6",
          // Desktop: left margin based on sidebar state
          "ml-0",
          sidebarCollapsed ? "md:ml-16" : "md:ml-64"
        )}
      >
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
