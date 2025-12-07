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
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { ReportCard } from "./ReportCard";
import { ExpandablePanel } from "./ExpandablePanel";
import { IndicatorBadge } from "./IndicatorBadge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const COLORS = {
  success: "hsl(142, 76%, 36%)",
  warning: "hsl(38, 92%, 50%)",
  danger: "hsl(0, 72%, 51%)",
  primary: "hsl(199, 89%, 48%)",
  accent: "hsl(270, 80%, 60%)",
  muted: "hsl(215, 20%, 55%)",
};

const PIE_COLORS = [
  "hsl(199, 89%, 48%)",
  "hsl(270, 80%, 60%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(330, 100%, 65%)",
  "hsl(160, 100%, 45%)",
  "hsl(210, 100%, 60%)",
];

interface DREItemProps {
  label: string;
  value: number;
  type: "receita" | "despesa" | "resultado" | "subtotal";
  level?: number;
  icon?: React.ReactNode;
}

function DREItem({ label, value, type, level = 0, icon }: DREItemProps) {
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
        {value >= 0 ? "" : "-"}{formatCurrency(value)}
      </span>
    </div>
  );
}

export function DRETab() {
  const {
    transacoes,
    categorias,
    getTotalReceitas,
    getTotalDespesas,
    getDespesasFixas,
  } = useFinance();

  const [periodo, setPeriodo] = useState<"mensal" | "trimestral" | "anual">("anual");

  // Cálculos da DRE
  const dre = useMemo(() => {
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    // Agrupa receitas por categoria
    const receitasPorCategoria = categorias.map(cat => ({
      categoria: cat,
      valor: transacoes
        .filter(t => t.tipo === "receita" && t.categoria === cat)
        .reduce((acc, t) => acc + t.valor, 0),
    })).filter(r => r.valor > 0);

    // Agrupa despesas por categoria
    const despesasPorCategoria = categorias.map(cat => ({
      categoria: cat,
      valor: transacoes
        .filter(t => t.tipo === "despesa" && t.categoria === cat)
        .reduce((acc, t) => acc + t.valor, 0),
    })).filter(d => d.valor > 0);

    // Evolução mensal
    const evolucaoMensal = meses.map((mes, i) => {
      const mesNum = String(i + 1).padStart(2, "0");
      const receitas = transacoes
        .filter(t => t.tipo === "receita" && t.data.includes(`2024-${mesNum}`))
        .reduce((acc, t) => acc + t.valor, 0);
      const despesas = transacoes
        .filter(t => t.tipo === "despesa" && t.data.includes(`2024-${mesNum}`))
        .reduce((acc, t) => acc + t.valor, 0);
      return { mes, receitas, despesas, resultado: receitas - despesas };
    });

    const totalReceitas = getTotalReceitas();
    const totalDespesas = getTotalDespesas();
    const despesasFixas = getDespesasFixas();
    const despesasVariaveis = totalDespesas - despesasFixas;
    const resultadoBruto = totalReceitas - (despesasFixas * 0.3); // Custos diretos simulados
    const resultadoOperacional = resultadoBruto - despesasVariaveis;
    const resultadoLiquido = totalReceitas - totalDespesas;

    // KPIs
    const margemBruta = totalReceitas > 0 ? (resultadoBruto / totalReceitas) * 100 : 0;
    const margemOperacional = totalReceitas > 0 ? (resultadoOperacional / totalReceitas) * 100 : 0;
    const margemLiquida = totalReceitas > 0 ? (resultadoLiquido / totalReceitas) * 100 : 0;
    const indiceEficiencia = totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 0;

    return {
      receitas: {
        total: totalReceitas,
        porCategoria: receitasPorCategoria,
      },
      custosDiretos: despesasFixas * 0.3, // Simulação
      resultadoBruto,
      despesas: {
        total: totalDespesas,
        fixas: despesasFixas,
        variaveis: despesasVariaveis,
        porCategoria: despesasPorCategoria,
      },
      resultadoOperacional,
      outrasReceitas: 0,
      outrasDespesas: 0,
      resultadoLiquido,
      evolucaoMensal,
      kpis: {
        margemBruta: { valor: margemBruta, status: margemBruta >= 40 ? "success" : margemBruta >= 20 ? "warning" : "danger" },
        margemOperacional: { valor: margemOperacional, status: margemOperacional >= 20 ? "success" : margemOperacional >= 10 ? "warning" : "danger" },
        margemLiquida: { valor: margemLiquida, status: margemLiquida >= 15 ? "success" : margemLiquida >= 5 ? "warning" : "danger" },
        indiceEficiencia: { valor: indiceEficiencia, status: indiceEficiencia <= 70 ? "success" : indiceEficiencia <= 85 ? "warning" : "danger" },
      },
    };
  }, [transacoes, categorias, getTotalReceitas, getTotalDespesas, getDespesasFixas]);

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  // Dados para gráfico comparativo
  const dadosComparativo = dre.evolucaoMensal.filter(m => m.receitas > 0 || m.despesas > 0);

  return (
    <div className="space-y-6">
      {/* Cards Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <ReportCard
          title="Receitas Totais"
          value={formatCurrency(dre.receitas.total)}
          status="success"
          icon={<TrendingUp className="w-5 h-5" />}
          tooltip="Soma de todas as receitas no período"
          delay={0}
        />
        <ReportCard
          title="Custos Diretos"
          value={formatCurrency(dre.custosDiretos)}
          status="warning"
          icon={<Receipt className="w-5 h-5" />}
          tooltip="Custos diretamente relacionados à geração de receita"
          delay={50}
        />
        <ReportCard
          title="Despesas Operacionais"
          value={formatCurrency(dre.despesas.total)}
          status="danger"
          icon={<TrendingDown className="w-5 h-5" />}
          tooltip="Total de despesas operacionais do período"
          delay={100}
        />
        <ReportCard
          title="Resultado Operacional"
          value={formatCurrency(dre.resultadoOperacional)}
          status={dre.resultadoOperacional >= 0 ? "success" : "danger"}
          icon={<Calculator className="w-5 h-5" />}
          tooltip="Resultado antes de outras receitas/despesas"
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
          status={dre.kpis.margemLiquida.status as any}
          icon={<BarChart3 className="w-5 h-5" />}
          tooltip="Percentual do lucro em relação à receita total"
          delay={250}
        />
      </div>

      {/* Filtro de Período */}
      <div className="flex justify-end">
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

      {/* DRE Estruturada */}
      <ExpandablePanel
        title="Demonstração do Resultado do Exercício"
        subtitle="Estrutura contábil completa"
        icon={<Receipt className="w-4 h-4" />}
        badge={dre.resultadoLiquido >= 0 ? "Lucro" : "Prejuízo"}
        badgeStatus={dre.resultadoLiquido >= 0 ? "success" : "danger"}
      >
        <div className="space-y-1 rounded-lg border border-border overflow-hidden bg-card/30">
          {/* RECEITAS */}
          <div className="bg-success/5 px-3 py-2 border-b border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-success flex items-center gap-2">
              <Plus className="w-3 h-3" /> 1. RECEITAS
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
          <DREItem label="Total de Receitas" value={dre.receitas.total} type="subtotal" icon={<Equal className="w-4 h-4" />} />

          {/* CUSTOS DIRETOS */}
          <div className="bg-warning/5 px-3 py-2 border-b border-border mt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-warning flex items-center gap-2">
              <Minus className="w-3 h-3" /> 2. CUSTOS DIRETOS
            </span>
          </div>
          <DREItem label="Custos Obrigatórios" value={dre.custosDiretos} type="despesa" level={1} />
          
          {/* RESULTADO BRUTO */}
          <DREItem label="= RESULTADO BRUTO" value={dre.resultadoBruto} type="resultado" icon={<Equal className="w-4 h-4" />} />

          {/* DESPESAS OPERACIONAIS */}
          <div className="bg-destructive/5 px-3 py-2 border-b border-border mt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-destructive flex items-center gap-2">
              <Minus className="w-3 h-3" /> 3. DESPESAS OPERACIONAIS
            </span>
          </div>
          {dre.despesas.porCategoria.map((desp) => (
            <DREItem
              key={desp.categoria}
              label={desp.categoria}
              value={desp.valor}
              type="despesa"
              level={1}
            />
          ))}
          <DREItem label="Total de Despesas" value={dre.despesas.total} type="subtotal" icon={<Equal className="w-4 h-4" />} />

          {/* RESULTADO OPERACIONAL */}
          <DREItem label="= RESULTADO OPERACIONAL" value={dre.resultadoOperacional} type="resultado" icon={<Equal className="w-4 h-4" />} />

          {/* RESULTADO LÍQUIDO FINAL */}
          <div className={cn(
            "px-4 py-4 mt-2",
            dre.resultadoLiquido >= 0 ? "bg-success/10" : "bg-destructive/10"
          )}>
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-lg font-bold",
                dre.resultadoLiquido >= 0 ? "text-success" : "text-destructive"
              )}>
                = RESULTADO LÍQUIDO FINAL
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
        {/* Evolução do Resultado */}
        <ExpandablePanel
          title="Evolução do Resultado Líquido"
          subtitle="Últimos 12 meses"
          icon={<BarChart3 className="w-4 h-4" />}
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dadosComparativo}>
                <defs>
                  <linearGradient id="colorResultado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" vertical={false} />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 12 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLORS.muted, fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220, 20%, 8%)",
                    border: "1px solid hsl(220, 20%, 18%)",
                    borderRadius: "12px",
                  }}
                  formatter={(value: number) => [formatCurrency(value), "Resultado"]}
                />
                <Area
                  type="monotone"
                  dataKey="resultado"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorResultado)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ExpandablePanel>

        {/* Despesas por Categoria */}
        <ExpandablePanel
          title="Despesas por Categoria"
          subtitle="Distribuição percentual"
          icon={<PieChart className="w-4 h-4" />}
        >
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={dre.despesas.porCategoria}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="valor"
                  nameKey="categoria"
                  label={({ categoria, percent }) => `${categoria} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: COLORS.muted, strokeWidth: 1 }}
                >
                  {dre.despesas.porCategoria.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220, 20%, 8%)",
                    border: "1px solid hsl(220, 20%, 18%)",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [formatCurrency(value), "Valor"]}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </ExpandablePanel>
      </div>

      {/* Receitas vs Despesas */}
      <ExpandablePanel
        title="Receitas vs Despesas"
        subtitle="Comparativo mensal"
        icon={<BarChart3 className="w-4 h-4" />}
      >
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosComparativo}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" vertical={false} />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 12 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: COLORS.muted, fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 20%, 8%)",
                  border: "1px solid hsl(220, 20%, 18%)",
                  borderRadius: "12px",
                }}
                formatter={(value: number) => [formatCurrency(value)]}
              />
              <Legend />
              <Bar dataKey="receitas" name="Receitas" fill={COLORS.success} radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ExpandablePanel>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <IndicatorBadge
          title="Margem Bruta"
          value={formatPercent(dre.kpis.margemBruta.valor)}
          status={dre.kpis.margemBruta.status as any}
          trend={dre.kpis.margemBruta.valor >= 40 ? "up" : "down"}
          tooltip="Percentual de lucro bruto sobre a receita. Valores acima de 40% são considerados bons."
          sparklineData={[30, 35, 38, 42, 40, 45, dre.kpis.margemBruta.valor]}
        />
        <IndicatorBadge
          title="Margem Operacional"
          value={formatPercent(dre.kpis.margemOperacional.valor)}
          status={dre.kpis.margemOperacional.status as any}
          trend={dre.kpis.margemOperacional.valor >= 20 ? "up" : "down"}
          tooltip="Percentual de lucro operacional sobre a receita. Valores acima de 20% indicam boa eficiência."
          sparklineData={[15, 18, 16, 20, 22, 19, dre.kpis.margemOperacional.valor]}
        />
        <IndicatorBadge
          title="Margem Líquida"
          value={formatPercent(dre.kpis.margemLiquida.valor)}
          status={dre.kpis.margemLiquida.status as any}
          trend={dre.kpis.margemLiquida.valor >= 15 ? "up" : "down"}
          tooltip="Percentual de lucro líquido final sobre a receita. Valores acima de 15% são excelentes."
          sparklineData={[10, 12, 11, 14, 16, 15, dre.kpis.margemLiquida.valor]}
        />
        <IndicatorBadge
          title="Índice de Eficiência"
          value={formatPercent(dre.kpis.indiceEficiencia.valor)}
          status={dre.kpis.indiceEficiencia.status as any}
          trend={dre.kpis.indiceEficiencia.valor <= 70 ? "up" : "down"}
          tooltip="Percentual de despesas em relação à receita. Quanto menor, mais eficiente. Ideal abaixo de 70%."
          sparklineData={[80, 75, 72, 70, 68, 65, dre.kpis.indiceEficiencia.valor]}
        />
      </div>
    </div>
  );
}
