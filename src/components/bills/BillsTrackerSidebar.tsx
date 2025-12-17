import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, TrendingUp, TrendingDown, Wallet, CheckCircle2, AlertTriangle, Repeat } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { formatCurrency } from "@/types/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { startOfMonth } from "date-fns";

interface BillsTrackerSidebarProps {
  currentDate: Date;
  totalPendingBills: number;
}

export function BillsTrackerSidebar({ currentDate, totalPendingBills }: BillsTrackerSidebarProps) {
  const { 
    contasMovimento, 
    calculateBalanceUpToDate, 
    transacoesV2, 
    monthlyRevenueForecast, 
    setMonthlyRevenueForecast,
    getRevenueForPreviousMonth,
  } = useFinance();
  
  const [forecastInput, setForecastInput] = useState(monthlyRevenueForecast.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

  useEffect(() => {
    // Update input when global state changes
    setForecastInput(monthlyRevenueForecast.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  }, [monthlyRevenueForecast]);

  const parseAmount = (value: string): number => {
    // Remove thousands separator (.), replace comma (,) with dot (.) for decimal
    const parsed = parseFloat(value.replace(/\./g, '').replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleForecastChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Simple cleaning: allow digits, comma, and dot
    let cleaned = rawValue.replace(/[^\d,.]/g, '');
    
    // Basic formatting to keep it clean
    if (cleaned.includes(',')) {
        cleaned = cleaned.replace(',', '.');
    }
    
    setForecastInput(cleaned);
  };
  
  const handleForecastBlur = () => {
    const parsed = parseAmount(forecastInput);
    setMonthlyRevenueForecast(parsed);
    setForecastInput(parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    toast.success("Previsão de receita atualizada!");
  };

  // 1. Saldo Atual das Contas Correntes (Início do Mês)
  const currentMonthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  
  const currentAccountBalances = useMemo(() => {
    const balances: { name: string; balance: number; type: string }[] = [];
    
    // Only consider accounts that are typically used for payments/liquidity
    contasMovimento.filter(c => c.accountType === 'corrente' || c.accountType === 'poupanca' || c.accountType === 'reserva').forEach(account => {
      // Calculate balance up to the day BEFORE the current month starts
      const dayBeforeStart = startOfMonth(currentMonthStart);
      const balance = calculateBalanceUpToDate(account.id, dayBeforeStart, transacoesV2, contasMovimento);
      balances.push({
        name: account.name,
        balance: balance,
        type: account.accountType,
      });
    });
    
    return balances;
  }, [contasMovimento, transacoesV2, calculateBalanceUpToDate, currentMonthStart]);
  
  const totalInitialBalance = useMemo(() => 
    currentAccountBalances.reduce((acc, c) => acc + c.balance, 0)
  , [currentAccountBalances]);
  
  // 2. Saldo Projetado após Pagamento
  const projectedFinalBalance = useMemo(() => {
    // Saldo Inicial do Mês + Previsão de Receita - Contas Pendentes
    return totalInitialBalance + monthlyRevenueForecast - totalPendingBills;
  }, [totalInitialBalance, monthlyRevenueForecast, totalPendingBills]);
  
  // 3. Receita do Mês Anterior (para referência)
  const previousMonthRevenue = useMemo(() => getRevenueForPreviousMonth(currentDate), [getRevenueForPreviousMonth, currentDate]);

  return (
    <div className="space-y-4">
      {/* Saldo Inicial do Mês */}
      <Card className="glass-card stat-card-neutral">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Saldo Inicial (Contas Movimento)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(totalInitialBalance)}
          </p>
          <div className="mt-2 space-y-1 text-xs">
            {currentAccountBalances.map((item, index) => (
              <div key={index} className="flex justify-between text-muted-foreground">
                <span>{item.name}</span>
                <span className={cn(item.balance >= 0 ? "text-success" : "text-destructive")}>
                  {formatCurrency(item.balance)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Previsão de Receita */}
      <Card className="glass-card stat-card-positive">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-success" />
            Previsão de Receita (Mês)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Label htmlFor="forecast" className="sr-only">Previsão de Receita</Label>
          <Input
            id="forecast"
            type="text"
            inputMode="decimal"
            value={forecastInput}
            onChange={handleForecastChange}
            onBlur={handleForecastBlur}
            className="text-2xl font-bold text-success border-none p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Mês Anterior: {formatCurrency(previousMonthRevenue)}
          </p>
        </CardContent>
      </Card>
      
      {/* Saldo Projetado */}
      <Card className={cn(
        "glass-card",
        projectedFinalBalance >= 0 ? "stat-card-success" : "stat-card-danger"
      )}>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Saldo Projetado (Após Contas)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-2xl font-bold">
            {formatCurrency(projectedFinalBalance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {projectedFinalBalance >= 0 
              ? "Suficiente para cobrir todas as contas pendentes."
              : <span className="text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Risco de saldo negativo.</span>
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
}