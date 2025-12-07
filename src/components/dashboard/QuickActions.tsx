import { 
  Plus, Minus, CreditCard, PiggyBank, Target, 
  FileText, BarChart3, TrendingUp, Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  route?: string;
  onClick?: () => void;
}

interface QuickActionsProps {
  onAddReceita?: () => void;
  onAddDespesa?: () => void;
  onAddEmprestimo?: () => void;
  onAddInvestimento?: () => void;
  onAddObjetivo?: () => void;
}

export function QuickActions({
  onAddReceita,
  onAddDespesa,
  onAddEmprestimo,
  onAddInvestimento,
  onAddObjetivo,
}: QuickActionsProps) {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      id: "add-receita",
      label: "Adicionar Receita",
      icon: Plus,
      color: "bg-success/20 text-success hover:bg-success/30 border-success/30",
      onClick: onAddReceita,
    },
    {
      id: "add-despesa",
      label: "Adicionar Despesa",
      icon: Minus,
      color: "bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30",
      onClick: onAddDespesa,
    },
    {
      id: "add-emprestimo",
      label: "Adicionar Empréstimo",
      icon: CreditCard,
      color: "bg-warning/20 text-warning hover:bg-warning/30 border-warning/30",
      onClick: onAddEmprestimo,
    },
    {
      id: "add-investimento",
      label: "Novo Investimento",
      icon: PiggyBank,
      color: "bg-primary/20 text-primary hover:bg-primary/30 border-primary/30",
      onClick: onAddInvestimento,
    },
    {
      id: "add-objetivo",
      label: "Novo Objetivo",
      icon: Target,
      color: "bg-accent/20 text-accent hover:bg-accent/30 border-accent/30",
      onClick: onAddObjetivo,
    },
    {
      id: "ver-balanco",
      label: "Ver Balanço",
      icon: FileText,
      color: "bg-muted text-foreground hover:bg-muted/80 border-border",
      route: "/relatorios",
    },
    {
      id: "ver-dre",
      label: "Ver DRE",
      icon: BarChart3,
      color: "bg-muted text-foreground hover:bg-muted/80 border-border",
      route: "/relatorios",
    },
    {
      id: "ver-indicadores",
      label: "Ver Indicadores",
      icon: TrendingUp,
      color: "bg-muted text-foreground hover:bg-muted/80 border-border",
      route: "/relatorios",
    },
  ];

  const handleClick = (action: QuickAction) => {
    if (action.route) {
      navigate(action.route);
    } else if (action.onClick) {
      action.onClick();
    }
  };

  return (
    <div className="glass-card p-5 animate-fade-in-up">
      <h3 className="text-lg font-semibold text-foreground mb-4">Ações Rápidas</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            className={cn(
              "flex flex-col items-center justify-center h-20 gap-2 border transition-all hover:scale-105",
              action.color
            )}
            onClick={() => handleClick(action)}
          >
            <action.icon className="h-5 w-5" />
            <span className="text-xs text-center leading-tight">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
