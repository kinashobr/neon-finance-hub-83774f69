import { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  Building,
  LayoutDashboard,
  Receipt,
  CreditCard,
  BarChart3,
  PieChart,
  Car,
  Download,
  Upload,
  AlertTriangle,
  Palette,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/contexts/FinanceContext";
import { useTheme, ThemeType } from "@/contexts/ThemeContext";
import { SidebarAlertas } from "@/components/dashboard/SidebarAlertas";
import { toast } from "@/hooks/use-toast";

interface GroupConfig {
  id: "financeiro" | "investimentos" | "patrimonio";
  label: string;
  icon: React.ElementType;
  defaultPath: string;
  paths: string[];
}

const GROUPS: GroupConfig[] = [
  {
    id: "financeiro",
    label: "Financeiro",
    icon: Wallet,
    defaultPath: "/",
    paths: ["/", "/receitas-despesas", "/emprestimos", "/relatorios"],
  },
  {
    id: "investimentos",
    label: "Investimentos",
    icon: TrendingUp,
    defaultPath: "/investimentos",
    paths: ["/investimentos"],
  },
  {
    id: "patrimonio",
    label: "Patrimônio",
    icon: Building,
    defaultPath: "/veiculos",
    paths: ["/veiculos"],
  },
];

const financeItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Receitas & Despesas", path: "/receitas-despesas", icon: Receipt },
  { title: "Empréstimos", path: "/emprestimos", icon: CreditCard },
  { title: "Relatórios", path: "/relatorios", icon: BarChart3 },
];

const investmentItems = [
  { title: "Carteira Geral", path: "/investimentos", icon: PieChart },
];

const patrimonioItems = [
  { title: "Veículos", path: "/veiculos", icon: Car },
];

function getItemsForGroup(id: GroupConfig["id"]) {
  if (id === "financeiro") return financeItems;
  if (id === "investimentos") return investmentItems;
  return patrimonioItems;
}

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { exportData, importData } = useFinance();
  const { theme, setTheme, themes } = useTheme();
  const [navLevel, setNavLevel] = useState<"root" | "group">("root");
  const [activeGroup, setActiveGroup] = useState<GroupConfig["id"] | null>(null);
  const [utilitiesOpen, setUtilitiesOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentGroupId: GroupConfig["id"] | null =
    GROUPS.find((group) => group.paths.some((p) => location.pathname === p))?.id ??
    null;

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

  const handleGroupTap = (group: GroupConfig) => {
    // Navega para o defaultPath se ainda não estiver dentro do grupo
    if (!group.paths.includes(location.pathname)) {
      navigate(group.defaultPath);
    }
    setNavLevel("group");
    setActiveGroup(group.id);
  };

  const handleBackToRoot = () => {
    setNavLevel("root");
    setActiveGroup(null);
  };

  const activeItems = activeGroup ? getItemsForGroup(activeGroup) : [];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden surface-container-high border-t border-border/60 backdrop-blur-md">
        <div className="flex h-14 items-stretch px-1 gap-1">
          {navLevel === "root" ? (
            <div className="flex flex-1 items-stretch gap-1">
              {GROUPS.map((group) => {
                const Icon = group.icon;
                const isActive = currentGroupId === group.id;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => handleGroupTap(group)}
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center gap-0.5 rounded-full transition-colors text-[10px] font-medium",
                      isActive
                        ? "md-primary shadow-sm"
                        : "text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className={cn(isActive && "text-[hsl(var(--md-sys-color-on-primary))]")}>{group.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-1 items-stretch gap-1">
              <button
                type="button"
                onClick={handleBackToRoot}
                className="flex items-center justify-center px-3 rounded-full text-[11px] font-medium text-muted-foreground hover:bg-muted/40"
              >
                <span className="mr-1">⟵</span>
                Principal
              </button>
              {activeItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1 rounded-full px-2 text-[10px] font-medium",
                      isActive
                        ? "md-primary shadow-sm"
                        : "text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className={cn(isActive && "text-[hsl(var(--md-sys-color-on-primary))]")}>{item.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Botão de utilidades sempre visível */}
          <button
            type="button"
            onClick={() => setUtilitiesOpen(true)}
            className="flex items-center justify-center w-10 rounded-full text-muted-foreground hover:bg-muted/40"
            aria-label="Mais opções"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Sheet único para utilidades, tema e alertas */}
      <Sheet open={utilitiesOpen} onOpenChange={setUtilitiesOpen}>
        <SheetContent
          side="bottom"
          className="surface-container-high border-t border-border/60 rounded-t-3xl px-4 pt-3 pb-4 flex flex-col gap-3 max-h-[85vh]"
        >
          <SheetHeader className="text-left">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full md-primary flex items-center justify-center">
                <MoreHorizontal className="w-4 h-4" />
              </div>
              <div>
                <SheetTitle className="text-sm font-semibold">
                  Utilidades
                </SheetTitle>
                <SheetDescription className="text-[11px]">
                  Backup de dados, tema e alertas inteligentes.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 flex flex-col gap-4 overflow-y-auto hide-scrollbar-mobile">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Transferir dados
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExport}
                  className="justify-start gap-2 surface-container border border-border/60 hover:bg-muted/60"
                >
                  <Download className="h-4 w-4" />
                  <span className="text-[12px]">Exportar</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleImportClick}
                  className="justify-start gap-2 surface-container border border-border/60 hover:bg-muted/60"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-[12px]">Importar</span>
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Tema & Avisos
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 rounded-xl surface-container px-3 py-2 border border-border/60">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    <span className="text-[12px] font-medium">Tema</span>
                  </div>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as ThemeType)}
                    className="bg-transparent text-[12px] outline-none border-none focus:ring-0 px-1 py-0.5 rounded-md"
                  >
                    {themes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl surface-container border border-border/60 px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-[12px] font-medium">
                      Alertas inteligentes
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto hide-scrollbar-mobile">
                    <SidebarAlertas collapsed={false} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
