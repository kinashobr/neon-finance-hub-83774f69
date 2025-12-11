import { useState } from "react";
import { 
  Wallet, TrendingUp, TrendingDown, CreditCard, PiggyBank, 
  LineChart, ArrowUpDown, Receipt, DollarSign, Eye, EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LineChart as ReLineChart, Line, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface CardData {
  id: string;
  title: string;
  value: number;
  change?: number;
  icon: React.ElementType;
  variant: "positive" | "negative" | "neutral" | "warning";
  sparkline?: number[];
  tooltip: string;
}

interface PatrimonioCardsProps {
  data: {
    patrimonioTotal: number;
    saldoCaixa: number;
    investimentosTotal: number;
    dividasTotal: number;
    patrimonioLiquido: number;
    variacaoMes: number;
    fluxoCaixa: number;
    gastosMes: number;
    receitasMes: number;
  };
}

const generateSparkline = (base: number, variance: number = 0.1) => {
  return Array.from({ length: 7 }, () => base * (1 + (Math.random() - 0.5) * variance));
};

export function PatrimonioCards({ data }: PatrimonioCardsProps) {
  const [hiddenCards, setHiddenCards] = useState<Set<string>>(new Set());

  const cards: CardData[] = [
    {
      id: "saldo-caixa",
      title: "Saldo em Caixa",
      value: data.saldoCaixa,
      change: -2.1,
      icon: DollarSign,
      variant: data.saldoCaixa >= 0 ? "positive" : "negative",
      sparkline: generateSparkline(Math.abs(data.saldoCaixa), 0.2),
      tooltip: "Saldo disponível em todas as contas movimento"
    },
    {
      id: "receitas-mes",
      title: "Receitas do Mês",
      value: data.receitasMes,
      icon: Receipt,
      variant: "positive",
      sparkline: generateSparkline(data.receitasMes || 1, 0.1),
      tooltip: "Total de receitas no mês corrente"
    },
    {
      id: "gastos-mes",
      title: "Despesas do Mês",
      value: data.gastosMes,
      icon: TrendingDown,
      variant: "negative",
      sparkline: generateSparkline(data.gastosMes || 1, 0.15),
      tooltip: "Total de despesas no mês corrente"
    },
    {
      id: "fluxo-caixa",
      title: "Balanço do Mês",
      value: data.fluxoCaixa,
      icon: TrendingUp,
      variant: data.fluxoCaixa >= 0 ? "positive" : "negative",
      sparkline: generateSparkline(Math.abs(data.fluxoCaixa) || 1, 0.3),
      tooltip: "Receitas - Despesas do mês atual"
    },
  ];

  const toggleVisibility = (cardId: string) => {
    setHiddenCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const formatValue = (card: CardData) => {
    if (card.id === "variacao-mes") {
      return `${card.value >= 0 ? "+" : ""}${card.value.toFixed(1)}%`;
    }
    return `R$ ${card.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case "positive": return "border-l-4 border-l-success";
      case "negative": return "border-l-4 border-l-destructive";
      case "warning": return "border-l-4 border-l-warning";
      default: return "border-l-4 border-l-primary";
    }
  };

  const getSparklineColor = (variant: string) => {
    switch (variant) {
      case "positive": return "hsl(142, 76%, 36%)";
      case "negative": return "hsl(0, 72%, 51%)";
      case "warning": return "hsl(38, 92%, 50%)";
      default: return "hsl(199, 89%, 48%)";
    }
  };

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className={cn(
              "glass-card p-4 animate-fade-in relative group",
              getVariantStyles(card.variant)
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Action buttons */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleVisibility(card.id)}
                  >
                    {hiddenCards.has(card.id) ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {hiddenCards.has(card.id) ? "Mostrar valor" : "Ocultar valor"}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                "p-2 rounded-lg",
                card.variant === "positive" && "bg-success/20 text-success",
                card.variant === "negative" && "bg-destructive/20 text-destructive",
                card.variant === "warning" && "bg-warning/20 text-warning",
                card.variant === "neutral" && "bg-primary/20 text-primary"
              )}>
                <card.icon className="h-4 w-4" />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground cursor-help truncate">
                    {card.title}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {card.tooltip}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Value */}
            <div className="text-xl font-bold text-foreground mb-1">
              {hiddenCards.has(card.id) ? "••••••" : formatValue(card)}
            </div>

            {/* Change indicator */}
            {card.change !== undefined && (
              <div className={cn(
                "text-xs flex items-center gap-1",
                card.change >= 0 ? "text-success" : "text-destructive"
              )}>
                {card.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {card.change >= 0 ? "+" : ""}{card.change.toFixed(1)}% vs mês anterior
              </div>
            )}

            {/* Sparkline */}
            {card.sparkline && (
              <div className="h-8 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ReLineChart data={card.sparkline.map((v, i) => ({ value: v, index: i }))}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={getSparklineColor(card.variant)}
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </ReLineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}