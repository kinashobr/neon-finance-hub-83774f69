import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, Wallet, Target, RefreshCw } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency } from "@/types/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, subDays, startOfMonth } from "date-fns";

interface BillsSidebarKPIsProps {
  currentDate: Date;
  totalPendingBills: number;
}

export function BillsSidebarKPIs({ currentDate, totalPendingBills }: BillsSidebarKPIsProps) {
  const { 
    monthlyRevenueForecast, 
    setMonthlyRevenueForecast, 
    getRevenueForPreviousMonth,
    calculateBalanceUpToDate,
    contasMovimento,
    transacoesV2,
  } = useFinance();
  
  const [forecastInput, setForecastInput] = useState(monthlyRevenueForecast.toFixed(2));

  // Contas de alta liquidez para cálculo de saldo inicial
  const highLiquidityAccountIds = useMemo(() => 
    contasMovimento
      .filter(c => ['corrente', 'poupanca', 'reserva', 'renda_fixa'].includes(c.accountType))
      .map(c => c.id)
  , [contasMovimento]);

  const calculos = useMemo(() => {
    const startOfCurrentMonth = startOfMonth(currentDate);
    const dayBeforeStart = subDays(startOfCurrentMonth, 1);
    
    // 1. Saldo Inicial (Caixa e Equivalentes)
    const initialBalance = highLiquidityAccountIds.reduce((acc, accountId) => {
      const balance = calculateBalanceUpToDate(accountId, dayBeforeStart, transacoesV2, contasMovimento);
      return acc + balance;
    }, 0);
    
    // 2. Receita do Mês Anterior (para sugestão)
    const revenuePrevMonth = getRevenueForPreviousMonth(currentDate);
    
    // 3. Saldo Projetado
    const projectedBalance = initialBalance + monthlyRevenueForecast - totalPendingBills;
    
    const status: 'success' | 'warning' | 'danger' = 
      projectedBalance >= 0 ? (projectedBalance > initialBalance ? 'success' : 'warning') : 'danger';

    return {
      initialBalance,
      revenuePrevMonth,
      projectedBalance,
      status,
    };
  }, [currentDate, highLiquidityAccountIds, calculateBalanceUpToDate, transacoesV2, contasMovimento, getRevenueForPreviousMonth, monthlyRevenueForecast, totalPendingBills]);
  
  const handleUpdateForecast = () => {
    const parsed = parseFloat(forecastInput.replace(',', '.'));
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Valor de previsão inválido.");
      return;
    }
    setMonthlyRevenueForecast(parsed);
    toast.success("Previsão de receita atualizada!");
  };
  
  const handleSuggestForecast = () => {
    setForecastInput(calculos.revenuePrevMonth.toFixed(2));
    setMonthlyRevenueForecast(calculos.revenuePrevMonth);
    toast.info("Previsão ajustada para a receita do mês anterior.");
  };

  return (
    <div className="space-y-4 shrink-0 w-full">
      <Card className="glass-card stat-card-neutral">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Fluxo de Caixa Projetado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          
          {/* Saldo Inicial */}
          <div className="flex justify-between items-center text-sm p-2 rounded-lg bg-muted/30">
            <span className="text-muted-foreground">Saldo Inicial (Caixa)</span>
            <span className="font-semibold text-primary">{formatCurrency(calculos.initialBalance)}</span>
          </div>
          
          {/* Previsão de Receita */}
          <div className="space-y-1 border-b border-border/50 pb-3">
            <Label className="text-xs text-muted-foreground flex items-center justify-between">
                Previsão de Receita ({format(currentDate, 'MMM')})
                <Button variant="ghost" size="sm" className="h-6 text-xs p-1 gap-1" onClick={handleSuggestForecast}>
                    <RefreshCw className="w-3 h-3" /> Sugerir ({formatCurrency(calculos.revenuePrevMonth)})
                </Button>
            </Label>
            <div className="flex gap-2">
                <Input
                    type="text"
                    inputMode="decimal"
                    value={forecastInput}
                    onChange={(e) => setForecastInput(e.target.value)}
                    onBlur={handleUpdateForecast}
                    placeholder="0,00"
                    className="h-8 text-sm"
                />
                <Button onClick={handleUpdateForecast} className="h-8 w-16 shrink-0">
                    Salvar
                </Button>
            </div>
          </div>
          
          {/* Contas Pendentes */}
          <div className="flex justify-between items-center text-sm p-2 rounded-lg bg-destructive/10">
            <span className="text-destructive font-medium flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Contas Pendentes
            </span>
            <span className="font-bold text-destructive">{formatCurrency(totalPendingBills)}</span>
          </div>
          
          {/* Saldo Projetado */}
          <div className={cn(
            "flex justify-between items-center p-3 rounded-lg border-2",
            calculos.status === 'success' && "bg-success/10 border-success/50 text-success",
            calculos.status === 'warning' && "bg-warning/10 border-warning/50 text-warning",
            calculos.status === 'danger' && "bg-destructive/10 border-destructive/50 text-destructive"
          )}>
            <span className="font-bold text-base">SALDO PROJETADO</span>
            <span className="font-extrabold text-xl">{formatCurrency(calculos.projectedBalance)}</span>
          </div>
          
        </CardContent>
      </Card>
    </div>
  );
}