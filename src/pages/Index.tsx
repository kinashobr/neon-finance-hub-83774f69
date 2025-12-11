import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useFinance } from "@/contexts/FinanceContext";
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
import { DateRangeSelector } from "@/components/dashboard/DateRangeSelector"; // Importando o novo seletor
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
  const { transacoes, transacoesV2, emprestimos, veiculos, investimentosRF, criptomoedas, stablecoins, objetivos, getTotalReceitas, getTotalDespesas, getAtivosTotal, getPassivosTotal, getPatrimonioLiquido } = useFinance();
  const [sections, setSections] = useState<DashboardSection[]>(defaultSections);
  const [layout, setLayout] = useState<"2col" | "3col" | "fluid">("fluid");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

  const handleDateRangeChange = useCallback((range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
  }, []);

  const filteredTransacoes = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return transacoes;
    
    return transacoes.filter(t => {
      const transactionDate = new Date(t.data + "T00:00:00");
      return transactionDate >= dateRange.from! && transactionDate <= dateRange.to!;
    });
  }, [transacoes, dateRange]);

  const totalReceitas = useMemo(() => {
    return filteredTransacoes.filter(t => t.tipo === "receita").reduce((acc, t) => acc + t.valor, 0);
  }, [filteredTransacoes]);

  const totalDespesas = useMemo(() => {
    return filteredTransacoes.filter(t => t.tipo === "despesa").reduce((acc, t) => acc + t.valor, 0);
  }, [filteredTransacoes]);

  const receitasMes = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Se o filtro de data estiver ativo, usamos o filtro. Caso contrário, usamos o mês atual.
    const isCurrentMonth = !dateRange.from || (dateRange.from.getMonth() === currentMonth && dateRange.from.getFullYear() === currentYear);

    return filteredTransacoes
      .filter(t => {
        const d = new Date(t.data + "T00:00:00");
        return isCurrentMonth ? (d.getMonth() === currentMonth && d.getFullYear() === currentYear) : true;
      })
      .filter(t => t.tipo === "receita")
      .reduce((acc, t) => acc + t.valor, 0);
  }, [filteredTransacoes, dateRange]);

  const despesasMes = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const isCurrentMonth = !dateRange.from || (dateRange.from.getMonth() === currentMonth && dateRange.from.getFullYear() === currentYear);

    return filteredTransacoes
      .filter(t => {
        const d = new Date(t.data + "T00:00:00");
        return isCurrentMonth ? (d.getMonth() === currentMonth && d.getFullYear() === currentYear) : true;
      })
      .filter(t => t.tipo === "despesa")
      .reduce((acc, t) => acc + t.valor, 0);
  }, [filteredTransacoes, dateRange]);

  const totalInvestimentos = useMemo(() => {
    const rf = investimentosRF.reduce((acc, inv) => acc + inv.valor, 0);
    const cripto = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0);
    const stable = stablecoins.reduce((acc, s) => acc + s.valorBRL, 0);
    const objs = objetivos.reduce((acc, o) => acc + o.atual, 0);
    return rf + cripto + stable + objs;
  }, [investimentosRF, criptomoedas, stablecoins, objetivos]);

  const totalDividas = useMemo(() => {
    return emprestimos.reduce((acc, e) => acc + e.valorTotal * 0.7, 0);
  }, [emprestimos]);

  const patrimonioData = useMemo(() => ({
    patrimonioTotal: totalInvestimentos + veiculos.reduce((acc, v) => acc + v.valorFipe, 0),
    saldoCaixa: totalReceitas - totalDespesas,
    investimentosTotal: totalInvestimentos,
    dividasTotal: totalDividas,
    patrimonioLiquido: totalInvestimentos - totalDividas,
    variacaoMes: 5.2,
    fluxoCaixa: receitasMes - despesasMes,
    gastosMes: despesasMes,
    receitasMes: receitasMes,
  }), [totalInvestimentos, veiculos, totalReceitas, totalDespesas, totalDividas, receitasMes, despesasMes]);

  const evolucaoData = useMemo(() => {
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    return meses.slice(0, 12).map((mes, i) => {
      const mesNum = String(i + 1).padStart(2, "0");
      const receitas = filteredTransacoes
        .filter(t => t.tipo === "receita" && t.data.includes(`-${mesNum}-`))
        .reduce((acc, t) => acc + t.valor, 0);
      const despesas = filteredTransacoes
        .filter(t => t.tipo === "despesa" && t.data.includes(`-${mesNum}-`))
        .reduce((acc, t) => acc + t.valor, 0);
      
      const patrimonioTotal = totalInvestimentos + veiculos.reduce((acc, v) => acc + v.valorFipe, 0);
      
      return {
        mes,
        patrimonioTotal,
        receitas,
        despesas,
        investimentos: totalInvestimentos,
        dividas: Math.max(totalDividas, 0),
      };
    });
  }, [filteredTransacoes, totalInvestimentos, veiculos, totalDividas]);

  const heatmapData = useMemo(() => {
    return Array.from({ length: 31 }, (_, i) => {
      const day = i + 1;
      const dayTransacoes = filteredTransacoes.filter(t => {
        const d = new Date(t.data).getDate();
        return d === day;
      });
      
      return {
        day,
        receitas: dayTransacoes.filter(t => t.tipo === "receita").reduce((acc, t) => acc + t.valor, 0),
        despesas: dayTransacoes.filter(t => t.tipo === "despesa").reduce((acc, t) => acc + t.valor, 0),
        transferencias: Math.random() > 0.7 ? Math.floor(Math.random() * 2000) : 0,
        aportes: Math.random() > 0.8 ? Math.floor(Math.random() * 3000) : 0,
      };
    });
  }, [filteredTransacoes]);

  const indicadores = useMemo(() => [
    {
      id: "liquidez",
      nome: "Liquidez Imediata",
      valor: 1.8,
      formato: "decimal" as const,
      limites: { bom: 1.5, atencao: 1.0 },
      formula: "(Stables + RF D+0) / Passivo Circulante"
    },
    {
      id: "solvencia",
      nome: "Solvência",
      valor: 2.2,
      formato: "decimal" as const,
      limites: { bom: 2.0, atencao: 1.5 },
      formula: "Ativo Total / Passivo Total"
    },
    {
      id: "endividamento",
      nome: "Endividamento",
      valor: 28,
      formato: "percent" as const,
      limites: { bom: 30, atencao: 50 },
      inverso: true,
      formula: "Passivo Total / Ativo Total × 100"
    },
    {
      id: "rentabilidade",
      nome: "Rentab. Investimentos",
      valor: 12.5,
      formato: "percent" as const,
      limites: { bom: 10, atencao: 6 },
      formula: "Rendimentos / Capital Investido × 100"
    },
    {
      id: "cresc-receitas",
      nome: "Cresc. Receitas",
      valor: 8.2,
      formato: "percent" as const,
      limites: { bom: 5, atencao: 0 },
      formula: "(Receitas Atual - Anterior) / Anterior × 100"
    },
    {
      id: "cresc-despesas",
      nome: "Cresc. Despesas",
      valor: 3.5,
      formato: "percent" as const,
      limites: { bom: 5, atencao: 10 },
      inverso: true,
      formula: "(Despesas Atual - Anterior) / Anterior × 100"
    },
    {
      id: "margem-poupanca",
      nome: "Margem Poupança",
      valor: 22,
      formato: "percent" as const,
      limites: { bom: 20, atencao: 10 },
      formula: "(Receitas - Despesas) / Receitas × 100"
    },
    {
      id: "expo-cripto",
      nome: "Exposição Cripto",
      valor: 18,
      formato: "percent" as const,
      limites: { bom: 20, atencao: 30 },
      inverso: true,
      formula: "Cripto / Patrimônio Total × 100"
    },
    {
      id: "peso-rf",
      nome: "Peso Renda Fixa",
      valor: 45,
      formato: "percent" as const,
      limites: { bom: 40, atencao: 20 },
      formula: "RF / Patrimônio Total × 100"
    },
    {
      id: "peso-rv",
      nome: "Peso Renda Variável",
      valor: 12,
      formato: "percent" as const,
      limites: { bom: 15, atencao: 30 },
      inverso: true,
      formula: "(Cripto + Ações) / Patrimônio Total × 100"
    },
  ], []);

  const alertas = useMemo(() => [
    {
      id: "1",
      tipo: "warning" as const,
      mensagem: "Gasto acima da média em Alimentação",
      detalhe: "R$ 850 vs média de R$ 650"
    },
    {
      id: "2",
      tipo: "danger" as const,
      mensagem: "Dívida representa 28% dos ativos",
      detalhe: "Atenção ao limite de 30%"
    },
    {
      id: "3",
      tipo: "info" as const,
      mensagem: "Renda Fixa vencendo em 15 dias",
      detalhe: "LCI Nubank - R$ 15.000"
    },
    {
      id: "4",
      tipo: "warning" as const,
      mensagem: "Aporte mensal não realizado",
      detalhe: "Meta: R$ 2.000/mês"
    },
    {
      id: "5",
      tipo: "success" as const,
      mensagem: "Meta de poupança atingida!",
      detalhe: "22% vs meta de 20%"
    },
  ], []);

  const tabelaConsolidada = useMemo(() => {
    const rfTotal = investimentosRF.reduce((acc, inv) => acc + inv.valor, 0);
    const criptoTotal = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0);
    const stablesTotal = stablecoins.reduce((acc, s) => acc + s.valorBRL, 0);
    const objetivosTotal = objetivos.reduce((acc, o) => acc + o.atual, 0);
    const caixa = totalReceitas - totalDespesas;
    const total = rfTotal + criptoTotal + stablesTotal + objetivosTotal + caixa;
    
    return [
      {
        id: "rf",
        categoria: "Renda Fixa",
        valor: rfTotal,
        percentual: (rfTotal / total) * 100,
        rentabilidade: 12.5,
        volatilidade: "Baixa",
        risco: "A"
      },
      {
        id: "cripto",
        categoria: "Criptomoedas",
        valor: criptoTotal,
        percentual: (criptoTotal / total) * 100,
        rentabilidade: 45.2,
        volatilidade: "Alta",
        risco: "C"
      },
      {
        id: "stables",
        categoria: "Stablecoins",
        valor: stablesTotal,
        percentual: (stablesTotal / total) * 100,
        rentabilidade: 0,
        volatilidade: "Baixa",
        risco: "A"
      },
      {
        id: "objetivos",
        categoria: "Objetivos",
        valor: objetivosTotal,
        percentual: (objetivosTotal / total) * 100,
        rentabilidade: 11.8,
        volatilidade: "Baixa",
        risco: "B"
      },
      {
        id: "caixa",
        categoria: "Caixa",
        valor: caixa,
        percentual: (caixa / total) * 100,
        rentabilidade: 0,
        volatilidade: "Baixa",
        risco: "A"
      },
    ];
  }, [investimentosRF, criptomoedas, stablecoins, objetivos, totalReceitas, totalDespesas]);

  const distribuicaoPorClasse = useMemo(() => [
    {
      nome: "Renda Fixa",
      valor: investimentosRF.reduce((acc, inv) => acc + inv.valor, 0),
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
    {
      nome: "Caixa",
      valor: Math.max(totalReceitas - totalDespesas, 0),
      cor: "hsl(210, 100%, 60%)"
    },
  ], [investimentosRF, criptomoedas, stablecoins, objetivos, totalReceitas, totalDespesas]);

  const distribuicaoPorRisco = useMemo(() => {
    const baixo = investimentosRF.reduce((acc, inv) => acc + inv.valor, 0) + stablecoins.reduce((acc, s) => acc + s.valorBRL, 0);
    const medio = objetivos.reduce((acc, o) => acc + o.atual, 0);
    const alto = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0) * 0.5;
    const especulativo = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0) * 0.5;
    
    return [
      {
        nome: "Baixo",
        valor: baixo,
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
    ];
  }, [investimentosRF, stablecoins, objetivos, criptomoedas]);

  const handleResetCustomization = () => {
    setSections(defaultSections);
    setLayout("fluid");
  };

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "patrimonio-cards":
        return <PatrimonioCards data={patrimonioData} />;
      case "quick-actions":
        return <QuickActions />;
      case "evolucao-chart":
        return <EvolucaoPatrimonialChart data={evolucaoData} />;
      case "heatmap":
        const now = dateRange.from || new Date();
        const txV2Filtered = transacoesV2.filter(t => {
          const d = new Date(t.date + "T00:00:00");
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        return <FluxoCaixaHeatmap month={String(now.getMonth() + 1).padStart(2, '0')} year={now.getFullYear()} transacoes={txV2Filtered} />;
      case "indicadores":
        return <IndicadoresFinanceiros indicadores={indicadores} />;
      case "tabela-consolidada":
        return <TabelaConsolidada data={tabelaConsolidada} />;
      case "objetivos":
        return <ObjetivosCards objetivos={objetivos} />;
      case "distribuicao-charts":
        return <DistribuicaoCharts porClasse={distribuicaoPorClasse} porRisco={distribuicaoPorRisco} />;
      case "transacoes-recentes":
        return <TransacoesRecentes transacoes={filteredTransacoes} limit={8} />;
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
            <DateRangeSelector onDateRangeChange={handleDateRangeChange} />
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