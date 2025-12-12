import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CalendarClock,
  ArrowUpRight,
  ArrowDownRight,
  Target
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
    },
    {
      id: 'variacao',
      title: 'Variação do Período',
      value: formatCurrency(Math.abs(data.variacaoPatrimonio)),
      subtitle: `${isPositiveVariation ? '+' : '-'}${Math.abs(data.variacaoPercentual).toFixed(1)}%`,
      icon: isPositiveVariation ? TrendingUp : TrendingDown,
      color: isPositiveVariation ? 'text-success' : 'text-destructive',
      bgColor: isPositiveVariation ? 'bg-success/10' : 'bg-destructive/10',
      trend: isPositiveVariation ? 'up' : 'down',
    },
    {
      id: 'liquidez',
      title: 'Liquidez Imediata',
      value: formatCurrency(data.liquidezImediata),
      icon: Wallet,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      id: 'compromissos',
      title: 'Compromissos do Mês',
      value: formatCurrency(data.compromissosMes),
      icon: CalendarClock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      id: 'projecao',
      title: 'Projeção 30 Dias',
      value: formatCurrency(Math.abs(data.projecao30Dias)),
      icon: isPositiveProjection ? ArrowUpRight : ArrowDownRight,
      color: isPositiveProjection ? 'text-success' : 'text-destructive',
      bgColor: isPositiveProjection ? 'bg-success/10' : 'bg-destructive/10',
      trend: isPositiveProjection ? 'up' : 'down',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className="glass-card p-4 flex flex-col gap-2 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {card.title}
            </span>
            <div className={cn("p-1.5 rounded-md", card.bgColor)}>
              <card.icon className={cn("h-3.5 w-3.5", card.color)} />
            </div>
          </div>
          
          <div className="flex items-end justify-between gap-2">
            <span className={cn("text-lg font-bold", card.trend ? card.color : "text-foreground")}>
              {card.trend === 'down' && '-'}
              {card.trend === 'up' && '+'}
              {card.value}
            </span>
            {card.subtitle && (
              <span className={cn("text-xs font-medium", card.color)}>
                {card.subtitle}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}