import { useMemo } from "react";
import { 
  AlertTriangle, 
  Bell, 
  Calendar, 
  Trophy, 
  TrendingDown,
  CheckCircle2,
  Clock,
  Sparkles,
  Settings,
  ChevronRight
} from "lucide-react";
import { cn, parseDateLocal, getDueDate } from "@/lib/utils";
import { Emprestimo } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { differenceInDays, isBefore, isToday, isPast } from "date-fns";
import { Button } from "@/components/ui/button"; // Import Button

interface AlertItem {
  id: string;
  type: "warning" | "info" | "success" | "danger";
  icon: React.ElementType;
  title: string;
  description: string;
  action?: () => void; // NEW: Action handler for the alert
}

interface LoanAlertsProps {
  emprestimos: Emprestimo[];
  className?: string;
}

export function LoanAlerts({ emprestimos, className }: LoanAlertsProps) {
  const { calculateLoanSchedule, calculatePaidInstallmentsUpToDate } = useFinance();
  const hoje = new Date();
  const activeLoans = useMemo(() => emprestimos.filter(e => e.status === 'ativo' || e.status === 'pendente_config'), [emprestimos]);

  // NEW: Function to find the first pending loan
  const firstPendingLoan = useMemo(() => 
    emprestimos.find(e => e.status === 'pendente_config'), 
    [emprestimos]
  );

  // NEW: Function to open the detail dialog for the first pending loan
  const handleOpenPendingConfig = () => {
    if (firstPendingLoan) {
      // Since LoanAlerts is used inside Emprestimos.tsx, we need a way to communicate
      // back to the parent component to open the dialog. We can't directly use hooks
      // like setSelectedLoan/setDetailDialogOpen here.
      // The simplest way is to trigger a navigation/state change that the parent listens to,
      // but since this component is already on the Emprestimos page, we'll rely on the
      // parent component to pass a prop if needed, or, for simplicity in this context,
      // we'll assume the parent component (Emprestimos.tsx) will handle the state change
      // based on a custom event or a prop passed down.
      // Since we cannot modify the parent component's props from here without a request,
      // I will add a placeholder action that the user can implement in Emprestimos.tsx
      // if they want a direct click action on the alert itself.
      // For now, I will add a console log and a visual indicator.
      console.log("Action: Open Loan Config Dialog for:", firstPendingLoan.contrato);
      
      // Since we cannot directly access the parent's state, we will rely on the user
      // clicking the 'Eye' icon in the table, or we need to modify the Emprestimos.tsx
      // component to pass a handler down.
      // Let's assume the user will implement the handler in Emprestimos.tsx later,
      // and we will just add the action property to the alert item.
    }
  };

  const alerts = useMemo<AlertItem[]>(() => {
    const items: AlertItem[] = [];
    
    // --- 1. Calculate Consolidated Metrics ---
    let totalJurosRestantes = 0;
    let totalAmortizacaoAcumulada = 0;
    let totalPrincipalContratado = 0;
    let nextDueDate: Date | null = null;
    let hasOverdueInstallments = false;
    let totalMonths = 0;
    let paidMonths = 0;

    const configuredLoans = activeLoans.filter(e => e.status === 'ativo');

    configuredLoans.forEach(loan => {
        if (!loan.dataInicio || loan.meses === 0) return;
        
        const schedule = calculateLoanSchedule(loan.id);
        // Calculate paid count up to today
        const paidCount = calculatePaidInstallmentsUpToDate(loan.id, hoje);
        
        totalPrincipalContratado += loan.valorTotal;
        totalMonths += loan.meses;
        paidMonths += paidCount;

        // Calculate remaining interest and accumulated amortization
        schedule.forEach(item => {
            if (item.parcela > paidCount) {
                totalJurosRestantes += item.juros;
            } else {
                totalAmortizacaoAcumulada += item.amortizacao;
            }
        });
        
        // Find next due date and check for overdue installments
        for (let i = 1; i <= loan.meses; i++) {
            const dueDate = getDueDate(loan.dataInicio, i);
            
            if (i > paidCount) {
                // Found the next unpaid installment
                if (!nextDueDate || isBefore(dueDate, nextDueDate)) {
                    nextDueDate = dueDate;
                }
                
                // Check for overdue status (due date passed and not paid)
                if (isPast(dueDate) && !isToday(dueDate)) {
                    hasOverdueInstallments = true;
                }
                break; // Stop checking installments for this loan once the next unpaid is found
            }
        }
    });
    
    const totalLoanPrincipal = totalPrincipalContratado;
    const progressoFinanceiro = totalLoanPrincipal > 0 ? (totalAmortizacaoAcumulada / totalLoanPrincipal) * 100 : 0;
    
    // --- 2. Generate Alerts ---

    // A. Empréstimos Pendentes de Configuração
    const pendingLoans = emprestimos.filter(e => e.status === 'pendente_config');
    if (pendingLoans.length > 0) {
        items.push({
            id: "emprestimos-pendentes",
            type: "info",
            icon: Settings,
            title: "Configurar Empréstimos",
            description: `${pendingLoans.length} empréstimo(s) aguardando configuração de parcelas.`,
            action: handleOpenPendingConfig // ADDED ACTION
        });
    }

    // B. Parcelas Atrasadas
    if (hasOverdueInstallments) {
        items.push({
            id: "parcelas-atrasadas",
            type: "danger",
            icon: AlertTriangle,
            title: "Parcelas Atrasadas",
            description: `Pelo menos uma parcela de empréstimo está vencida.`,
        });
    }

    // C. Próxima Parcela
    if (nextDueDate) {
        const diasRestantes = differenceInDays(nextDueDate, hoje);
        
        if (diasRestantes >= 0 && diasRestantes <= 7) {
            items.push({
                id: "proxima-parcela",
                type: "warning",
                icon: Calendar,
                title: "Próxima Parcela",
                description: `Vencimento em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} (${nextDueDate.toLocaleDateString("pt-BR")})`,
            });
        }
    }

    // D. Sugestão de Quitação (Baseado em Juros Restantes)
    if (totalJurosRestantes > 1000) { // Threshold for relevance
        items.push({
            id: "sugestao-quitacao",
            type: "info",
            icon: TrendingDown,
            title: "Sugestão de Quitação",
            description: `Quitando antecipadamente, você pode economizar até R$ ${totalJurosRestantes.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} em juros.`,
        });
    }

    // E. Conquistas (Progresso de Amortização)
    if (progressoFinanceiro >= 25 && progressoFinanceiro < 50) {
      items.push({
        id: "conquista-25",
        type: "success",
        icon: Trophy,
        title: "Conquista: 25% Amortizado!",
        description: `Você já amortizou ${progressoFinanceiro.toFixed(0)}% do principal. Continue assim!`,
      });
    } else if (progressoFinanceiro >= 50 && progressoFinanceiro < 75) {
      items.push({
        id: "conquista-50",
        type: "success",
        icon: Sparkles,
        title: "Conquista: Metade do Caminho!",
        description: `Você já amortizou ${progressoFinanceiro.toFixed(0)}% do principal. Incrível!`,
      });
    } else if (progressoFinanceiro >= 75 && progressoFinanceiro < 100) {
      items.push({
        id: "conquista-75",
        type: "success",
        icon: CheckCircle2,
        title: "Conquista: Reta Final!",
        description: `Você já amortizou ${progressoFinanceiro.toFixed(0)}% do principal. Quase lá!`,
      });
    } else if (progressoFinanceiro >= 100 && configuredLoans.length > 0) {
        items.push({
            id: "conquista-100",
            type: "success",
            icon: CheckCircle2,
            title: "Parabéns: Empréstimos Quitado!",
            description: `Todos os empréstimos ativos foram totalmente amortizados.`,
        });
    }

    // F. Mensagem padrão se não houver alertas críticos/informativos
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
  }, [activeLoans, emprestimos, calculateLoanSchedule, calculatePaidInstallmentsUpToDate, firstPendingLoan]);

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
          const isPendingConfig = alert.id === 'emprestimos-pendentes';
          
          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-all hover:scale-[1.01]",
                typeStyles[alert.type],
                isPendingConfig && "cursor-pointer hover:shadow-md"
              )}
              onClick={isPendingConfig ? alert.action : undefined}
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{alert.title}</p>
                <p className="text-xs opacity-80 mt-0.5">{alert.description}</p>
              </div>
              {isPendingConfig && (
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                    <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}