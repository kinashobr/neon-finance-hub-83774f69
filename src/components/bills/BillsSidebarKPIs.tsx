import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, DollarSign, Wallet, Target, RefreshCw, Calculator } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency } from "@/types/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, subDays, startOfMonth } from "date-fns";

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
    const status: 'success' | 'warning' | 'danger' = projectedBalance >= 0 ? (projectedBalance > initialBalance ? 'success' : 'warning') : 'danger';
    return { initialBalance, revenuePrevMonth, projectedBalance, netFlowProjected, totalExpensesForMonth, status };
  }, [currentDate, highLiquidityAccountIds, calculateBalanceUpToDate, transacoesV2, contasMovimento, getRevenueForPreviousMonth, monthlyRevenueForecast, totalPendingBills, totalPaidBills]);
  
  const handleUpdateForecast = () => {
    const parsed = parseFromBR(forecastInput);
    if (isNaN(parsed) || parsed < 0) return;
    setMonthlyRevenueForecast(parsed);
    setForecastInput(formatToBR(parsed));
  };
  
  const handleSuggestForecast = () => {
    const suggestedValue = calculos.revenuePrevMonth;
    setForecastInput(formatToBR(suggestedValue));
    setMonthlyRevenueForecast(suggestedValue);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d,.]/g, '');
    const parts = value.split(',');
    if (parts.length > 2) value = parts[0] + ',' + parts.slice(1).join('');
    setForecastInput(value);
  };

  return (
    <div className="space-y-4 shrink-0 w-full cq-gap-md">
      <Card className="glass-card stat-card-neutral overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="cq-text-sm flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Fluxo de Caixa Projetado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          <div className="flex justify-between items-center cq-text-xs p-2 rounded-lg bg-muted/30">
            <span className="text-muted-foreground">Saldo Inicial</span>
            <span className="font-semibold text-primary">{formatCurrency(calculos.initialBalance)}</span>
          </div>
          
          <div className="space-y-1.5 border-b border-border/50 pb-3">
            <Label className="cq-text-xs text-muted-foreground flex items-center justify-between">
                Previsão de Receita
                <Button variant="ghost" size="sm" className="h-6 text-[10px] p-1 gap-1" onClick={handleSuggestForecast}>
                    <RefreshCw className="w-2.5 h-2.5" /> Sugerir
                </Button>
            </Label>
            <div className="flex gap-2">
                <Input type="text" inputMode="decimal" value={forecastInput} onChange={handleInputChange} onBlur={handleUpdateForecast} className="h-8 cq-text-xs" />
                <Button onClick={handleUpdateForecast} className="h-8 px-2 cq-text-xs">Salvar</Button>
            </div>
          </div>
          
          <div className="flex justify-between items-center p-2 rounded-lg bg-destructive/5">
            <span className="text-destructive font-medium cq-text-xs flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5" /> Despesas
            </span>
            <span className="font-bold text-destructive cq-text-sm">{formatCurrency(calculos.totalExpensesForMonth)}</span>
          </div>

          <Separator className="my-2" />

          <div className="flex justify-between items-center cq-text-xs px-1">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" /> Fluxo Projetado
            </span>
            <span className={cn("font-bold", calculos.netFlowProjected >= 0 ? "text-success" : "text-destructive")}>
              {formatCurrency(calculos.netFlowProjected)}
            </span>
          </div>
          
          <div className={cn(
            "flex flex-col items-center p-4 rounded-xl border-2 mt-4 text-center",
            calculos.status === 'success' && "bg-success/10 border-success/30 text-success",
            calculos.status === 'warning' && "bg-warning/10 border-warning/30 text-warning",
            calculos.status === 'danger' && "bg-destructive/10 border-destructive/30 text-destructive"
          )}>
            <span className="font-bold cq-text-xs uppercase tracking-widest opacity-80">Saldo Final Projetado</span>
            <span className="font-black cq-text-xl mt-1">{formatCurrency(calculos.projectedBalance)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}