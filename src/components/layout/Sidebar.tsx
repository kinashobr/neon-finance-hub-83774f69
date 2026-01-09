import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Car,
  ChevronLeft,
  ChevronRight,
  Wallet,
  FileBarChart,
  Download,
  Upload,
  TrendingUp,
  PieChart,
  Target,
  BarChart3,
  AlertTriangle,
  LineChart,
  ChevronDown,
  Building,
  Coins,
  Bitcoin,
  Palette,
  Check,
  CircleDollarSign,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/contexts/FinanceContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarAlertas } from "@/components/dashboard/SidebarAlertas";

interface NavSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: {
    title: string;
    path: string;
    icon: React.ElementType;
  }[];
}

const navSections: NavSection[] = [
  {
    id: "financeiro",
    title: "Financeiro",
    icon: Wallet,
    items: [
      { title: "Dashboard", path: "/", icon: LayoutDashboard },
      { title: "Receitas & Despesas", path: "/receitas-despesas", icon: Receipt },
      { title: "Empréstimos", path: "/emprestimos", icon: CreditCard },
      { title: "Relatórios", path: "/relatorios", icon: BarChart3 },
    ],
  },
  {
    id: "investimentos",
    title: "Investimentos",
    icon: TrendingUp,
    items: [
      { title: "Carteira Geral", path: "/investimentos", icon: PieChart },
    ],
  },
  {
    id: "patrimonio",
    title: "Patrimônio",
    icon: Building,
    items: [
      { title: "Veículos", path: "/veiculos", icon: Car },
    ],
  },
];


export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(["financeiro", "patrimonio", "investimentos", "relatorios"]);
  const location = useLocation();
  const { exportData, importData } = useFinance();
  const { theme, setTheme, themes } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load collapsed state from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    if (savedCollapsed) {
      setCollapsed(JSON.parse(savedCollapsed));
    }
  }, []);

  // Save collapsed state and dispatch event for MainLayout
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed));
    window.dispatchEvent(new CustomEvent("sidebar-toggle", { detail: collapsed }));
  }, [collapsed]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleExport = () => {
    exportData();
    toast({
      title: "Exportação concluída",
      description: "Arquivo finance-data.json baixado com sucesso!",
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo JSON válido.",
        variant: "destructive",
      });
      return;
    }

    const result = await importData(file);
    
    toast({
      title: result.success ? "Sucesso" : "Erro",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const isPathActive = (path: string) => {
    return location.pathname === path;
  };

  const NavItem = ({ item, isActive }: { item: { title: string; path: string; icon: React.ElementType }; isActive: boolean }) => {
    const Icon = item.icon;
    
    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink
              to={item.path}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 mx-auto",
                isActive
                  ? "sidebar-nav-active"
                  : "sidebar-nav-item"
              )}
            >
              <Icon className="w-5 h-5" />
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right" className="sidebar-tooltip">
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <NavLink
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
          isActive
            ? "sidebar-nav-active"
            : "sidebar-nav-item"
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="font-medium text-sm truncate">{item.title}</span>
        {isActive && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-current opacity-80 animate-pulse" />
        )}
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-background border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg sidebar-logo-bg flex items-center justify-center">
            <CircleDollarSign className="w-4 h-4 sidebar-logo-icon" />
          </div>
          <span className="font-bold text-sm">Orbium Finance</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 z-50 sidebar-bg border-r sidebar-border transition-all duration-300 ease-in-out flex flex-col",
          // Desktop floating card styles
          "hidden md:flex md:top-4 md:bottom-4 md:ml-4 md:rounded-2xl md:shadow-xl md:h-auto md:border",
          collapsed ? "md:w-16" : "md:w-64",
          // Mobile styles - slide in from left, below mobile header
          mobileOpen && "flex top-14 h-[calc(100vh-3.5rem)] w-[280px]"
        )}
      >
      {/* Header - Logo & App Name (Desktop only, mobile has separate header) */}
      <div className="hidden md:flex h-16 items-center justify-between px-4 border-b sidebar-border shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl sidebar-logo-bg flex items-center justify-center shrink-0">
              <CircleDollarSign className="w-5 h-5 sidebar-logo-icon" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm sidebar-brand-text truncate">
                Orbium
              </span>
              <span className="text-xs sidebar-brand-subtitle truncate">
                Finance
              </span>
            </div>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-9 h-9 rounded-xl sidebar-logo-bg flex items-center justify-center mx-auto cursor-pointer">
                <CircleDollarSign className="w-5 h-5 sidebar-logo-icon" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="sidebar-tooltip">
              Orbium Finance
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Navigation - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-4 px-2">
        <nav className="flex flex-col gap-2">
          {navSections.map((section) => {
            const SectionIcon = section.icon;
            const isOpen = openSections.includes(section.id);
            const hasActiveItem = section.items.some((item) => isPathActive(item.path));

            if (collapsed) {
              return (
                <div key={section.id} className="flex flex-col gap-1">
                  {section.items.map((item) => (
                    <NavItem
                      key={item.path}
                      item={item}
                      isActive={isPathActive(item.path)}
                    />
                  ))}
                </div>
              );
            }

            return (
              <Collapsible
                key={section.id}
                open={isOpen}
                onOpenChange={() => toggleSection(section.id)}
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left",
                      hasActiveItem ? "sidebar-section-active" : "sidebar-section-header"
                    )}
                  >
                    <SectionIcon className="w-4 h-4" />
                    <span className="font-semibold text-xs uppercase tracking-wider flex-1">
                      {section.title}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-2 mt-1 space-y-0.5">
                  {section.items.map((item) => (
                    <NavItem
                      key={item.path}
                      item={item}
                      isActive={isPathActive(item.path)}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="my-4 mx-2 h-px sidebar-divider" />

        {/* Import/Export Section */}
        <div className={cn("px-1", collapsed && "px-0")}>
          {!collapsed && (
            <p className="text-xs sidebar-section-label mb-2 px-2">
              Transferir Dados
            </p>
          )}
          <div className={cn("flex gap-2", collapsed ? "flex-col items-center" : "flex-row")}>
            {collapsed ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleExport}
                      className="sidebar-action-btn w-10 h-10"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="sidebar-tooltip">
                    Exportar dados
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleImportClick}
                      className="sidebar-action-btn w-10 h-10"
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="sidebar-tooltip">
                    Importar dados
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExport}
                  className="flex-1 sidebar-action-btn justify-start gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleImportClick}
                  className="flex-1 sidebar-action-btn justify-start gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Importar
                </Button>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Divider */}
        <div className="my-4 mx-2 h-px sidebar-divider" />

        {/* Alertas Inteligentes */}
        <SidebarAlertas collapsed={collapsed} />
      </div>

      {/* Footer - Theme Selector */}
      <div className="shrink-0 p-3 border-t sidebar-border">
        {!collapsed ? (
          <div className="space-y-2">
            <p className="text-xs sidebar-section-label px-1 flex items-center gap-1.5">
              <Palette className="w-3 h-3" />
              Tema
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center justify-between gap-2 p-2 rounded-lg sidebar-theme-switcher-bg text-sm">
                  <div className="flex items-center gap-2">
                    <span>{themes.find(t => t.id === theme)?.icon}</span>
                    <span className="text-xs font-medium">{themes.find(t => t.id === theme)?.name}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {themes.map((t) => (
                  <DropdownMenuItem
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span>{t.icon}</span>
                      <span>{t.name}</span>
                    </div>
                    {theme === t.id && <Check className="w-4 h-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-10 h-10 rounded-lg sidebar-theme-btn flex items-center justify-center mx-auto">
                    <Palette className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-48">
                  {themes.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span>{t.icon}</span>
                        <span>{t.name}</span>
                      </div>
                      {theme === t.id && <Check className="w-4 h-4 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent side="right" className="sidebar-tooltip">
              Selecionar tema
            </TooltipContent>
          </Tooltip>
        )}

        {/* Collapse Toggle - Desktop only */}
        <div className="mt-3 hidden md:flex justify-center">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setCollapsed(false)}
                  className="w-10 h-10 rounded-lg sidebar-collapse-btn flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="sidebar-tooltip">
                Expandir sidebar
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => setCollapsed(true)}
              className="w-full py-2 rounded-lg sidebar-collapse-btn flex items-center justify-center gap-2 text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              Recolher
            </button>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}