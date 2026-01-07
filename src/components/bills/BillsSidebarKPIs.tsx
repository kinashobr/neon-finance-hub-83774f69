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
    monthlyRevenueForecast, 
    setMonthlyRevenueForecast, 
    getRevenueForPreviousMonth,
    calculateBalanceUpToDate,
    contasMovimento,
    transacoesV2,
  } = useFinance();
  
  const [forecastInput, setForecastInput] = useState(() => formatToBR(monthlyRevenueForecast));
  
  useEffect(() => {
      setForecastInput(formatToBR(monthlyRevenueForecast));
  }, [monthlyRevenueForecast]);

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
    const netFlowProjected = monthlyRevenueForecast - totalExpensesForMonth;
    const projectedBalance = initialBalance + netFlowProjected;
    
    return { initialBalance, projectedBalance, netFlowProjected, totalExpensesForMonth };
  }, [currentDate, highLiquidityAccountIds, calculateBalanceUpToDate, transacoesV2, contasMovimento, monthlyRevenueForecast, totalPendingBills, totalPaidBills]);
  
  const handleUpdateForecast = () => {
    const parsed = parseFromBR(forecastInput);
    setMonthlyRevenueForecast(parsed);
    toast.success("Previsão salva!");
  };

  const monthLabel = format(currentDate, 'MMM', { locale: ptBR });

  return (
    <div className="flex flex-col h-full space-y-2.5">
      {/* HEADER COMPACTO */}
      <div className="flex items-center gap-2 px-1 mb-1">
        <Wallet className="w-3.5 h-3.5 text-primary" />
        <h3 className="cq-text-xs font-bold uppercase tracking-tight text-muted-foreground">Projeção {monthLabel}</h3>
      </div>

      {/* DISPONIBILIDADE */}
      <div className="glass-card p-3 flex justify-between items-center">
        <span className="cq-text-xs text-muted-foreground font-medium">Caixa Inicial</span>
        <span className="cq-text-sm font-bold text-foreground">{formatCurrency(calculos.initialBalance)}</span>
      </div>

      {/* PREVISÃO RECEITA */}
      <div className="glass-card p-3 space-y-2">
        <div className="flex justify-between items-center">
          <Label className="cq-text-xs text-muted-foreground font-medium">Prev. Entradas</Label>
          <button 
            onClick={() => {
              const sugg = getRevenueForPreviousMonth(currentDate);
              setForecastInput(formatToBR(sugg));
              setMonthlyRevenueForecast(sugg);
            }}
            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-2.5 h-2.5" /> SUGERIR
          </button>
        </div>
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <TrendingUp className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-success/70" />
            <Input 
              type="text"
              value={forecastInput}
              onChange={(e) => setForecastInput(e.target.value)}
              className="h-8 pl-6 cq-text-xs bg-background/50 border-border/40 rounded-lg"
            />
          </div>
          <Button size="icon" variant="secondary" onClick={handleUpdateForecast} className="h-8 w-8 shrink-0">
            <Save className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* COMPROMISSOS (Box Vermelho Compacto) */}
      <div className="glass-card stat-card-negative p-3 bg-destructive/5 border-destructive/20">
        <div className="flex justify-between items-center mb-2">
          <span className="cq-text-xs font-bold text-destructive uppercase tracking-tighter">Compromissos</span>
          <span className="cq-text-base font-black text-destructive">{formatCurrency(calculos.totalExpensesForMonth)}</span>
        </div>
        <div className="space-y-1 pt-1 border-t border-destructive/10">
          <div className="flex justify-between text-[10px] md:cq-text-xs">
            <span className="text-muted-foreground">Pendentes + Cartão</span>
            <span className="font-semibold text-destructive">{formatCurrency(totalPendingBills)}</span>
          </div>
          <div className="flex justify-between text-[10px] md:cq-text-xs">
            <span className="text-muted-foreground">Já Pago (Débito)</span>
            <span className="text-success font-semibold">{formatCurrency(totalPaidBills)}</span>
          </div>
        </div>
      </div>

      {/* RESULTADO E SALDO FINAL (A parte mais importante, compactada) */}
      <div className={cn(
        "glass-card p-3 space-y-2 border-l-4 transition-all duration-300",
        calculos.projectedBalance >= 0 ? "stat-card-positive" : "stat-card-negative"
      )}>
        <div className="flex justify-between items-center cq-text-xs">
          <span className="text-muted-foreground font-medium">Fluxo Líquido</span>
          <span className={cn("font-bold", calculos.netFlowProjected >= 0 ? "text-success" : "text-destructive")}>
            {calculos.netFlowProjected > 0 ? '+' : ''}{formatCurrency(calculos.netFlowProjected)}
          </span>
        </div>
        
        <Separator className="opacity-30" />
        
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="cq-text-xs font-bold text-muted-foreground uppercase leading-none tracking-tighter">Saldo Final</span>
            <span className="text-[9px] text-muted-foreground opacity-70">Projetado</span>
          </div>
          <span className={cn(
            "cq-text-lg font-black tracking-tight",
            calculos.projectedBalance >= 0 ? "text-success" : "text-destructive"
          )}>
            {formatCurrency(calculos.projectedBalance)}
          </span>
        </div>
      </div>

      {/* ALERTA DE ATENÇÃO (Apenas se negativo e bem pequeno) */}
      {calculos.projectedBalance < 0 && (
        <div className="p-2 rounded-lg bg-warning/10 border border-warning/20 flex gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
          <p className="text-[9px] leading-tight text-warning-foreground font-medium">
            Saldo projetado negativo. Revise seus custos.
          </p>
        </div>
      )}
    </div>
  );
}