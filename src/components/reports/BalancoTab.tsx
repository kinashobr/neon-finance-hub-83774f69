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
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export function BalancoTab() {
  const {
    transacoesV2,
    contasMovimento,
    emprestimos,
    veiculos,
    investimentosRF,
    criptomoedas,
    stablecoins,
    objetivos,
    categoriasV2,
  } = useFinance();

  // Calcula saldo de cada conta baseado em transações
  const saldosPorConta = useMemo(() => {
    const saldos: Record<string, number> = {};
    
    contasMovimento.forEach(conta => {
      saldos[conta.id] = conta.initialBalance;
    });

    transacoesV2.forEach(t => {
      if (!saldos[t.accountId]) saldos[t.accountId] = 0;
      
      if (t.flow === 'in' || t.flow === 'transfer_in') {
        saldos[t.accountId] += t.amount;
      } else {
        saldos[t.accountId] -= t.amount;
      }
    });

    return saldos;
  }, [transacoesV2, contasMovimento]);

  // Cálculos do Balanço Patrimonial
  const balanco = useMemo(() => {
    const now = new Date();
    const mesAtual = format(now, 'yyyy-MM');
    const mesAnterior = format(subMonths(now, 1), 'yyyy-MM');

    // === ATIVOS CIRCULANTES ===
    const contasCorrente = contasMovimento.filter(c => c.accountType === 'conta_corrente');
    const contasPoupanca = contasMovimento.filter(c => c.accountType === 'poupanca');
    const contasReserva = contasMovimento.filter(c => c.accountType === 'reserva_emergencia');
    
    const saldoContasCorrente = contasCorrente.reduce((acc, c) => acc + (saldosPorConta[c.id] || 0), 0);
    const saldoPoupanca = contasPoupanca.reduce((acc, c) => acc + (saldosPorConta[c.id] || 0), 0);
    const saldoReserva = contasReserva.reduce((acc, c) => acc + (saldosPorConta[c.id] || 0), 0);
    
    // Caixa e equivalentes
    const caixaEquivalentes = Math.max(0, saldoContasCorrente + saldoPoupanca + saldoReserva);

    // === INVESTIMENTOS ===
    const contasRendaFixa = contasMovimento.filter(c => c.accountType === 'aplicacao_renda_fixa');
    const contasCripto = contasMovimento.filter(c => c.accountType === 'criptoativos');
    const contasObjetivos = contasMovimento.filter(c => c.accountType === 'objetivos_financeiros');
    
    const saldoRendaFixa = contasRendaFixa.reduce((acc, c) => acc + (saldosPorConta[c.id] || 0), 0);
    const saldoCripto = contasCripto.reduce((acc, c) => acc + (saldosPorConta[c.id] || 0), 0);
    const saldoObjetivos = contasObjetivos.reduce((acc, c) => acc + (saldosPorConta[c.id] || 0), 0);
    
    // Investimentos também da base legada
    const totalInvRF = investimentosRF.reduce((acc, i) => acc + i.valor, 0);
    const totalCripto = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0);
    const totalStable = stablecoins.reduce((acc, s) => acc + s.valorBRL, 0);
    const totalObjetivos = objetivos.reduce((acc, o) => acc + o.atual, 0);
    
    const investimentosTotal = Math.max(
      saldoRendaFixa + saldoCripto + saldoObjetivos,
      totalInvRF + totalCripto + totalStable + totalObjetivos
    );

    // === IMOBILIZADO ===
    const veiculosAtivos = veiculos.filter(v => v.status !== 'vendido');
    const valorVeiculos = veiculosAtivos.reduce((acc, v) => acc + (v.valorFipe || v.valorVeiculo || 0), 0);

    // === TOTAL ATIVOS ===
    const totalAtivos = caixaEquivalentes + investimentosTotal + valorVeiculos;

    // === PASSIVOS ===
    const emprestimosAtivos = emprestimos.filter(e => e.status !== 'quitado');
    const saldoDevedorTotal = emprestimosAtivos.reduce((acc, e) => {
      const parcelasRestantes = e.meses - (e.parcelasPagas || 0);
      return acc + (e.parcela * parcelasRestantes);
    }, 0);

    // Passivo curto prazo (próximos 12 meses)
    const passivoCurtoPrazo = emprestimosAtivos.reduce((acc, e) => {
      const parcelasRestantes = Math.min(12, e.meses - (e.parcelasPagas || 0));
      return acc + (e.parcela * parcelasRestantes);
    }, 0);

    // Passivo longo prazo
    const passivoLongoPrazo = saldoDevedorTotal - passivoCurtoPrazo;

    const totalPassivos = saldoDevedorTotal;

    // === PATRIMÔNIO LÍQUIDO ===
    const patrimonioLiquido = totalAtivos - totalPassivos;

    // === VARIAÇÃO MENSAL ===
    const transacoesMesAtual = transacoesV2.filter(t => t.date.startsWith(mesAtual));
    const transacoesMesAnterior = transacoesV2.filter(t => t.date.startsWith(mesAnterior));
    
    const calcularResultado = (transacoes: typeof transacoesV2) => {
      const entradas = transacoes
        .filter(t => t.flow === 'in' && t.operationType !== 'transferencia' && t.operationType !== 'liberacao_emprestimo')
        .reduce((acc, t) => acc + t.amount, 0);
      const saidas = transacoes
        .filter(t => t.flow === 'out' && t.operationType !== 'transferencia' && t.operationType !== 'aplicacao')
        .reduce((acc, t) => acc + t.amount, 0);
      return entradas - saidas;
    };

    const resultadoMesAtual = calcularResultado(transacoesMesAtual);
    const resultadoMesAnterior = calcularResultado(transacoesMesAnterior);
    const variacaoMensal = resultadoMesAnterior !== 0
      ? ((resultadoMesAtual - resultadoMesAnterior) / Math.abs(resultadoMesAnterior)) * 100
      : resultadoMesAtual > 0 ? 100 : 0;

    return {
      ativos: {
        circulantes: {
          caixa: caixaEquivalentes,
          contasCorrente: saldoContasCorrente,
          poupanca: saldoPoupanca,
          reservaEmergencia: saldoReserva,
        },
        naoCirculantes: {
          investimentos: investimentosTotal,
          rendaFixa: Math.max(saldoRendaFixa, totalInvRF),
          criptoativos: Math.max(saldoCripto, totalCripto),
          stablecoins: totalStable,
          objetivos: Math.max(saldoObjetivos, totalObjetivos),
          veiculos: valorVeiculos,
        },
        total: totalAtivos,
      },
      passivos: {
        curtoPrazo: passivoCurtoPrazo,
        longoPrazo: passivoLongoPrazo,
        total: totalPassivos,
        emprestimos: emprestimosAtivos,
      },
      patrimonioLiquido,
      variacaoMensal,
      resultadoMesAtual,
    };
  }, [transacoesV2, contasMovimento, emprestimos, veiculos, investimentosRF, criptomoedas, stablecoins, objetivos, saldosPorConta]);

  // Evolução do PL nos últimos 12 meses
  const evolucaoPL = useMemo(() => {
    const resultado: { mes: string; ativos: number; passivos: number; pl: number }[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const data = subMonths(now, i);
      const mesStr = format(data, 'yyyy-MM');
      const mesLabel = format(data, 'MMM', { locale: ptBR });
      
      const inicio = startOfMonth(data);
      const fim = endOfMonth(data);

      // Calcular saldo acumulado até o final do mês
      let saldoAcumulado = contasMovimento.reduce((acc, c) => acc + c.initialBalance, 0);
      
      transacoesV2.forEach(t => {
        try {
          const dataT = parseISO(t.date);
          if (dataT <= fim) {
            if (t.flow === 'in' || t.flow === 'transfer_in') {
              saldoAcumulado += t.amount;
            } else {
              saldoAcumulado -= t.amount;
            }
          }
        } catch (e) {}
      });

      // Valor de investimentos (simplificado - usar valor atual)
      const invTotal = balanco.ativos.naoCirculantes.investimentos * (0.7 + i * 0.03);
      const veicTotal = balanco.ativos.naoCirculantes.veiculos;
      
      const ativosTotal = Math.max(0, saldoAcumulado) + invTotal + veicTotal;
      const passivosTotal = balanco.passivos.total * (1 + (11 - i) * 0.02);
      
      resultado.push({
        mes: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1),
        ativos: ativosTotal,
        passivos: passivosTotal,
        pl: ativosTotal - passivosTotal,
      });
    }

    return resultado;
  }, [transacoesV2, contasMovimento, balanco]);

  // Composição dos ativos para gráfico pizza
  const composicaoAtivos = useMemo(() => {
    const items = [
      { name: "Caixa e Equivalentes", value: balanco.ativos.circulantes.caixa, color: COLORS.primary },
      { name: "Renda Fixa", value: balanco.ativos.naoCirculantes.rendaFixa, color: COLORS.success },
      { name: "Criptoativos", value: balanco.ativos.naoCirculantes.criptoativos, color: COLORS.gold },
      { name: "Stablecoins", value: balanco.ativos.naoCirculantes.stablecoins, color: COLORS.cyan },
      { name: "Objetivos", value: balanco.ativos.naoCirculantes.objetivos, color: COLORS.accent },
      { name: "Veículos", value: balanco.ativos.naoCirculantes.veiculos, color: COLORS.warning },
    ].filter(item => item.value > 0);

    return items;
  }, [balanco]);

  // Composição dos passivos
  const composicaoPassivos = useMemo(() => {
    return [
      { name: "Curto Prazo (12m)", value: balanco.passivos.curtoPrazo, color: COLORS.warning },
      { name: "Longo Prazo", value: balanco.passivos.longoPrazo, color: COLORS.danger },
    ].filter(item => item.value > 0);
  }, [balanco]);

  // Métricas
  const metricas = useMemo(() => {
    const plAtivos = balanco.ativos.total > 0 ? (balanco.patrimonioLiquido / balanco.ativos.total) * 100 : 0;
    const liquidezGeral = balanco.passivos.total > 0 ? balanco.ativos.total / balanco.passivos.total : 999;
    const liquidezCorrente = balanco.passivos.curtoPrazo > 0 
      ? balanco.ativos.circulantes.caixa / balanco.passivos.curtoPrazo 
      : 999;
    const endividamento = balanco.ativos.total > 0 ? (balanco.passivos.total / balanco.ativos.total) * 100 : 0;
    const coberturaAtivos = balanco.passivos.total > 0 ? balanco.ativos.total / balanco.passivos.total : 999;
    const imobilizacao = balanco.patrimonioLiquido > 0 
      ? (balanco.ativos.naoCirculantes.veiculos / balanco.patrimonioLiquido) * 100 
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
  }, [balanco]);

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
          value={formatCurrency(balanco.ativos.total)}
          status="success"
          icon={<TrendingUp className="w-5 h-5" />}
          tooltip="Soma de todos os bens e direitos: caixa, investimentos, veículos"
          delay={0}
        />
        <ReportCard
          title="Ativos Circulantes"
          value={formatCurrency(balanco.ativos.circulantes.caixa)}
          status="success"
          icon={<Banknote className="w-5 h-5" />}
          tooltip="Recursos de alta liquidez: contas correntes, poupança, reserva"
          delay={50}
        />
        <ReportCard
          title="Investimentos"
          value={formatCurrency(balanco.ativos.naoCirculantes.investimentos)}
          status="success"
          icon={<PiggyBank className="w-5 h-5" />}
          tooltip="Renda fixa, criptoativos, stablecoins e objetivos"
          delay={100}
        />
        <ReportCard
          title="Total de Passivos"
          value={formatCurrency(balanco.passivos.total)}
          status={balanco.passivos.total > 0 ? "danger" : "success"}
          icon={<TrendingDown className="w-5 h-5" />}
          tooltip="Soma de todas as obrigações: empréstimos e financiamentos"
          delay={150}
        />
        <ReportCard
          title="Patrimônio Líquido"
          value={formatCurrency(balanco.patrimonioLiquido)}
          status={balanco.patrimonioLiquido >= 0 ? "success" : "danger"}
          icon={<Scale className="w-5 h-5" />}
          tooltip="Ativos - Passivos = Riqueza Líquida"
          delay={200}
        />
        <ReportCard
          title="Variação Mensal"
          value={formatPercent(balanco.variacaoMensal)}
          trend={balanco.variacaoMensal}
          trendLabel="mês anterior"
          status={balanco.variacaoMensal >= 0 ? "success" : "danger"}
          icon={<LineChart className="w-5 h-5" />}
          tooltip="Variação do resultado comparado ao mês anterior"
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
          badge={formatCurrency(balanco.ativos.total)}
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
                      {formatCurrency(saldosPorConta[conta.id] || 0)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco.ativos.total > 0 ? formatPercent(((saldosPorConta[conta.id] || 0) / balanco.ativos.total) * 100) : "0%"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-border bg-muted/20">
                  <TableCell className="font-medium text-foreground pl-4">Subtotal Circulante</TableCell>
                  <TableCell className="text-right font-semibold text-success">{formatCurrency(balanco.ativos.circulantes.caixa)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {balanco.ativos.total > 0 ? formatPercent((balanco.ativos.circulantes.caixa / balanco.ativos.total) * 100) : "0%"}
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
                {balanco.ativos.naoCirculantes.rendaFixa > 0 && (
                  <TableRow className="border-border hover:bg-muted/20">
                    <TableCell className="pl-6 flex items-center gap-2">
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      Aplicações em Renda Fixa
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(balanco.ativos.naoCirculantes.rendaFixa)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco.ativos.total > 0 ? formatPercent((balanco.ativos.naoCirculantes.rendaFixa / balanco.ativos.total) * 100) : "0%"}
                    </TableCell>
                  </TableRow>
                )}
                {balanco.ativos.naoCirculantes.criptoativos > 0 && (
                  <TableRow className="border-border hover:bg-muted/20">
                    <TableCell className="pl-6 flex items-center gap-2">
                      <Bitcoin className="w-3 h-3 text-gold" />
                      Criptoativos
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(balanco.ativos.naoCirculantes.criptoativos)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco.ativos.total > 0 ? formatPercent((balanco.ativos.naoCirculantes.criptoativos / balanco.ativos.total) * 100) : "0%"}
                    </TableCell>
                  </TableRow>
                )}
                {balanco.ativos.naoCirculantes.stablecoins > 0 && (
                  <TableRow className="border-border hover:bg-muted/20">
                    <TableCell className="pl-6 flex items-center gap-2">
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      Stablecoins
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(balanco.ativos.naoCirculantes.stablecoins)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco.ativos.total > 0 ? formatPercent((balanco.ativos.naoCirculantes.stablecoins / balanco.ativos.total) * 100) : "0%"}
                    </TableCell>
                  </TableRow>
                )}
                {balanco.ativos.naoCirculantes.objetivos > 0 && (
                  <TableRow className="border-border hover:bg-muted/20">
                    <TableCell className="pl-6 flex items-center gap-2">
                      <Target className="w-3 h-3 text-accent" />
                      Objetivos Financeiros
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(balanco.ativos.naoCirculantes.objetivos)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco.ativos.total > 0 ? formatPercent((balanco.ativos.naoCirculantes.objetivos / balanco.ativos.total) * 100) : "0%"}
                    </TableCell>
                  </TableRow>
                )}
                {balanco.ativos.naoCirculantes.veiculos > 0 && (
                  <TableRow className="border-border hover:bg-muted/20">
                    <TableCell className="pl-6 flex items-center gap-2">
                      <Car className="w-3 h-3 text-warning" />
                      Imobilizado (Veículos)
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(balanco.ativos.naoCirculantes.veiculos)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco.ativos.total > 0 ? formatPercent((balanco.ativos.naoCirculantes.veiculos / balanco.ativos.total) * 100) : "0%"}
                    </TableCell>
                  </TableRow>
                )}

                {/* TOTAL ATIVOS */}
                <TableRow className="border-border bg-success/10">
                  <TableCell className="font-bold text-success">TOTAL DO ATIVO</TableCell>
                  <TableCell className="text-right font-bold text-success text-lg">{formatCurrency(balanco.ativos.total)}</TableCell>
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
          badge={formatCurrency(balanco.ativos.total)}
          badgeStatus={balanco.patrimonioLiquido >= 0 ? "success" : "danger"}
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
                {balanco.passivos.emprestimos.filter(e => (e.meses - (e.parcelasPagas || 0)) <= 12).map(emp => (
                  <TableRow key={emp.id} className="border-border hover:bg-muted/20">
                    <TableCell className="pl-6 flex items-center gap-2">
                      <Building2 className="w-3 h-3 text-warning" />
                      {emp.contrato}
                    </TableCell>
                    <TableCell className="text-right font-medium text-warning">
                      {formatCurrency(emp.parcela * Math.min(12, emp.meses - (emp.parcelasPagas || 0)))}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco.ativos.total > 0 ? formatPercent((emp.parcela * Math.min(12, emp.meses - (emp.parcelasPagas || 0)) / balanco.ativos.total) * 100) : "0%"}
                    </TableCell>
                  </TableRow>
                ))}
                {balanco.passivos.curtoPrazo > 0 && (
                  <TableRow className="border-border bg-muted/20">
                    <TableCell className="font-medium text-foreground pl-4">Subtotal Curto Prazo</TableCell>
                    <TableCell className="text-right font-semibold text-warning">{formatCurrency(balanco.passivos.curtoPrazo)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco.ativos.total > 0 ? formatPercent((balanco.passivos.curtoPrazo / balanco.ativos.total) * 100) : "0%"}
                    </TableCell>
                  </TableRow>
                )}

                {/* PASSIVO NÃO CIRCULANTE */}
                {balanco.passivos.longoPrazo > 0 && (
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
                        {formatCurrency(balanco.passivos.longoPrazo)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {balanco.ativos.total > 0 ? formatPercent((balanco.passivos.longoPrazo / balanco.ativos.total) * 100) : "0%"}
                      </TableCell>
                    </TableRow>
                  </>
                )}

                {/* TOTAL PASSIVO */}
                <TableRow className="border-border bg-destructive/10">
                  <TableCell className="font-bold text-destructive">TOTAL DO PASSIVO</TableCell>
                  <TableCell className="text-right font-bold text-destructive">{formatCurrency(balanco.passivos.total)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {balanco.ativos.total > 0 ? formatPercent((balanco.passivos.total / balanco.ativos.total) * 100) : "0%"}
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
                  <TableCell className={cn("text-right font-medium", balanco.patrimonioLiquido >= 0 ? "text-success" : "text-destructive")}>
                    {formatCurrency(balanco.patrimonioLiquido)}
                  </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {balanco.ativos.total > 0 ? formatPercent((balanco.patrimonioLiquido / balanco.ativos.total) * 100) : "0%"}
                    </TableCell>
                  </TableRow>

                {/* TOTAL PASSIVO + PL */}
                <TableRow className="border-border bg-primary/10">
                  <TableCell className="font-bold text-primary">TOTAL PASSIVO + PL</TableCell>
                  <TableCell className="text-right font-bold text-primary text-lg">{formatCurrency(balanco.ativos.total)}</TableCell>
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
                  data={composicaoAtivos}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: COLORS.muted, strokeWidth: 1 }}
                >
                  {composicaoAtivos.map((entry, index) => (
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
        </ExpandablePanel>

        {/* Evolução do PL */}
        <ExpandablePanel
          title="Evolução Patrimonial"
          subtitle="Últimos 12 meses"
          icon={<LineChart className="w-4 h-4" />}
          badge={balanco.variacaoMensal >= 0 ? "Crescendo" : "Reduzindo"}
          badgeStatus={balanco.variacaoMensal >= 0 ? "success" : "danger"}
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={evolucaoPL}>
                <defs>
                  <linearGradient id="colorPL" x1="0" y1="0" x2="0" y2="1">
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
                  formatter={(value: number, name: string) => [formatCurrency(value), name === 'pl' ? 'Patrimônio Líquido' : name === 'ativos' ? 'Ativos' : 'Passivos']}
                />
                <Legend />
                <Bar dataKey="ativos" name="Ativos" fill={COLORS.success} opacity={0.7} radius={[4, 4, 0, 0]} />
                <Bar dataKey="passivos" name="Passivos" fill={COLORS.danger} opacity={0.7} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="pl" name="Patrimônio Líquido" stroke={COLORS.primary} strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
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
            descricao="Percentual dos ativos comprometidos com dívidas. Ideal: abaixo de 30%"
            formula="(Passivo Total / Ativo Total) × 100"
            sparklineData={generateSparkline(metricas.endividamento.valor, metricas.endividamento.valor < 30 ? "down" : "up")}
            icon={<CreditCard className="w-4 h-4" />}
          />
          <DetailedIndicatorBadge
            title="Cobertura de Ativos"
            value={formatRatio(metricas.coberturaAtivos.valor)}
            status={metricas.coberturaAtivos.status}
            trend={metricas.coberturaAtivos.valor >= 2 ? "up" : "down"}
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