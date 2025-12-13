import { useMemo, useState, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Calculator,
  BarChart3,
  PieChart,
  Minus,
  Plus,
  Equal,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  Target,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart as RechartsPie,
  Pie,
  Cell,
  ComposedChart,
  Line,
} from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { ReportCard } from "./ReportCard";
import { ExpandablePanel } from "./ExpandablePanel";
import { IndicatorBadge } from "./IndicatorBadge";
import { DetailedIndicatorBadge } from "./DetailedIndicatorBadge";
import { cn, parseDateLocal } from "@/lib/utils";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ComparisonDateRanges, DateRange } from "@/types/finance";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransacaoCompleta } from "@/types/finance";

const COLORS = {
  success: "hsl(142, 76%, 36%)",
  warning: "hsl(38, 92%, 50%)",
  danger: "hsl(0, 72%, 51%)",
  primary: "hsl(199, 89%, 48%)",
  accent: "hsl(270, 80%, 60%)",
  muted: "hsl(215, 20% 55%)",
  gold: "hsl(45, 93%, 47%)",
  cyan: "hsl(180, 70%, 50%)",
};

const PIE_COLORS = [
  COLORS.primary,
  COLORS.accent,
  COLORS.success,
  COLORS.warning,
  COLORS.gold,
  COLORS.cyan,
  COLORS.danger,
];

interface DREItemProps {
  label: string;
  value: number;
  type: "receita" | "despesa" | "resultado" | "subtotal";
  level?: number;
  icon?: React.ReactNode;
  subItems?: { label: string; value: number }[];
}

function DREItem({ label, value, type, level = 0, icon, subItems }: DREItemProps) {
  const formatCurrency = (v: number) => `R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const styles = {
    receita: "text-success",
    despesa: "text-destructive",
    resultado: value >= 0 ? "text-success font-bold" : "text-destructive font-bold",
    subtotal: value >= 0 ? "text-primary font-semibold" : "text-warning font-semibold",
  };

  const bgStyles = {
    receita: "",
    despesa: "",
    resultado: "bg-muted/30 rounded-lg",
    subtotal: "bg-muted/20 rounded-lg",
  };

  const prefix = type === "despesa" ? "(-) " : type === "resultado" && value < 0 ? "(-) " : "";

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between py-2.5 px-3 border-b border-border/30 last:border-0",
          bgStyles[type]
        )}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className={cn(
            "text-sm",
            type === "resultado" || type === "subtotal" ? "font-semibold" : "text-muted-foreground"
          )}>
            {prefix}{label}
          </span>
        </div>
        <span className={cn("text-sm tabular-nums", styles[type])}>
          {value < 0 ? "-" : ""}{formatCurrency(value)}
        </span>
      </div>
      {subItems && subItems.map((item, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between py-1.5 px-3 border-b border-border/20"
          style={{ paddingLeft: `${28 + level * 16}px` }}
        >
          <span className="text-xs text-muted-foreground">{item.label}</span>
          <span className={cn("text-xs tabular-nums", type === "receita" ? "text-success/80" : "text-destructive/80")}>
            {formatCurrency(item.value)}
          </span>
        </div>
      ))}
    </>
  );
}

// Define o tipo de status esperado pelos componentes ReportCard e IndicatorBadge
type KPIStatus = "success" | "warning" | "danger" | "neutral";

interface DRETabProps {
  dateRanges: ComparisonDateRanges;
}

export function DRETab({ dateRanges }: DRETabProps) {
  const {
    transacoesV2,
    categoriasV2,
    emprestimos,
    getJurosTotais,
    calculateLoanAmortizationAndInterest, // <-- NEW
  } = useFinance();

  const { range1, range2 } = dateRanges;
  
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const now = new Date();

  // Helper para filtrar transações por um range específico
  const filterTransactionsByRange = useCallback((range: DateRange) => {
    if (!range.from || !range.to) return transacoesV2;
    
    const rangeFrom = startOfDay(range.from);
    const rangeTo = endOfDay(range.to);
    
    return transacoesV2.filter(t => {
      try {
        const dataT = parseDateLocal(t.date);
        return isWithinInterval(dataT, { start: rangeFrom, end: rangeTo });
      } catch {
        return false;
      }
    });
  }, [transacoesV2]);

  const transacoesPeriodo1 = useMemo(() => filterTransactionsByRange(range1), [filterTransactionsByRange, range1]);
  const transacoesPeriodo2 = useMemo(() => filterTransactionsByRange(range2), [filterTransactionsByRange, range2]);

  // Função para calcular a DRE de um conjunto de transações
  const calculateDRE = useCallback((transactions: TransacaoCompleta[]) => {
    const categoriasMap = new Map(categoriasV2.map(c => [c.id, c]));

    // 1. RECEITAS: Apenas operações de 'receita' e 'rendimento'
    const transacoesReceita = transactions.filter(t => 
      t.operationType === 'receita' || t.operationType === 'rendimento'
    );

    const receitasAgrupadas = new Map<string, number>();
    transacoesReceita.forEach(t => {
      const cat = categoriasMap.get(t.categoryId || '') || { label: 'Outras Receitas', nature: 'receita' };
      const key = cat.label;
      receitasAgrupadas.set(key, (receitasAgrupadas.get(key) || 0) + t.amount);
    });

    const receitasPorCategoria: { categoria: string; valor: number; natureza: string }[] = [];
    receitasAgrupadas.forEach((valor, categoria) => {
      receitasPorCategoria.push({ categoria, valor, natureza: 'receita' });
    });
    receitasPorCategoria.sort((a, b) => b.valor - a.valor);

    // 2. DESPESAS OPERACIONAIS: Todas as saídas que NÃO são transferências, aplicações, resgates ou pagamentos de empréstimo
    const despesasFixas: { categoria: string; valor: number }[] = [];
    const despesasVariaveis: { categoria: string; valor: number }[] = [];
    
    const transacoesDespesaOperacional = transactions.filter(t => 
      (t.operationType === 'despesa' || t.operationType === 'veiculo') &&
      t.flow === 'out'
    );

    const despesasFixasMap = new Map<string, number>();
    const despesasVariaveisMap = new Map<string, number>();

    transacoesDespesaOperacional.forEach(t => {
      const cat = categoriasMap.get(t.categoryId || '');
      const catLabel = cat?.label || 'Outras Despesas';
      const nature = cat?.nature || 'despesa_variavel';

      if (nature === 'despesa_fixa') {
        despesasFixasMap.set(catLabel, (despesasFixasMap.get(catLabel) || 0) + t.amount);
      } else {
        // Inclui despesa_variavel e outros (fallback)
        despesasVariaveisMap.set(catLabel, (despesasVariaveisMap.get(catLabel) || 0) + t.amount);
      }
    });

    despesasFixasMap.forEach((valor, categoria) => {
      despesasFixas.push({ categoria, valor });
    });
    despesasVariaveisMap.forEach((valor, categoria) => {
      despesasVariaveis.push({ categoria, valor });
    });
    despesasFixas.sort((a, b) => b.valor - a.valor);
    despesasVariaveis.sort((a, b) => b.valor - a.valor);

    const totalReceitas = receitasPorCategoria.reduce((acc, r) => acc + r.valor, 0);
    const despesasOperacionaisFixas = despesasFixas.reduce((acc, d) => acc + d.valor, 0);
    const despesasOperacionaisVariaveis = despesasVariaveis.reduce((acc, d) => acc + d.valor, 0);
    
    // 3. Juros e Encargos (Apenas a componente de JUROS dos pagamentos de Empréstimo)
    let jurosEmprestimos = 0;
    const pagamentosEmprestimo = transactions.filter(t => t.operationType === 'pagamento_emprestimo');
    
    pagamentosEmprestimo.forEach(t => {
        const loanIdStr = t.links?.loanId?.replace('loan_', '');
        const parcelaIdStr = t.links?.parcelaId;
        
        if (loanIdStr && parcelaIdStr) {
            const loanId = parseInt(loanIdStr);
            const parcelaNumber = parseInt(parcelaIdStr);
            
            if (!isNaN(loanId) && !isNaN(parcelaNumber)) {
                const calc = calculateLoanAmortizationAndInterest(loanId, parcelaNumber);
                
                if (calc) {
                    // O custo financeiro (juros) é o valor pago menos a amortização do principal.
                    // A amortização é determinada pelo cronograma (calc.amortization).
                    const amortization = calc.amortization;
                    const interestComponent = t.amount - amortization;
                    
                    jurosEmprestimos += interestComponent;
                } else {
                    // Se não for possível calcular (ex: empréstimo não configurado ou dados inválidos),
                    // pulamos a transação para evitar distorção no DRE.
                    console.warn(`Transação de empréstimo ${t.id} não pôde ser calculada para DRE (loanId: ${loanId}, parcela: ${parcelaNumber}).`);
                }
            }
        }
    });
      
    const totalDespesasOperacionais = despesasOperacionaisFixas + despesasOperacionaisVariaveis;

    const resultadoBruto = totalReceitas - despesasOperacionaisFixas;
    const resultadoOperacional = resultadoBruto - despesasOperacionaisVariaveis;
    const resultadoLiquido = resultadoOperacional - jurosEmprestimos; // Juros e Encargos

    const composicaoDespesas = [
      { name: "Despesas Fixas", value: despesasOperacionaisFixas, color: COLORS.danger },
      { name: "Despesas Variáveis", value: despesasOperacionaisVariaveis, color: COLORS.warning },
      { name: "Juros e Encargos", value: jurosEmprestimos, color: COLORS.accent },
    ].filter(item => item.value > 0);

    const margemBruta = totalReceitas > 0 ? (resultadoBruto / totalReceitas) * 100 : 0;
    const margemOperacional = totalReceitas > 0 ? (resultadoOperacional / totalReceitas) * 100 : 0;
    const margemLiquida = totalReceitas > 0 ? (resultadoLiquido / totalReceitas) * 100 : 0;

    return {
      totalReceitas,
      totalDespesas: totalDespesasOperacionais + jurosEmprestimos, // Total de saídas operacionais + juros
      resultadoLiquido,
      resultadoBruto,
      resultadoOperacional,
      jurosEmprestimos,
      receitasPorCategoria,
      despesasFixas,
      despesasVariaveis,
      composicaoDespesas,
      margemBruta,
      margemOperacional,
      margemLiquida,
      totalDespesasFixas: despesasOperacionaisFixas,
      totalDespesasVariaveis: despesasOperacionaisVariaveis,
    };
  }, [categoriasV2, calculateLoanAmortizationAndInterest]);

  // DRE para o Período 1 (Principal)
  const dre1 = useMemo(() => calculateDRE(transacoesPeriodo1), [calculateDRE, transacoesPeriodo1]);

  // DRE para o Período 2 (Comparação)
  const dre2 = useMemo(() => calculateDRE(transacoesPeriodo2), [calculateDRE, transacoesPeriodo2]);

  // Variação do Resultado Líquido (RL) entre P1 e P2
  const variacaoRL = useMemo(() => {
    if (!range2.from) return { diff: 0, percent: 0 };
    
    const rl1 = dre1.resultadoLiquido;
    const rl2 = dre2.resultadoLiquido;
    
    const diff = rl1 - rl2;
    const percent = rl2 !== 0 ? (diff / Math.abs(rl2)) * 100 : 0;
    
    return { diff, percent };
  }, [dre1, dre2, range2.from]);

  // Evolução mensal (últimos 12 meses) - Usa todas as transações para histórico
  const evolucaoMensal = useMemo(() => {
    const resultado: { mes: string; receitas: number; despesas: number; resultado: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const data = subMonths(now, i);
      const inicio = startOfMonth(data);
      const fim = endOfMonth(data);
      const mesLabel = format(data, 'MMM', { locale: ptBR });

      const transacoesMes = transacoesV2.filter(t => {
        try {
          const dataT = parseDateLocal(t.date);
          return isWithinInterval(dataT, { start: inicio, end: fim });
        } catch {
          return false;
        }
      });

      const receitasMes = transacoesMes
        .filter(t => t.operationType === 'receita' || t.operationType === 'rendimento')
        .reduce((acc, t) => acc + t.amount, 0);
      
      // Despesas aqui incluem despesas operacionais e pagamentos de empréstimo (valor total da parcela)
      const despesasMes = transacoesMes
        .filter(t => t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo' || t.operationType === 'veiculo')
        .reduce((acc, t) => acc + t.amount, 0);

      resultado.push({
        mes: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1),
        receitas: receitasMes,
        despesas: despesasMes,
        resultado: receitasMes - despesasMes,
      });
    }
    return resultado;
  }, [transacoesV2, now]);

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const getStatus = (value: number): KPIStatus => {
    if (value > 0) return "success";
    if (value < 0) return "danger";
    return "neutral";
  };

  return (
    <div className="space-y-6">
      {/* Cards Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportCard
          title="Receita Total"
          value={formatCurrency(dre1.totalReceitas)}
          status="success"
          icon={<TrendingUp className="w-5 h-5" />}
          tooltip="Soma de todas as entradas (exceto transferências, resgates e empréstimos)"
          delay={0}
        />
        <ReportCard
          title="Despesa Total"
          value={formatCurrency(dre1.totalDespesas)}
          status="danger"
          icon={<TrendingDown className="w-5 h-5" />}
          tooltip="Soma de todas as saídas operacionais e Juros/Encargos"
          delay={50}
        />
        <ReportCard
          title="Resultado Líquido"
          value={formatCurrency(dre1.resultadoLiquido)}
          status={getStatus(dre1.resultadoLiquido)}
          icon={<DollarSign className="w-5 h-5" />}
          tooltip="Receita Total - Despesa Operacional - Juros/Encargos"
          delay={100}
        />
        <ReportCard
          title="Variação do RL"
          value={formatPercent(variacaoRL.percent)}
          trend={variacaoRL.percent}
          trendLabel="Período 2"
          status={variacaoRL.percent >= 0 ? "success" : "danger"}
          icon={<Percent className="w-5 h-5" />}
          tooltip={`Variação do Resultado Líquido comparado ao Período 2. Diferença: ${formatCurrency(variacaoRL.diff)}`}
          delay={150}
        />
      </div>

      {/* DRE Estruturada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DRE Detalhada */}
        <ExpandablePanel
          title="Demonstração do Resultado"
          subtitle={`Período 1: ${format(range1.from || now, 'dd/MM/yyyy')} a ${format(range1.to || now, 'dd/MM/yyyy')}`}
          icon={<Receipt className="w-4 h-4" />}
          badge={formatCurrency(dre1.resultadoLiquido)}
          badgeStatus={getStatus(dre1.resultadoLiquido)}
          defaultExpanded={true}
        >
          <div className="glass-card p-0">
            {/* Receitas */}
            <DREItem label="RECEITA BRUTA" value={dre1.totalReceitas} type="receita" icon={<Plus className="w-4 h-4" />} />
            {dre1.receitasPorCategoria.map((r, index) => (
              <DREItem key={index} label={r.categoria} value={r.valor} type="receita" level={1} />
            ))}

            {/* Despesas Fixas */}
            <DREItem label="(-) DESPESAS FIXAS" value={dre1.totalDespesasFixas} type="despesa" icon={<Minus className="w-4 h-4" />} />
            {dre1.despesasFixas.map((d, index) => (
              <DREItem key={index} label={d.categoria} value={d.valor} type="despesa" level={1} />
            ))}

            {/* Resultado Bruto */}
            <DREItem label="RESULTADO BRUTO" value={dre1.resultadoBruto} type="subtotal" icon={<Equal className="w-4 h-4" />} />

            {/* Despesas Variáveis */}
            <DREItem label="(-) DESPESAS VARIÁVEIS" value={dre1.totalDespesasVariaveis} type="despesa" icon={<Minus className="w-4 h-4" />} />
            {dre1.despesasVariaveis.map((d, index) => (
              <DREItem key={index} label={d.categoria} value={d.valor} type="despesa" level={1} />
            ))}

            {/* Resultado Operacional */}
            <DREItem label="RESULTADO OPERACIONAL" value={dre1.resultadoOperacional} type="subtotal" icon={<Equal className="w-4 h-4" />} />

            {/* Juros e Encargos */}
            <DREItem label="(-) JUROS E ENCARGOS (Custo Financeiro)" value={dre1.jurosEmprestimos} type="despesa" icon={<CreditCard className="w-4 h-4" />} />

            {/* Resultado Líquido */}
            <DREItem label="RESULTADO LÍQUIDO" value={dre1.resultadoLiquido} type="resultado" icon={<DollarSign className="w-4 h-4" />} />
          </div>
        </ExpandablePanel>

        {/* Gráficos */}
        <div className="space-y-6">
          {/* Evolução Mensal */}
          <ExpandablePanel
            title="Evolução do Resultado"
            subtitle="Últimos 12 meses"
            icon={<BarChart3 className="w-4 h-4" />}
          >
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={evolucaoMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" vertical={false} />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 11 }} />
                  <YAxis
                    yAxisId="left"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: COLORS.muted, fontSize: 11 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: COLORS.primary, fontSize: 11 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                    }}
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="receitas" name="Receitas" fill={COLORS.success} opacity={0.7} radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="despesas" name="Despesas" fill={COLORS.danger} opacity={0.7} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="resultado" name="Resultado" stroke={COLORS.primary} strokeWidth={3} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ExpandablePanel>

          {/* Composição das Despesas */}
          <ExpandablePanel
            title="Composição das Despesas"
            subtitle="Distribuição por tipo"
            icon={<PieChart className="w-4 h-4" />}
          >
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={dre1.composicaoDespesas}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: COLORS.muted, strokeWidth: 1 }}
                  >
                    {dre1.composicaoDespesas.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Valor"]}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </ExpandablePanel>
        </div>
      </div>
    </div>
  );
}