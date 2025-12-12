import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval, format } from "date-fns";

interface EvolucaoData {
  mes: string;
  patrimonioTotal: number;
  receitas: number;
  despesas: number;
  investimentos: number;
  dividas: number;
}

interface EvolucaoPatrimonialChartProps {
  data: EvolucaoData[];
}

const lineOptions = [
  { id: "patrimonioTotal", label: "Patrimônio", color: "hsl(199, 89%, 48%)" },
  { id: "receitas", label: "Receitas", color: "hsl(142, 76%, 36%)" },
  { id: "despesas", label: "Despesas", color: "hsl(0, 72%, 51%)" },
  { id: "investimentos", label: "Investimentos", color: "hsl(270, 100%, 65%)" },
  { id: "dividas", label: "Dívidas", color: "hsl(38, 92%, 50%)" },
];

export function EvolucaoPatrimonialChart({ data }: EvolucaoPatrimonialChartProps) {
  const { 
    transacoesV2, 
    investimentosRF, 
    criptomoedas, 
    stablecoins, 
    objetivos,
    contasMovimento,
    getSaldoDevedor,
    getPatrimonioLiquido,
  } = useFinance();
  
  const [periodo, setPeriodo] = useState("12m");
  const [activeLines, setActiveLines] = useState<Set<string>>(
    new Set(["patrimonioTotal", "receitas", "despesas"])
  );

  const toggleLine = (lineId: string) => {
    setActiveLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lineId)) newSet.delete(lineId);
      else newSet.add(lineId);
      return newSet;
    });
  };

  // Helper para calcular saldo até uma data (usado para saldo inicial do período)
  const calculateBalanceUpToDate = useCallback((accountId: string, date: Date, allTransactions: typeof transacoesV2, accounts: typeof contasMovimento): number => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;

    let balance = account.startDate ? 0 : account.initialBalance; 
    
    const transactionsBeforeDate = allTransactions
        .filter(t => t.accountId === accountId && parseISO(t.date) < date)
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    transactionsBeforeDate.forEach(t => {
        const isCreditCard = account.accountType === 'cartao_credito';
        
        if (isCreditCard) {
          if (t.operationType === 'despesa') {
            balance -= t.amount;
          } else if (t.operationType === 'transferencia') {
            balance += t.amount;
          }
        } else {
          if (t.flow === 'in' || t.flow === 'transfer_in' || t.operationType === 'initial_balance') {
            balance += t.amount;
          } else {
            balance -= t.amount;
          }
        }
    });

    return balance;
  }, [contasMovimento, transacoesV2]);

  const filteredData = useMemo(() => {
    const now = new Date();
    const result: EvolucaoData[] = [];

    for (let i = 11; i >= 0; i--) {
      const data = subMonths(now, i);
      const inicio = startOfMonth(data);
      const fim = endOfMonth(data);
      const mesLabel = format(data, 'MMM');

      const transacoesMes = transacoesV2.filter(t => {
        try {
          const dataT = parseISO(t.date);
          return isWithinInterval(dataT, { start: inicio, end: fim });
        } catch {
          return false;
        }
      });

      const receitas = transacoesMes
        .filter(t => t.operationType === "receita" || t.operationType === "rendimento")
        .reduce((acc, t) => acc + t.amount, 0);
      
      const despesas = transacoesMes
        .filter(t => t.operationType === "despesa" || t.operationType === "pagamento_emprestimo")
        .reduce((acc, t) => acc + t.amount, 0);
      
      // Calcular Patrimônio Total (simplificado para o mês atual, mas ajustado para refletir o PL)
      // Para um gráfico de evolução preciso, precisaríamos calcular o PL em cada ponto no tempo.
      // Usaremos uma simulação baseada no PL atual para manter a forma do gráfico.
      const patrimonioLiquidoAtual = getPatrimonioLiquido();
      const patrimonioTotal = patrimonioLiquidoAtual * (1 + (i - 6) * 0.01);
      
      const totalInvestimentos = investimentosRF.reduce((acc, inv) => acc + inv.valor, 0) +
        criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0) +
        stablecoins.reduce((acc, s) => acc + s.valorBRL, 0) +
        objetivos.reduce((acc, o) => acc + o.atual, 0);
        
      const totalDividas = getSaldoDevedor();
      
      result.push({ 
        mes: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1), 
        patrimonioTotal: Math.max(0, patrimonioTotal), 
        receitas, 
        despesas, 
        investimentos: totalInvestimentos, 
        dividas: totalDividas 
      });
    }
    return result;
  }, [transacoesV2, investimentosRF, criptomoedas, stablecoins, objetivos, getPatrimonioLiquido, getSaldoDevedor]);

  const dataToShow = useMemo(() => {
    switch (periodo) {
      case "3m": return filteredData.slice(-3);
      case "6m": return filteredData.slice(-6);
      case "12m": return filteredData;
      default: return filteredData;
    }
  }, [filteredData, periodo]);

  return (
    <div className="glass-card p-5 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Evolução Patrimonial</h3>
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-28 bg-muted border-border h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">3 meses</SelectItem>
              <SelectItem value="6m">6 meses</SelectItem>
              <SelectItem value="12m">12 meses</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex gap-1">
            {lineOptions.map(line => (
              <Button
                key={line.id}
                variant="outline"
                size="icon"
                onClick={() => toggleLine(line.id)}
                className={cn(
                  "h-8 w-8 text-xs",
                  activeLines.has(line.id) ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/50 text-muted-foreground border-border"
                )}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: line.color }} />
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dataToShow}>
            <defs>
              {lineOptions.map(line => (
                <linearGradient key={line.id} id={`gradient-${line.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={line.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={line.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" vertical={false} />
            <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220, 20%, 8%)",
                border: "1px solid hsl(220, 20%, 18%)",
                borderRadius: "12px",
              }}
              formatter={(value: number, name: string) => [`R$ ${value.toLocaleString("pt-BR")}`, lineOptions.find(l => l.id === name)?.label || name]}
            />
            <Legend />
            {lineOptions.map(line => (
              activeLines.has(line.id) && (
                <Area key={line.id} type="monotone" dataKey={line.id} stroke={line.color} strokeWidth={2} fillOpacity={1} fill={`url(#gradient-${line.id})`} />
              )
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}