import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Wallet, RefreshCw, Calculator, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency } from "@/types/finance";
import { cn } from "@/lib/utils";
import { startOfMonth, subDays } from "date-fns";

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
    
    const percentPaid = totalExpensesForMonth > 0 ? (totalPaidBills / totalExpensesForMonth) * 100 : 0;
    
    const status: 'success' | 'warning' | 'danger' = projectedBalance >= 0 ? (projectedBalance > initialBalance ? 'success' : 'warning') : 'danger';
    
    return { initialBalance, revenuePrevMonth, projectedBalance, netFlowProjected, totalExpensesForMonth, percentPaid, status };
  }, [currentDate, highLiquidityAccountIds, calculateBalanceUpToDate, transacoesV2, contasMovimento, getRevenueForPreviousMonth, monthlyRevenueForecast, totalPendingBills, totalPaidBills]);
  
  const handleUpdateForecast = () => {
    const parsed = parseFromBR(forecastInput);
    if (isNaN(parsed) || parsed < 0) return;
    setMonthlyRevenueForecast(parsed);
  };
  
  const handleSuggestForecast = () => {
    setForecastInput(formatToBR(calculos.revenuePrevMonth));
    setMonthlyRevenueForecast(calculos.revenuePrevMonth);
  };

  return (
    <div className="space-y-4 w-full">
      {/* CARD 1: RESUMO DE PAGAMENTOS */}
      <Card className="glass-card stat-card-info overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="cq-text-sm flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-info" />
            Progresso do Mês
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="cq-text-xs text-muted-foreground">Pago</span>
              <span className="cq-text-base font-bold text-success">{formatCurrency(totalPaidBills)}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="cq-text-xs text-muted-foreground">Total</span>
              <span className="cq-text-base font-bold">{formatCurrency(calculos.totalExpensesForMonth)}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <Progress value={calculos.percentPaid} className="h-2 bg-muted" />
            <div className="flex justify-between cq-text-xs font-medium text-muted-foreground">
              <span>{calculos.percentPaid.toFixed(0)}% concluído</span>
              {totalPendingBills > 0 && (
                <span className="flex items-center gap-1 text-warning">
                  <Clock className="w-3 h-3" /> {formatCurrency(totalPendingBills)} pendente
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: FLUXO E PROJEÇÃO */}
      <Card className="glass-card stat-card-neutral overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="cq-text-sm flex items-center gap-2 font-bold">
            <Wallet className="w-4 h-4 text-primary" />
            Fluxo de Caixa Projetado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          <div className="flex justify-between items-center cq-text-xs p-2 rounded-lg bg-muted/30">
            <span className="text-muted-foreground">Saldo Inicial do Mês</span>
            <span className="font-semibold">{formatCurrency(calculos.initialBalance)}</span>
          </div>
          
          <div className="space-y-1.5 border-b border-border/50 pb-3">
            <Label className="cq-text-xs text-muted-foreground flex items-center justify-between">
                Previsão de Receita
                <Button variant="ghost" size="sm" className="h-6 text-[10px] p-1 gap-1" onClick={handleSuggestForecast}>
                    <RefreshCw className="w-2.5 h-2.5" /> Sugerir
                </Button>
            </Label>
            <div className="flex gap-2">
                <Input 
                  type="text" 
                  inputMode="decimal" 
                  value={forecastInput} 
                  onChange={(e) => setForecastInput(e.target.value)} 
                  onBlur={handleUpdateForecast}
                  className="h-8 cq-text-xs bg-background/50" 
                />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center cq-text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-success" /> Receita
              </span>
              <span className="font-bold text-success">{formatCurrency(monthlyRevenueForecast)}</span>
            </div>
            <div className="flex justify-between items-center cq-text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-destructive" /> Despesas
              </span>
              <span className="font-bold text-destructive">{formatCurrency(calculos.totalExpensesForMonth)}</span>
            </div>
          </div>

          <Separator className="my-1" />

          <div className="flex justify-between items-center cq-text-xs px-1">
            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
              <Calculator className="w-3.5 h-3.5" /> Resultado do Mês
            </span>
            <span className={cn("font-bold", calculos.netFlowProjected >= 0 ? "text-success" : "text-destructive")}>
              {calculos.netFlowProjected > 0 ? '+' : ''}{formatCurrency(calculos.netFlowProjected)}
            </span>
          </div>
          
          <div className={cn(
            "flex flex-col items-center p-4 rounded-xl border-2 mt-2 text-center transition-all",
            calculos.status === 'success' && "bg-success/10 border-success/30 text-success shadow-[0_0_15px_rgba(34,197,94,0.1)]",
            calculos.status === 'warning' && "bg-warning/10 border-warning/30 text-warning",
            calculos.status === 'danger' && "bg-destructive/10 border-destructive/30 text-destructive shadow-[0_0_15px_rgba(239,68,68,0.1)]"
          )}>
            <span className="font-bold cq-text-xs uppercase tracking-widest opacity-80">Saldo Final Projetado</span>
            <span className="font-black cq-text-xl mt-1 leading-none">{formatCurrency(calculos.projectedBalance)}</span>
          </div>
        </CardContent>
      </Card>

      {/* AVISO DE ATENÇÃO (Se houver saldo negativo) */}
      {calculos.projectedBalance < 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="cq-text-xs font-medium leading-tight">
            Atenção: A projeção indica saldo negativo ao fim do mês. Revise suas despesas ou adicione novas receitas.
          </p>
        </div>
      )}
    </div>
  );
}