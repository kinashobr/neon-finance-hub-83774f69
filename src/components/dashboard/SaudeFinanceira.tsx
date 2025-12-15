import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  Wallet,
  Scale,
  Activity,
  Briefcase,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define o tipo de status esperado pelo IndicatorBadge
type IndicatorStatus = 'otimo' | 'bom' | 'atencao' | 'critico';

interface IndicadorSaude {
  id: string;
  nome: string;
  valor: number;
  status: IndicatorStatus;
  descricao: string;
}

interface SaudeFinanceiraProps {
  liquidez: number; // Liquidez Geral (Ativo Total / Passivo Total)
  endividamento: number; // percentual (Passivo Total / Ativo Total)
  diversificacao: number; // percentual (0-100, quanto mais diversificado melhor)
  estabilidadeFluxo: number; // percentual de meses positivos
  dependenciaRenda: number; // Comprometimento Fixo (Despesas Fixas / Receitas Totais)
}

const statusConfig = {
  otimo: { color: 'text-success', bgColor: 'bg-success/20', icon: CheckCircle2, label: 'Ótimo' },
  bom: { color: 'text-info', bgColor: 'bg-info/20', icon: Shield, label: 'Bom' },
  atencao: { color: 'text-warning', bgColor: 'bg-warning/20', icon: AlertTriangle, label: 'Atenção' },
  critico: { color: 'text-destructive', bgColor: 'bg-destructive/20', icon: XCircle, label: 'Crítico' },
};

export function SaudeFinanceira({
  liquidez,
  endividamento,
  diversificacao,
  estabilidadeFluxo,
  dependenciaRenda,
}: SaudeFinanceiraProps) {
  
  const getStatusLiquidez = (valor: number): IndicatorStatus => {
    // Liquidez Geral (Ativo Total / Passivo Total)
    if (valor >= 2.0) return 'otimo';
    if (valor >= 1.5) return 'bom';
    if (valor >= 1.0) return 'atencao';
    return 'critico';
  };

  const getStatusEndividamento = (valor: number): IndicatorStatus => {
    // Endividamento (Passivo Total / Ativo Total * 100)
    if (valor <= 20) return 'otimo';
    if (valor <= 35) return 'bom';
    if (valor <= 50) return 'atencao';
    return 'critico';
  };

  const getStatusDiversificacao = (valor: number): IndicatorStatus => {
    if (valor >= 70) return 'otimo';
    if (valor >= 50) return 'bom';
    if (valor >= 30) return 'atencao';
    return 'critico';
  };

  const getStatusEstabilidade = (valor: number): IndicatorStatus => {
    if (valor >= 80) return 'otimo';
    if (valor >= 60) return 'bom';
    if (valor >= 40) return 'atencao';
    return 'critico';
  };

  const getStatusDependencia = (valor: number): IndicatorStatus => {
    // Comprometimento Fixo (Despesas Fixas / Receitas Totais * 100)
    if (valor <= 40) return 'otimo';
    if (valor <= 60) return 'bom';
    if (valor <= 80) return 'atencao';
    return 'critico';
  };
  
  const formatRatio = (value: number) => value >= 999 ? "∞" : `${value.toFixed(2)}x`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const getIndicatorDetails = (id: string, status: IndicatorStatus, rawValue: number): { description: string, recommendation: string } => {
    switch (id) {
      case 'liquidez':
        const ratio = formatRatio(rawValue);
        if (status === 'otimo' || status === 'bom') {
          return {
            description: `Seus ativos cobrem seus passivos ${ratio} vezes.`,
            recommendation: "Excelente cobertura de dívidas. Mantenha a reserva de emergência robusta."
          };
        } else if (status === 'atencao') {
          return {
            description: `Seus ativos cobrem seus passivos ${ratio} vezes. O limite é 1.0x.`,
            recommendation: "A liquidez está próxima do limite. Considere aumentar a reserva de emergência."
          };
        } else {
          return {
            description: `Seus ativos cobrem seus passivos apenas ${ratio} vezes.`,
            recommendation: "Risco alto! Seus ativos não cobrem seus passivos. Priorize a redução de dívidas."
          };
        }
      case 'endividamento':
        const debtPercent = formatPercent(rawValue);
        if (status === 'otimo' || status === 'bom') {
          return {
            description: `Apenas ${debtPercent} dos seus ativos são financiados por dívidas.`,
            recommendation: "Nível de dívida saudável. Continue monitorando e evite alavancagem excessiva."
          };
        } else if (status === 'atencao') {
          return {
            description: `Cerca de ${debtPercent} dos seus ativos são dívidas.`,
            recommendation: "O endividamento está moderado. Evite novas dívidas de longo prazo e foque na amortização."
          };
        } else {
          return {
            description: `Mais de ${debtPercent} dos seus ativos são dívidas.`,
            recommendation: "Nível de dívida perigoso. Priorize a amortização do principal e renegocie taxas."
          };
        }
      case 'diversificacao':
        const divPercent = formatPercent(rawValue);
        if (status === 'otimo' || status === 'bom') {
          return {
            description: `Sua carteira está ${divPercent} diversificada.`,
            recommendation: "Boa distribuição de ativos. Revise a alocação periodicamente para manter o equilíbrio."
          };
        } else if (status === 'atencao') {
          return {
            description: `Sua carteira está ${divPercent} diversificada.`,
            recommendation: "Aumente a exposição a diferentes classes de ativos para reduzir riscos de concentração."
          };
        } else {
          return {
            description: `Sua carteira está apenas ${divPercent} diversificada.`,
            recommendation: "Alta concentração de risco. Diversifique imediatamente, especialmente em ativos voláteis."
          };
        }
      case 'estabilidade':
        const stabPercent = formatPercent(rawValue);
        if (status === 'otimo' || status === 'bom') {
          return {
            description: `${stabPercent} dos últimos 6 meses tiveram saldo positivo.`,
            recommendation: "Fluxo de caixa consistente. Excelente previsibilidade financeira."
          };
        } else if (status === 'atencao') {
          return {
            description: `${stabPercent} dos últimos 6 meses tiveram saldo positivo.`,
            recommendation: "O fluxo é instável. Crie um orçamento mais rígido para despesas variáveis e monitore receitas."
          };
        } else {
          return {
            description: `${stabPercent} dos últimos 6 meses tiveram saldo positivo.`,
            recommendation: "Fluxo muito volátil. Identifique e estabilize as fontes de receita ou corte despesas essenciais."
          };
        }
      case 'dependencia':
        const depPercent = formatPercent(rawValue);
        if (status === 'otimo' || status === 'bom') {
          return {
            description: `Apenas ${depPercent} da sua receita é comprometida com despesas fixas.`,
            recommendation: "Baixa rigidez orçamentária. Seus custos fixos são controláveis."
          };
        } else if (status === 'atencao') {
          return {
            description: `${depPercent} da sua receita é comprometida com despesas fixas.`,
            recommendation: "A rigidez é alta. Procure reduzir despesas fixas ou aumentar a renda para criar mais folga."
          };
        } else {
          return {
            description: `Mais de ${depPercent} da sua receita é comprometida com despesas fixas.`,
            recommendation: "Risco de insolvência em caso de perda de renda. Reduza custos fixos drasticamente."
          };
        }
      default:
        return { description: '', recommendation: '' };
    }
  };

  const indicadores: (IndicadorSaude & { icon: React.ElementType, rawValue: number, displayValue: string })[] = [
    {
      id: 'liquidez',
      nome: 'Liquidez Geral',
      rawValue: liquidez,
      displayValue: formatRatio(liquidez),
      valor: Math.min(liquidez * 50, 100), // normalizar para 0-100 (assumindo 2.0 = 100%)
      status: getStatusLiquidez(liquidez),
      descricao: liquidez >= 1.5 ? 'Ativos cobrem passivos adequadamente' : 'Atenção à cobertura de dívidas',
      icon: Wallet,
    },
    {
      id: 'endividamento',
      nome: 'Endividamento',
      rawValue: endividamento,
      displayValue: formatPercent(endividamento),
      valor: 100 - Math.min(endividamento, 100), // inverter (menos dívida = melhor)
      status: getStatusEndividamento(endividamento),
      descricao: endividamento <= 35 ? 'Dívidas sob controle' : 'Dívidas elevadas',
      icon: Scale,
    },
    {
      id: 'diversificacao',
      nome: 'Diversificação',
      rawValue: diversificacao,
      displayValue: formatPercent(diversificacao),
      valor: diversificacao,
      status: getStatusDiversificacao(diversificacao),
      descricao: diversificacao >= 50 ? 'Carteira diversificada' : 'Concentração elevada',
      icon: TrendingUp,
    },
    {
      id: 'estabilidade',
      nome: 'Estabilidade Fluxo',
      rawValue: estabilidadeFluxo,
      displayValue: formatPercent(estabilidadeFluxo),
      valor: estabilidadeFluxo,
      status: getStatusEstabilidade(estabilidadeFluxo),
      descricao: estabilidadeFluxo >= 60 ? 'Fluxo mensal estável' : 'Fluxo instável',
      icon: Activity,
    },
    {
      id: 'dependencia',
      nome: 'Comprometimento Fixo',
      rawValue: dependenciaRenda,
      displayValue: formatPercent(dependenciaRenda),
      valor: 100 - Math.min(dependenciaRenda, 100), // inverter (menos % fixo = melhor)
      status: getStatusDependencia(dependenciaRenda),
      descricao: dependenciaRenda <= 60 ? 'Custos fixos sob controle' : 'Alta rigidez orçamentária',
      icon: Briefcase,
    },
  ];

  // Calcular score geral
  const scoreGeral = indicadores.reduce((acc, ind) => acc + ind.valor, 0) / indicadores.length;
  const statusGeral = scoreGeral >= 75 ? 'otimo' : scoreGeral >= 55 ? 'bom' : scoreGeral >= 35 ? 'atencao' : 'critico';
  const configGeral = statusConfig[statusGeral];
  const IconGeral = configGeral.icon;

  return (
    <TooltipProvider>
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Saúde Financeira</h3>
            <p className="text-xs text-muted-foreground">Indicadores sintéticos</p>
          </div>
          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full", configGeral.bgColor)}>
            <IconGeral className={cn("h-3.5 w-3.5", configGeral.color)} />
            <span className={cn("text-xs font-semibold", configGeral.color)}>
              {configGeral.label}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {indicadores.map((ind) => {
            const config = statusConfig[ind.status];
            const details = getIndicatorDetails(ind.id, ind.status, ind.rawValue);
            
            return (
              <Tooltip key={ind.id}>
                <TooltipTrigger asChild>
                  <div className="space-y-1.5 cursor-help">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ind.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{ind.nome}</span>
                      </div>
                      <div className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        config.bgColor,
                        config.color
                      )}>
                        {config.label} ({ind.displayValue})
                      </div>
                    </div>
                    
                    {/* Barra de progresso visual */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            ind.status === 'otimo' && "bg-success",
                            ind.status === 'bom' && "bg-info",
                            ind.status === 'atencao' && "bg-warning",
                            ind.status === 'critico' && "bg-destructive",
                          )}
                          style={{ width: `${ind.valor}%` }}
                        />
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">{ind.descricao}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-4 space-y-2 bg-popover border-border">
                  <div className="flex items-center gap-2 font-semibold text-foreground border-b pb-2">
                    <Info className="w-4 h-4 text-primary" />
                    {ind.nome}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Status: <span className={cn("font-medium", config.color)}>{config.label}</span></p>
                    <p className="text-sm text-foreground">{details.description}</p>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Recomendação:</p>
                    <p className="text-sm text-primary">{details.recommendation}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}