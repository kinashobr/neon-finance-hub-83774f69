import { useMemo, useCallback } from "react";
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
  Banknote,
  PiggyBank,
  Bitcoin,
  Target,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Droplets,
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
  BarChart,
  Bar,
  Legend,
  ComposedChart,
  Line,
} from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { ReportCard } from "./ReportCard";
import { ExpandablePanel } from "./ExpandablePanel";
import { IndicatorBadge } from "./IndicatorBadge";
import { DetailedIndicatorBadge } from "./DetailedIndicatorBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ACCOUNT_TYPE_LABELS } from "@/types/finance";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ComparisonDateRanges, DateRange } from "@/types/finance";
import { ContaCorrente, TransacaoCompleta } from "@/types/finance";
import { EvolucaoPatrimonialChart } from "@/components/dashboard/EvolucaoPatrimonialChart"; // ADDED IMPORT

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
];

// Define o tipo de status esperado pelo IndicatorBadge
type IndicatorStatus = "success" | "warning" | "danger" | "neutral";

interface BalancoTabProps {
  dateRanges: ComparisonDateRanges;
}

export function BalancoTab({ dateRanges }: BalancoTabProps) {
  const {
    transacoesV2,
    contasMovimento,
    emprestimos,
    veiculos,
    categoriasV2,
    getAtivosTotal,
    getPassivosTotal,
    getPatrimonioLiquido,
    calculateBalanceUpToDate, // Importado do contexto
  } = useFinance();

  const { range1, range2 } = dateRanges;

  // 1. Filtrar transações para um período específico
  const filterTransactionsByRange = useCallback((range: DateRange) => {
    if (!range.from || !range.to) return transacoesV2;
    
    return transacoesV2.filter(t => {
      try {
        const dataT = parseISO(t.date);
        return isWithinInterval(dataT, { start: range.from!, end: range.to! });
      } catch {
        return false;
      }
    });
  }, [transacoesV2]);

  const transacoesPeriodo1 = useMemo(() => filterTransactionsByRange(range1), [filterTransactionsByRange, range1]);
  const transacoesPeriodo2 = useMemo(() => filterTransactionsByRange(range2), [filterTransactionsByRange, range2]);

  // 2. Calcular saldo de cada conta baseado nas transações do período (Saldo Final do Período)
  const calculateFinalBalances = useCallback((transactions: typeof transacoesV2, periodStart: Date | undefined) => {
    const saldos: Record<string, number> = {};
    
    contasMovimento.forEach(conta => {
      // O saldo inicial é o saldo acumulado ANTES do período
      const saldoInicialPeriodo = periodStart 
        ? calculateBalanceUpToDate(conta.id, periodStart, transacoesV2, contasMovimento)
        : calculateBalanceUpToDate(conta.id, undefined, transacoesV2, contasMovimento);
        
      saldos[conta.id] = saldoInicialPeriodo;
    });

    transactions.forEach(t => {
      if (!saldos[t.accountId]) saldos[t.accountId] = 0;
      
      if (t.flow === 'in' || t.flow === 'transfer_in') {
        saldos[t.accountId] += t.amount;
      } else {
        saldos[t.accountId] -= t.amount;
      }
    });

    return saldos;
  }, [contasMovimento, transacoesV2, calculateBalanceUpToDate]);

  // Cálculos do Balanço Patrimonial para um período
  const calculateBalanco = useCallback((transactions: typeof transacoesV2, periodStart: Date | undefined) => {
    const saldosPorConta = calculateFinalBalances(transactions, periodStart);

    // === ATIVOS CIRCULANTES ===
    const contasCirculantes = contasMovimento.filter(c => 
      ['conta_corrente', 'poupanca', 'reserva_emergencia'].includes(c.accountType)
    );
    const caixaEquivalentes = contasCirculantes.reduce((acc, c) => acc + Math.max(0, saldosPorConta[c.id] || 0), 0);

    // === INVESTIMENTOS ===
    const contasInvestimento = contasMovimento.filter(c => 
      ['aplicacao_renda_fixa', 'criptoativos', 'objetivos_financeiros'].includes(c.accountType)
    );
    
    const saldoRendaFixa = contasInvestimento.filter(c => c.accountType === 'aplicacao_renda_fixa' || c.accountType === 'poupanca').reduce((acc, c) => acc + Math.max(0, saldosPorConta[c.id] || 0), 0);
    const saldoCripto = contasInvestimento.filter(c => c.accountType === 'criptoativos' && !c.name.toLowerCase().includes('stable')).reduce((acc, c) => acc + Math.max(0, saldosPorConta[c.id] || 0), 0);
    const saldoStable = contasInvestimento.filter(c => c.accountType === 'criptoativos' && c.name.toLowerCase().includes('stable')).reduce((acc, c) => acc + Math.max(0, saldosPorConta[c.id] || 0), 0);
    const saldoObjetivos = contasInvestimento.filter(c => c.accountType === 'objetivos_financeiros').reduce((acc, c) => acc + Math.max(0, saldosPorConta[c.id] || 0), 0);
    
    const investimentosTotal = saldoRendaFixa + saldoCripto + saldoStable + saldoObjetivos;

    // === IMOBILIZADO ===
    const veiculosAtivos = veiculos.filter(v => v.status !== 'vendido');
    const valorVeiculos = veiculosAtivos.reduce((acc, v) => acc + (v.valorFipe || v.valorVeiculo || 0), 0);

    // === TOTAL ATIVOS
    const totalAtivos = caixaEquivalentes + investimentosTotal + valorVeiculos;

    // === PASSIVOS ===
    const emprestimosAtivos = emprestimos.filter(e => e.status !== 'quitado');
    const totalPassivos = getPassivosTotal(); // Usamos o total passivo global, pois dívidas são passivos de longo prazo

    // Passivo curto prazo (próximos 12 meses)
    const passivoCurtoPrazo = emprestimosAtivos.reduce((acc, e) => {
      const parcelasRestantes = Math.min(12, e.meses - (e.parcelasPagas || 0));
      return acc + (e.parcela * parcelasRestantes);
    }, 0);
    
    // Passivo longo prazo
    const passivoLongoPrazo = totalPassivos - passivoCurtoPrazo;

    // === PATRIMÔNIO LÍQUIDO ===
    const patrimonioLiquido = totalAtivos - totalPassivos;

    // === RESULTADO DO PERÍODO (Fluxo de Caixa) ===
    const calcularResultado = (transacoes: typeof transacoesV2) => {
      const entradas = transacoes
        .filter(t => t.flow === 'in' && t.operationType !== 'transferencia' && t.operationType !== 'liberacao_emprestimo')
        .reduce((acc, t) => acc + t.amount, 0);
      const saidas = transacoes
        .filter(t => t.flow === 'out' && t.operationType !== 'transferencia' && t.operationType !== 'aplicacao')
        .reduce((acc, t) => acc + t.amount, 0);
      return entradas - saidas;
    };

    const resultadoPeriodo = calcularResultado(transactions);

    return {
      saldosPorConta,
      ativos: {
        circulantes: { caixa: caixaEquivalentes },
        naoCirculantes: { investimentos: investimentosTotal, rendaFixa: saldoRendaFixa, criptoativos: saldoCripto, stablecoins: saldoStable, objetivos: saldoObjetivos, veiculos: valorVeiculos },
        total: totalAtivos,
      },
      passivos: {
        curtoPrazo: passivoCurtoPrazo,
        longoPrazo: passivoLongoPrazo,
        total: totalPassivos,
        emprestimos: emprestimosAtivos,
      },
      patrimonioLiquido,
      resultadoPeriodo,
    };
  }, [contasMovimento, emprestimos, veiculos, transacoesV2, getPassivosTotal, calculateFinalBalances, calculateBalanceUpToDate]);

  // Balanço para o Período 1 (Principal)
  const balanco1 = useMemo(() => calculateBalanco(transacoesPeriodo1, range1.from), [calculateBalanco, transacoesPeriodo1, range1.from]);

  // Balanço para o Período 2 (Comparação)
  const balanco2 = useMemo(() => calculateBalanco(transacoesPeriodo2, range2.from), [calculateBalanco, transacoesPeriodo2, range2.from]);

  // Variação do Patrimônio Líquido (PL) entre P1 e P2
  const variacaoPL = useMemo(() => {
    if (!range2.from) return { diff: 0, percent: 0 };
    
    const pl1 = balanco1.patrimonioLiquido;
    const pl2 = balanco2.patrimonioLiquido;
    
    const diff = pl1 - pl2;
    const percent = pl2 !== 0 ? (diff / Math.abs(pl2)) * 100 : 0;
    
    return { diff, percent };
  }, [balanco1, balanco2, range2.from]);

  // Composição dos ativos para gráfico pizza (usando P1)
  const composicaoAtivos = useMemo(() => {
    const items = [
      { name: "Caixa e Equivalentes", value: balanco1.ativos.circulantes.caixa, color: COLORS.primary },
      { name: "Renda Fixa", value: balanco1.ativos.naoCirculantes.rendaFixa, color: COLORS.success },
      { name: "Criptoativos", value: balanco1.ativos.naoCirculantes.criptoativos, color: COLORS.gold },
      { name: "Stablecoins", value: balanco1.ativos.naoCirculantes.stablecoins, color: COLORS.cyan },
      { name: "Objetivos", value: balanco1.ativos.naoCirculantes.objetivos, color: COLORS.accent },
      { name: "Veículos", value: balanco1.ativos.naoCirculantes.veiculos, color: COLORS.warning },
    ].filter(item => item.value > 0);

    return items;
  }, [balanco1]);

  // Métricas (usando P1)
  const metricas = useMemo(() => {
    const plAtivos = balanco1.ativos.total > 0 ? (balanco1.patrimonioLiquido / balanco1.ativos.total) * 100 : 0;
    const liquidezGeral = balanco1.passivos.total > 0 ? balanco1.ativos.total / balanco1.passivos.total : 999;
    const passivoCurtoPrazo = balanco1.passivos.curtoPrazo;
    const liquidezCorrente = passivoCurtoPrazo > 0 
      ? balanco1.ativos.circulantes.caixa / passivoCurtoPrazo 
      : 999;
    const endividamento = balanco1.ativos.total > 0 ? (balanco1.passivos.total / balanco1.ativos.total) * 100 : 0;
    const coberturaAtivos = balanco1.passivos.total > 0 ? balanco1.ativos.total / balanco1.passivos.total : 999;
    const imobilizacao = balanco1.patrimonioLiquido > 0 
      ? (balanco1.ativos.naoCirculantes.veiculos / balanco1.patrimonioLiquido) * 100 
      : 0;

    return {
      plAtivos: { 
        valor: plAtivos, 
        status: (plAtivos >= 50 ? "success" : plAtivos >= 30 ? "warning" : "danger") as IndicatorStatus 
      },
      liquidezGeral: { 
        valor: liquidezGeral, 
        status: (liquidezGeral >= 2 ? "success" : liquidezGeral >= 1 ? "warning" : "danger") as IndicatorStatus 
      },
      liquidezCorrente: { 
        valor: liquidezCorrente, 
        status: (liquidezCorrente >= 1.5 ? "success" : liquidezCorrente >= 1 ? "warning" : "danger") as IndicatorStatus 
      },
      endividamento: { 
        valor: endividamento, 
        status: (endividamento < 30 ? "success" : endividamento < 50 ? "warning" : "danger") as IndicatorStatus 
      },
      coberturaAtivos: { 
        valor: coberturaAtivos, 
        status: (coberturaAtivos >= 2 ? "success" : coberturaAtivos >= 1 ? "warning" : "danger") as IndicatorStatus 
      },
      imobilizacao: { 
        valor: imobilizacao, 
        status: (imobilizacao < 30 ? "success" : imobilizacao < 50 ? "warning" : "danger") as IndicatorStatus 
      },
    };
  }, [balanco1]);

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const formatRatio = (value: number) => value >= 999 ? "∞" : `${value.toFixed(2)}x`;

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
          title="Total de Ativos"
          value={formatCurrency(balanco1.ativos.total)}
          status="success"
          icon={<TrendingUp className="w-5 h-5" />}
          tooltip="Soma de todos os bens e direitos: caixa, investimentos, veículos"
          delay={0}
        />
        <ReportCard
          title="Ativos Circulantes"
          value={formatCurrency(balanco1.ativos.circulantes.caixa)}
          status="success"
          icon={<Banknote className="w-5 h-5" />}
          tooltip="Recursos de alta liquidez: contas correntes, poupança, reserva"
          delay={50}
        />
        <ReportCard
          title="Investimentos"
          value={formatCurrency(balanco1.ativos.naoCirculantes.investimentos)}
          status="success"
          icon={<PiggyBank className="w-5 h-5" />}
          tooltip="Renda fixa, criptoativos, stablecoins e objetivos"
          delay={100}
        />
        <ReportCard
          title="Total de Passivos"
          value={formatCurrency(balanco1.passivos.total)}
          status={balanco1.passivos.total > 0 ? "danger" : "success"}
          icon={<TrendingDown className="w-5 h-5" />}
          tooltip="Soma de todas as obrigações: empréstimos e financiamentos"
          delay={150}
        />
        <ReportCard
          title="Patrimônio Líquido"
          value={formatCurrency(balanco1.patrimonioLiquido)}
          status={balanco1.patrimonioLiquido >= 0 ? "success" : "danger"}
          icon={<Scale className="w-5 h-5" />}
          tooltip="Ativos - Passivos = Riqueza Líquida"
          delay={200}
        />
        <ReportCard
          title="Variação do PL"
          value={formatPercent(variacaoPL.percent)}
          trend={variacaoPL.percent}
          trendLabel="Período 2"
          status={variacaoPL.percent >= 0 ? "success" : "danger"}
          icon={<LineChart className="w-5 h-5" />}
          tooltip={`Variação do Patrimônio Líquido comparado ao Período 2. Diferença: ${formatCurrency(variacaoPL.diff)}`}
          delay={250}
        />
      </div>

      {/* Balanço Patrimonial Estruturado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ATIVO */}
        <ExpandablePanel
          title="ATIVO"
          subtitle="Bens e direitos"
          icon={<Wallet className="w-4 h-4" />}
          badge={formatCurrency(balanco1.ativos.total)}
          badgeStatus="success"
          defaultExpanded={true}
        >
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-muted/30">
                  <TableHead className="text-muted-foreground">Conta</TableHead>
                  <TableHead className="text-muted-foreground text-right">Valor</TableHead>
                  <TableHead className="text-muted-foreground text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* ATIVO CIRCULANTE */}
                <TableRow className="border-border bg-success/5">
                  <TableCell colSpan={3} className="font-semibold text-success text-sm">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      ATIVO CIRCULANTE
                    </div>
                  </TableCell>
                </TableRow>
                {contasMovimento.filter(c => ['conta_corrente', 'poupanca', 'reserva_emergencia'].includes(c.accountType)).map(conta => (
                  <TableRow key={conta.id} className="border-border hover:bg-muted/20">
                    <TableCell className="pl-6 flex items-center gap-2">
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      {conta.name}
                      <span className="text-xs text-muted-foreground">({ACCOUNT_TYPE_LABELS[conta.accountType]})</span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-success">
                      {formatCurrency(balanco1.saldosPorConta[conta.id] || 0)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco1.ativos.total > 0 ? formatPercent(((balanco1.saldosPorConta[conta.id] || 0) / balanco1.ativos.total) * 100) : "0%"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-border bg-muted/20">
                  <TableCell className="font-medium text-foreground pl-4">Subtotal Circulante</TableCell>
                  <TableCell className="text-right font-semibold text-success">{formatCurrency(balanco1.ativos.circulantes.caixa)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {balanco1.ativos.total > 0 ? formatPercent((balanco1.ativos.circulantes.caixa / balanco1.ativos.total) * 100) : "0%"}
                  </TableCell>
                </TableRow>

                {/* ATIVO NÃO CIRCULANTE */}
                <TableRow className="border-border bg-primary/5">
                  <TableCell colSpan={3} className="font-semibold text-primary text-sm">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      ATIVO NÃO CIRCULANTE
                    </div>
                  </TableCell>
                </TableRow>
                {balanco1.ativos.naoCirculantes.rendaFixa > 0 && (
                  <TableRow className="border-border hover:bg-muted/20">
                    <TableCell className="pl-6 flex items-center gap-2">
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      Aplicações em Renda Fixa
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(balanco1.ativos.naoCirculantes.rendaFixa)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco1.ativos.total > 0 ? formatPercent((balanco1.ativos.naoCirculantes.rendaFixa / balanco1.ativos.total) * 100) : "0%"}
                    </TableCell>
                  </TableRow>
                )}
                {balanco1.ativos.naoCirculantes.criptoativos > 0 && (
                  <TableRow className="border-border hover:bg-muted/20">
                    <TableCell className="pl-6 flex items-center gap-2">
                      <Bitcoin className="w-3 h-3 text-gold" />
                      Criptoativos
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(balanco1.ativos.naoCirculantes.criptoativos)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco1.ativos.total > 0 ? formatPercent((balanco1.ativos.naoCirculantes.criptoativos / balanco1.ativos.total) * 100) : "0%"}
                    </TableCell>
                  </TableRow>
                )}
                {balanco1.ativos.naoCirculantes.stablecoins > 0 && (
                  <TableRow className="border-border hover:bg-muted/20">
                    <TableCell className="pl-6 flex items-center gap-2">
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      Stablecoins
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(balanco1.ativos.naoCirculantes.stablecoins)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco1.ativos.total > 0 ? formatPercent((balanco1.ativos.naoCirculantes.stablecoins / balanco1.ativos.total) * 100) : "0%"}
                    </TableCell>
                  </TableRow>
                )}
                {balanco1.ativos.naoCirculantes.objetivos > 0 && (
                  <TableRow className="border-border hover:bg-muted/20">
                    <TableCell className="pl-6 flex items-center gap-2">
                      <Target className="w-3 h-3 text-accent" />
                      Objetivos Financeiros
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(balanco1.ativos.naoCirculantes.objetivos)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco1.ativos.total > 0 ? formatPercent((balanco1.ativos.naoCirculantes.objetivos / balanco1.ativos.total) * 100) : "0%"}
                    </TableCell>
                  </TableRow>
                )}
                {balanco1.ativos.naoCirculantes.veiculos > 0 && (
                  <TableRow className="border-border hover:bg-muted/20">
                    <TableCell className="pl-6 flex items-center gap-2">
                      <Car className="w-3 h-3 text-warning" />
                      Imobilizado (Veículos)
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(balanco1.ativos.naoCirculantes.veiculos)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco1.ativos.total > 0 ? formatPercent((balanco1.ativos.naoCirculantes.veiculos / balanco1.ativos.total) * 100) : "0%"}
                    </TableCell>
                  </TableRow>
                )}

                {/* TOTAL ATIVOS */}
                <TableRow className="border-border bg-success/10">
                  <TableCell className="font-bold text-success">TOTAL DO ATIVO</TableCell>
                  <TableCell className="text-right font-bold text-success text-lg">{formatCurrency(balanco1.ativos.total)}</TableCell>
                  <TableCell className="text-right font-bold text-success">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </ExpandablePanel>

        {/* PASSIVO + PL */}
        <ExpandablePanel
          title="PASSIVO + PATRIMÔNIO LÍQUIDO"
          subtitle="Obrigações e capital próprio"
          icon={<CreditCard className="w-4 h-4" />}
          badge={formatCurrency(balanco1.ativos.total)}
          badgeStatus={balanco1.patrimonioLiquido >= 0 ? "success" : "danger"}
          defaultExpanded={true}
        >
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-muted/30">
                  <TableHead className="text-muted-foreground">Conta</TableHead>
                  <TableHead className="text-muted-foreground text-right">Valor</TableHead>
                  <TableHead className="text-muted-foreground text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* PASSIVO CIRCULANTE */}
                <TableRow className="border-border bg-warning/5">
                  <TableCell colSpan={3} className="font-semibold text-warning text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      PASSIVO CIRCULANTE (até 12 meses)
                    </div>
                  </TableCell>
                </TableRow>
                {balanco1.passivos.emprestimos.filter(e => (e.meses - (e.parcelasPagas || 0)) <= 12).map(emp => (
                  <TableRow key={emp.id} className="border-border hover:bg-muted/20">
                    <TableCell className="pl-6 flex items-center gap-2">
                      <Building2 className="w-3 h-3 text-warning" />
                      {emp.contrato}
                    </TableCell>
                    <TableCell className="text-right font-medium text-warning">
                      {formatCurrency(emp.parcela * Math.min(12, emp.meses - (emp.parcelasPagas || 0)))}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco1.ativos.total > 0 ? formatPercent((emp.parcela * Math.min(12, emp.meses - (emp.parcelasPagas || 0)) / balanco1.ativos.total) * 100) : "0%"}
                    </TableCell>
                  </TableRow>
                ))}
                {balanco1.passivos.curtoPrazo > 0 && (
                  <TableRow className="border-border bg-muted/20">
                    <TableCell className="font-medium text-foreground pl-4">Subtotal Curto Prazo</TableCell>
                    <TableCell className="text-right font-semibold text-warning">{formatCurrency(balanco1.passivos.curtoPrazo)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco1.ativos.total > 0 ? formatPercent((balanco1.passivos.curtoPrazo / balanco1.ativos.total) * 100) : "0%"}
                    </TableCell>
                  </TableRow>
                )}

                {/* PASSIVO NÃO CIRCULANTE */}
                {balanco1.passivos.longoPrazo > 0 && (
                  <>
                    <TableRow className="border-border bg-destructive/5">
                      <TableCell colSpan={3} className="font-semibold text-destructive text-sm">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          PASSIVO NÃO CIRCULANTE (longo prazo)
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-border hover:bg-muted/20">
                      <TableCell className="pl-6">Empréstimos e Financiamentos</TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        {formatCurrency(balanco1.passivos.longoPrazo)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {balanco1.ativos.total > 0 ? formatPercent((balanco1.passivos.longoPrazo / balanco1.ativos.total) * 100) : "0%"}
                      </TableCell>
                    </TableRow>
                  </>
                )}

                {/* TOTAL PASSIVO */}
                <TableRow className="border-border bg-destructive/10">
                  <TableCell className="font-bold text-destructive">TOTAL DO PASSIVO</TableCell>
                  <TableCell className="text-right font-bold text-destructive">{formatCurrency(balanco1.passivos.total)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {balanco1.ativos.total > 0 ? formatPercent((balanco1.passivos.total / balanco1.ativos.total) * 100) : "0%"}
                  </TableCell>
                </TableRow>

                {/* PATRIMÔNIO LÍQUIDO */}
                <TableRow className="border-border bg-primary/5">
                  <TableCell colSpan={3} className="font-semibold text-primary text-sm">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      PATRIMÔNIO LÍQUIDO
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow className="border-border hover:bg-muted/20">
                  <TableCell className="pl-6">Capital Próprio (Ativos - Passivos)</TableCell>
                  <TableCell className={cn("text-right font-medium", balanco1.patrimonioLiquido >= 0 ? "text-success" : "text-destructive")}>
                    {formatCurrency(balanco1.patrimonioLiquido)}
                  </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco1.ativos.total > 0 ? formatPercent((balanco1.patrimonioLiquido / balanco1.ativos.total) * 100) : "0%"}
                    </TableCell>
                  </TableRow>

                {/* TOTAL PASSIVO + PL */}
                <TableRow className="border-border bg-primary/10">
                  <TableCell className="font-bold text-primary">TOTAL PASSIVO + PL</TableCell>
                  <TableCell className="text-right font-bold text-primary text-lg">{formatCurrency(balanco1.ativos.total)}</TableCell>
                  <TableCell className="text-right font-bold text-primary">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </ExpandablePanel>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Composição dos Ativos */}
        <ExpandablePanel
          title="Composição dos Ativos"
          subtitle="Distribuição por classe"
          icon={<PieChart className="w-4 h-4" />}
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={composicaoAtivos.filter(d => d.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {composicaoAtivos.filter(d => d.value > 0).map((entry, index) => (
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

        {/* Evolução do PL (REPLACED WITH DEDICATED COMPONENT) */}
        <ExpandablePanel
          title="Evolução Patrimonial"
          subtitle="Últimos 12 meses"
          icon={<LineChart className="w-4 h-4" />}
          badge={variacaoPL.percent >= 0 ? "Crescendo" : "Reduzindo"}
          badgeStatus={variacaoPL.percent >= 0 ? "success" : "danger"}
        >
          <EvolucaoPatrimonialChart />
        </ExpandablePanel>
      </div>

      {/* Indicadores do Balanço */}
      <ExpandablePanel
        title="Indicadores Patrimoniais"
        subtitle="Métricas de saúde financeira"
        icon={<Landmark className="w-4 h-4" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DetailedIndicatorBadge
            title="PL / Total de Ativos"
            value={formatPercent(metricas.plAtivos.valor)}
            status={metricas.plAtivos.status}
            trend={metricas.plAtivos.valor >= 50 ? "up" : "down"}
            trendLabel="vs P2"
            descricao="Indica quanto do patrimônio é efetivamente seu. Ideal: acima de 50%"
            formula="(Patrimônio Líquido / Ativo Total) × 100"
            sparklineData={generateSparkline(metricas.plAtivos.valor, metricas.plAtivos.valor >= 50 ? "up" : "down")}
            icon={<Scale className="w-4 h-4" />}
          />
          <DetailedIndicatorBadge
            title="Liquidez Geral"
            value={formatRatio(metricas.liquidezGeral.valor)}
            status={metricas.liquidezGeral.status}
            trend={metricas.liquidezGeral.valor >= 2 ? "up" : "down"}
            trendLabel="vs P2"
            descricao="Capacidade de pagar todas as dívidas. Ideal: acima de 2x"
            formula="Ativo Total / Passivo Total"
            sparklineData={generateSparkline(metricas.liquidezGeral.valor, metricas.liquidezGeral.valor >= 2 ? "up" : "down")}
            icon={<Droplets className="w-4 h-4" />}
          />
          <DetailedIndicatorBadge
            title="Liquidez Corrente"
            value={formatRatio(metricas.liquidezCorrente.valor)}
            status={metricas.liquidezCorrente.status}
            trend={metricas.liquidezCorrente.valor >= 1.5 ? "up" : "down"}
            trendLabel="vs P2"
            descricao="Capacidade de pagar dívidas de curto prazo. Ideal: acima de 1.5x"
            formula="Ativo Circulante / Passivo Circulante"
            sparklineData={generateSparkline(metricas.liquidezCorrente.valor, metricas.liquidezCorrente.valor >= 1.5 ? "up" : "down")}
            icon={<Banknote className="w-4 h-4" />}
          />
          <DetailedIndicatorBadge
            title="Endividamento"
            value={formatPercent(metricas.endividamento.valor)}
            status={metricas.endividamento.status}
            trend={metricas.endividamento.valor < 30 ? "up" : "down"}
            trendLabel="vs P2"
            descricao="Percentual dos ativos comprometidos com dívidas. Quanto menor, melhor. Ideal: abaixo de 30%"
            formula="(Passivo Total / Ativo Total) × 100"
            sparklineData={generateSparkline(metricas.endividamento.valor, metricas.endividamento.valor < 30 ? "down" : "up")}
            icon={<CreditCard className="w-4 h-4" />}
          />
          <DetailedIndicatorBadge
            title="Cobertura de Ativos"
            value={formatRatio(metricas.coberturaAtivos.valor)}
            status={metricas.coberturaAtivos.status}
            trend={metricas.coberturaAtivos.valor >= 2 ? "up" : "down"}
            trendLabel="vs P2"
            descricao="Quantas vezes os ativos cobrem os passivos. Ideal: acima de 2x"
            formula="Ativo Total / Passivo Total"
            sparklineData={generateSparkline(metricas.coberturaAtivos.valor, metricas.coberturaAtivos.valor >= 2 ? "up" : "down")}
            icon={<ShieldCheck className="w-4 h-4" />}
          />
          <DetailedIndicatorBadge
            title="Imobilização do PL"
            value={formatPercent(metricas.imobilizacao.valor)}
            status={metricas.imobilizacao.status}
            trend={metricas.imobilizacao.valor < 30 ? "up" : "down"}
            trendLabel="vs P2"
            descricao="Quanto do PL está em bens imobilizados (veículos). Ideal: abaixo de 30%"
            formula="(Ativo Imobilizado / Patrimônio Líquido) × 100"
            sparklineData={generateSparkline(metricas.imobilizacao.valor, metricas.imobilizacao.valor < 30 ? "down" : "up")}
            icon={<Car className="w-4 h-4" />}
          />
        </div>
      </ExpandablePanel>
    </div>
  );
}