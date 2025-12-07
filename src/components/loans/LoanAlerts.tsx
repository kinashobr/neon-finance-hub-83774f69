import { useMemo } from "react";
import { 
  AlertTriangle, 
  Bell, 
  Calendar, 
  Trophy, 
  TrendingDown,
  CheckCircle2,
  Clock,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Emprestimo } from "@/contexts/FinanceContext";

interface AlertItem {
  id: string;
  type: "warning" | "info" | "success" | "danger";
  icon: React.ElementType;
  title: string;
  description: string;
}

interface LoanAlertsProps {
  emprestimos: Emprestimo[];
  className?: string;
}

export function LoanAlerts({ emprestimos, className }: LoanAlertsProps) {
  const alerts = useMemo<AlertItem[]>(() => {
    const items: AlertItem[] = [];
    
    // Próxima parcela (simulação - próximo dia 10)
    const hoje = new Date();
    const proximoDia = new Date(hoje.getFullYear(), hoje.getMonth(), 10);
    if (proximoDia <= hoje) {
      proximoDia.setMonth(proximoDia.getMonth() + 1);
    }
    const diasRestantes = Math.ceil((proximoDia.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diasRestantes <= 5) {
      items.push({
        id: "proxima-parcela",
        type: "warning",
        icon: Calendar,
        title: "Próxima Parcela",
        description: `Vencimento em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} (${proximoDia.toLocaleDateString("pt-BR")})`,
      });
    }

    // Parcelas atrasadas (simulação)
    const emprestimosAtrasados = emprestimos.filter(e => {
      const parcelasPagas = Math.floor(e.meses * 0.3);
      const mesAtual = hoje.getMonth() + 1;
      return parcelasPagas < mesAtual - 1;
    });

    if (emprestimosAtrasados.length > 0) {
      items.push({
        id: "parcelas-atrasadas",
        type: "danger",
        icon: AlertTriangle,
        title: "Parcelas Atrasadas",
        description: `${emprestimosAtrasados.length} empréstimo(s) com parcela(s) em atraso`,
      });
    }

    // Sugestão de quitação
    const emprestimosCaros = emprestimos.filter(e => e.taxaMensal > 2);
    if (emprestimosCaros.length > 0) {
      const economia = emprestimosCaros.reduce((acc, e) => {
        const jurosRestantes = (e.parcela * e.meses * 0.7) - (e.valorTotal * 0.7);
        return acc + Math.max(0, jurosRestantes * 0.3);
      }, 0);
      
      items.push({
        id: "sugestao-quitacao",
        type: "info",
        icon: TrendingDown,
        title: "Sugestão de Quitação",
        description: `Quitando antecipadamente, você pode economizar até R$ ${economia.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
      });
    }

    // Conquistas
    const totalPago = emprestimos.reduce((acc, e) => {
      const parcelasPagas = Math.floor(e.meses * 0.3);
      return acc + (parcelasPagas * e.parcela);
    }, 0);
    const totalContratado = emprestimos.reduce((acc, e) => acc + e.valorTotal, 0);
    const percentualQuitado = totalContratado > 0 ? (totalPago / totalContratado) * 100 : 0;

    if (percentualQuitado >= 25 && percentualQuitado < 50) {
      items.push({
        id: "conquista-25",
        type: "success",
        icon: Trophy,
        title: "Conquista: 25% Quitado!",
        description: "Você já pagou 1/4 das suas dívidas. Continue assim!",
      });
    } else if (percentualQuitado >= 50 && percentualQuitado < 75) {
      items.push({
        id: "conquista-50",
        type: "success",
        icon: Sparkles,
        title: "Conquista: Metade do Caminho!",
        description: "Você já quitou 50% das suas dívidas. Incrível!",
      });
    } else if (percentualQuitado >= 75) {
      items.push({
        id: "conquista-75",
        type: "success",
        icon: CheckCircle2,
        title: "Conquista: Reta Final!",
        description: "Você já pagou 75% das suas dívidas. Quase lá!",
      });
    }

    // Se não houver alertas, mostra mensagem positiva
    if (items.length === 0) {
      items.push({
        id: "tudo-ok",
        type: "success",
        icon: CheckCircle2,
        title: "Tudo em Dia!",
        description: "Seus empréstimos estão sob controle. Continue assim!",
      });
    }

    return items;
  }, [emprestimos]);

  const typeStyles = {
    warning: "bg-warning/10 border-warning/30 text-warning",
    info: "bg-primary/10 border-primary/30 text-primary",
    success: "bg-success/10 border-success/30 text-success",
    danger: "bg-destructive/10 border-destructive/30 text-destructive",
  };

  return (
    <div className={cn("glass-card p-5", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Alertas Inteligentes</h3>
      </div>
      <div className="space-y-3">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-all hover:scale-[1.01]",
                typeStyles[alert.type]
              )}
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{alert.title}</p>
                <p className="text-xs opacity-80 mt-0.5">{alert.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
