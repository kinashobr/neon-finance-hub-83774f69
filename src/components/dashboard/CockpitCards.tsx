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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
    },
    {
      id: 'liquidez',
      title: 'Liquidez Imediata',
      value: formatCurrency(data.liquidezImediata),
      icon: Droplets,
      color: 'text-info',
      bgColor: 'bg-info', // Aumentado para 50% de opacidade
      status: data.liquidezImediata > 0 ? 'info' : 'danger',
    },
    {
      id: 'compromissos',
      title: 'Compromissos do Mês',
      value: formatCurrency(data.compromissosMes),
      icon: CalendarClock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      status: 'warning',
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
    },
  ];
  
  const statusColors = {
    success: "border-l-success",
    warning: "border-l-warning",
    danger: "border-l-destructive",
    neutral: "border-l-primary",
    info: "border-l-neon-cyan",
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className={cn(
            "glass-card p-4 flex flex-col gap-2 transition-all hover:scale-[1.02] border-l-4",
            statusColors[card.status as keyof typeof statusColors]
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide whitespace-normal">
              {card.title}
            </span>
            <div className={cn("p-2 rounded-xl", card.bgColor)}>
              <card.icon className={cn("h-5 w-5", card.color)} />
            </div>
          </div>
          
          <div className="flex flex-col">
            <span className={cn("text-xl font-bold whitespace-nowrap", card.color)}>
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
      ))}
    </div>
  );
}