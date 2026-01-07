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
    
    const status: 'success' | 'warning' | 'danger' = 
      projectedBalance >= 0 ? (projectedBalance > initialBalance ? 'success' : 'warning') : 'danger';

    return {
      initialBalance,
      revenuePrevMonth,
      projectedBalance,
      netFlowProjected,
      totalExpensesForMonth,
      status,
    };
  }, [currentDate, highLiquidityAccountIds, calculateBalanceUpToDate, transacoesV2, contasMovimento, getRevenueForPreviousMonth, monthlyRevenueForecast, totalPendingBills, totalPaidBills]);
  
  const handleUpdateForecast = () => {
    const parsed = parseFromBR(forecastInput);
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Valor de previsão inválido.");
      return;
    }
    setMonthlyRevenueForecast(parsed);
    setForecastInput(formatToBR(parsed));
    toast.success("Previsão de receita atualizada!");
  };
  
  const handleSuggestForecast = () => {
    const suggestedValue = calculos.revenuePrevMonth;
    setForecastInput(formatToBR(suggestedValue));
    setMonthlyRevenueForecast(suggestedValue);
    toast.info("Previsão ajustada para a receita do mês anterior.");
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^\d,.]/g, '');
    const parts = value.split(',');
    if (parts.length > 2) {
        value = parts[0] + ',' + parts.slice(1).join('');
    }
    setForecastInput(value);
  };

  return (
    <div className="space-y-3 md:space-y-4 shrink-0 w-full">
      <Card className="glass-card stat-card-neutral overflow-hidden">
        <CardHeader className="p-3 md:p-4 pb-1 md:pb-2">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
            Resumo do Fluxo
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-1 md:pt-2 space-y-3">
          
          {/* Grid de Saldos para Mobile, Lista para Desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
            <div className="flex justify-between items-center text-xs md:text-sm p-2 rounded-lg bg-muted/30">
              <span className="text-muted-foreground">Saldo Inicial (Caixa)</span>
              <span className="font-semibold text-primary whitespace-nowrap">{formatCurrency(calculos.initialBalance)}</span>
            </div>
            
            <div className="flex justify-between items-center text-xs md:text-sm p-2 rounded-lg bg-destructive/10">
              <span className="text-destructive font-medium flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Despesas do Mês
              </span>
              <span className="font-bold text-destructive whitespace-nowrap">{formatCurrency(calculos.totalExpensesForMonth)}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 border-y border-border/50 py-2">
            <div className="flex justify-between items-center text-[10px] md:text-xs px-1 text-muted-foreground">
              <span>Pendentes + Cartão</span>
              <span className="font-medium text-destructive">{formatCurrency(totalPendingBills)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] md:text-xs px-1 text-muted-foreground">
              <span>Pago (Dinheiro)</span>
              <span className="font-medium text-success">{formatCurrency(totalPaidBills)}</span>
            </div>
          </div>

          {/* Previsão de Receita - Layout compacto */}
          <div className="space-y-1.5">
            <Label className="text-[10px] md:text-xs text-muted-foreground flex items-center justify-between">
                Receita Prevista ({format(currentDate, 'MMM')})
                <Button variant="ghost" size="sm" className="h-5 text-[9px] md:text-xs p-0 gap-1 hover:bg-transparent" onClick={handleSuggestForecast}>
                    Sugerir ({formatCurrency(calculos.revenuePrevMonth)})
                </Button>
            </Label>
            <div className="flex gap-1.5">
                <Input
                    type="text"
                    inputMode="decimal"
                    value={forecastInput}
                    onChange={handleInputChange}
                    onBlur={handleUpdateForecast}
                    placeholder="0,00"
                    className="h-7 md:h-8 text-xs md:text-sm rounded-md"
                />
                <Button onClick={handleUpdateForecast} size="sm" className="h-7 md:h-8 px-2 md:px-3 text-xs shrink-0">
                    OK
                </Button>
            </div>
          </div>
          
          <Separator className="hidden lg:block my-2" />

          {/* Fluxo e Saldo Projetado - Destaque */}
          <div className="space-y-2 mt-2">
            <div className="flex justify-between items-center text-xs md:text-sm px-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calculator className="w-3 h-3 md:w-3.5 md:h-3.5" /> Fluxo Líquido
              </span>
              <span className={cn(
                "font-bold whitespace-nowrap",
                calculos.netFlowProjected >= 0 ? "text-success" : "text-destructive"
              )}>
                {formatCurrency(calculos.netFlowProjected)}
              </span>
            </div>
            
            <div className={cn(
              "flex flex-col md:flex-row md:justify-between md:items-center p-2.5 rounded-lg border-2",
              calculos.status === 'success' && "bg-success/10 border-success/30 text-success",
              calculos.status === 'warning' && "bg-warning/10 border-warning/30 text-warning",
              calculos.status === 'danger' && "bg-destructive/10 border-destructive/30 text-destructive"
            )}>
              <span className="font-bold text-[10px] md:text-xs uppercase tracking-wider mb-1 md:mb-0">
                Saldo Projetado <span className="opacity-70">(Final)</span>
              </span>
              <span className="font-extrabold text-base md:text-lg whitespace-nowrap leading-none">
                {formatCurrency(calculos.projectedBalance)}
              </span>
            </div>
          </div>
          
        </CardContent>
      </Card>
    </div>
  );
}