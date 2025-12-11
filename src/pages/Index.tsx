"use client";

import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useFinance } from "@/contexts/FinanceContext";
import { CockpitCards } from "@/components/dashboard/CockpitCards";
import { MovimentacoesRelevantes } from "@/components/dashboard/MovimentacoesRelevantes";
import { AcompanhamentoAtivos } from "@/components/dashboard/AcompanhamentoAtivos";
import { SaudeFinanceira } from "@/components/dashboard/SaudeFinanceira";
import { FluxoCaixaHeatmap } from "@/components/dashboard/FluxoCaixaHeatmap";
import { PeriodSelector, DateRange } from "@/components/dashboard/PeriodSelector";
import { 
  Activity,
  LayoutDashboard
} from "lucide-react";
import { startOfMonth, endOfMonth, isWithinInterval, format, subMonths } from "date-fns";

const Index = () => {
  const { 
    transacoesV2,
    contasMovimento,
    emprestimos, 
    investimentosRF, 
    criptomoedas, 
    stablecoins, 
    objetivos,
  } = useFinance();

  // Inicializa o range para o mês atual
  const now = new Date();
  const initialRange: DateRange = { from: startOfMonth(now), to: endOfMonth(now) };
  const [dateRange, setDateRange] = useState<DateRange>(initialRange);

  const handlePeriodChange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, []);

  // Filtra transações V2 pelo período selecionado
  const filteredTransacoesV2 = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return transacoesV2;
    
    return transacoesV2.filter(t => {
      const transactionDate = new Date(t.date);
      return isWithinInterval(transactionDate, { start: dateRange.from!, end: dateRange.to! });
    });
  }, [transacoesV2, dateRange]);

  const currentMonth = dateRange.from ? dateRange.from.getMonth() : now.getMonth();
  const currentYear = dateRange.from ? dateRange.from.getFullYear() : now.getFullYear();

  // Calcular saldo por conta (usando todas as transações para o saldo atual, mas filtrando para o período)
  const saldosPorConta = useMemo(() => {
    return contasMovimento.map(conta => {
      const contaTx = transacoesV2.filter(t => t.accountId === conta.id);
      const totalIn = contaTx.filter(t => t.flow === 'in' || t.flow === 'transfer_in').reduce((s, t) => s + t.amount, 0);
      const totalOut = contaTx.filter(t => t.flow === 'out' || t.flow === 'transfer_out').reduce((s, t) => s + t.amount, 0);
      return {
        ...conta,
        saldo: conta.initialBalance + totalIn - totalOut,
      };
    });
  }, [contasMovimento, transacoesV2]);

  // Liquidez imediata (contas correntes e poupança)
  const liquidezImediata = useMemo(() => {
    return saldosPorConta
      .filter(c => c.accountType === 'conta_corrente' || c.accountType === 'poupanca')
      .reduce((acc, c) => acc + c.saldo, 0);
  }, [saldosPorConta]);

  // Total de todos os ativos
  const totalAtivos = useMemo(() => {
    const saldoContas = saldosPorConta.reduce((acc, c) => acc + c.saldo, 0);
    const rf = investimentosRF.reduce((acc, inv) => acc + inv.valor, 0);
    const cripto = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0);
    const stable = stablecoins.reduce((acc, s) => acc + s.valorBRL, 0);
    const objs = objetivos.reduce((acc, o) => acc + o.atual, 0);
    return saldoContas + rf + cripto + stable + objs;
  }, [saldosPorConta, investimentosRF, criptomoedas, stablecoins, objetivos]);

  // Total dívidas (empréstimos ativos)
  const totalDividas = useMemo(() => {
    return emprestimos
      .filter(e => e.status !== 'pendente_config' && e.status !== 'quitado')
      .reduce((acc, e) => {
        const parcelasPagas = e.parcelasPagas || 0;
        const saldoDevedor = Math.max(0, e.valorTotal - (parcelasPagas * e.parcela));
        return acc + saldoDevedor;
      }, 0);
  }, [emprestimos]);

  // Patrimônio total
  const patrimonioTotal = totalAtivos - totalDividas;

  // Transações do período selecionado (para Cockpit e Movimentações Relevantes)
  const transacoesPeriodo = filteredTransacoesV2;

  // Transações do período anterior (para cálculo de variação)
  const transacoesPeriodoAnterior = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return []; // Não calcula variação se for "Todo o período"

    const diffInMonths = dateRange.to.getMonth() - dateRange.from.getMonth() + 12 * (dateRange.to.getFullYear() - dateRange.from.getFullYear());
    
    const prevFrom = subMonths(dateRange.from, diffInMonths);
    const prevTo = subMonths(dateRange.to, diffInMonths);

    return transacoesV2.filter(t => {
      const transactionDate = new Date(t.date);
      return isWithinInterval(transactionDate, { start: prevFrom, end: prevTo });
    });
  }, [transacoesV2, dateRange]);

  // Receitas e despesas do período ATUAL
  const receitasPeriodo = useMemo(() => {
    return transacoesPeriodo
      .filter(t => t.operationType === 'receita' || t.operationType === 'rendimento')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transacoesPeriodo]);

  const despesasPeriodo = useMemo(() => {
    return transacoesPeriodo
      .filter(t => t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transacoesPeriodo]);

  // Receitas e despesas do período ANTERIOR
  const receitasPeriodoAnterior = useMemo(() => {
    return transacoesPeriodoAnterior
      .filter(t => t.operationType === 'receita' || t.operationType === 'rendimento')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transacoesPeriodoAnterior]);

  const despesasPeriodoAnterior = useMemo(() => {
    return transacoesPeriodoAnterior
      .filter(t => t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transacoesPeriodoAnterior]);

  // Variação do patrimônio (simplificado para o fluxo de caixa do período)
  const saldoPeriodoAtual = receitasPeriodo - despesasPeriodo;
  const saldoPeriodoAnterior = receitasPeriodoAnterior - despesasPeriodoAnterior;
  const variacaoPatrimonio = saldoPeriodoAtual - saldoPeriodoAnterior;
  const variacaoPercentual = saldoPeriodoAnterior !== 0 
    ? ((saldoPeriodoAtual - saldoPeriodoAnterior) / Math.abs(saldoPeriodoAnterior)) * 100 
    : 0;

  // Compromissos do período (despesas + parcelas empréstimo)
  const compromissosPeriodo = despesasPeriodo;

  // Projeção 30 dias (baseado na média do período atual)
  const diasNoPeriodo = dateRange.from && dateRange.to ? (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24) : 30;
  const saldoMedioDiario = diasNoPeriodo > 0 ? saldoPeriodoAtual / diasNoPeriodo : 0;
  const projecao30Dias = saldoPeriodoAtual + (saldoMedioDiario * 30);

  // Dados do cockpit
  const cockpitData = {
    patrimonioTotal,
    variacaoPatrimonio,
    variacaoPercentual,
    liquidezImediata,
    compromissosMes: compromissosPeriodo,
    projecao30Dias,
  };

  // Dados para acompanhamento de ativos
  const investimentosRFTotal = useMemo(() => {
    const rfLegado = investimentosRF.reduce((acc, inv) => acc + inv.valor, 0);
    const rfContas = saldosPorConta
      .filter(c => c.accountType === 'aplicacao_renda_fixa')
      .reduce((acc, c) => acc + c.saldo, 0);
    return rfLegado + rfContas;
  }, [investimentosRF, saldosPorConta]);

  const poupancaTotal = useMemo(() => {
    return saldosPorConta
      .filter(c => c.accountType === 'poupanca')
      .reduce((acc, c) => acc + c.saldo, 0);
  }, [saldosPorConta]);

  const reservaEmergencia = useMemo(() => {
    return saldosPorConta
      .filter(c => c.accountType === 'reserva_emergencia')
      .reduce((acc, c) => acc + c.saldo, 0);
  }, [saldosPorConta]);

  const criptoTotal = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0);
  const stablesTotal = stablecoins.reduce((acc, s) => acc + s.valorBRL, 0);

  // Dados para saúde financeira
  const liquidezRatio = totalDividas > 0 ? liquidezImediata / (totalDividas * 0.1 || 1) : 2;
  const endividamentoPercent = totalAtivos > 0 ? (totalDividas / totalAtivos) * 100 : 0;
  
  // Diversificação (quantos tipos de ativos diferentes > 0)
  const tiposAtivos = [
    investimentosRFTotal > 0,
    criptoTotal > 0,
    stablesTotal > 0,
    reservaEmergencia > 0,
    poupancaTotal > 0,
    liquidezImediata > 0,
  ].filter(Boolean).length;
  const diversificacaoPercent = (tiposAtivos / 6) * 100;

  // Estabilidade do fluxo (meses com saldo positivo)
  const mesesPositivos = useMemo(() => {
    const ultimos6Meses = [];
    for (let i = 0; i < 6; i++) {
      const m = now.getMonth() - i < 0 ? 12 + (now.getMonth() - i) : now.getMonth() - i;
      const y = now.getMonth() - i < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const txMes = transacoesV2.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === m && d.getFullYear() === y;
      });
      const rec = txMes.filter(t => t.operationType === 'receita').reduce((a, t) => a + t.amount, 0);
      const desp = txMes.filter(t => t.operationType === 'despesa').reduce((a, t) => a + t.amount, 0);
      if (rec > desp) ultimos6Meses.push(true);
      else ultimos6Meses.push(false);
    }
    return (ultimos6Meses.filter(Boolean).length / 6) * 100;
  }, [transacoesV2]);

  // Dependência de renda (assumindo 80% se não há dados)
  const dependenciaRenda = receitasPeriodo > 0 ? 80 : 100;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 animate-fade-in">
          <div className="p-2 rounded-xl bg-primary/10">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Central Financeira</h1>
            <p className="text-sm text-muted-foreground">
              Visão rápida da sua situação financeira
            </p>
          </div>
          <div className="ml-auto">
            <PeriodSelector 
              initialRange={initialRange}
              onDateRangeChange={handlePeriodChange} 
            />
          </div>
        </div>

        {/* Bloco 1 - Cockpit */}
        <section className="animate-fade-in-up">
          <CockpitCards data={cockpitData} />
        </section>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna esquerda - Movimentações e Fluxo */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bloco 3 - Movimentações Relevantes */}
            <section className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <MovimentacoesRelevantes transacoes={transacoesPeriodo} limit={6} />
            </section>

            {/* Fluxo de Caixa Heatmap */}
            <section className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <FluxoCaixaHeatmap 
                month={dateRange.from ? format(dateRange.from, 'MM') : format(now, 'MM')} 
                year={dateRange.from ? dateRange.from.getFullYear() : now.getFullYear()} 
                transacoes={transacoesPeriodo} 
              />
            </section>
          </div>

          {/* Coluna direita - Ativos e Saúde */}
          <div className="space-y-6">
            {/* Bloco 4 - Acompanhamento de Ativos */}
            <section className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <AcompanhamentoAtivos
                investimentosRF={investimentosRFTotal}
                criptomoedas={criptoTotal}
                stablecoins={stablesTotal}
                reservaEmergencia={reservaEmergencia}
                poupanca={poupancaTotal}
              />
            </section>

            {/* Bloco 6 - Saúde Financeira */}
            <section className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
              <SaudeFinanceira
                liquidez={liquidezRatio}
                endividamento={endividamentoPercent}
                diversificacao={diversificacaoPercent}
                estabilidadeFluxo={mesesPositivos}
                dependenciaRenda={dependenciaRenda}
              />
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;