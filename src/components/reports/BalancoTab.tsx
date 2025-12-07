import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Wallet,
  Building2,
  Car,
  CreditCard,
  Landmark,
  PieChart,
  LineChart,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { ReportCard } from "./ReportCard";
import { ExpandablePanel } from "./ExpandablePanel";
import { IndicatorBadge } from "./IndicatorBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const COLORS = {
  success: "hsl(142, 76%, 36%)",
  warning: "hsl(38, 92%, 50%)",
  danger: "hsl(0, 72%, 51%)",
  primary: "hsl(199, 89%, 48%)",
  accent: "hsl(270, 80%, 60%)",
  muted: "hsl(215, 20%, 55%)",
};

const PIE_COLORS = [COLORS.primary, COLORS.accent, COLORS.success, COLORS.warning, COLORS.danger];

export function BalancoTab() {
  const {
    transacoes,
    emprestimos,
    veiculos,
    getTotalReceitas,
    getTotalDespesas,
    getSaldoDevedor,
    getValorFipeTotal,
    getPatrimonioLiquido,
    getAtivosTotal,
    getPassivosTotal,
  } = useFinance();

  // Cálculos do Balanço Patrimonial
  const balanco = useMemo(() => {
    const caixa = Math.max(0, getTotalReceitas() - getTotalDespesas());
    const veiculosFipe = getValorFipeTotal();
    const ativos = caixa + veiculosFipe;
    const passivos = getSaldoDevedor();
    const patrimonioLiquido = ativos - passivos;

    // Cálculo de variação mensal simulada (últimos 2 meses)
    const receitasMesAtual = transacoes
      .filter(t => t.tipo === "receita" && t.data.includes("2024-02"))
      .reduce((acc, t) => acc + t.valor, 0);
    const despesasMesAtual = transacoes
      .filter(t => t.tipo === "despesa" && t.data.includes("2024-02"))
      .reduce((acc, t) => acc + t.valor, 0);
    const receitasMesAnterior = transacoes
      .filter(t => t.tipo === "receita" && t.data.includes("2024-01"))
      .reduce((acc, t) => acc + t.valor, 0);
    const despesasMesAnterior = transacoes
      .filter(t => t.tipo === "despesa" && t.data.includes("2024-01"))
      .reduce((acc, t) => acc + t.valor, 0);

    const saldoMesAtual = receitasMesAtual - despesasMesAtual;
    const saldoMesAnterior = receitasMesAnterior - despesasMesAnterior;
    const variacaoMensal = saldoMesAnterior !== 0 
      ? ((saldoMesAtual - saldoMesAnterior) / Math.abs(saldoMesAnterior)) * 100 
      : 0;

    return {
      ativos: {
        caixa,
        bancos: caixa * 0.3, // Simulação
        investimentos: caixa * 0.2, // Simulação
        veiculos: veiculosFipe,
        creditosReceber: 0,
        outros: 0,
        total: ativos,
      },
      passivos: {
        emprestimos: passivos,
        cartoes: emprestimos.filter(e => e.contrato.toLowerCase().includes("crédito")).reduce((acc, e) => acc + (e.parcela * e.meses * 0.7), 0),
        contasPagar: 0,
        obrigacoesTributarias: 0,
        passivosContingentes: 0,
        total: passivos,
      },
      patrimonioLiquido,
      variacaoMensal,
    };
  }, [transacoes, emprestimos, getTotalReceitas, getTotalDespesas, getSaldoDevedor, getValorFipeTotal]);

  // Evolução do PL nos últimos 12 meses (simulação)
  const evolucaoPL = useMemo(() => {
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const baseValue = balanco.patrimonioLiquido;
    return meses.map((mes, i) => ({
      mes,
      pl: Math.max(0, baseValue * (0.5 + (i * 0.05) + (Math.random() * 0.1))),
    }));
  }, [balanco.patrimonioLiquido]);

  // Dados para gráfico pizza de composição
  const composicaoAtivos = useMemo(() => [
    { name: "Caixa", value: balanco.ativos.caixa, percent: (balanco.ativos.caixa / balanco.ativos.total) * 100 },
    { name: "Veículos", value: balanco.ativos.veiculos, percent: (balanco.ativos.veiculos / balanco.ativos.total) * 100 },
  ].filter(item => item.value > 0), [balanco.ativos]);

  // Métricas adicionais
  const metricas = useMemo(() => {
    const plAtivos = balanco.ativos.total > 0 ? (balanco.patrimonioLiquido / balanco.ativos.total) * 100 : 0;
    const indiceCapitalizacao = balanco.patrimonioLiquido > 0 ? (balanco.patrimonioLiquido / balanco.ativos.total) * 100 : 0;
    const variacaoAtivosPassivos = balanco.passivos.total > 0 ? (balanco.ativos.total / balanco.passivos.total) : 999;

    return {
      plAtivos: { valor: plAtivos, status: plAtivos >= 50 ? "success" : plAtivos >= 30 ? "warning" : "danger" },
      indiceCapitalizacao: { valor: indiceCapitalizacao, status: indiceCapitalizacao >= 60 ? "success" : indiceCapitalizacao >= 40 ? "warning" : "danger" },
      variacaoAtivosPassivos: { valor: variacaoAtivosPassivos, status: variacaoAtivosPassivos >= 2 ? "success" : variacaoAtivosPassivos >= 1 ? "warning" : "danger" },
    };
  }, [balanco]);

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Cards Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <ReportCard
          title="Total de Ativos"
          value={formatCurrency(balanco.ativos.total)}
          status="success"
          icon={<TrendingUp className="w-5 h-5" />}
          tooltip="Soma de todos os bens e direitos: caixa, investimentos, veículos e outros ativos"
          delay={0}
        />
        <ReportCard
          title="Total de Passivos"
          value={formatCurrency(balanco.passivos.total)}
          status="danger"
          icon={<TrendingDown className="w-5 h-5" />}
          tooltip="Soma de todas as obrigações: empréstimos, financiamentos e dívidas"
          delay={50}
        />
        <ReportCard
          title="Patrimônio Líquido"
          value={formatCurrency(balanco.patrimonioLiquido)}
          status={balanco.patrimonioLiquido >= 0 ? "success" : "danger"}
          icon={<Scale className="w-5 h-5" />}
          tooltip="Ativos menos Passivos - representa a riqueza líquida"
          delay={100}
        />
        <ReportCard
          title="Variação Mensal"
          value={formatPercent(balanco.variacaoMensal)}
          trend={balanco.variacaoMensal}
          trendLabel="mês anterior"
          status={balanco.variacaoMensal >= 0 ? "success" : "danger"}
          icon={<LineChart className="w-5 h-5" />}
          tooltip="Variação do patrimônio comparado ao mês anterior"
          delay={150}
        />
        <ReportCard
          title="Índice de Solvência"
          value={formatPercent(metricas.plAtivos.valor)}
          status={metricas.plAtivos.status as any}
          icon={<Landmark className="w-5 h-5" />}
          tooltip="PL / Total de Ativos - indica a proporção do patrimônio em relação aos ativos"
          delay={200}
        />
      </div>

      {/* Painéis Expansíveis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Composição dos Ativos */}
        <ExpandablePanel
          title="Composição dos Ativos"
          subtitle="Detalhamento de bens e direitos"
          icon={<Wallet className="w-4 h-4" />}
          badge={formatCurrency(balanco.ativos.total)}
          badgeStatus="success"
        >
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-muted/30">
                  <TableHead className="text-muted-foreground">Conta</TableHead>
                  <TableHead className="text-muted-foreground text-right">Valor</TableHead>
                  <TableHead className="text-muted-foreground text-right">% Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-border hover:bg-muted/20">
                  <TableCell className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" />
                    Caixa e Equivalentes
                  </TableCell>
                  <TableCell className="text-right font-medium text-success">{formatCurrency(balanco.ativos.caixa)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {balanco.ativos.total > 0 ? formatPercent((balanco.ativos.caixa / balanco.ativos.total) * 100) : "0%"}
                  </TableCell>
                </TableRow>
                <TableRow className="border-border hover:bg-muted/20">
                  <TableCell className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-accent" />
                    Imobilizado (Veículos)
                  </TableCell>
                  <TableCell className="text-right font-medium text-success">{formatCurrency(balanco.ativos.veiculos)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {balanco.ativos.total > 0 ? formatPercent((balanco.ativos.veiculos / balanco.ativos.total) * 100) : "0%"}
                  </TableCell>
                </TableRow>
                <TableRow className="border-border bg-success/5">
                  <TableCell className="font-semibold text-success">TOTAL ATIVOS</TableCell>
                  <TableCell className="text-right font-bold text-success">{formatCurrency(balanco.ativos.total)}</TableCell>
                  <TableCell className="text-right font-medium text-success">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Mini gráfico pizza */}
          {composicaoAtivos.length > 0 && (
            <div className="mt-4 h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={composicaoAtivos}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {composicaoAtivos.map((_, index) => (
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
          )}
        </ExpandablePanel>

        {/* Composição dos Passivos */}
        <ExpandablePanel
          title="Composição dos Passivos"
          subtitle="Detalhamento de obrigações"
          icon={<CreditCard className="w-4 h-4" />}
          badge={formatCurrency(balanco.passivos.total)}
          badgeStatus="danger"
        >
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-muted/30">
                  <TableHead className="text-muted-foreground">Conta</TableHead>
                  <TableHead className="text-muted-foreground text-right">Valor</TableHead>
                  <TableHead className="text-muted-foreground text-right">% Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emprestimos.map((emp) => (
                  <TableRow key={emp.id} className="border-border hover:bg-muted/20">
                    <TableCell className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-destructive" />
                      {emp.contrato}
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      {formatCurrency(emp.parcela * emp.meses * 0.7)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco.passivos.total > 0 
                        ? formatPercent(((emp.parcela * emp.meses * 0.7) / balanco.passivos.total) * 100) 
                        : "0%"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-border bg-destructive/5">
                  <TableCell className="font-semibold text-destructive">TOTAL PASSIVOS</TableCell>
                  <TableCell className="text-right font-bold text-destructive">{formatCurrency(balanco.passivos.total)}</TableCell>
                  <TableCell className="text-right font-medium text-destructive">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </ExpandablePanel>
      </div>

      {/* Gráfico de Evolução do PL */}
      <ExpandablePanel
        title="Evolução do Patrimônio Líquido"
        subtitle="Últimos 12 meses"
        icon={<LineChart className="w-4 h-4" />}
        badge={balanco.variacaoMensal >= 0 ? "Crescendo" : "Reduzindo"}
        badgeStatus={balanco.variacaoMensal >= 0 ? "success" : "danger"}
      >
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolucaoPL}>
              <defs>
                <linearGradient id="colorPL" x1="0" y1="0" x2="0" y2="1">
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
                formatter={(value: number) => [formatCurrency(value), "Patrimônio Líquido"]}
              />
              <Area
                type="monotone"
                dataKey="pl"
                stroke={COLORS.primary}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPL)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ExpandablePanel>

      {/* Métricas Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <IndicatorBadge
          title="PL / Total de Ativos"
          value={formatPercent(metricas.plAtivos.valor)}
          status={metricas.plAtivos.status as any}
          trend={metricas.plAtivos.valor >= 50 ? "up" : "down"}
          tooltip="Indica quanto do patrimônio total é efetivamente seu. Valores acima de 50% são considerados saudáveis."
          sparklineData={[40, 45, 42, 48, 52, 50, metricas.plAtivos.valor]}
        />
        <IndicatorBadge
          title="Índice de Capitalização"
          value={formatPercent(metricas.indiceCapitalizacao.valor)}
          status={metricas.indiceCapitalizacao.status as any}
          trend={metricas.indiceCapitalizacao.valor >= 60 ? "up" : "down"}
          tooltip="Mede a proporção de recursos próprios em relação ao total de ativos. Quanto maior, mais capitalizado."
          sparklineData={[50, 55, 58, 54, 60, 62, metricas.indiceCapitalizacao.valor]}
        />
        <IndicatorBadge
          title="Ativos / Passivos"
          value={metricas.variacaoAtivosPassivos.valor.toFixed(2) + "x"}
          status={metricas.variacaoAtivosPassivos.status as any}
          trend={metricas.variacaoAtivosPassivos.valor >= 2 ? "up" : "down"}
          tooltip="Razão entre ativos e passivos. Valores acima de 2x indicam boa capacidade de pagamento."
          sparklineData={[1.2, 1.5, 1.8, 1.6, 2.0, 2.2, metricas.variacaoAtivosPassivos.valor]}
        />
      </div>
    </div>
  );
}
