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

interface IndicadorSaude {
  id: string;
  nome: string;
  valor: number;
  status: 'otimo' | 'bom' | 'atencao' | 'critico';
  descricao: string;
  valorBruto: number; // Valor real do indicador (ex: 1.5x, 30%)
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
  
  const getStatusLiquidez = (valor: number): IndicadorSaude['status'] => {
    if (valor >= 2.0) return 'otimo';
    if (valor >= 1.5) return 'bom';
    if (valor >= 1.0) return 'atencao';
    return 'critico';
  };

  const getStatusEndividamento = (valor: number): IndicadorSaude['status'] => {
    if (valor <= 20) return 'otimo';
    if (valor <= 35) return 'bom';
    if (valor <= 50) return 'atencao';
    return 'critico';
  };

  const getStatusDiversificacao = (valor: number): IndicadorSaude['status'] => {
    if (valor >= 70) return 'otimo';
    if (valor >= 50) return 'bom';
    if (valor >= 30) return 'atencao';
    return 'critico';
  };

  const getStatusEstabilidade = (valor: number): IndicadorSaude['status'] => {
    if (valor >= 80) return 'otimo';
    if (valor >= 60) return 'bom';
    if (valor >= 40) return 'atencao';
    return 'critico';
  };

  const getStatusDependencia = (valor: number): IndicadorSaude['status'] => {
    if (valor <= 40) return 'otimo';
    if (valor <= 60) return 'bom';
    if (valor <= 80) return 'atencao';
    return 'critico';
  };
  
  const getLiquidezTooltip = (status: IndicadorSaude['status'], valor: number) => {
    const ratio = valor.toFixed(2);
    switch (status) {
      case 'otimo': return {
        title: `Liquidez de ${ratio}x (Excelente)`,
        recommendation: "Seus ativos cobrem suas dívidas mais de duas vezes. Mantenha o foco na rentabilidade.",
        ideal: "Ideal: > 2.0x"
      };
      case 'bom': return {
        title: `Liquidez de ${ratio}x (Bom)`,
        recommendation: "A cobertura de dívidas é sólida. Considere aumentar a reserva de emergência para maior segurança.",
        ideal: "Ideal: > 2.0x"
      };
      case 'atencao': return {
        title: `Liquidez de ${ratio}x (Atenção)`,
        recommendation: "A cobertura está próxima de 1:1. Evite novas dívidas e priorize a alocação em ativos líquidos.",
        ideal: "Ideal: > 2.0x"
      };
      case 'critico': return {
        title: `Liquidez de ${ratio}x (Crítico)`,
        recommendation: "Seus passivos superam seus ativos. Priorize a quitação de dívidas de alto custo (empréstimos e cartões).",
        ideal: "Ideal: > 2.0x"
      };
    }
  };
  
  const getEndividamentoTooltip = (status: IndicadorSaude['status'], valor: number) => {
    const percent = valor.toFixed(1);
    switch (status) {
      case 'otimo': return {
        title: `Endividamento de ${percent}% (Excelente)`,
        recommendation: "Seu nível de dívida é muito baixo. Você tem grande capacidade de alavancagem, se necessário.",
        ideal: "Ideal: < 20%"
      };
      case 'bom': return {
        title: `Endividamento de ${percent}% (Bom)`,
        recommendation: "O nível de dívida é saudável. Mantenha o controle e evite que o percentual suba.",
        ideal: "Ideal: < 20%"
      };
      case 'atencao': return {
        title: `Endividamento de ${percent}% (Atenção)`,
        recommendation: "Quase metade dos seus ativos são financiados por dívidas. Revise o custo dos seus empréstimos.",
        ideal: "Ideal: < 20%"
      };
      case 'critico': return {
        title: `Endividamento de ${percent}% (Crítico)`,
        recommendation: "Mais da metade dos seus ativos são dívidas. Foco total na redução do principal de empréstimos.",
        ideal: "Ideal: < 20%"
      };
    }
  };
  
  const getDiversificacaoTooltip = (status: IndicadorSaude['status'], valor: number) => {
    const percent = valor.toFixed(0);
    switch (status) {
      case 'otimo': return {
        title: `Diversificação de ${percent}% (Excelente)`,
        recommendation: "Sua carteira está bem distribuída. Continue explorando diferentes classes de ativos.",
        ideal: "Ideal: > 70%"
      };
      case 'bom': return {
        title: `Diversificação de ${percent}% (Bom)`,
        recommendation: "Boa distribuição. Certifique-se de que a alocação está alinhada com seus objetivos de risco.",
        ideal: "Ideal: > 70%"
      };
      case 'atencao': return {
        title: `Diversificação de ${percent}% (Atenção)`,
        recommendation: "A concentração em poucas classes de ativos é alta. Considere alocar capital em áreas menos representadas.",
        ideal: "Ideal: > 70%"
      };
      case 'critico': return {
        title: `Diversificação de ${percent}% (Crítico)`,
        recommendation: "Risco de concentração muito alto. Diversificar é a prioridade para proteger o patrimônio.",
        ideal: "Ideal: > 70%"
      };
    }
  };
  
  const getEstabilidadeTooltip = (status: IndicadorSaude['status'], valor: number) => {
    const percent = valor.toFixed(0);
    switch (status) {
      case 'otimo': return {
        title: `Estabilidade de ${percent}% (Excelente)`,
        recommendation: "Seu fluxo de caixa é altamente previsível e positivo. Você pode planejar investimentos de longo prazo com segurança.",
        ideal: "Ideal: > 80%"
      };
      case 'bom': return {
        title: `Estabilidade de ${percent}% (Bom)`,
        recommendation: "O fluxo é majoritariamente positivo. Revise os meses negativos para identificar despesas pontuais.",
        ideal: "Ideal: > 80%"
      };
      case 'atencao': return {
        title: `Estabilidade de ${percent}% (Atenção)`,
        recommendation: "O fluxo é instável. Crie um orçamento mais rígido para garantir que as receitas superem as despesas consistentemente.",
        ideal: "Ideal: > 80%"
      };
      case 'critico': return {
        title: `Estabilidade de ${percent}% (Crítico)`,
        recommendation: "O fluxo é negativo na maioria dos meses. É urgente aumentar as receitas ou cortar despesas variáveis.",
        ideal: "Ideal: > 80%"
      };
    }
  };
  
  const getDependenciaTooltip = (status: IndicadorSaude['status'], valor: number) => {
    const percent = valor.toFixed(1);
    switch (status) {
      case 'otimo': return {
        title: `Comprometimento Fixo de ${percent}% (Excelente)`,
        recommendation: "Seus custos fixos são baixos. Você tem grande flexibilidade para lidar com imprevistos.",
        ideal: "Ideal: < 40%"
      };
      case 'bom': return {
        title: `Comprometimento Fixo de ${percent}% (Bom)`,
        recommendation: "O nível é bom. Mantenha a vigilância para evitar o aumento de despesas fixas (assinaturas, parcelas).",
        ideal: "Ideal: < 40%"
      };
      case 'atencao': return {
        title: `Comprometimento Fixo de ${percent}% (Atenção)`,
        recommendation: "A rigidez orçamentária é alta. Procure reduzir ou renegociar despesas fixas não essenciais.",
        ideal: "Ideal: < 40%"
      };
      case 'critico': return {
        title: `Comprometimento Fixo de ${percent}% (Crítico)`,
        recommendation: "A maior parte da sua renda está comprometida com custos fixos. Isso limita sua capacidade de poupar e investir.",
        ideal: "Ideal: < 40%"
      };
    }
  };


  const indicadores: (IndicadorSaude & { icon: React.ElementType, getTooltip: (status: IndicadorSaude['status'], valor: number) => { title: string; recommendation: string; ideal: string } })[] = [
    {
      id: 'liquidez',
      nome: 'Liquidez Geral',
      valor: Math.min(liquidez * 50, 100),
      status: getStatusLiquidez(liquidez),
      descricao: liquidez >= 1.5 ? 'Ativos cobrem passivos adequadamente' : 'Atenção à cobertura de dívidas',
      valorBruto: liquidez,
      icon: Wallet,
      getTooltip: getLiquidezTooltip,
    },
    {
      id: 'endividamento',
      nome: 'Endividamento',
      valor: 100 - Math.min(endividamento, 100),
      status: getStatusEndividamento(endividamento),
      descricao: endividamento <= 35 ? 'Dívidas sob controle' : 'Dívidas elevadas',
      valorBruto: endividamento,
      icon: Scale,
      getTooltip: getEndividamentoTooltip,
    },
    {
      id: 'diversificacao',
      nome: 'Diversificação',
      valor: diversificacao,
      status: getStatusDiversificacao(diversificacao),
      descricao: diversificacao >= 50 ? 'Carteira diversificada' : 'Concentração elevada',
      valorBruto: diversificacao,
      icon: TrendingUp,
      getTooltip: getDiversificacaoTooltip,
    },
    {
      id: 'estabilidade',
      nome: 'Estabilidade Fluxo',
      valor: estabilidadeFluxo,
      status: getStatusEstabilidade(estabilidadeFluxo),
      descricao: estabilidadeFluxo >= 60 ? 'Fluxo mensal estável' : 'Fluxo instável',
      valorBruto: estabilidadeFluxo,
      icon: Activity,
      getTooltip: getEstabilidadeTooltip,
    },
    {
      id: 'dependencia',
      nome: 'Comprometimento Fixo',
      valor: 100 - Math.min(dependenciaRenda, 100),
      status: getStatusDependencia(dependenciaRenda),
      descricao: dependenciaRenda <= 60 ? 'Custos fixos sob controle' : 'Alta rigidez orçamentária',
      valorBruto: dependenciaRenda,
      icon: Briefcase,
      getTooltip: getDependenciaTooltip,
    },
  ];

  // Calcular score geral
  const scoreGeral = indicadores.reduce((acc, ind) => acc + ind.valor, 0) / indicadores.length;
  const statusGeral = scoreGeral >= 75 ? 'otimo' : scoreGeral >= 55 ? 'bom' : scoreGeral >= 35 ? 'atencao' : 'critico';
  const configGeral = statusConfig[statusGeral];
  const IconGeral = configGeral.icon;

  return (
    <TooltipProvider>
      <div className="glass-card p-4 md:p-5">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-foreground">Saúde Financeira</h3>
            <p className="text-xs text-muted-foreground">Indicadores sintéticos</p>
          </div>
          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full", configGeral.bgColor)}>
            <IconGeral className={cn("h-3.5 w-3.5", configGeral.color)} />
            <span className={cn("text-xs font-semibold", configGeral.color)}>
              {configGeral.label}
            </span>
          </div>
        </div>

        <div className="space-y-2 md:space-y-3">
          {indicadores.map((ind) => {
            const config = statusConfig[ind.status];
            const tooltipData = ind.getTooltip(ind.status, ind.valorBruto);
            
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
                        {config.label}
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
                <TooltipContent className="max-w-xs sidebar-tooltip p-3 space-y-2">
                  <div className="flex items-center gap-2 border-b pb-1">
                    <Info className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">{tooltipData.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tooltipData.recommendation}
                  </p>
                  <div className="text-xs pt-1 border-t border-border/50">
                    <span className="font-medium text-primary">Referência:</span> {tooltipData.ideal}
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