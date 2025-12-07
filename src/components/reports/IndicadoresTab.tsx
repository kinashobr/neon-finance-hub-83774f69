import { useMemo } from "react";
import {
  Droplets,
  Shield,
  TrendingUp,
  Gauge,
  Wallet,
  Target,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Percent,
  PiggyBank,
  HeartPulse,
  Clock,
  Car,
} from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { IndicatorBadge } from "./IndicatorBadge";
import { ExpandablePanel } from "./ExpandablePanel";
import { cn } from "@/lib/utils";

interface IndicatorGroupProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function IndicatorGroup({ title, subtitle, icon, children, className }: IndicatorGroupProps) {
  return (
    <ExpandablePanel
      title={title}
      subtitle={subtitle}
      icon={icon}
      className={className}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </ExpandablePanel>
  );
}

export function IndicadoresTab() {
  const {
    transacoes,
    emprestimos,
    getTotalReceitas,
    getTotalDespesas,
    getSaldoDevedor,
    getJurosTotais,
    getDespesasFixas,
    getPatrimonioLiquido,
    getAtivosTotal,
    getPassivosTotal,
    getCustoVeiculos,
  } = useFinance();

  const indicadores = useMemo(() => {
    const ativos = getAtivosTotal();
    const passivos = getPassivosTotal();
    const receitas = getTotalReceitas();
    const despesas = getTotalDespesas();
    const despesasFixas = getDespesasFixas();
    const juros = getJurosTotais();
    const patrimonioLiquido = getPatrimonioLiquido();
    const caixa = Math.max(0, receitas - despesas);
    const veiculosCusto = getCustoVeiculos();
    const resultado = receitas - despesas;
    const saldoDevedor = getSaldoDevedor();

    // Receitas e despesas mensais
    const receitasMesAtual = transacoes
      .filter(t => t.tipo === "receita" && t.data.includes("2024-02"))
      .reduce((acc, t) => acc + t.valor, 0);
    const receitasMesAnterior = transacoes
      .filter(t => t.tipo === "receita" && t.data.includes("2024-01"))
      .reduce((acc, t) => acc + t.valor, 0);
    const despesasMesAtual = transacoes
      .filter(t => t.tipo === "despesa" && t.data.includes("2024-02"))
      .reduce((acc, t) => acc + t.valor, 0);
    const despesasMesAnterior = transacoes
      .filter(t => t.tipo === "despesa" && t.data.includes("2024-01"))
      .reduce((acc, t) => acc + t.valor, 0);

    // LIQUIDEZ
    const liquidezCorrente = passivos > 0 ? caixa / passivos : caixa > 0 ? 999 : 0;
    const liquidezSeca = passivos > 0 ? (caixa * 0.8) / passivos : caixa > 0 ? 999 : 0;
    const liquidezImediata = passivos > 0 ? (caixa * 0.5) / passivos : caixa > 0 ? 999 : 0;

    // ENDIVIDAMENTO
    const endividamentoTotal = ativos > 0 ? (passivos / ativos) * 100 : 0;
    const dividaPL = patrimonioLiquido > 0 ? (saldoDevedor / patrimonioLiquido) * 100 : 0;
    const passivosAtivos = ativos > 0 ? (passivos / ativos) * 100 : 0;

    // RENTABILIDADE
    const rentabilidadeMensal = receitas > 0 ? (resultado / receitas) * 100 : 0;
    const rentabilidadeAcumulada = receitas > 0 ? ((resultado * 12) / receitas) * 100 : 0;

    // EFICIÊNCIA
    const indiceDespesasFixas = despesas > 0 ? (despesasFixas / despesas) * 100 : 0;
    const crescimentoReceitas = receitasMesAnterior > 0
      ? ((receitasMesAtual - receitasMesAnterior) / receitasMesAnterior) * 100
      : 0;
    const crescimentoDespesas = despesasMesAnterior > 0
      ? ((despesasMesAtual - despesasMesAnterior) / despesasMesAnterior) * 100
      : 0;

    // PESSOAIS
    const custoVidaMensal = despesas / 12;
    const mesesSobrevivencia = custoVidaMensal > 0 ? caixa / custoVidaMensal : 999;
    const salarioComprometido = receitasMesAtual > 0 ? (despesasMesAtual / receitasMesAtual) * 100 : 0;

    // VEÍCULOS
    const custoVeiculosPL = patrimonioLiquido > 0 ? (veiculosCusto / patrimonioLiquido) * 100 : 0;

    // OUTROS
    const solvencia = passivos > 0 ? ativos / passivos : ativos > 0 ? 999 : 0;
    const giroCaixa = caixa > 0 ? receitas / caixa : 0;
    const coberturaJuros = juros > 0 ? resultado / juros : resultado > 0 ? 999 : 0;
    const margemPoupanca = receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0;

    return {
      liquidez: {
        corrente: { valor: liquidezCorrente, status: liquidezCorrente >= 1.5 ? "success" : liquidezCorrente >= 1 ? "warning" : "danger" },
        seca: { valor: liquidezSeca, status: liquidezSeca >= 1 ? "success" : liquidezSeca >= 0.7 ? "warning" : "danger" },
        imediata: { valor: liquidezImediata, status: liquidezImediata >= 0.5 ? "success" : liquidezImediata >= 0.3 ? "warning" : "danger" },
      },
      endividamento: {
        total: { valor: endividamentoTotal, status: endividamentoTotal < 30 ? "success" : endividamentoTotal < 50 ? "warning" : "danger" },
        dividaPL: { valor: dividaPL, status: dividaPL < 50 ? "success" : dividaPL < 100 ? "warning" : "danger" },
        passivosAtivos: { valor: passivosAtivos, status: passivosAtivos < 40 ? "success" : passivosAtivos < 60 ? "warning" : "danger" },
      },
      rentabilidade: {
        mensal: { valor: rentabilidadeMensal, status: rentabilidadeMensal >= 20 ? "success" : rentabilidadeMensal >= 10 ? "warning" : "danger" },
        acumulada: { valor: rentabilidadeAcumulada, status: rentabilidadeAcumulada >= 200 ? "success" : rentabilidadeAcumulada >= 100 ? "warning" : "danger" },
      },
      eficiencia: {
        despesasFixas: { valor: indiceDespesasFixas, status: indiceDespesasFixas < 50 ? "success" : indiceDespesasFixas < 70 ? "warning" : "danger" },
        crescimentoReceitas: { valor: crescimentoReceitas, status: crescimentoReceitas > 5 ? "success" : crescimentoReceitas >= 0 ? "warning" : "danger" },
        crescimentoDespesas: { valor: crescimentoDespesas, status: crescimentoDespesas < 0 ? "success" : crescimentoDespesas < 10 ? "warning" : "danger" },
      },
      pessoais: {
        custoVida: { valor: custoVidaMensal, status: "neutral" },
        mesesSobrevivencia: { valor: mesesSobrevivencia, status: mesesSobrevivencia >= 6 ? "success" : mesesSobrevivencia >= 3 ? "warning" : "danger" },
        salarioComprometido: { valor: salarioComprometido, status: salarioComprometido < 70 ? "success" : salarioComprometido < 90 ? "warning" : "danger" },
      },
      veiculos: {
        custoVeiculosPL: { valor: custoVeiculosPL, status: custoVeiculosPL < 30 ? "success" : custoVeiculosPL < 50 ? "warning" : "danger" },
      },
      outros: {
        solvencia: { valor: solvencia, status: solvencia >= 2 ? "success" : solvencia >= 1 ? "warning" : "danger" },
        giroCaixa: { valor: giroCaixa, status: giroCaixa >= 2 ? "success" : giroCaixa >= 1 ? "warning" : "danger" },
        coberturaJuros: { valor: coberturaJuros, status: coberturaJuros >= 3 ? "success" : coberturaJuros >= 1.5 ? "warning" : "danger" },
        margemPoupanca: { valor: margemPoupanca, status: margemPoupanca >= 20 ? "success" : margemPoupanca >= 10 ? "warning" : "danger" },
      },
    };
  }, [transacoes, getTotalReceitas, getTotalDespesas, getSaldoDevedor, getJurosTotais, getDespesasFixas, getPatrimonioLiquido, getAtivosTotal, getPassivosTotal, getCustoVeiculos]);

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const formatRatio = (value: number) => value >= 999 ? "∞" : `${value.toFixed(2)}x`;
  const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const formatMeses = (value: number) => value >= 999 ? "∞" : `${value.toFixed(1)} meses`;

  // Dados para sparklines (simulação histórica)
  const generateSparkline = (current: number, trend: "up" | "down" | "stable" = "stable") => {
    const base = current * 0.7;
    const range = current * 0.3;
    return Array.from({ length: 6 }, (_, i) => {
      const progress = i / 5;
      if (trend === "up") return base + range * progress + Math.random() * range * 0.2;
      if (trend === "down") return base + range * (1 - progress) + Math.random() * range * 0.2;
      return base + range * 0.5 + (Math.random() - 0.5) * range * 0.4;
    }).concat([current]);
  };

  return (
    <div className="space-y-6">
      {/* Legenda de Status */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-6 animate-fade-in">
        <span className="text-sm font-medium text-muted-foreground">Legenda:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="text-sm text-muted-foreground">Saudável</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-warning" />
          <span className="text-sm text-muted-foreground">Atenção</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span className="text-sm text-muted-foreground">Crítico</span>
        </div>
      </div>

      {/* LIQUIDEZ */}
      <IndicatorGroup
        title="Indicadores de Liquidez"
        subtitle="Capacidade de pagamento de curto prazo"
        icon={<Droplets className="w-4 h-4" />}
      >
        <IndicatorBadge
          title="Liquidez Corrente"
          value={formatRatio(indicadores.liquidez.corrente.valor)}
          status={indicadores.liquidez.corrente.status as any}
          trend={indicadores.liquidez.corrente.valor >= 1.5 ? "up" : "down"}
          tooltip="Capacidade de pagar obrigações de curto prazo. Ideal: acima de 1.5x"
          sparklineData={generateSparkline(indicadores.liquidez.corrente.valor, indicadores.liquidez.corrente.valor >= 1.5 ? "up" : "down")}
          icon={<Droplets className="w-4 h-4" />}
        />
        <IndicatorBadge
          title="Liquidez Seca"
          value={formatRatio(indicadores.liquidez.seca.valor)}
          status={indicadores.liquidez.seca.status as any}
          trend={indicadores.liquidez.seca.valor >= 1 ? "up" : "down"}
          tooltip="Liquidez excluindo estoques e ativos menos líquidos. Ideal: acima de 1x"
          sparklineData={generateSparkline(indicadores.liquidez.seca.valor, indicadores.liquidez.seca.valor >= 1 ? "up" : "down")}
          icon={<Droplets className="w-4 h-4" />}
        />
        <IndicatorBadge
          title="Liquidez Imediata"
          value={formatRatio(indicadores.liquidez.imediata.valor)}
          status={indicadores.liquidez.imediata.status as any}
          trend={indicadores.liquidez.imediata.valor >= 0.5 ? "up" : "down"}
          tooltip="Capacidade de pagamento imediato com recursos em caixa. Ideal: acima de 0.5x"
          sparklineData={generateSparkline(indicadores.liquidez.imediata.valor, indicadores.liquidez.imediata.valor >= 0.5 ? "up" : "down")}
          icon={<Droplets className="w-4 h-4" />}
        />
      </IndicatorGroup>

      {/* ENDIVIDAMENTO */}
      <IndicatorGroup
        title="Indicadores de Endividamento"
        subtitle="Nível de comprometimento com dívidas"
        icon={<Shield className="w-4 h-4" />}
      >
        <IndicatorBadge
          title="Endividamento Total"
          value={formatPercent(indicadores.endividamento.total.valor)}
          status={indicadores.endividamento.total.status as any}
          trend={indicadores.endividamento.total.valor < 30 ? "up" : "down"}
          tooltip="Percentual dos ativos comprometidos com dívidas. Ideal: abaixo de 30%"
          sparklineData={generateSparkline(indicadores.endividamento.total.valor, indicadores.endividamento.total.valor < 30 ? "down" : "up")}
          icon={<Shield className="w-4 h-4" />}
        />
        <IndicatorBadge
          title="Dívida / PL"
          value={formatPercent(indicadores.endividamento.dividaPL.valor)}
          status={indicadores.endividamento.dividaPL.status as any}
          trend={indicadores.endividamento.dividaPL.valor < 50 ? "up" : "down"}
          tooltip="Proporção da dívida em relação ao patrimônio líquido. Ideal: abaixo de 50%"
          sparklineData={generateSparkline(indicadores.endividamento.dividaPL.valor, indicadores.endividamento.dividaPL.valor < 50 ? "down" : "up")}
          icon={<Shield className="w-4 h-4" />}
        />
        <IndicatorBadge
          title="Passivos / Ativos"
          value={formatPercent(indicadores.endividamento.passivosAtivos.valor)}
          status={indicadores.endividamento.passivosAtivos.status as any}
          trend={indicadores.endividamento.passivosAtivos.valor < 40 ? "up" : "down"}
          tooltip="Quanto dos ativos está comprometido com passivos. Ideal: abaixo de 40%"
          sparklineData={generateSparkline(indicadores.endividamento.passivosAtivos.valor, indicadores.endividamento.passivosAtivos.valor < 40 ? "down" : "up")}
          icon={<Shield className="w-4 h-4" />}
        />
      </IndicatorGroup>

      {/* RENTABILIDADE */}
      <IndicatorGroup
        title="Indicadores de Rentabilidade"
        subtitle="Retorno sobre recursos"
        icon={<TrendingUp className="w-4 h-4" />}
      >
        <IndicatorBadge
          title="Rentabilidade Mensal"
          value={formatPercent(indicadores.rentabilidade.mensal.valor)}
          status={indicadores.rentabilidade.mensal.status as any}
          trend={indicadores.rentabilidade.mensal.valor >= 20 ? "up" : "down"}
          tooltip="Percentual de lucro sobre a receita mensal. Ideal: acima de 20%"
          sparklineData={generateSparkline(indicadores.rentabilidade.mensal.valor, indicadores.rentabilidade.mensal.valor >= 20 ? "up" : "down")}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <IndicatorBadge
          title="Rentabilidade Acumulada"
          value={formatPercent(indicadores.rentabilidade.acumulada.valor)}
          status={indicadores.rentabilidade.acumulada.status as any}
          trend={indicadores.rentabilidade.acumulada.valor >= 200 ? "up" : "down"}
          tooltip="Projeção de rentabilidade anualizada. Ideal: acima de 200%"
          sparklineData={generateSparkline(indicadores.rentabilidade.acumulada.valor / 10, indicadores.rentabilidade.acumulada.valor >= 200 ? "up" : "down")}
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </IndicatorGroup>

      {/* EFICIÊNCIA */}
      <IndicatorGroup
        title="Indicadores de Eficiência"
        subtitle="Otimização de recursos"
        icon={<Gauge className="w-4 h-4" />}
      >
        <IndicatorBadge
          title="Despesas Fixas"
          value={formatPercent(indicadores.eficiencia.despesasFixas.valor)}
          status={indicadores.eficiencia.despesasFixas.status as any}
          trend={indicadores.eficiencia.despesasFixas.valor < 50 ? "up" : "down"}
          tooltip="Proporção de despesas fixas no total. Ideal: abaixo de 50%"
          sparklineData={generateSparkline(indicadores.eficiencia.despesasFixas.valor, indicadores.eficiencia.despesasFixas.valor < 50 ? "down" : "up")}
          icon={<Gauge className="w-4 h-4" />}
        />
        <IndicatorBadge
          title="Crescimento Receitas"
          value={formatPercent(indicadores.eficiencia.crescimentoReceitas.valor)}
          status={indicadores.eficiencia.crescimentoReceitas.status as any}
          trend={indicadores.eficiencia.crescimentoReceitas.valor > 0 ? "up" : "down"}
          tooltip="Variação das receitas em relação ao mês anterior. Ideal: positivo"
          sparklineData={generateSparkline(Math.abs(indicadores.eficiencia.crescimentoReceitas.valor) + 10, indicadores.eficiencia.crescimentoReceitas.valor > 0 ? "up" : "down")}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <IndicatorBadge
          title="Crescimento Despesas"
          value={formatPercent(indicadores.eficiencia.crescimentoDespesas.valor)}
          status={indicadores.eficiencia.crescimentoDespesas.status as any}
          trend={indicadores.eficiencia.crescimentoDespesas.valor < 0 ? "up" : "down"}
          tooltip="Variação das despesas em relação ao mês anterior. Ideal: negativo ou zero"
          sparklineData={generateSparkline(Math.abs(indicadores.eficiencia.crescimentoDespesas.valor) + 10, indicadores.eficiencia.crescimentoDespesas.valor < 0 ? "down" : "up")}
          icon={<Activity className="w-4 h-4" />}
        />
      </IndicatorGroup>

      {/* PESSOAIS */}
      <IndicatorGroup
        title="Indicadores Pessoais"
        subtitle="Saúde financeira individual"
        icon={<HeartPulse className="w-4 h-4" />}
      >
        <IndicatorBadge
          title="Custo de Vida Mensal"
          value={formatCurrency(indicadores.pessoais.custoVida.valor)}
          status="neutral"
          tooltip="Média mensal de despesas totais"
          icon={<Wallet className="w-4 h-4" />}
        />
        <IndicatorBadge
          title="Meses de Sobrevivência"
          value={formatMeses(indicadores.pessoais.mesesSobrevivencia.valor)}
          status={indicadores.pessoais.mesesSobrevivencia.status as any}
          trend={indicadores.pessoais.mesesSobrevivencia.valor >= 6 ? "up" : "down"}
          tooltip="Quantos meses você consegue viver com o caixa atual. Ideal: acima de 6 meses"
          sparklineData={generateSparkline(indicadores.pessoais.mesesSobrevivencia.valor, indicadores.pessoais.mesesSobrevivencia.valor >= 6 ? "up" : "down")}
          icon={<Clock className="w-4 h-4" />}
        />
        <IndicatorBadge
          title="Salário Comprometido"
          value={formatPercent(indicadores.pessoais.salarioComprometido.valor)}
          status={indicadores.pessoais.salarioComprometido.status as any}
          trend={indicadores.pessoais.salarioComprometido.valor < 70 ? "up" : "down"}
          tooltip="Percentual da renda comprometida com despesas. Ideal: abaixo de 70%"
          sparklineData={generateSparkline(indicadores.pessoais.salarioComprometido.valor, indicadores.pessoais.salarioComprometido.valor < 70 ? "down" : "up")}
          icon={<Percent className="w-4 h-4" />}
        />
      </IndicatorGroup>

      {/* OUTROS */}
      <IndicatorGroup
        title="Outros Indicadores"
        subtitle="Métricas complementares"
        icon={<Target className="w-4 h-4" />}
      >
        <IndicatorBadge
          title="Índice de Solvência"
          value={formatRatio(indicadores.outros.solvencia.valor)}
          status={indicadores.outros.solvencia.status as any}
          trend={indicadores.outros.solvencia.valor >= 2 ? "up" : "down"}
          tooltip="Capacidade de pagar todas as dívidas com os ativos. Ideal: acima de 2x"
          sparklineData={generateSparkline(indicadores.outros.solvencia.valor, indicadores.outros.solvencia.valor >= 2 ? "up" : "down")}
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <IndicatorBadge
          title="Giro de Caixa"
          value={formatRatio(indicadores.outros.giroCaixa.valor)}
          status={indicadores.outros.giroCaixa.status as any}
          trend={indicadores.outros.giroCaixa.valor >= 2 ? "up" : "down"}
          tooltip="Rotatividade do dinheiro em caixa. Ideal: acima de 2x"
          sparklineData={generateSparkline(indicadores.outros.giroCaixa.valor, indicadores.outros.giroCaixa.valor >= 2 ? "up" : "down")}
          icon={<Activity className="w-4 h-4" />}
        />
        <IndicatorBadge
          title="Cobertura de Juros"
          value={formatRatio(indicadores.outros.coberturaJuros.valor)}
          status={indicadores.outros.coberturaJuros.status as any}
          trend={indicadores.outros.coberturaJuros.valor >= 3 ? "up" : "down"}
          tooltip="Capacidade de pagar juros com o resultado. Ideal: acima de 3x"
          sparklineData={generateSparkline(indicadores.outros.coberturaJuros.valor, indicadores.outros.coberturaJuros.valor >= 3 ? "up" : "down")}
          icon={<Shield className="w-4 h-4" />}
        />
        <IndicatorBadge
          title="Margem de Poupança"
          value={formatPercent(indicadores.outros.margemPoupanca.valor)}
          status={indicadores.outros.margemPoupanca.status as any}
          trend={indicadores.outros.margemPoupanca.valor >= 20 ? "up" : "down"}
          tooltip="Percentual da renda que sobra para poupar. Ideal: acima de 20%"
          sparklineData={generateSparkline(indicadores.outros.margemPoupanca.valor, indicadores.outros.margemPoupanca.valor >= 20 ? "up" : "down")}
          icon={<PiggyBank className="w-4 h-4" />}
        />
        <IndicatorBadge
          title="Custo Veículos / PL"
          value={formatPercent(indicadores.veiculos.custoVeiculosPL.valor)}
          status={indicadores.veiculos.custoVeiculosPL.status as any}
          trend={indicadores.veiculos.custoVeiculosPL.valor < 30 ? "up" : "down"}
          tooltip="Proporção do patrimônio investido em veículos. Ideal: abaixo de 30%"
          sparklineData={generateSparkline(indicadores.veiculos.custoVeiculosPL.valor, indicadores.veiculos.custoVeiculosPL.valor < 30 ? "down" : "up")}
          icon={<Car className="w-4 h-4" />}
        />
      </IndicatorGroup>
    </div>
  );
}
