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
  valorBruto: number;
}

interface SaudeFinanceiraProps {
  liquidez: number;
  endividamento: number;
  diversificacao: number;
  estabilidadeFluxo: number;
  dependenciaRenda: number;
}

const statusConfig = {
  otimo: { color: 'text-success', bgColor: 'bg-success/15', icon: CheckCircle2, label: 'Ótimo' },
  bom: { color: 'text-info', bgColor: 'bg-info/15', icon: Shield, label: 'Bom' },
  atencao: { color: 'text-warning', bgColor: 'bg-warning/15', icon: AlertTriangle, label: 'Atenção' },
  critico: { color: 'text-destructive', bgColor: 'bg-destructive/15', icon: XCircle, label: 'Crítico' },
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

  const indicadores: (IndicadorSaude & { icon: React.ElementType })[] = [
    {
      id: 'liquidez',
      nome: 'Liquidez',
      valor: Math.min(liquidez * 50, 100),
      status: getStatusLiquidez(liquidez),
      descricao: liquidez >= 1.5 ? 'Ativos cobrem passivos' : 'Atenção às dívidas',
      valorBruto: liquidez,
      icon: Wallet,
    },
    {
      id: 'endividamento',
      nome: 'Endividamento',
      valor: 100 - Math.min(endividamento, 100),
      status: getStatusEndividamento(endividamento),
      descricao: endividamento <= 35 ? 'Dívidas sob controle' : 'Dívidas elevadas',
      valorBruto: endividamento,
      icon: Scale,
    },
    {
      id: 'diversificacao',
      nome: 'Diversificação',
      valor: diversificacao,
      status: getStatusDiversificacao(diversificacao),
      descricao: diversificacao >= 50 ? 'Carteira diversificada' : 'Concentração elevada',
      valorBruto: diversificacao,
      icon: TrendingUp,
    },
    {
      id: 'estabilidade',
      nome: 'Estabilidade',
      valor: estabilidadeFluxo,
      status: getStatusEstabilidade(estabilidadeFluxo),
      descricao: estabilidadeFluxo >= 60 ? 'Fluxo estável' : 'Fluxo instável',
      valorBruto: estabilidadeFluxo,
      icon: Activity,
    },
    {
      id: 'dependencia',
      nome: 'Custos Fixos',
      valor: 100 - Math.min(dependenciaRenda, 100),
      status: getStatusDependencia(dependenciaRenda),
      descricao: dependenciaRenda <= 60 ? 'Controlados' : 'Alta rigidez',
      valorBruto: dependenciaRenda,
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
      <div className="glass-card p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-foreground">Saúde Financeira</h3>
            <p className="text-xs text-muted-foreground">Indicadores sintéticos</p>
          </div>
          <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full", configGeral.bgColor)}>
            <IconGeral className={cn("h-4 w-4", configGeral.color)} />
            <span className={cn("text-xs font-semibold", configGeral.color)}>
              {configGeral.label}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {indicadores.map((ind) => {
            const config = statusConfig[ind.status];
            
            return (
              <Tooltip key={ind.id}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-3 cursor-help">
                    <div className={cn("p-2 rounded-xl shrink-0", config.bgColor)}>
                      <ind.icon className={cn("h-4 w-4", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{ind.nome}</span>
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", config.bgColor, config.color)}>
                          {config.label}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
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
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs rounded-xl">
                  <p className="text-sm font-medium">{ind.nome}</p>
                  <p className="text-xs text-muted-foreground">{ind.descricao}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
