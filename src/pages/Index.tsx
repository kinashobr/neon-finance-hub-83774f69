import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { PatrimonioCards } from "@/components/dashboard/PatrimonioCards";
import { EvolucaoPatrimonialChart } from "@/components/dashboard/EvolucaoPatrimonialChart";
import { FluxoCaixaHeatmap } from "@/components/dashboard/FluxoCaixaHeatmap";
import { IndicadoresFinanceiros } from "@/components/dashboard/IndicadoresFinanceiros";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AlertasFinanceiros } from "@/components/dashboard/AlertasFinanceiros";
import { TabelaConsolidada } from "@/components/dashboard/TabelaConsolidada";
import { ObjetivosCards } from "@/components/dashboard/ObjetivosCards";
import { DistribuicaoCharts } from "@/components/dashboard/DistribuicaoCharts";
import { TransacoesRecentes } from "@/components/dashboard/TransacoesRecentes";
import { DashboardCustomizer, DashboardSection } from "@/components/dashboard/DashboardCustomizer";
import { PeriodSelector, PeriodRange, periodToDateRange } from "@/components/dashboard/PeriodSelector";
import { cn } from "@/lib/utils";

const defaultSections: DashboardSection[] = [
  { id: "patrimonio-cards", nome: "Cards de Patrimônio", visivel: true, ordem: 0 },
  { id: "quick-actions", nome: "Ações Rápidas", visivel: true, ordem: 1 },
  { id: "heatmap", nome: "Fluxo de Caixa Mensal", visivel: true, ordem: 2 },
  { id: "evolucao-chart", nome: "Evolução Patrimonial", visivel: true, ordem: 3 },
  { id: "transacoes-recentes", nome: "Transações Recentes", visivel: true, ordem: 4 },
  { id: "indicadores", nome: "Indicadores Financeiros", visivel: false, ordem: 5 },
  { id: "tabela-consolidada", nome: "Tabela Consolidada", visivel: false, ordem: 6 },
  { id: "objetivos", nome: "Objetivos Financeiros", visivel: false, ordem: 7 },
  { id: "distribuicao-charts", nome: "Gráficos de Distribuição", visivel: false, ordem: 8 },
];

const Index = () => {
  const { 
    // Novos dados integrados
    transacoesV2,
    contasMovimento,
    // Dados legados ainda usados
    emprestimos, 
    veiculos, 
    investimentosRF, 
    criptomoedas, 
    stablecoins, 
    objetivos,
  } = useFinance();
  
  const [sections, setSections] = useState<DashboardSection[]>(defaultSections);
  const [layout, setLayout] = useState<"2col" | "3col" | "fluid">("fluid");
  const [periodRange, setPeriodRange] = useState<PeriodRange>({
    startMonth: null,
    startYear: null,
    endMonth: null,
    endYear: null,
  });

  const handlePeriodChange = useCallback((period: PeriodRange) => {
    setPeriodRange(period);
  }, []);

  const dateRange = useMemo(() => periodToDateRange(periodRange), [periodRange]);

  // Filtrar transações pelo período selecionado
  const filteredTransacoes = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return transacoesV2;
    
    return transacoesV2.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= dateRange.from! && transactionDate <= dateRange.to!;
    });
  }, [transacoesV2, dateRange]);

  // Calcular saldo total das contas movimento
  const saldoContas = useMemo(() => {
    return contasMovimento.reduce((acc, conta) => {
      const contaTx = transacoesV2.filter(t => t.accountId === conta.id);
      const totalIn = contaTx.filter(t => t.flow === 'in' || t.flow === 'transfer_in').reduce((s, t) => s + t.amount, 0);
      const totalOut = contaTx.filter(t => t.flow === 'out' || t.flow === 'transfer_out').reduce((s, t) => s + t.amount, 0);
      return acc + conta.initialBalance + totalIn - totalOut;
    }, 0);
  }, [contasMovimento, transacoesV2]);

  // Calcular receitas e despesas do período
  const totalReceitas = useMemo(() => {
    return filteredTransacoes
      .filter(t => t.operationType === 'receita' || t.operationType === 'rendimento')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransacoes]);

  const totalDespesas = useMemo(() => {
    return filteredTransacoes
      .filter(t => t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransacoes]);

  const receitasMes = useMemo(() => {
    const now = new Date();
    return filteredTransacoes
      .filter(t => 
        (t.operationType === 'receita' || t.operationType === 'rendimento') && 
        new Date(t.date).getMonth() === now.getMonth() && 
        new Date(t.date).getFullYear() === now.getFullYear()
      )
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransacoes]);

  const despesasMes = useMemo(() => {
    const now = new Date();
    return filteredTransacoes
      .filter(t => 
        (t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo') && 
        new Date(t.date).getMonth() === now.getMonth() && 
        new Date(t.date).getFullYear() === now.getFullYear()
      )
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransacoes]);

  // Calcular total de investimentos das contas movimento tipo investimento
  const totalInvestimentosContas = useMemo(() => {
    const investmentAccountTypes = ['aplicacao_renda_fixa', 'poupanca', 'criptoativos', 'reserva_emergencia', 'objetivos_financeiros'];
    return contasMovimento
      .filter(c => investmentAccountTypes.includes(c.accountType))
      .reduce((acc, conta) => {
        const contaTx = transacoesV2.filter(t => t.accountId === conta.id);
        const totalIn = contaTx.filter(t => t.flow === 'in' || t.flow === 'transfer_in').reduce((s, t) => s + t.amount, 0);
        const totalOut = contaTx.filter(t => t.flow === 'out' || t.flow === 'transfer_out').reduce((s, t) => s + t.amount, 0);
        return acc + conta.initialBalance + totalIn - totalOut;
      }, 0);
  }, [contasMovimento, transacoesV2]);

  // Total investimentos (contas + legado)
  const totalInvestimentos = useMemo(() => {
    const rf = investimentosRF.reduce((acc, inv) => acc + inv.valor, 0);
    const cripto = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0);
    const stable = stablecoins.reduce((acc, s) => acc + s.valorBRL, 0);
    const objs = objetivos.reduce((acc, o) => acc + o.atual, 0);
    return rf + cripto + stable + objs + totalInvestimentosContas;
  }, [investimentosRF, criptomoedas, stablecoins, objetivos, totalInvestimentosContas]);

  // Total dívidas
  const totalDividas = useMemo(() => {
    return emprestimos
      .filter(e => e.status !== 'pendente_config' && e.status !== 'quitado')
      .reduce((acc, e) => {
        const parcelasPagas = e.parcelasPagas || 0;
        const saldoDevedor = Math.max(0, e.valorTotal - (parcelasPagas * e.parcela));
        return acc + saldoDevedor;
      }, 0);
  }, [emprestimos]);

  const patrimonioData = {
    patrimonioTotal: totalInvestimentos + veiculos.filter(v => v.status !== 'vendido').reduce((acc, v) => acc + v.valorFipe, 0),
    saldoCaixa: saldoContas,
    investimentosTotal: totalInvestimentos,
    dividasTotal: totalDividas,
    patrimonioLiquido: saldoContas + totalInvestimentos - totalDividas,
    variacaoMes: totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas * 100) : 0,
    fluxoCaixa: receitasMes - despesasMes,
    gastosMes: despesasMes,
    receitasMes: receitasMes,
  };

  const evolucaoData = useMemo(() => {
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    let patrimonioAcumulado = saldoContas > 0 ? saldoContas : 0;
    let investimentosAcumulados = totalInvestimentos > 0 ? totalInvestimentos : 0;
    let dividasAcumuladas = totalDividas > 0 ? totalDividas : 0;
    
    return meses.slice(0, 12).map((mes, i) => {
      const mesNum = String(i + 1).padStart(2, "0");
      const receitas = filteredTransacoes
        .filter(t => (t.operationType === 'receita' || t.operationType === 'rendimento') && t.date.includes(`-${mesNum}-`))
        .reduce((acc, t) => acc + t.amount, 0);
      const despesas = filteredTransacoes
        .filter(t => (t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo') && t.date.includes(`-${mesNum}-`))
        .reduce((acc, t) => acc + t.amount, 0);
      
      if (receitas > 0 || despesas > 0) {
        patrimonioAcumulado += (receitas - despesas) * 0.3;
        investimentosAcumulados += (receitas - despesas) * 0.2;
        dividasAcumuladas = Math.max(0, dividasAcumuladas - despesas * 0.1);
      }
      
      return {
        mes,
        patrimonioTotal: patrimonioAcumulado,
        receitas,
        despesas,
        investimentos: investimentosAcumulados,
        dividas: Math.max(dividasAcumuladas, 0),
      };
    });
  }, [filteredTransacoes, saldoContas, totalInvestimentos, totalDividas]);

  const heatmapData = useMemo(() => {
    return Array.from({ length: 31 }, (_, i) => {
      const day = i + 1;
      const dayTransacoes = filteredTransacoes.filter(t => {
        const d = new Date(t.date).getDate();
        return d === day;
      });
      
      return {
        day,
        receitas: dayTransacoes.filter(t => t.operationType === 'receita' || t.operationType === 'rendimento').reduce((acc, t) => acc + t.amount, 0),
        despesas: dayTransacoes.filter(t => t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo').reduce((acc, t) => acc + t.amount, 0),
        transferencias: dayTransacoes.filter(t => t.operationType === 'transferencia').reduce((acc, t) => acc + t.amount, 0),
        aportes: dayTransacoes.filter(t => t.operationType === 'aplicacao').reduce((acc, t) => acc + t.amount, 0),
      };
    });
  }, [filteredTransacoes]);

  const indicadores = useMemo(() => {
    const margemPoupanca = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) * 100 : 0;
    const endividamento = (saldoContas + totalInvestimentos) > 0 ? (totalDividas / (saldoContas + totalInvestimentos)) * 100 : 0;
    
    return [
      {
        id: "liquidez",
        nome: "Liquidez Imediata",
        valor: saldoContas > 0 && totalDividas > 0 ? saldoContas / (totalDividas * 0.1 || 1) : 2.0,
        formato: "decimal" as const,
        limites: { bom: 1.5, atencao: 1.0 },
        formula: "Caixa / Passivo Circulante"
      },
      {
        id: "solvencia",
        nome: "Solvência",
        valor: totalDividas > 0 ? (saldoContas + totalInvestimentos) / totalDividas : 3.0,
        formato: "decimal" as const,
        limites: { bom: 2.0, atencao: 1.5 },
        formula: "Ativo Total / Passivo Total"
      },
      {
        id: "endividamento",
        nome: "Endividamento",
        valor: endividamento,
        formato: "percent" as const,
        limites: { bom: 30, atencao: 50 },
        inverso: true,
        formula: "Passivo Total / Ativo Total × 100"
      },
      {
        id: "rentabilidade",
        nome: "Rentab. Investimentos",
        valor: totalInvestimentos > 0 ? (totalReceitas * 0.1 / totalInvestimentos) * 100 : 0,
        formato: "percent" as const,
        limites: { bom: 10, atencao: 6 },
        formula: "Rendimentos / Capital Investido × 100"
      },
      {
        id: "margem-poupanca",
        nome: "Margem Poupança",
        valor: margemPoupanca,
        formato: "percent" as const,
        limites: { bom: 20, atencao: 10 },
        formula: "(Receitas - Despesas) / Receitas × 100"
      },
    ];
  }, [saldoContas, totalInvestimentos, totalDividas, totalReceitas, totalDespesas]);

  const alertas = useMemo(() => {
    const alerts = [];
    
    // Alerta de saldo negativo
    if (saldoContas < 0) {
      alerts.push({
        id: "saldo-negativo",
        tipo: "danger" as const,
        mensagem: "Saldo de caixa negativo",
        detalhe: `Saldo atual: R$ ${saldoContas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      });
    }
    
    // Alerta de dívidas
    if (totalDividas > saldoContas * 2) {
      alerts.push({
        id: "dividas-altas",
        tipo: "warning" as const,
        mensagem: "Dívidas acima do recomendado",
        detalhe: "Dívidas representam mais de 2x o saldo disponível"
      });
    }
    
    // Alerta de margem de poupança
    const margem = totalReceitas > 0 ? (totalReceitas - totalDespesas) / totalReceitas * 100 : 0;
    if (margem < 10 && totalReceitas > 0) {
      alerts.push({
        id: "margem-baixa",
        tipo: "warning" as const,
        mensagem: "Margem de poupança baixa",
        detalhe: `Apenas ${margem.toFixed(1)}% das receitas está sendo poupado`
      });
    }
    
    // Empréstimos pendentes
    const pendentes = emprestimos.filter(e => e.status === 'pendente_config').length;
    if (pendentes > 0) {
      alerts.push({
        id: "emprestimos-pendentes",
        tipo: "info" as const,
        mensagem: `${pendentes} empréstimo(s) pendente(s) de configuração`,
        detalhe: "Acesse a tela de Empréstimos para configurar"
      });
    }
    
    return alerts.length > 0 ? alerts : [
      {
        id: "tudo-ok",
        tipo: "success" as const,
        mensagem: "Finanças em dia!",
        detalhe: "Nenhum alerta no momento"
      }
    ];
  }, [saldoContas, totalDividas, totalReceitas, totalDespesas, emprestimos]);

  const tabelaConsolidada = useMemo(() => {
    const rfTotal = investimentosRF.reduce((acc, inv) => acc + inv.valor, 0);
    const criptoTotal = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0);
    const stablesTotal = stablecoins.reduce((acc, s) => acc + s.valorBRL, 0);
    const objetivosTotal = objetivos.reduce((acc, o) => acc + o.atual, 0);
    const caixa = saldoContas;
    const total = rfTotal + criptoTotal + stablesTotal + objetivosTotal + caixa + totalInvestimentosContas;
    
    return [
      {
        id: "caixa",
        categoria: "Caixa",
        valor: caixa,
        percentual: total > 0 ? (caixa / total) * 100 : 0,
        rentabilidade: 0,
        volatilidade: "Baixa",
        risco: "A"
      },
      {
        id: "rf",
        categoria: "Renda Fixa",
        valor: rfTotal + totalInvestimentosContas,
        percentual: total > 0 ? ((rfTotal + totalInvestimentosContas) / total) * 100 : 0,
        rentabilidade: 12.5,
        volatilidade: "Baixa",
        risco: "A"
      },
      {
        id: "cripto",
        categoria: "Criptomoedas",
        valor: criptoTotal,
        percentual: total > 0 ? (criptoTotal / total) * 100 : 0,
        rentabilidade: 45.2,
        volatilidade: "Alta",
        risco: "C"
      },
      {
        id: "stables",
        categoria: "Stablecoins",
        valor: stablesTotal,
        percentual: total > 0 ? (stablesTotal / total) * 100 : 0,
        rentabilidade: undefined,
        volatilidade: "Baixa",
        risco: "A"
      },
      {
        id: "objetivos",
        categoria: "Objetivos",
        valor: objetivosTotal,
        percentual: total > 0 ? (objetivosTotal / total) * 100 : 0,
        rentabilidade: 11.8,
        volatilidade: "Baixa",
        risco: "B"
      },
    ].filter(item => item.valor > 0);
  }, [investimentosRF, criptomoedas, stablecoins, objetivos, saldoContas, totalInvestimentosContas]);

  const distribuicaoPorClasse = useMemo(() => [
    {
      nome: "Caixa",
      valor: saldoContas > 0 ? saldoContas : 0,
      cor: "hsl(210, 100%, 60%)"
    },
    {
      nome: "Renda Fixa",
      valor: investimentosRF.reduce((acc, inv) => acc + inv.valor, 0) + totalInvestimentosContas,
      cor: "hsl(199, 89%, 48%)"
    },
    {
      nome: "Cripto",
      valor: criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0),
      cor: "hsl(270, 100%, 65%)"
    },
    {
      nome: "Stables",
      valor: stablecoins.reduce((acc, s) => acc + s.valorBRL, 0),
      cor: "hsl(142, 76%, 36%)"
    },
    {
      nome: "Objetivos",
      valor: objetivos.reduce((acc, o) => acc + o.atual, 0),
      cor: "hsl(38, 92%, 50%)"
    },
  ].filter(item => item.valor > 0), [investimentosRF, criptomoedas, stablecoins, objetivos, saldoContas, totalInvestimentosContas]);

  const distribuicaoPorRisco = useMemo(() => {
    const baixo = investimentosRF.reduce((acc, inv) => acc + inv.valor, 0) + stablecoins.reduce((acc, s) => acc + s.valorBRL, 0) + saldoContas;
    const medio = objetivos.reduce((acc, o) => acc + o.atual, 0);
    const alto = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0) * 0.5;
    const especulativo = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0) * 0.5;
    
    return [
      {
        nome: "Baixo",
        valor: baixo > 0 ? baixo : 0,
        cor: "hsl(142, 76%, 36%)"
      },
      {
        nome: "Médio",
        valor: medio,
        cor: "hsl(199, 89%, 48%)"
      },
      {
        nome: "Alto",
        valor: alto,
        cor: "hsl(38, 92%, 50%)"
      },
      {
        nome: "Especulativo",
        valor: especulativo,
        cor: "hsl(0, 72%, 51%)"
      },
    ].filter(item => item.valor > 0);
  }, [investimentosRF, stablecoins, objetivos, criptomoedas, saldoContas]);

  const handleResetCustomization = () => {
    setSections(defaultSections);
    setLayout("fluid");
    toast.success("Dashboard resetado para o padrão");
  };

  // Converter transacoesV2 para formato legado para TransacoesRecentes
  const transacoesFormatadas = useMemo(() => {
    return filteredTransacoes.map(t => ({
      id: parseInt(t.id.replace(/\D/g, '')) || Math.random() * 1000000,
      descricao: t.description,
      valor: t.amount,
      data: t.date,
      tipo: t.flow === 'in' || t.flow === 'transfer_in' ? 'receita' as const : 'despesa' as const,
      categoria: t.categoryId || 'Outros',
    }));
  }, [filteredTransacoes]);

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "patrimonio-cards":
        return <PatrimonioCards data={patrimonioData} />;
      case "quick-actions":
        return <QuickActions />;
      case "evolucao-chart":
        return <EvolucaoPatrimonialChart data={evolucaoData} />;
      case "heatmap":
        const now = new Date();
        return <FluxoCaixaHeatmap month={String(now.getMonth() + 1).padStart(2, '0')} year={now.getFullYear()} transacoes={transacoesV2} />;
      case "indicadores":
        return <IndicadoresFinanceiros indicadores={indicadores} />;
      case "tabela-consolidada":
        return <TabelaConsolidada data={tabelaConsolidada} />;
      case "objetivos":
        return <ObjetivosCards objetivos={objetivos} />;
      case "distribuicao-charts":
        return <DistribuicaoCharts porClasse={distribuicaoPorClasse} porRisco={distribuicaoPorRisco} />;
      case "transacoes-recentes":
        return <TransacoesRecentes transacoes={transacoesFormatadas} limit={8} />;
      default:
        return null;
    }
  };

  const visibleSections = sections
    .filter(s => s.visivel)
    .sort((a, b) => a.ordem - b.ordem);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Financeiro</h1>
            <p className="text-muted-foreground mt-1">
              Painel unificado das suas finanças pessoais
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PeriodSelector 
              tabId="dashboard" 
              onPeriodChange={handlePeriodChange} 
            />
            <DashboardCustomizer
              sections={sections}
              layout={layout}
              onSectionsChange={setSections}
              onLayoutChange={setLayout}
              onReset={handleResetCustomization}
            />
          </div>
        </div>

        <div className={cn(
          "space-y-6",
          layout === "2col" && "grid grid-cols-1 lg:grid-cols-2 gap-6",
          layout === "3col" && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        )}>
          {visibleSections.map((section) => (
            <div key={section.id} className="animate-fade-in-up">
              {renderSection(section.id)}
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;