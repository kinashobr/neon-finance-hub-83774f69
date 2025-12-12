import { useState, useMemo, useCallback, useEffect } from "react";
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
import { PeriodSelector, DateRange } from "@/components/dashboard/PeriodSelector";
import { cn } from "@/lib/utils";
import { startOfMonth, endOfMonth, isWithinInterval, format, parseISO } from "date-fns";
import { ContaCorrente } from "@/types/finance";
import { Info } from "lucide-react"; // Importação de ícone
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Importações de Tooltip

// Interface e tipos copiados de IndicadoresFinanceiros.tsx para uso local
interface Indicador {
  id: string;
  nome: string;
  valor: number;
  formato: "percent" | "decimal" | "currency";
  limites: { bom: number; atencao: number };
  inverso?: boolean;
  formula: string;
}

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

// Funções e estilos auxiliares para a seção de Indicadores (copiados de IndicadoresFinanceiros.tsx)
const getStatus = (indicador: Indicador): "success" | "warning" | "danger" => {
  const { valor, limites, inverso } = indicador;
  
  if (inverso) {
    if (valor <= limites.bom) return "success";
    if (valor <= limites.atencao) return "warning";
    return "danger";
  } else {
    if (valor >= limites.bom) return "success";
    if (valor >= limites.atencao) return "warning";
    return "danger";
  }
};

const formatValue = (indicador: Indicador): string => {
  switch (indicador.formato) {
    case "percent": return `${indicador.valor.toFixed(1)}%`;
    case "decimal": return indicador.valor.toFixed(2);
    case "currency": return `R$ ${indicador.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    default: return indicador.valor.toString();
  }
};

const statusStyles = {
  success: "stat-card-positive",
  warning: "stat-card-neutral",
  danger: "stat-card-negative",
};

const statusTextStyles = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};


const Index = () => {
  const { 
    transacoesV2, 
    emprestimos, 
    veiculos, 
    investimentosRF, 
    criptomoedas, 
    stablecoins, 
    objetivos, 
    contasMovimento,
    getAtivosTotal,
    getPassivosTotal,
    getPatrimonioLiquido,
    getValorFipeTotal,
  } = useFinance();
  
  const [sections, setSections] = useState<DashboardSection[]>(() => {
    const saved = localStorage.getItem("dashboard-sections");
    return saved ? JSON.parse(saved) : defaultSections;
  });
  const [layout, setLayout] = useState<"2col" | "3col" | "fluid">(() => {
    const saved = localStorage.getItem("dashboard-layout");
    return (saved as "2col" | "3col" | "fluid") || "fluid";
  });
  
  // Inicializa o range para o mês atual
  const now = new Date();
  const initialRange: DateRange = { from: startOfMonth(now), to: endOfMonth(now) };
  const [dateRange, setDateRange] = useState<DateRange>(initialRange);

  const handlePeriodChange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, []);

  // Persist customization
  useEffect(() => {
    localStorage.setItem("dashboard-sections", JSON.stringify(sections));
  }, [sections]);

  useEffect(() => {
    localStorage.setItem("dashboard-layout", layout);
  }, [layout]);

  // Filtra transacoesV2 pelo período selecionado
  const filteredTransacoesV2 = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return transacoesV2;
    
    return transacoesV2.filter(t => {
      const transactionDate = parseISO(t.date);
      return isWithinInterval(transactionDate, { start: dateRange.from!, end: dateRange.to! });
    });
  }, [transacoesV2, dateRange]);

  // Helper para calcular saldo até uma data (usado para saldo inicial do período)
  const calculateBalanceUpToDate = useCallback((accountId: string, date: Date | undefined, allTransactions: typeof transacoesV2, accounts: typeof contasMovimento): number => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;

    let balance = account.startDate ? 0 : account.initialBalance; 
    const targetDate = date || new Date(9999, 11, 31);

    const transactionsBeforeDate = allTransactions
        .filter(t => t.accountId === accountId && parseISO(t.date) < targetDate)
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    transactionsBeforeDate.forEach(t => {
        const isCreditCard = account.accountType === 'cartao_credito';
        
        if (isCreditCard) {
          if (t.operationType === 'despesa') {
            balance -= t.amount;
          } else if (t.operationType === 'transferencia') {
            balance += t.amount;
          }
        } else {
          if (t.flow === 'in' || t.flow === 'transfer_in' || t.operationType === 'initial_balance') {
            balance += t.amount;
          } else {
            balance -= t.amount;
          }
        }
    });

    return balance;
  }, [contasMovimento, transacoesV2]);

  // Cálculos do período
  const totalReceitas = useMemo(() => {
    return filteredTransacoesV2
      .filter(t => t.operationType === "receita" || t.operationType === "rendimento")
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransacoesV2]);

  const totalDespesas = useMemo(() => {
    return filteredTransacoesV2
      .filter(t => t.operationType === "despesa" || t.operationType === "pagamento_emprestimo")
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransacoesV2]);

  const saldoCaixa = useMemo(() => {
    // Saldo final do período para contas correntes
    const contasLiquidas = contasMovimento.filter(c => 
      ['conta_corrente', 'poupanca', 'reserva_emergencia'].includes(c.accountType)
    );
    
    return contasLiquidas.reduce((acc, conta) => {
      const initialBalance = dateRange.from 
        ? calculateBalanceUpToDate(conta.id, dateRange.from, transacoesV2, contasMovimento)
        : calculateBalanceUpToDate(conta.id, undefined, transacoesV2, contasMovimento);
        
      const txInPeriod = filteredTransacoesV2.filter(t => t.accountId === conta.id);
      const inTx = txInPeriod.filter(t => t.flow === 'in' || t.flow === 'transfer_in').reduce((s, t) => s + t.amount, 0);
      const outTx = txInPeriod.filter(t => t.flow === 'out' || t.flow === 'transfer_out').reduce((s, t) => s + t.amount, 0);
      
      return acc + (initialBalance + inTx - outTx);
    }, 0);
  }, [contasMovimento, transacoesV2, filteredTransacoesV2, dateRange, calculateBalanceUpToDate]);

  const totalInvestimentos = useMemo(() => {
    const invContas = contasMovimento
      .filter(c => ['aplicacao_renda_fixa', 'criptoativos', 'objetivos_financeiros'].includes(c.accountType))
      .reduce((acc, conta) => {
        const initialBalance = calculateBalanceUpToDate(conta.id, undefined, transacoesV2, contasMovimento);
        return acc + initialBalance;
      }, 0);
      
    const invLegados = investimentosRF.reduce((acc, inv) => acc + inv.valor, 0) +
                      criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0) +
                      stablecoins.reduce((acc, s) => acc + s.valorBRL, 0) +
                      objetivos.reduce((acc, o) => acc + o.atual, 0);
                      
    return invContas + invLegados;
  }, [contasMovimento, transacoesV2, investimentosRF, criptomoedas, stablecoins, objetivos, calculateBalanceUpToDate]);

  const totalDividas = getPassivosTotal();

  const patrimonioData = useMemo(() => ({
    patrimonioTotal: getAtivosTotal(),
    saldoCaixa: saldoCaixa,
    investimentosTotal: totalInvestimentos,
    dividasTotal: totalDividas,
    patrimonioLiquido: getPatrimonioLiquido(),
    variacaoMes: 5.2, // Placeholder
    fluxoCaixa: totalReceitas - totalDespesas,
    gastosMes: totalDespesas,
    receitasMes: totalReceitas,
  }), [getAtivosTotal, saldoCaixa, totalInvestimentos, totalDividas, getPatrimonioLiquido, totalReceitas, totalDespesas]);

  const evolucaoData = useMemo(() => {
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const now = new Date();
    
    return meses.slice(0, 12).map((mes, i) => {
      const data = new Date(now.getFullYear(), i, 1);
      const mesNum = format(data, "MM");
      const ano = format(data, "yyyy");
      
      const transacoesMes = transacoesV2.filter(t => t.date.startsWith(`${ano}-${mesNum}`));
      
      const receitas = transacoesMes
        .filter(t => t.operationType === "receita" || t.operationType === "rendimento")
        .reduce((acc, t) => acc + t.amount, 0);
      const despesas = transacoesMes
        .filter(t => t.operationType === "despesa" || t.operationType === "pagamento_emprestimo")
        .reduce((acc, t) => acc + t.amount, 0);
      
      // Simulação de PL para o gráfico de evolução
      const patrimonioTotal = getPatrimonioLiquido() * (1 + (i - 6) * 0.01);
      
      return {
        mes,
        patrimonioTotal: Math.max(0, patrimonioTotal),
        receitas,
        despesas,
        investimentos: totalInvestimentos,
        dividas: totalDividas,
      };
    });
  }, [transacoesV2, totalInvestimentos, totalDividas, getPatrimonioLiquido]);

  const indicadoresData: Indicador[] = useMemo(() => [
    // Indicadores mantidos como placeholders, pois a lógica real está em IndicadoresTab
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

  const tabelaConsolidada = useMemo(() => {
    const total = getAtivosTotal();
    
    const rfTotal = investimentosRF.reduce((acc, inv) => acc + inv.valor, 0) + contasMovimento.filter(c => c.accountType === 'aplicacao_renda_fixa').reduce((acc, c) => calculateBalanceUpToDate(c.id, undefined, transacoesV2, contasMovimento) + acc, 0);
    const criptoTotal = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0) + contasMovimento.filter(c => c.accountType === 'criptoativos').reduce((acc, c) => calculateBalanceUpToDate(c.id, undefined, transacoesV2, contasMovimento) + acc, 0);
    const stablesTotal = stablecoins.reduce((acc, s) => acc + s.valorBRL, 0);
    const objetivosTotal = objetivos.reduce((acc, o) => acc + o.atual, 0) + contasMovimento.filter(c => c.accountType === 'objetivos_financeiros').reduce((acc, c) => calculateBalanceUpToDate(c.id, undefined, transacoesV2, contasMovimento) + acc, 0);
    const caixa = saldoCaixa;
    
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
    ].filter(item => item.valor > 0);
  }, [investimentosRF, criptomoedas, stablecoins, objetivos, saldoCaixa, getAtivosTotal, contasMovimento, transacoesV2, calculateBalanceUpToDate]);

  const distribuicaoPorClasse = useMemo(() => {
    const total = getAtivosTotal();
    const rfTotal = investimentosRF.reduce((acc, inv) => acc + inv.valor, 0) + contasMovimento.filter(c => c.accountType === 'aplicacao_renda_fixa').reduce((acc, c) => calculateBalanceUpToDate(c.id, undefined, transacoesV2, contasMovimento) + acc, 0);
    const criptoTotal = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0) + contasMovimento.filter(c => c.accountType === 'criptoativos').reduce((acc, c) => calculateBalanceUpToDate(c.id, undefined, transacoesV2, contasMovimento) + acc, 0);
    const stablesTotal = stablecoins.reduce((acc, s) => acc + s.valorBRL, 0);
    const objetivosTotal = objetivos.reduce((acc, o) => acc + o.atual, 0) + contasMovimento.filter(c => c.accountType === 'objetivos_financeiros').reduce((acc, c) => calculateBalanceUpToDate(c.id, undefined, transacoesV2, contasMovimento) + acc, 0);
    const caixa = saldoCaixa;
    
    return [
      {
        nome: "Renda Fixa",
        valor: rfTotal,
        cor: "hsl(199, 89%, 48%)"
      },
      {
        nome: "Cripto",
        valor: criptoTotal,
        cor: "hsl(270, 100%, 65%)"
      },
      {
        nome: "Stables",
        valor: stablesTotal,
        cor: "hsl(142, 76%, 36%)"
      },
      {
        nome: "Objetivos",
        valor: objetivosTotal,
        cor: "hsl(38, 92%, 50%)"
      },
      {
        nome: "Caixa",
        valor: caixa,
        cor: "hsl(210, 100%, 60%)"
      },
    ].filter(item => item.valor > 0);
  }, [investimentosRF, criptomoedas, stablecoins, objetivos, saldoCaixa, getAtivosTotal, contasMovimento, transacoesV2, calculateBalanceUpToDate]);

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
    ].filter(item => item.valor > 0);
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
        const month = dateRange.from ? format(dateRange.from, 'MM') : format(now, 'MM');
        const year = dateRange.from ? dateRange.from.getFullYear() : now.getFullYear();
        return <FluxoCaixaHeatmap month={month} year={year} transacoes={filteredTransacoesV2} />;
      case "indicadores":
        // Passa os dados calculados para o componente IndicadoresFinanceiros
        return <IndicadoresFinanceiros indicadores={indicadoresData} />;
      case "tabela-consolidada":
        return <TabelaConsolidada data={tabelaConsolidada} />;
      case "objetivos":
        return <ObjetivosCards objetivos={objetivos} />;
      case "distribuicao-charts":
        return <DistribuicaoCharts porClasse={distribuicaoPorClasse} porRisco={distribuicaoPorRisco} />;
      case "transacoes-recentes":
        return <TransacoesRecentes transacoes={filteredTransacoesV2} limit={8} />;
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
              initialRange={initialRange}
              onDateRangeChange={handlePeriodChange} 
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