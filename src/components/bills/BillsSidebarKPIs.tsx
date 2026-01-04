import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, DollarSign, Wallet, Target, RefreshCw, Calculator, CreditCard } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency } from "@/types/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, subDays, startOfMonth } from "date-fns";

interface BillsSidebarKPIsProps {
  currentDate: Date;
  totalPendingBills: number; // Valor que AINDA falta pagar (não marcados como pagos)
  totalPaidBills?: number; // Valor que JÁ foi pago no mês
  totalCreditCardPaidBills?: number; // NOVO: Valor pago via Cartão de Crédito
}

// Helper para formatar número para string BR
const formatToBR = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Helper para converter string BR para float
const parseFromBR = (value: string): number => {
    const cleaned = value.replace(/[^\d,]/g, '');
    const parsed = parseFloat(cleaned.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
};

export function BillsSidebarKPIs({ 
  currentDate, 
  totalPendingBills, 
  totalPaidBills = 0,
  totalCreditCardPaidBills = 0 
}: BillsSidebarKPIsProps) {
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
    
    // As despesas totais consideram tudo que foi pago + o que falta pagar
    const totalExpensesForMonth = totalPendingBills + totalPaidBills;
    
    // O fluxo líquido projetado retira as despesas do faturamento previsto
    const netFlowProjected = monthlyRevenueForecast - totalExpensesForMonth;
    
    // O saldo final projetado considera apenas o impacto na liquidez (não retira o que foi pago no Cartão agora)
    // Mas para o planejamento, as despesas totais são o que importa
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

  const totalCashPaid = totalPaidBills - totalCreditCardPaidBills;

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
            <span className="font-semibold text-primary whitespace-nowrap">{formatCurrency(calculos.initialBalance)}</span>
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
                    onChange={handleInputChange}
                    onBlur={handleUpdateForecast}
                    placeholder="0,00"
                    className="h-8 text-sm"
                />
                <Button onClick={handleUpdateForecast} className="h-8 w-16 shrink-0">
                    Salvar
                </Button>
            </div>
          </div>
          
          {/* Despesas Totais */}
          <div className="flex justify-between items-center text-sm p-2 rounded-lg bg-destructive/10">
            <span className="text-destructive font-medium flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Despesas Totais (Mês)
            </span>
            <span className="font-bold text-destructive whitespace-nowrap">{formatCurrency(calculos.totalExpensesForMonth)}</span>
          </div>
          
          {/* Detalhe Pendente / Cartão */}
          <div className="space-y-1.5 bg-muted/20 p-2 rounded-lg">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> A pagar (Pendentes)
                </span>
                <span className="font-medium text-destructive whitespace-nowrap">{formatCurrency(totalPendingBills)}</span>
            </div>
            
            <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> Pago no Cartão (Dívida)
                </span>
                <span className="font-medium text-orange-500 whitespace-nowrap">{formatCurrency(totalCreditCardPaidBills)}</span>
            </div>
          </div>
          
          {/* Detalhe Pago Liquidez */}
          <div className="flex justify-between items-center text-xs px-2 text-muted-foreground">
            <span>Já pago (Saldo Líquido)</span>
            <span className="font-medium text-success whitespace-nowrap">{formatCurrency(totalCashPaid)}</span>
          </div>

          <Separator className="my-2" />

          {/* Fluxo Líquido Projetado */}
          <div className="flex justify-between items-center text-sm px-2">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5" /> Fluxo Líquido Projetado
            </span>
            <span className={cn(
              "font-bold whitespace-nowrap",
              calculos.netFlowProjected >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(calculos.netFlowProjected)}
            </span>
          </div>
          
          {/* Saldo Final Projetado */}
          <div className={cn(
            "flex justify-between items-center p-3 rounded-lg border-2 mt-2",
            calculos.status === 'success' && "bg-success/10 border-success/50 text-success",
            calculos.status === 'warning' && "bg-warning/10 border-warning/50 text-warning",
            calculos.status === 'danger' && "bg-destructive/10 border-destructive/50 text-destructive"
          )}>
            <span className="font-bold text-xs uppercase tracking-wider">
              Saldo Projetado <span className="whitespace-nowrap">(Com Caixa)</span>
            </span>
            <span className="font-extrabold text-lg whitespace-nowrap">{formatCurrency(calculos.projectedBalance)}</span>
          </div>
          
        </CardContent>
      </Card>
    </div>
  );
}