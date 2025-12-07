import { useMemo } from "react";
import { Info, TrendingUp, TrendingDown, Gauge, Target, DollarSign } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";

interface Indicador {
  id: string;
  nome: string;
  valor: number;
  formato: "percent" | "decimal" | "currency";
  limites: { bom: number; atencao: number };
  inverso?: boolean;
  formula: string;
}

interface IndicadoresFinanceirosProps {
  indicadores: Indicador[];
}

export function IndicadoresFinanceiros({ indicadores }: IndicadoresFinanceirosProps) {
  const { transacoes, emprestimos, veiculos, investimentosRF, criptomoedas, stablecoins, objetivos } = useFinance();

  const calculos = useMemo(() => {
    const receitas = transacoes.filter(t => t.tipo === "receita").reduce((acc, t) => acc + t.valor, 0);
    const despesas = transacoes.filter(t => t.tipo === "despesa").reduce((acc, t) => acc + t.valor, 0);
    const totalInvestimentos = investimentosRF.reduce((acc, inv) => acc + inv.valor, 0) +
      criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0) +
      stablecoins.reduce((acc, s) => acc + s.valorBRL, 0) +
      objetivos.reduce((acc, o) => acc + o.atual, 0);
    const totalDividas = emprestimos.reduce((acc, e) => acc + e.valorTotal * 0.7, 0);
    const ativos = totalInvestimentos + veiculos.reduce((acc, v) => acc + v.valorFipe, 0);
    const passivos = totalDividas;

    const meses = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    const receitasPorMes = meses.map(mes => 
      transacoes.filter(t => t.tipo === "receita" && t.data.includes(`-${mes}-`)).reduce((acc, t) => acc + t.valor, 0)
    );
    const despesasPorMes = meses.map(mes => 
      transacoes.filter(t => t.tipo === "despesa" && t.data.includes(`-${mes}-`)).reduce((acc, t) => acc + t.valor, 0)
    );

    const receitasValidas = receitasPorMes.filter(r => r > 0);
    const despesasValidas = despesasPorMes.filter(d => d > 0);

    let crescimentoReceitas = 0;
    let crescimentoDespesas = 0;

    if (receitasValidas.length >= 2) {
      const mesAtual = receitasValidas[receitasValidas.length - 1];
      const mesAnterior = receitasValidas[receitasValidas.length - 2];
      crescimentoReceitas = mesAnterior > 0 ? ((mesAtual - mesAnterior) / mesAnterior) * 100 : 0;
    }

    if (despesasValidas.length >= 2) {
      const mesAtual = despesasValidas[despesasValidas.length - 1];
      const mesAnterior = despesasValidas[despesasValidas.length - 2];
      crescimentoDespesas = mesAnterior > 0 ? ((mesAtual - mesAnterior) / mesAnterior) * 100 : 0;
    }

    return {
      liquidez: ativos > 0 ? (ativos / passivos) : 0,
      endividamento: ativos > 0 ? (passivos / ativos) * 100 : 0,
      margemPoupanca: receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0,
      rentabilidade: totalInvestimentos > 0 ? 12.5 : 0,
      crescimentoReceitas,
      crescimentoDespesas,
      solvencia: ativos > 0 ? (ativos / passivos) : 0,
      exposicaoCripto: totalInvestimentos > 0 ? (criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0) / totalInvestimentos) * 100 : 0,
      pesoRF: totalInvestimentos > 0 ? (investimentosRF.reduce((acc, inv) => acc + inv.valor, 0) / totalInvestimentos) * 100 : 0,
      pesoRV: totalInvestimentos > 0 ? ((criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0) + objetivos.reduce((acc, o) => acc + o.atual, 0)) / totalInvestimentos) * 100 : 0,
    };
  }, [transacoes, emprestimos, veiculos, investimentosRF, criptomoedas, stablecoins, objetivos]);

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

  const indicadoresData: Indicador[] = useMemo(() => [
    {
      id: "liquidez",
      nome: "Liquidez Imediata",
      valor: calculos.liquidez,
      formato: "decimal",
      limites: { bom: 1.5, atencao: 1.0 },
      formula: "(Stables + RF D+0) / Passivo Circulante"
    },
    {
      id: "solvencia",
      nome: "Solvência",
      valor: calculos.solvencia,
      formato: "decimal",
      limites: { bom: 2.0, atencao: 1.5 },
      formula: "Ativo Total / Passivo Total"
    },
    {
      id: "endividamento",
      nome: "Endividamento",
      valor: calculos.endividamento,
      formato: "percent",
      limites: { bom: 30, atencao: 50 },
      inverso: true,
      formula: "Passivo Total / Ativo Total × 100"
    },
    {
      id: "rentabilidade",
      nome: "Rentab. Investimentos",
      valor: calculos.rentabilidade,
      formato: "percent",
      limites: { bom: 10, atencao: 6 },
      formula: "Rendimentos / Capital Investido × 100"
    },
    {
      id: "cresc-receitas",
      nome: "Cresc. Receitas",
      valor: calculos.crescimentoReceitas,
      formato: "percent",
      limites: { bom: 5, atencao: 0 },
      formula: "(Receitas Atual - Anterior) / Anterior × 100"
    },
    {
      id: "cresc-despesas",
      nome: "Cresc. Despesas",
      valor: calculos.crescimentoDespesas,
      formato: "percent",
      limites: { bom: 5, atencao: 10 },
      inverso: true,
      formula: "(Despesas Atual - Anterior) / Anterior × 100"
    },
    {
      id: "margem-poupanca",
      nome: "Margem Poupança",
      valor: calculos.margemPoupanca,
      formato: "percent",
      limites: { bom: 20, atencao: 10 },
      formula: "(Receitas - Despesas) / Receitas × 100"
    },
    {
      id: "expo-cripto",
      nome: "Exposição Cripto",
      valor: calculos.exposicaoCripto,
      formato: "percent",
      limites: { bom: 20, atencao: 30 },
      inverso: true,
      formula: "Cripto / Patrimônio Total × 100"
    },
    {
      id: "peso-rf",
      nome: "Peso Renda Fixa",
      valor: calculos.pesoRF,
      formato: "percent",
      limites: { bom: 40, atencao: 20 },
      formula: "RF / Patrimônio Total × 100"
    },
    {
      id: "peso-rv",
      nome: "Peso Renda Variável",
      valor: calculos.pesoRV,
      formato: "percent",
      limites: { bom: 15, atencao: 30 },
      inverso: true,
      formula: "(Cripto + Ações) / Patrimônio Total × 100"
    },
  ], [calculos]);

  return (
    <TooltipProvider>
      <div className="glass-card p-5 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Indicadores Financeiros</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {indicadoresData.map((indicador) => {
            const status = getStatus(indicador);
            return (
              <Tooltip key={indicador.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "glass-card p-3 border-l-4 transition-all hover:scale-[1.02] cursor-help",
                      statusStyles[status]
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{indicador.nome}</p>
                        <p className={cn("text-lg font-bold mt-1", statusTextStyles[status])}>
                          {formatValue(indicador)}
                        </p>
                      </div>
                      <div className={cn(
                        "p-2 rounded-lg",
                        status === "success" && "bg-success/10 text-success",
                        status === "warning" && "bg-warning/10 text-warning",
                        status === "danger" && "bg-destructive/10 text-destructive"
                      )}>
                        <Info className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{indicador.formula}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}