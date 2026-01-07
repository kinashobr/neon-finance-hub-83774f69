import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, Wallet, RefreshCw, Calculator, TrendingUp, AlertCircle, Save } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency } from "@/types/finance";
import { cn } from "@/lib/utils";
import { startOfMonth, subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface BillsSidebarKPIsProps {
  currentDate: Date;
  totalPendingBills: number;
  totalPaidBills?: number;
}

const formatToBR = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseFromBR = (value: string): number => {
    const cleaned = value.replace(/[^\d,]/g, '');
    const parsed = parseFloat(cleaned.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
};

export function BillsSidebarKPIs({ currentDate, totalPendingBills, totalPaidBills = 0 }: BillsSidebarKPIsProps) {
  const { 
    revenueForecasts, 
    setMonthlyRevenueForecast, 
    getRevenueForPreviousMonth,
    calculateBalanceUpToDate,
    contasMovimento,
    transacoesV2,
  } = useFinance();
  
  const monthKey = useMemo(() => format(currentDate, 'yyyy-MM'), [currentDate]);
  const currentForecast = revenueForecasts[monthKey] || 0;
  
  const [forecastInput, setForecastInput] = useState(() => formatToBR(currentForecast));
  
  // Atualiza o input local quando o mês ou o valor no contexto muda
  useEffect(() => {
      setForecastInput(formatToBR(currentForecast));
  }, [currentForecast, monthKey]);

  const highLiquidityAccountIds = useMemo(() => 
    contasMovimento
      .filter(c => ['corrente', 'poupanca', 'reserva', 'renda_fixa'].includes(c.accountType))
      .map(c => c.id)
  , [contasMovimento]);

  const calculos = useMemo(() => {
    const startOfCurrentMonth = startOfMonth(currentDate);
    const dayBeforeStart = subDays(startOfCurrentMonth, 1);
    
    const initialBalance = highLiquidityAccountIds.reduce((acc, accountId) => {
      const balance = calculateBalanceUpToDate(accountId, dayBeforeStart, transacoesV2, contasMovimento);
      return acc + balance;
    }, 0);

    const totalExpensesForMonth = totalPendingBills + totalPaidBills;
    const netFlowProjected = currentForecast - totalExpensesForMonth;
    const projectedBalance = initialBalance + netFlowProjected;
    
    return { initialBalance, projectedBalance, netFlowProjected, totalExpensesForMonth };
  }, [currentDate, highLiquidityAccountIds, calculateBalanceUpToDate, transacoesV2, contasMovimento, currentForecast, totalPendingBills, totalPaidBills]);
  
  const handleInputChange = (value: string) => {
    setForecastInput(value);
  };

  const handleBlur = () => {
    const parsed = parseFromBR(forecastInput);
    if (parsed !== currentForecast) {
        setMonthlyRevenueForecast(monthKey, parsed);
    }
  };

  const handleSuggest = () => {
    const sugg = getRevenueForPreviousMonth(currentDate);
    setForecastInput(formatToBR(sugg));
    setMonthlyRevenueForecast(monthKey, sugg);
    toast.info(`Previsão sugerida com base no mês anterior.`);
  };

  const monthLabel = format(currentDate, 'MMM', { locale: ptBR });

  return (
    <div className="flex flex-col h-full space-y-2.5 overflow-hidden">
      {/* HEADER COMPACTO */}
      <div className="flex items-center gap-2 px-1 mb-1 shrink-0">
        <Wallet className="w-3.5 h-3.5 text-primary shrink-0" />
        <h3 className="cq-text-xs font-bold uppercase tracking-tight text-muted-foreground truncate">Projeção {monthLabel}</h3>
      </div>

      {/* DISPONIBILIDADE */}
      <div className="glass-card p-3 flex justify-between items-center gap-2">
        <span className="cq-text-xs text-muted-foreground font-medium truncate">Caixa Inicial</span>
        <span className="cq-text-sm font-bold text-foreground truncate">{formatCurrency(calculos.initialBalance)}</span>
      </div>

      {/* PREVISÃO RECEITA */}
      <div className="glass-card p-3 space-y-2">
        <div className="flex justify-between items-center gap-2">
          <Label className="cq-text-xs text-muted-foreground font-medium truncate">Prev. Entradas</Label>
          <button 
            onClick={handleSuggest}
            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 shrink-0"
          >
            <RefreshCw className="w-2.5 h-2.5" /> SUGERIR
          </button>
        </div>
        <div className="relative">
          <TrendingUp className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-success/70" />
          <Input 
            type="text"
            value={forecastInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleBlur}
            placeholder="0,00"
            className="h-8 pl-6 cq-text-xs bg-background/50 border-border/40 rounded-lg w-full"
          />
        </div>
      </div>

      {/* COMPROMISSOS */}
      <div className="glass-card stat-card-negative p-3 bg-destructive/5 border-destructive/20">
        <div className="flex justify-between items-center mb-2 gap-2">
          <span className="cq-text-xs font-bold text-destructive uppercase tracking-tighter truncate">Compromissos</span>
          <span className="cq-text-base font-black text-destructive truncate">{formatCurrency(calculos.totalExpensesForMonth)}</span>
        </div>
        <div className="space-y-1 pt-1 border-t border-destructive/10">
          <div className="flex justify-between text-[10px] md:cq-text-xs gap-2">
            <span className="text-muted-foreground truncate">Pendentes + Cartão</span>
            <span className="font-semibold text-destructive truncate">{formatCurrency(totalPendingBills)}</span>
          </div>
          <div className="flex justify-between text-[10px] md:cq-text-xs gap-2">
            <span className="text-muted-foreground truncate">Já Pago (Débito)</span>
            <span className="text-success font-semibold truncate">{formatCurrency(totalPaidBills)}</span>
          </div>
        </div>
      </div>

      {/* RESULTADO E SALDO FINAL */}
      <div className={cn(
        "glass-card p-3 space-y-2 border-l-4 transition-all duration-300",
        calculos.projectedBalance >= 0 ? "stat-card-positive" : "stat-card-negative"
      )}>
        <div className="flex justify-between items-center cq-text-xs gap-2">
          <span className="text-muted-foreground font-medium truncate">Fluxo Líquido</span>
          <span className={cn("font-bold truncate", calculos.netFlowProjected >= 0 ? "text-success" : "text-destructive")}>
            {calculos.netFlowProjected > 0 ? '+' : ''}{formatCurrency(calculos.netFlowProjected)}
          </span>
        </div>
        
        <Separator className="opacity-30" />
        
        <div className="flex justify-between items-center gap-2">
          <div className="flex flex-col min-w-0">
            <span className="cq-text-xs font-bold text-muted-foreground uppercase leading-none tracking-tighter truncate">Saldo Final</span>
            <span className="text-[9px] text-muted-foreground opacity-70 truncate">Projetado</span>
          </div>
          <span className={cn(
            "cq-text-lg font-black tracking-tight truncate",
            calculos.projectedBalance >= 0 ? "text-success" : "text-destructive"
          )}>
            {formatCurrency(calculos.projectedBalance)}
          </span>
        </div>
      </div>

      {/* ALERTA DE ATENÇÃO */}
      {calculos.projectedBalance < 0 && (
        <div className="p-2 rounded-lg bg-warning/10 border border-warning/20 flex gap-2 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
          <p className="text-[9px] leading-tight text-warning-foreground font-medium">
            Saldo projetado negativo. Revise seus custos.
          </p>
        </div>
      )}
    </div>
  );
}