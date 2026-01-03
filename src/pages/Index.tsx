"use client";

import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useFinance } from "@/contexts/FinanceContext";
import { CockpitCards } from "@/components/dashboard/CockpitCards";
import { MovimentacoesRelevantes } from "@/components/dashboard/MovimentacoesRelevantes";
import { AcompanhamentoAtivos } from "@/components/dashboard/AcompanhamentoAtivos";
import { SaudeFinanceira } from "@/components/dashboard/SaudeFinanceira";
import { FluxoCaixaHeatmap } from "@/components/dashboard/FluxoCaixaHeatmap";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { DateRange, ComparisonDateRanges } from "@/types/finance";
import { 
  Activity,
  LayoutDashboard
} from "lucide-react";
import { startOfMonth, endOfMonth, isWithinInterval, format, subMonths, subDays, startOfDay, endOfDay } from "date-fns";
import { parseDateLocal } from "@/lib/utils";

const Index = () => {
  const { 
    transacoesV2,
    contasMovimento,
    categoriasV2,
    getValorFipeTotal,
    getAtivosTotal,
    getPassivosTotal,
    getSaldoDevedor,
    calculateBalanceUpToDate, // Importado do contexto
    dateRanges, // <-- Use context state
    setDateRanges, // <-- Use context setter
  } = useFinance();

  const handlePeriodChange = useCallback((ranges: ComparisonDateRanges) => {
    setDateRanges(ranges);
  }, [setDateRanges]);

  // Helper para filtrar transações por um range específico
  const filterTransactionsByRange = useCallback((range: DateRange) => {
    if (!range.from || !range.to) return transacoesV2;
    
    // Normaliza os limites do período para garantir que o dia inteiro seja incluído
    const rangeFrom = startOfDay(range.from);
    const rangeTo = endOfDay(range.to);
    
    return transacoesV2.filter(t => {
      const transactionDate = parseDateLocal(t.date);
      return isWithinInterval(transactionDate, { start: rangeFrom, end: rangeTo });
    });
  }, [transacoesV2]);

  // Transações do Período 1 (Principal)
  const transacoesPeriodo1 = useMemo(() => filterTransactionsByRange(dateRanges.range1), [filterTransactionsByRange, dateRanges.range1]);

  // Transações do Período 2 (Comparação)
  const transacoesPeriodo2 = useMemo(() => filterTransactionsByRange(dateRanges.range2), [filterTransactionsByRange, dateRanges.range2]);

  // Saldo por conta (usando a data final do período 1 para o saldo atual)
  const saldosPorConta = useMemo(() => {
    const targetDate = dateRanges.range1.to;
    
    return contasMovimento.map(conta => {
      // Usamos calculateBalanceUpToDate para obter o saldo acumulado até o final do período
      const saldo = calculateBalanceUpToDate(conta.id, targetDate, transacoesV2, contasMovimento);
      
      return {
        ...conta,
        saldo: saldo,
      };
    });
  }, [contasMovimento, transacoesV2, dateRanges.range1.to, calculateBalanceUpToDate]);

  // Liquidez imediata (contas correntes, poupança, reserva e RENDA FIXA)
  const liquidezImediata = useMemo(() => {
    return saldosPorConta
      .filter(c => c.accountType === 'corrente' || c.accountType === 'poupanca' || c.accountType === 'reserva' || c.accountType === 'renda_fixa')
      .reduce((acc, c) => acc + c.saldo, 0);
  }, [saldosPorConta]);

  // Total de todos os ativos (usando a função period-aware do contexto)
  const totalAtivosPeriodo = useMemo(() => {
    return getAtivosTotal(dateRanges.range1.to);
  }, [getAtivosTotal, dateRanges.range1.to]);

  // Total dívidas (empréstimos ativos) - Usando a função period-aware do contexto
  const totalDividas = useMemo(() => {
    return getPassivosTotal(dateRanges.range1.to);
  }, [getPassivosTotal, dateRanges.range1.to]);

  // Patrimônio total
  const patrimonioTotal = totalAtivosPeriodo - totalDividas;

  // Receitas e despesas do período ATUAL (P1)
  const receitasPeriodo1 = useMemo(() => {
    return transacoesPeriodo1
      .filter(t => t.operationType !== 'initial_balance' && (t.operationType === 'receita' || t.operationType === 'rendimento'))
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transacoesPeriodo1]);

  // Despesas e despesas do período ATUAL (P1)
  const despesasPeriodo1 = useMemo(() => {
    return transacoesPeriodo1
      .filter(t => t.operationType !== 'initial_balance' && (t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo'))
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transacoesPeriodo1]);

  // Receitas e despesas do período ANTERIOR (P2)
  const receitasPeriodo2 = useMemo(() => {
    return transacoesPeriodo2
      .filter(t => t.operationType !== 'initial_balance' && (t.operationType === 'receita' || t.operationType === 'rendimento'))
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transacoesPeriodo2]);

  // Despesas e despesas do período ANTERIOR (P2)
  const despesasPeriodo2 = useMemo(() => {
    return transacoesPeriodo2
      .filter(t => t.operationType !== 'initial_balance' && (t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo'))
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transacoesPeriodo2]);

  // Variação do patrimônio (baseado no fluxo de caixa do período)
  const saldoPeriodo1 = receitasPeriodo1 - despesasPeriodo1;
  const saldoPeriodo2 = receitasPeriodo2 - despesasPeriodo2;
  
  const variacaoPatrimonio = saldoPeriodo1 - saldoPeriodo2;
  const variacaoPercentual = saldoPeriodo2 !== 0 
    ? ((saldoPeriodo1 - saldoPeriodo2) / Math.abs(saldoPeriodo2)) * 100 
    : 0;

  // Compromissos do período (despesas + parcelas empréstimo)
  const compromissosPeriodo = despesasPeriodo1;

  // Projeção 30 dias (baseado na média do período atual)
  const diasNoPeriodo = dateRanges.range1.from && dateRanges.range1.to ? (dateRanges.range1.to.getTime() - dateRanges.range1.from.getTime()) / (1000 * 60 * 60 * 24) : 30;
  const saldoMedioDiario = diasNoPeriodo > 0 ? saldoPeriodo1 / diasNoPeriodo : 0;
  const projecao30Dias = saldoPeriodo1 + (saldoMedioDiario * 30);

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
    return saldosPorConta
      .filter(c => c.accountType === 'renda_fixa' || c.accountType === 'poupanca')
      .reduce((acc, c) => acc + c.saldo, 0);
  }, [saldosPorConta]);

  const poupancaTotal = useMemo(() => {
    return saldosPorConta
      .filter(c => c.accountType === 'poupanca')
      .reduce((acc, c) => acc + c.saldo, 0);
  }, [saldosPorConta]);

  const reservaEmergencia = useMemo(() => {
    return saldosPorConta
      .filter(c => c.accountType === 'reserva')
      .reduce((acc, c) => acc + c.saldo, 0);
  }, [saldosPorConta]);

  const criptoTotal = useMemo(() => {
    return saldosPorConta
      .filter(c => c.accountType === 'cripto' && !c.name.toLowerCase().includes('stable'))
      .reduce((acc, c) => acc + c.saldo, 0);
  }, [saldosPorConta]);
  
  const stablesTotal = useMemo(() => {
    return saldosPorConta
      .filter(c => c.accountType === 'cripto' && c.name.toLowerCase().includes('stable'))
      .reduce((acc, c) => acc + c.saldo, 0);
  }, [saldosPorConta]);

  // Dados para saúde financeira
  
  // 1. Liquidez Ratio (Liquidez Geral: Ativo Total / Passivo Total)
  const liquidezRatio = totalDividas > 0 ? totalAtivosPeriodo / totalDividas : 999;

  // 2. Endividamento Percent (Passivo Total / Ativo Total * 100)
  const endividamentoPercent = totalAtivosPeriodo > 0 ? (totalDividas / totalAtivosPeriodo) * 100 : 0;
  
  // 3. Diversificação (quantos tipos de ativos diferentes > 0)
  const tiposAtivos = [
    investimentosRFTotal > 0,
    criptoTotal > 0,
    stablesTotal > 0,
    reservaEmergencia > 0,
    poupancaTotal > 0,
    liquidezImediata > 0,
    getValorFipeTotal(dateRanges.range1.to) > 0,
  ].filter(Boolean).length;
  const diversificacaoPercent = (tiposAtivos / 7) * 100;

  // 4. Estabilidade do fluxo (meses com saldo positivo)
  const mesesPositivos = useMemo(() => {
    const ultimos6Meses = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const data = subMonths(now, i);
      const m = data.getMonth();
      const y = data.getFullYear();
      
      const txMes = transacoesV2.filter(t => {
        const d = parseDateLocal(t.date);
        return d.getMonth() === m && d.getFullYear() === y;
      });
      
      const rec = txMes.filter(t => t.operationType !== 'initial_balance' && (t.operationType === 'receita' || t.operationType === 'rendimento')).reduce((a, t) => a + t.amount, 0);
      const desp = txMes.filter(t => t.operationType !== 'initial_balance' && (t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo')).reduce((a, t) => a + t.amount, 0);
      
      if (rec > desp) ultimos6Meses.push(true);
      else ultimos6Meses.push(false);
    }
    return (ultimos6Meses.filter(Boolean).length / 6) * 100;
  }, [transacoesV2]);

  // 5. Dependência de renda (Comprometimento Fixo: Despesas Fixas / Receitas Totais * 100)
  const despesasFixasPeriodo = useMemo(() => {
    const categoriasMap = new Map(categoriasV2.map(c => [c.id, c]));
    return transacoesPeriodo1
        .filter(t => {
            const cat = categoriasMap.get(t.categoryId || '');
            return cat?.nature === 'despesa_fixa' && t.operationType !== 'initial_balance';
        })
        .reduce((acc, t) => acc + t.amount, 0);
  }, [transacoesPeriodo1, categoriasV2]);
  
  const dependenciaRenda = receitasPeriodo1 > 0 ? (despesasFixasPeriodo / receitasPeriodo1) * 100 : 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <LayoutDashboard className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Central Financeira</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Visão rápida da sua situação financeira
              </p>
            </div>
          </div>
          <div className="md:ml-auto">
            <PeriodSelector 
              initialRanges={dateRanges}
              onDateRangeChange={handlePeriodChange} 
            />
          </div>
        </div>

        {/* Bloco 1 - Cockpit */}
        <section className="animate-fade-in-up">
          <CockpitCards data={cockpitData} />
        </section>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Coluna esquerda - Movimentações e Fluxo */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Bloco 3 - Movimentações Relevantes */}
            <section className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <MovimentacoesRelevantes transacoes={transacoesPeriodo1} limit={6} />
            </section>

            {/* Fluxo de Caixa Heatmap */}
            <section className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <FluxoCaixaHeatmap 
                month={dateRanges.range1.from ? format(dateRanges.range1.from, 'MM') : format(new Date(), 'MM')} 
                year={dateRanges.range1.from ? dateRanges.range1.from.getFullYear() : new Date().getFullYear()} 
                transacoes={transacoesPeriodo1} 
              />
            </section>
          </div>

          {/* Coluna direita - Ativos e Saúde */}
          <div className="space-y-4 md:space-y-6">
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