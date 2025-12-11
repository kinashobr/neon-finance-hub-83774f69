import { useMemo, useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CATEGORY_NATURE_LABELS } from "@/types/finance";

const COLORS = {
  success: "hsl(142, 76%, 36%)",
  warning: "hsl(38, 92%, 50%)",
  danger: "hsl(0, 72%, 51%)",
  primary: "hsl(199, 89%, 48%)",
  accent: "hsl(270, 80%, 60%)",
  muted: "hsl(215, 20%, 55%)",
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
  "hsl(330, 100%, 65%)",
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
  dateRange: { from: Date | undefined; to: Date | undefined };
}

export function DRETab({ dateRange }: DRETabProps) {
  const {
    transacoesV2,
    categoriasV2,
    contasMovimento,
    emprestimos,
  } = useFinance();

  const [periodo, setPeriodo] = useState<"mensal" | "trimestral" | "anual">("anual");

  // Cálculos da DRE
  const dre = useMemo(() => {
    const now = new Date();
    
    // Definir período de análise
    let dataInicio: Date;
    let dataFim: Date;
    
    if (dateRange.from && dateRange.to) {
      dataInicio = dateRange.from;
      dataFim = dateRange.to;
    } else {
      // Se não houver filtro externo, usa o filtro interno (mensal/trimestral/anual)
      switch (periodo) {
        case "mensal":
          dataInicio = startOfMonth(now);
          dataFim = endOfMonth(now);
          break;
        case "trimestral":
          dataInicio = subMonths(startOfMonth(now), 2);
          dataFim = endOfMonth(now);
          break;
        case "anual":
        default:
          dataInicio = subMonths(startOfMonth(now), 11);
          dataFim = endOfMonth(now);
          break;
      }
    }

    // Filtrar transações do período
    const transacoesPeriodo = transacoesV2.filter(t => {
      try {
        const dataT = parseISO(t.date + "T00:00:00");
        return isWithinInterval(dataT, { start: dataInicio, end: dataFim });
      } catch {
        return false;
      }
    });

    // Mapear categorias por ID
    const categoriasMap = new Map(categoriasV2.map(c => [c.id, c]));

    // Agrupar receitas por categoria
    const receitasPorCategoria: { categoria: string; valor: number; natureza: string }[] = [];
    const transacoesReceita = transacoesPeriodo.filter(t => 
      t.flow === 'in' && 
      t.operationType !== 'transferencia' &&
      t.operationType !== 'liberacao_emprestimo'
    );

    const receitasAgrupadas = new Map<string, number>();
    transacoesReceita.forEach(t => {
      const cat = categoriasMap.get(t.categoryId || '') || { label: 'Outras Receitas', nature: 'receita' };
      const key = cat.label;
      receitasAgrupadas.set(key, (receitasAgrupadas.get(key) || 0) + t.amount);
    });
    receitasAgrupadas.forEach((valor, categoria) => {
      receitasPorCategoria.push({ categoria, valor, natureza: 'receita' });
    });

    // Agrupar despesas por categoria e natureza
    const despesasFixas: { categoria: string; valor: number }[] = [];
    const despesasVariaveis: { categoria: string; valor: number }[] = [];
    
    const transacoesDespesa = transacoesPeriodo.filter(t => 
      t.flow === 'out' && 
      t.operationType !== 'transferencia' &&
      t.operationType !== 'aplicacao'
    );

    const despesasFixasMap = new Map<string, number>();
    const despesasVariaveisMap = new Map<string, number>();

    transacoesDespesa.forEach(t => {
      const cat = categoriasMap.get(t.categoryId || '');
      const catLabel = cat?.label || 'Outras Despesas';
      const nature = cat?.nature || 'despesa_variavel';

      if (nature === 'despesa_fixa') {
        despesasFixasMap.set(catLabel, (despesasFixasMap.get(catLabel) || 0) + t.amount);
      } else {
        despesasVariaveisMap.set(catLabel, (despesasVariaveisMap.get(catLabel) || 0) + t.amount);
      }
    });

    despesasFixasMap.forEach((valor, categoria) => {
      despesasFixas.push({ categoria, valor });
    });
    despesasVariaveisMap.forEach((valor, categoria) => {
      despesasVariaveis.push({ categoria, valor });
    });

    // Ordenar por valor
    receitasPorCategoria.sort((a, b) => b.valor - a.valor);
    despesasFixas.sort((a, b) => b.valor - a.valor);
    despesasVariaveis.sort((a, b) => b.valor - a.valor);

    // Totais
    const totalReceitas = receitasPorCategoria.reduce((acc, r) => acc + r.valor, 0);
    const totalDespesasFixas = despesasFixas.reduce((acc, d) => acc + d.valor, 0);
    const totalDespesasVariaveis = despesasVariaveis.reduce((acc, d) => acc + d.valor, 0);
    const totalDespesas = totalDespesasFixas + totalDespesasVariaveis;

    // Juros de empréstimos (passivo financeiro)
    const jurosEmprestimos = emprestimos
      .filter(e => e.status === 'ativo')
      .reduce((acc, e) => acc + (e.parcela * e.taxaMensal / 100), 0);

    // Resultados
    const resultadoBruto = totalReceitas - totalDespesasFixas;
    const resultadoOperacional = resultadoBruto - totalDespesasVariaveis;
    const resultadoAntesJuros = resultadoOperacional;
    const resultadoLiquido = resultadoOperacional - jurosEmprestimos;

    // Evolução mensal (últimos 12 meses)
    const evolucaoMensal: { mes: string; receitas: number; despesas: number; resultado: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const data = subMonths(now, i);
      const inicio = startOfMonth(data);
      const fim = endOfMonth(data);
      const mesLabel = format(data, 'MMM', { locale: ptBR });

      const transacoesMes = transacoesV2.filter(t => {
        try {
          const dataT = parseISO(t.date + "T00:00:00");
          return isWithinInterval(dataT, { start: inicio, end: fim });
        } catch {
          return false;
        }
      });

      const receitasMes = transacoesMes
        .filter(t => t.flow === 'in' && t.operationType !== 'transferencia' && t.operationType !== 'liberacao_emprestimo')
        .reduce((acc, t) => acc + t.amount, 0);
      const despesasMes = transacoesMes
        .filter(t => t.flow === 'out' && t.operationType !== 'transferencia' && t.operationType !== 'aplicacao')
        .reduce((acc, t) => acc + t.amount, 0);

      evolucaoMensal.push({
        mes: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1),
        receitas: receitasMes,
        despesas: despesasMes,
        resultado: receitasMes - despesasMes,
      });
    }

    // KPIs
    const margemBruta = totalReceitas > 0 ? (resultadoBruto / totalReceitas) * 100 : 0;
    const margemOperacional = totalReceitas > 0 ? (resultadoOperacional / totalReceitas) * 100 : 0;
    const margemLiquida = totalReceitas > 0 ? (resultadoLiquido / totalReceitas) * 100 : 0;
    const indiceEficiencia = totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 0;
    const comprometimentoFixo = totalReceitas > 0 ? (totalDespesasFixas / totalReceitas) * 100 : 0;

    return {
      receitas: {
        total: totalReceitas,
        porCategoria: receitasPorCategoria,
      },
      despesas: {
        total: totalDespesas,
        fixas: {
          total: totalDespesasFixas,
          porCategoria: despesasFixas,
        },
        variaveis: {
          total: totalDespesasVariaveis,
          porCategoria: despesasVariaveis,
        },
      },
      jurosFinanceiros: jurosEmprestimos,
      resultadoBruto,
      resultadoOperacional,
      resultadoLiquido,
      evolucaoMensal,
      kpis: {
        margemBruta: { 
          valor: margemBruta, 
          status: (margemBruta >= 40 ? "success" : margemBruta >= 20 ? "warning" : "danger") as KPIStatus 
        },
        margemOperacional: { 
          valor: margemOperacional, 
          status: (margemOperacional >= 20 ? "success" : margemOperacional >= 10 ? "warning" : "danger") as KPIStatus 
        },
        margemLiquida: { 
          valor: margemLiquida, 
          status: (margemLiquida >= 15 ? "success" : margemLiquida >= 5 ? "warning" : "danger") as KPIStatus 
        },
        indiceEficiencia: { 
          valor: indiceEficiencia, 
          status: (indiceEficiencia <= 70 ? "success" : indiceEficiencia <= 85 ? "warning" : "danger") as KPIStatus 
        },
        comprometimentoFixo: { 
          valor: comprometimentoFixo, 
          status: (comprometimentoFixo <= 40 ? "success" : comprometimentoFixo <= 60 ? "warning" : "danger") as KPIStatus 
        },
      },
      periodo: {
        inicio: format(dataInicio, 'dd/MM/yyyy'),
        fim: format(dataFim, 'dd/MM/yyyy'),
      },
    };
  }, [transacoesV2, categoriasV2, emprestimos, periodo, dateRange]);

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  // Dados para gráficos
  const dadosComparativo = dre.evolucaoMensal.filter(m => m.receitas > 0 || m.despesas > 0);
  
  const despesasPorTipo = [
    { name: "Despesas Fixas", value: dre.despesas.fixas.total, color: COLORS.warning },
    { name: "Despesas Variáveis", value: dre.despesas.variaveis.total, color: COLORS.danger },
  ].filter(d => d.value > 0);

  const todasDespesas = [
    ...dre.despesas.fixas.porCategoria.map(d => ({ ...d, tipo: 'fixa' })),
    ...dre.despesas.variaveis.porCategoria.map(d => ({ ...d, tipo: 'variavel' })),
  ].sort((a, b) => b.valor - a.valor).slice(0, 8);

  // Sparkline generator (copiado de IndicadoresTab para consistência)
  const generateSparkline = (current: number, trend: "up" | "down" | "stable" = "stable") => {
    const base = Math.abs(current) * 0.7;
    const range = Math.abs(current) * 0.3 || 10;
    return Array.from({ length: 6 }, (_, i) => {
      const progress = i / 5;
      if (trend === "up") return base + range * progress + Math.random() * range * 0.2;
      if (trend === "down") return base + range * (1 - progress) + Math.random() * range * 0.2;
      return base + range * 0.5 + (Math.random() - 0.5) * range * 0.4;
    }).concat([Math.abs(current)]);
  };

  return (
    <div className="space-y-6">
      {/* Cards Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <ReportCard
          title="Receitas Totais"
          value={formatCurrency(dre.receitas.total)}
          status="success"
          icon={<TrendingUp className="w-5 h-5" />}
          tooltip={`Soma de todas as receitas de ${dre.periodo.inicio} a ${dre.periodo.fim}`}
          delay={0}
        />
        <ReportCard
          title="Despesas Fixas"
          value={formatCurrency(dre.despesas.fixas.total)}
          status="warning"
          icon={<Receipt className="w-5 h-5" />}
          tooltip="Despesas obrigatórias e recorrentes"
          delay={50}
        />
        <ReportCard
          title="Despesas Variáveis"
          value={formatCurrency(dre.despesas.variaveis.total)}
          status="danger"
          icon={<TrendingDown className="w-5 h-5" />}
          tooltip="Despesas não essenciais ou flexíveis"
          delay={100}
        />
        <ReportCard
          title="Resultado Bruto"
          value={formatCurrency(dre.resultadoBruto)}
          status={dre.resultadoBruto >= 0 ? "success" : "danger"}
          icon={<Calculator className="w-5 h-5" />}
          tooltip="Receitas - Despesas Fixas"
          delay={150}
        />
        <ReportCard
          title="Resultado Líquido"
          value={formatCurrency(dre.resultadoLiquido)}
          status={dre.resultadoLiquido >= 0 ? "success" : "danger"}
          icon={<DollarSign className="w-5 h-5" />}
          tooltip="Resultado final após todas as deduções"
          delay={200}
        />
        <ReportCard
          title="Margem Líquida"
          value={formatPercent(dre.kpis.margemLiquida.valor)}
          status={dre.kpis.margemLiquida.status}
          icon={<Percent className="w-5 h-5" />}
          tooltip="Percentual do lucro em relação à receita total"
          delay={250}
        />
      </div>

      {/* Filtro de Período (Interno, só aparece se não houver filtro externo) */}
      {!dateRange.from && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="text-sm text-muted-foreground">
            Período: <span className="font-medium text-foreground">{dre.periodo.inicio}</span> a <span className="font-medium text-foreground">{dre.periodo.fim}</span>
          </div>
          <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as any)}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="mensal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Mensal
              </TabsTrigger>
              <TabsTrigger value="trimestral" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Trimestral
              </TabsTrigger>
              <TabsTrigger value="anual" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Anual
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* DRE Estruturada */}
      <ExpandablePanel
        title="Demonstração do Resultado"
        subtitle="Estrutura contábil completa"
        icon={<Receipt className="w-4 h-4" />}
        badge={dre.resultadoLiquido >= 0 ? "Superávit" : "Déficit"}
        badgeStatus={dre.resultadoLiquido >= 0 ? "success" : "danger"}
        defaultExpanded={true}
      >
        <div className="space-y-1 rounded-lg border border-border overflow-hidden bg-card/30">
          {/* RECEITAS */}
          <div className="bg-success/5 px-3 py-2 border-b border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-success flex items-center gap-2">
              <Plus className="w-3 h-3" /> 1. RECEITAS OPERACIONAIS
            </span>
          </div>
          {dre.receitas.porCategoria.map((rec) => (
            <DREItem
              key={rec.categoria}
              label={rec.categoria}
              value={rec.valor}
              type="receita"
              level={1}
            />
          ))}
          <DREItem 
            label="TOTAL DE RECEITAS" 
            value={dre.receitas.total} 
            type="subtotal" 
            icon={<Equal className="w-4 h-4" />} 
          />

          {/* DESPESAS FIXAS */}
          <div className="bg-warning/5 px-3 py-2 border-b border-border mt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-warning flex items-center gap-2">
              <Minus className="w-3 h-3" /> 2. DESPESAS FIXAS (Obrigatórias)
            </span>
          </div>
          {dre.despesas.fixas.porCategoria.map((desp) => (
            <DREItem
              key={desp.categoria}
              label={desp.categoria}
              value={desp.valor}
              type="despesa"
              level={1}
            />
          ))}
          {dre.despesas.fixas.total > 0 && (
            <DREItem 
              label="Subtotal Despesas Fixas" 
              value={dre.despesas.fixas.total} 
              type="subtotal" 
            />
          )}

          {/* RESULTADO BRUTO */}
          <DREItem 
            label="= RESULTADO BRUTO" 
            value={dre.resultadoBruto} 
            type="resultado" 
            icon={<Equal className="w-4 h-4" />} 
          />

          {/* DESPESAS VARIÁVEIS */}
          <div className="bg-destructive/5 px-3 py-2 border-b border-border mt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-destructive flex items-center gap-2">
              <Minus className="w-3 h-3" /> 3. DESPESAS VARIÁVEIS (Flexíveis)
            </span>
          </div>
          {dre.despesas.variaveis.porCategoria.map((desp) => (
            <DREItem
              key={desp.categoria}
              label={desp.categoria}
              value={desp.valor}
              type="despesa"
              level={1}
            />
          ))}
          {dre.despesas.variaveis.total > 0 && (
            <DREItem 
              label="Subtotal Despesas Variáveis" 
              value={dre.despesas.variaveis.total} 
              type="subtotal" 
            />
          )}

          {/* RESULTADO OPERACIONAL */}
          <DREItem 
            label="= RESULTADO OPERACIONAL" 
            value={dre.resultadoOperacional} 
            type="resultado" 
            icon={<Equal className="w-4 h-4" />} 
          />

          {/* DESPESAS FINANCEIRAS */}
          {dre.jurosFinanceiros > 0 && (
            <>
              <div className="bg-accent/5 px-3 py-2 border-b border-border mt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                  <Minus className="w-3 h-3" /> 4. DESPESAS FINANCEIRAS
                </span>
              </div>
              <DREItem
                label="Juros de Empréstimos"
                value={dre.jurosFinanceiros}
                type="despesa"
                level={1}
              />
            </>
          )}

          {/* RESULTADO LÍQUIDO FINAL */}
          <div className={cn(
            "px-4 py-4 mt-2",
            dre.resultadoLiquido >= 0 ? "bg-success/10" : "bg-destructive/10"
          )}>
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-lg font-bold flex items-center gap-2",
                dre.resultadoLiquido >= 0 ? "text-success" : "text-destructive"
              )}>
                {dre.resultadoLiquido >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                = RESULTADO LÍQUIDO DO PERÍODO
              </span>
              <span className={cn(
                "text-2xl font-bold tabular-nums",
                dre.resultadoLiquido >= 0 ? "text-success" : "text-destructive"
              )}>
                {formatCurrency(dre.resultadoLiquido)}
              </span>
            </div>
          </div>
        </div>
      </ExpandablePanel>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução Mensal */}
        <ExpandablePanel
          title="Evolução do Resultado"
          subtitle="Últimos 12 meses"
          icon={<BarChart3 className="w-4 h-4" />}
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dadosComparativo}>
                <defs>
                  <linearGradient id="colorResultadoDRE" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 11 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLORS.muted, fontSize: 11 }}
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
                <Legend 
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      receitas: "Receitas",
                      despesas: "Despesas",
                      resultado: "Resultado",
                    };
                    return labels[value] || value;
                  }}
                />
                <Bar dataKey="receitas" name="Receitas" fill={COLORS.success} opacity={0.8} radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill={COLORS.danger} opacity={0.8} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="resultado" name="Resultado" stroke={COLORS.primary} strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ExpandablePanel>

        {/* Despesas por Tipo */}
        <ExpandablePanel
          title="Composição das Despesas"
          subtitle="Fixas vs Variáveis"
          icon={<PieChart className="w-4 h-4" />}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={despesasPorTipo}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {despesasPorTipo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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
            <div className="flex flex-col justify-center gap-3">
              {despesasPorTipo.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{formatCurrency(item.value)}</div>
                  </div>
                  <div className="text-sm font-medium">
                    {dre.despesas.total > 0 ? formatPercent((item.value / dre.despesas.total) * 100) : "0%"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ExpandablePanel>
      </div>

      {/* Despesas por Categoria */}
      <ExpandablePanel
        title="Despesas por Categoria"
        subtitle="Top 8 categorias"
        icon={<Target className="w-4 h-4" />}
      >
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={todasDespesas} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis 
                type="number" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: COLORS.muted, fontSize: 11 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <YAxis 
                type="category" 
                dataKey="categoria" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: COLORS.muted, fontSize: 11 }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string, props: any) => [
                  formatCurrency(value), 
                  props.payload.tipo === 'fixa' ? 'Despesa Fixa' : 'Despesa Variável'
                ]}
              />
              <Bar 
                dataKey="valor" 
                radius={[0, 4, 4, 0]}
              >
                {todasDespesas.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.tipo === 'fixa' ? COLORS.warning : COLORS.danger} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ExpandablePanel>

      {/* KPIs */}
      <ExpandablePanel
        title="Indicadores de Performance"
        subtitle="Análise de margens e eficiência"
        icon={<BarChart3 className="w-4 h-4" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <DetailedIndicatorBadge
            title="Margem Bruta"
            value={formatPercent(dre.kpis.margemBruta.valor)}
            status={dre.kpis.margemBruta.status}
            trend={dre.kpis.margemBruta.valor >= 40 ? "up" : "down"}
            descricao="(Receitas - Despesas Fixas) / Receitas × 100. Ideal: acima de 40%"
            formula="(Receitas - Despesas Fixas) / Receitas × 100"
            sparklineData={generateSparkline(dre.kpis.margemBruta.valor, dre.kpis.margemBruta.valor >= 40 ? "up" : "down")}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <DetailedIndicatorBadge
            title="Margem Operacional"
            value={formatPercent(dre.kpis.margemOperacional.valor)}
            status={dre.kpis.margemOperacional.status}
            trend={dre.kpis.margemOperacional.valor >= 20 ? "up" : "down"}
            descricao="Resultado Operacional / Receitas × 100. Ideal: acima de 20%"
            formula="Resultado Operacional / Receitas × 100"
            sparklineData={generateSparkline(dre.kpis.margemOperacional.valor, dre.kpis.margemOperacional.valor >= 20 ? "up" : "down")}
            icon={<Calculator className="w-4 h-4" />}
          />
          <DetailedIndicatorBadge
            title="Margem Líquida"
            value={formatPercent(dre.kpis.margemLiquida.valor)}
            status={dre.kpis.margemLiquida.status}
            trend={dre.kpis.margemLiquida.valor >= 15 ? "up" : "down"}
            descricao="Resultado Líquido / Receitas × 100. Ideal: acima de 15%"
            formula="Resultado Líquido / Receitas × 100"
            sparklineData={generateSparkline(dre.kpis.margemLiquida.valor, dre.kpis.margemLiquida.valor >= 15 ? "up" : "down")}
            icon={<DollarSign className="w-4 h-4" />}
          />
          <DetailedIndicatorBadge
            title="Índice de Eficiência"
            value={formatPercent(dre.kpis.indiceEficiencia.valor)}
            status={dre.kpis.indiceEficiencia.status}
            trend={dre.kpis.indiceEficiencia.valor <= 70 ? "up" : "down"}
            descricao="Total Despesas / Receitas × 100. Ideal: abaixo de 70%"
            formula="Total Despesas / Receitas × 100"
            sparklineData={generateSparkline(dre.kpis.indiceEficiencia.valor, dre.kpis.indiceEficiencia.valor <= 70 ? "down" : "up")}
            icon={<Target className="w-4 h-4" />}
          />
          <DetailedIndicatorBadge
            title="Comprometimento Fixo"
            value={formatPercent(dre.kpis.comprometimentoFixo.valor)}
            status={dre.kpis.comprometimentoFixo.status}
            trend={dre.kpis.comprometimentoFixo.valor <= 40 ? "up" : "down"}
            descricao="Despesas Fixas / Receitas × 100. Ideal: abaixo de 40%"
            formula="Despesas Fixas / Receitas × 100"
            sparklineData={generateSparkline(dre.kpis.comprometimentoFixo.valor, dre.kpis.comprometimentoFixo.valor <= 40 ? "down" : "up")}
            icon={<Wallet className="w-4 h-4" />}
          />
        </div>
      </ExpandablePanel>
    </div>
  );
}