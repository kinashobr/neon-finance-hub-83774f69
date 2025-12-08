import { 
  TrendingUp, TrendingDown, Calendar, AlertTriangle, 
  Award, Zap, ArrowUpRight, ArrowDownRight, Sparkles, 
  DollarSign, Calculator, Repeat, Target, Percent
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Transacao } from "@/contexts/FinanceContext";

interface EnhancedStatCardsProps {
  transacoes: Transacao[];
  totalReceitas: number;
  totalDespesas: number;
}

export const EnhancedStatCards = ({ transacoes, totalReceitas, totalDespesas }: EnhancedStatCardsProps) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Transações do mês atual
  const transacoesMes = transacoes.filter(t => {
    const date = new Date(t.data);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  
  // Transações do mês anterior
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const transacoesMesAnterior = transacoes.filter(t => {
    const date = new Date(t.data);
    return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
  });

  // Cálculos do mês atual (CORRIGIDOS)
  const receitasMes = transacoesMes.filter(t => t.tipo === "receita").reduce((acc, t) => acc + t.valor, 0);
  const despesasMes = transacoesMes.filter(t => t.tipo === "despesa").reduce((acc, t) => acc + t.valor, 0);
  
  // Cálculos do mês anterior (CORRIGIDOS)
  const receitasMesAnterior = transacoesMesAnterior.filter(t => t.tipo === "receita").reduce((acc, t) => acc + t.valor, 0);
  const despesasMesAnterior = transacoesMesAnterior.filter(t => t.tipo === "despesa").reduce((acc, t) => acc + t.valor, 0);

  // Ticket médio (CORRIGIDO)
  const receitasCount = transacoesMes.filter(t => t.tipo === "receita").length;
  const despesasCount = transacoesMes.filter(t => t.tipo === "despesa").length;
  const ticketMedioReceitas = receitasCount > 0 ? receitasMes / receitasCount : 0;
  const ticketMedioDespesas = despesasCount > 0 ? despesasMes / despesasCount : 0;

  // Categoria com maior gasto (CORRIGIDO)
  const despesasPorCategoria = transacoesMes
    .filter(t => t.tipo === "despesa")
    .reduce((acc, t) => {
      acc[t.categoria] = (acc[t.categoria] || 0) + t.valor;
      return acc;
    }, {} as Record<string, number>);
  
  const categoriaMaiorGasto = Object.entries(despesasPorCategoria)
    .sort(([,a], [,b]) => b - a)[0];

  // Principal origem de receita (CORRIGIDO)
  const receitasPorCategoria = transacoesMes
    .filter(t => t.tipo === "receita")
    .reduce((acc, t) => {
      acc[t.categoria] = (acc[t.categoria] || 0) + t.valor;
      return acc;
    }, {} as Record<string, number>);
  
  const principalReceita = Object.entries(receitasPorCategoria)
    .sort(([,a], [,b]) => b - a)[0];

  // Variações percentuais (CORRIGIDAS)
  const variacaoReceitas = receitasMesAnterior > 0 
    ? ((receitasMes - receitasMesAnterior) / receitasMesAnterior) * 100 
    : 0;
  const variacaoDespesas = despesasMesAnterior > 0 
    ? ((despesasMes - despesasMesAnterior) / despesasMesAnterior) * 100 
    : 0;

  // Cálculos avançados (NOVOS)
  const saldoMes = receitasMes - despesasMes;
  const margemPoupanca = receitasMes > 0 ? (saldoMes / receitasMes) * 100 : 0;
  const indiceEndividamento = receitasMes > 0 ? (despesasMes / receitasMes) * 100 : 0;
  
  // Despesas fixas (CORRIGIDO)
  const CATEGORIAS_FIXAS = ["Moradia", "Saúde", "Transporte", "Salário"];
  const despesasFixas = transacoesMes
    .filter(t => t.tipo === "despesa" && CATEGORIAS_FIXAS.includes(t.categoria))
    .reduce((acc, t) => acc + t.valor, 0);
  
  const despesasVariaveis = despesasMes - despesasFixas;

  // Projeção de saldo (NOVO)
  const diasNoMes = new Date(currentYear, currentMonth + 1, 0).getDate();
  const diaAtual = currentDate.getDate();
  const mediaDiaria = diaAtual > 0 ? saldoMes / diaAtual : 0;
  const diasRestantes = diasNoMes - diaAtual;
  const projecaoSaldo = saldoMes + (mediaDiaria * diasRestantes);

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const cards = [
    {
      title: "Ticket Médio Receitas",
      value: formatCurrency(ticketMedioReceitas),
      icon: TrendingUp,
      tooltip: "Valor médio por transação de receita no mês atual",
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-l-success",
      trend: variacaoReceitas,
      trendLabel: "vs mês anterior",
      extra: `${receitasCount} transações`,
    },
    {
      title: "Ticket Médio Despesas",
      value: formatCurrency(ticketMedioDespesas),
      icon: TrendingDown,
      tooltip: "Valor médio por transação de despesa no mês atual",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-l-destructive",
      trend: variacaoDespesas,
      trendLabel: "vs mês anterior",
      extra: `${despesasCount} transações`,
    },
    {
      title: "Saldo Mensal",
      value: formatCurrency(saldoMes),
      icon: DollarSign,
      tooltip: `Receitas: ${formatCurrency(receitasMes)} - Despesas: ${formatCurrency(despesasMes)}`,
      color: saldoMes >= 0 ? "text-success" : "text-destructive",
      bgColor: saldoMes >= 0 ? "bg-success/10" : "bg-destructive/10",
      borderColor: saldoMes >= 0 ? "border-l-success" : "border-l-destructive",
      trend: variacaoReceitas - variacaoDespesas,
      trendLabel: "variação total",
      extra: saldoMes >= 0 ? "Positivo" : "Negativo",
    },
    {
      title: "Maior Gasto",
      value: categoriaMaiorGasto ? categoriaMaiorGasto[0] : "—",
      icon: AlertTriangle,
      tooltip: categoriaMaiorGasto ? `${formatCurrency(categoriaMaiorGasto[1])} em ${categoriaMaiorGasto[0]}` : "Sem despesas",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-l-destructive",
      trend: undefined,
      trendLabel: "",
      extra: categoriaMaiorGasto ? formatCurrency(categoriaMaiorGasto[1]) : "",
    },
    {
      title: "Principal Receita",
      value: principalReceita ? principalReceita[0] : "—",
      icon: Award,
      tooltip: principalReceita ? `${formatCurrency(principalReceita[1])} em ${principalReceita[0]}` : "Sem receitas",
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-l-success",
      trend: undefined,
      trendLabel: "",
      extra: principalReceita ? formatCurrency(principalReceita[1]) : "",
    },
    {
      title: "Despesas Fixas",
      value: formatCurrency(despesasFixas),
      icon: Repeat,
      tooltip: `Despesas fixas: ${despesasFixas > 0 && despesasMes > 0 ? ((despesasFixas / despesasMes) * 100).toFixed(1) : "0.0"}% do total`,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-l-primary",
      trend: undefined,
      trendLabel: "",
      extra: despesasFixas > 0 && despesasMes > 0 ? `${((despesasFixas / despesasMes) * 100).toFixed(1)}%` : "0%",
    },
    {
      title: "Margem de Poupança",
      value: `${margemPoupanca.toFixed(1)}%`,
      icon: Target,
      tooltip: `Percentual do que sobra após despesas: ${(margemPoupanca).toFixed(1)}%`,
      color: margemPoupanca >= 20 ? "text-success" : margemPoupanca >= 10 ? "text-warning" : "text-destructive",
      bgColor: margemPoupanca >= 20 ? "bg-success/10" : margemPoupanca >= 10 ? "bg-warning/10" : "bg-destructive/10",
      borderColor: margemPoupanca >= 20 ? "border-l-success" : margemPoupanca >= 10 ? "border-l-warning" : "border-l-destructive",
      trend: margemPoupanca,
      trendLabel: "ideal > 20%",
      extra: margemPoupanca >= 0 ? "Saudável" : "Preocupante",
    },
    {
      title: "Índice de Endividamento",
      value: `${indiceEndividamento.toFixed(1)}%`,
      icon: Percent,
      tooltip: `Despesas vs Receitas: ${(indiceEndividamento).toFixed(1)}%`,
      color: indiceEndividamento <= 30 ? "text-success" : indiceEndividamento <= 50 ? "text-warning" : "text-destructive",
      bgColor: indiceEndividamento <= 30 ? "bg-success/10" : indiceEndividamento <= 50 ? "bg-warning/10" : "bg-destructive/10",
      borderColor: indiceEndividamento <= 30 ? "border-l-success" : indiceEndividamento <= 50 ? "border-l-warning" : "border-l-destructive",
      trend: -indiceEndividamento, // Quanto menor melhor
      trendLabel: "ideal < 30%",
      extra: indiceEndividamento <= 30 ? "Bom" : indiceEndividamento <= 50 ? "Cuidado" : "Alerta",
    },
    {
      title: "Projeção de Saldo",
      value: formatCurrency(projecaoSaldo),
      icon: Calculator,
      tooltip: `Baseado na média diária até ${diaAtual} dias`,
      color: projecaoSaldo >= 0 ? "text-success" : "text-destructive",
      bgColor: projecaoSaldo >= 0 ? "bg-success/10" : "bg-destructive/10",
      borderColor: projecaoSaldo >= 0 ? "border-l-success" : "border-l-destructive",
      trend: projecaoSaldo >= 0 ? 10 : -10,
      trendLabel: "para o mês",
      extra: projecaoSaldo >= 0 ? "Positiva" : "Negativa",
    },
    {
      title: "Despesas Variáveis",
      value: formatCurrency(despesasVariaveis),
      icon: Zap,
      tooltip: `Despesas totais - Despesas fixas: ${formatCurrency(despesasVariaveis)}`,
      color: "text-warning",
      bgColor: "bg-warning/10",
      borderColor: "border-l-warning",
      trend: undefined,
      trendLabel: "",
      extra: despesasVariaveis > 0 && despesasMes > 0 ? `${((despesasVariaveis / despesasMes) * 100).toFixed(1)}%` : "0%",
    },
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-fade-in">
        {cards.map((card, index) => (
          <Tooltip key={card.title}>
            <TooltipTrigger asChild>
              <div 
                className={cn(
                  "glass-card p-4 border-l-4 cursor-help transition-all duration-300 hover:scale-[1.02]",
                  card.borderColor
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium truncate">{card.title}</p>
                    <p className={cn("text-lg font-bold mt-1 truncate", card.color)}>{card.value}</p>
                    {card.extra && (
                      <p className="text-xs text-muted-foreground mt-0.5">{card.extra}</p>
                    )}
                    {card.trend !== undefined && (
                      <div className={cn(
                        "flex items-center gap-1 mt-1 text-xs font-medium",
                        card.trend >= 0 ? "text-success" : "text-destructive"
                      )}>
                        <span>{card.trend >= 0 ? "▲" : "▼"}</span>
                        <span>{Math.abs(card.trend).toFixed(1)}%</span>
                        <span className="text-muted-foreground">{card.trendLabel}</span>
                      </div>
                    )}
                  </div>
                  <div className={cn("p-2 rounded-lg shrink-0", card.bgColor)}>
                    <card.icon className={cn("w-4 h-4", card.color)} />
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{card.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};