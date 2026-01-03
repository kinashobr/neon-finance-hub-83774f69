import { 
  TrendingUp, 
  TrendingDown, 
  CalendarClock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Target, 
  Droplets 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CockpitData {
  patrimonioTotal: number;
  variacaoPatrimonio: number;
  variacaoPercentual: number;
  liquidezImediata: number;
  compromissosMes: number;
  projecao30Dias: number;
}

interface CockpitCardsProps {
  data: CockpitData;
}

export function CockpitCards({ data }: CockpitCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const isPositiveVariation = data.variacaoPatrimonio >= 0;
  const isPositiveProjection = data.projecao30Dias >= 0;

  const cards = [
    {
      id: 'patrimonio',
      title: 'Patrimônio Total',
      value: formatCurrency(data.patrimonioTotal),
      icon: Target,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      status: data.patrimonioTotal >= 0 ? 'neutral' : 'danger',
      tooltip: 'Valor total dos ativos (contas, investimentos, veículos) menos o total dos passivos (dívidas, cartões, seguros a pagar).'
    },
    {
      id: 'variacao',
      title: 'Variação do Período',
      value: formatCurrency(Math.abs(data.variacaoPatrimonio)),
      subtitle: `${isPositiveVariation ? '+' : ''}${data.variacaoPercentual.toFixed(1)}%`,
      icon: isPositiveVariation ? TrendingUp : TrendingDown,
      color: isPositiveVariation ? 'text-success' : 'text-destructive',
      bgColor: isPositiveVariation ? 'bg-success/10' : 'bg-destructive/10',
      trend: isPositiveVariation ? 'up' : 'down',
      status: isPositiveVariation ? 'success' : 'danger',
      tooltip: 'Mudança líquida no patrimônio (Receitas - Despesas) comparada ao período anterior.'
    },
    {
      id: 'liquidez',
      title: 'Liquidez Imediata',
      value: formatCurrency(data.liquidezImediata),
      icon: Droplets,
      color: 'text-info',
      bgColor: 'bg-info/10', 
      status: data.liquidezImediata > 0 ? 'info' : 'danger',
      customBgStyle: { backgroundColor: 'hsl(var(--info) / 0.1)' },
      tooltip: 'Soma dos saldos em contas correntes, poupança, reserva de emergência e renda fixa de alta liquidez.'
    },
    {
      id: 'compromissos',
      title: 'Compromissos do Mês',
      value: formatCurrency(data.compromissosMes),
      icon: CalendarClock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      status: 'warning',
      tooltip: 'Total de despesas e parcelas de empréstimos registradas no período atual.'
    },
    {
      id: 'projecao',
      title: 'Projeção 30 Dias',
      value: formatCurrency(Math.abs(data.projecao30Dias)),
      icon: isPositiveProjection ? ArrowUpRight : ArrowDownRight,
      color: isPositiveProjection ? 'text-success' : 'text-destructive',
      bgColor: isPositiveProjection ? 'bg-success/10' : 'bg-destructive/10',
      trend: isPositiveProjection ? 'up' : 'down',
      status: isPositiveProjection ? 'success' : 'danger',
      tooltip: 'Estimativa do saldo líquido (Receitas - Despesas) projetado para os próximos 30 dias, baseada na média do período atual.'
    },
  ];
  
  const statusColors = {
    success: "stat-card-positive",
    warning: "stat-card-warning",
    danger: "stat-card-negative",
    neutral: "stat-card-neutral",
    info: "stat-card-info",
  };

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {cards.map((card) => (
          <Tooltip key={card.id}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "glass-card p-4 flex flex-col gap-2 transition-all hover:scale-[1.02] cursor-help",
                  statusColors[card.status as keyof typeof statusColors]
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide whitespace-normal">
                    {card.title}
                  </span>
                  <div 
                    className={cn("p-2 rounded-xl", card.bgColor)}
                    style={card.customBgStyle}
                  >
                    <card.icon className={cn("h-5 w-5", card.color)} />
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <span className={cn("text-lg md:text-xl font-bold", card.color)}>
                    {card.trend === 'down' && '-'}
                    {card.trend === 'up' && '+'}
                    {card.value}
                  </span>
                  {card.subtitle && (
                    <span className={cn("text-xs font-medium mt-1 whitespace-nowrap", card.color)}>
                      {card.subtitle}
                    </span>
                  )}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-popover border-border">
              <p className="text-sm">{card.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}