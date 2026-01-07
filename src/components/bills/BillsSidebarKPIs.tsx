import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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

    const revenuePrevMonth = getRevenueForPreviousMonth(currentDate);
    const totalExpensesForMonth = totalPendingBills + totalPaidBills;
    const netFlowProjected = monthlyRevenueForecast - totalExpensesForMonth;
    const projectedBalance = initialBalance + netFlowProjected;
    
    return { 
      initialBalance, 
      revenuePrevMonth, 
      projectedBalance, 
      netFlowProjected, 
      totalExpensesForMonth 
    };
  }, [currentDate, highLiquidityAccountIds, calculateBalanceUpToDate, transacoesV2, contasMovimento, getRevenueForPreviousMonth, monthlyRevenueForecast, totalPendingBills, totalPaidBills]);
  
  const handleUpdateForecast = () => {
    const parsed = parseFromBR(forecastInput);
    setMonthlyRevenueForecast(parsed);
    toast.success("Previsão atualizada!");
  };
  
  const handleSuggestForecast = () => {
    const suggestion = calculos.revenuePrevMonth;
    setForecastInput(formatToBR(suggestion));
    setMonthlyRevenueForecast(suggestion);
  };

  const monthLabel = format(currentDate, 'MMMM', { locale: ptBR });

  return (
    <div className="space-y-4">
      {/* HEADER TÍTULO */}
      <div className="flex items-center gap-2 px-1 mb-2">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <Wallet className="w-4 h-4" />
        </div>
        <h3 className="cq-text-sm font-bold tracking-tight text-foreground uppercase">Projeção de Fluxo</h3>
      </div>

      {/* SALDO INICIAL */}
      <div className="glass-card p-4 space-y-1">
        <Label className="cq-text-xs text-muted-foreground font-medium">Disponibilidade Inicial (Caixa)</Label>
        <p className="cq-text-lg font-bold text-foreground">
          {formatCurrency(calculos.initialBalance)}
        </p>
      </div>

      {/* PREVISÃO DE RECEITA */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex justify-between items-center">
          <Label className="cq-text-xs text-muted-foreground font-medium">Previsão de Entradas</Label>
          <button 
            onClick={handleSuggestForecast}
            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-2.5 h-2.5" /> SUGERIR
          </button>
        </div>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <TrendingUp className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-success" />
            <Input 
              type="text"
              inputMode="decimal"
              value={forecastInput}
              onChange={(e) => setForecastInput(e.target.value)}
              className="h-9 pl-8 cq-text-sm bg-background border-border/50 rounded-lg"
            />
          </div>
          <Button 
            size="icon"
            variant="secondary"
            onClick={handleUpdateForecast}
            className="h-9 w-9 shrink-0"
          >
            <Save className="w-4 h-4" />
          </Button>
        </div>
        
        {calculos.revenuePrevMonth > 0 && (
          <p className="cq-text-xs text-muted-foreground italic">
            Ref. mês anterior: {formatCurrency(calculos.revenuePrevMonth)}
          </p>
        )}
      </div>

      {/* BLOCO DE DESPESAS */}
      <div className="glass-card stat-card-negative p-4 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-0.5">
            <Label className="cq-text-xs text-muted-foreground font-medium uppercase tracking-wider">Compromissos</Label>
            <p className="cq-text-lg font-black text-destructive">
              {formatCurrency(calculos.totalExpensesForMonth)}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>

        <Separator className="opacity-50" />

        <div className="space-y-2">
          <div className="flex justify-between cq-text-xs">
            <span className="text-muted-foreground">A Pagar + Cartão</span>
            <span className="font-semibold">{formatCurrency(totalPendingBills)}</span>
          </div>
          <div className="flex justify-between cq-text-xs">
            <span className="text-muted-foreground">Já Pago (Débito)</span>
            <span className="text-success font-semibold">{formatCurrency(totalPaidBills)}</span>
          </div>
        </div>
      </div>

      {/* RESULTADO FINAL */}
      <div className={cn(
        "glass-card p-5 border-l-4 transition-all duration-300",
        calculos.projectedBalance >= 0 ? "stat-card-positive" : "stat-card-negative"
      )}>
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4 text-muted-foreground" />
          <span className="cq-text-xs font-bold text-muted-foreground uppercase tracking-widest">Saldo Projetado</span>
        </div>
        
        <div className="space-y-0.5">
          <p className={cn(
            "cq-text-xl font-black leading-none",
            calculos.projectedBalance >= 0 ? "text-success" : "text-destructive"
          )}>
            {formatCurrency(calculos.projectedBalance)}
          </p>
          <div className="flex items-center gap-1.5 pt-1">
            <Badge variant="outline" className={cn(
              "cq-text-xs py-0 px-1.5 border-0",
              calculos.netFlowProjected >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {calculos.netFlowProjected >= 0 ? '+' : ''}{formatCurrency(calculos.netFlowProjected)} de fluxo
            </Badge>
          </div>
        </div>
      </div>

      {/* ALERTA DE ATENÇÃO */}
      {calculos.projectedBalance < 0 && (
        <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 flex gap-3 animate-pulse">
          <AlertCircle className="w-4 h-4 text-warning shrink-0" />
          <p className="text-[10px] leading-tight text-warning-foreground font-medium">
            Sua projeção indica que o caixa não cobrirá as despesas. Considere reduzir custos ou antecipar receitas.
          </p>
        </div>
      )}
    </div>
  );
}