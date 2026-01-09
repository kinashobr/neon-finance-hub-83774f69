import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface BalanceHighlightCardProps {
  saldoTotal: number;
  variacao: number;
  variacaoPercent: number;
}

export function BalanceHighlightCard({ 
  saldoTotal, 
  variacao, 
  variacaoPercent 
}: BalanceHighlightCardProps) {
  const isPositive = variacao >= 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="relative overflow-hidden glass-card p-6 md:p-8 rounded-3xl">
      {/* Mesh blob background */}
      <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 mesh-blob mesh-blob-primary opacity-30 translate-x-1/4 -translate-y-1/4" />
      <div className="absolute bottom-0 left-0 w-32 h-32 mesh-blob mesh-blob-secondary opacity-20 -translate-x-1/4 translate-y-1/4" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 md:p-4 rounded-2xl bg-primary/10">
            <Wallet className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          </div>
          <span className="text-muted-foreground font-medium text-sm md:text-base">Saldo Total</span>
        </div>
        
        <p className="text-3xl md:text-5xl font-bold text-foreground mb-3">
          {formatCurrency(saldoTotal)}
        </p>
        
        <div className={cn(
          "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all",
          isPositive 
            ? "bg-success/15 text-success" 
            : "bg-destructive/15 text-destructive"
        )}>
          {isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>
            {isPositive ? '+' : ''}{formatCurrency(variacao)} ({variacaoPercent.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
