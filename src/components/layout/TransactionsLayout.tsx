import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TransactionsLayoutProps {
  mainContent: React.ReactNode;
  kpiSidebar: React.ReactNode;
}

export function TransactionsLayout({ mainContent, kpiSidebar }: TransactionsLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {/* Main Content Area (3/4 or 4/5 width) */}
      <div className="lg:col-span-3 xl:col-span-4 space-y-6">
        {mainContent}
      </div>

      {/* KPI Sidebar (1/4 or 1/5 width) */}
      <aside className="lg:col-span-1 xl:col-span-1">
        <div className="sticky top-6 space-y-6">
          {kpiSidebar}
        </div>
      </aside>
    </div>
  );
}