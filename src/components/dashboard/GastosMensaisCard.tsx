import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface GastosMensaisCardProps {
  valor: number;
  valorAnterior: number;
}

export function GastosMensaisCard({ valor, valorAnterior }: GastosMensaisCardProps) {
  const [showAtual, setShowAtual] = useState(true);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const displayValue = showAtual ? valor : valorAnterior;
  const diferenca = valor - valorAnterior;
  const diferencaPercent = valorAnterior > 0 ? (diferenca / valorAnterior) * 100 : 0;
  const isAumento = diferenca > 0;

  return (
    <div className="glass-card p-5 md:p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-xl bg-destructive/10">
            <TrendingDown className="w-5 h-5 text-destructive" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Gastos Mensais</span>
        </div>
        
        {/* Toggle */}
        <div className="flex bg-muted/50 rounded-lg p-1 text-xs">
          <button
            onClick={() => setShowAtual(true)}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all min-h-[32px]",
              showAtual 
                ? "bg-background text-foreground shadow-soft font-medium" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Este Mês
          </button>
          <button
            onClick={() => setShowAtual(false)}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all min-h-[32px]",
              !showAtual 
                ? "bg-background text-foreground shadow-soft font-medium" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Anterior
          </button>
        </div>
      </div>
      
      <p className="text-2xl md:text-3xl font-bold text-foreground mb-2">
        {formatCurrency(displayValue)}
      </p>

      {showAtual && valorAnterior > 0 && (
        <div className={cn(
          "inline-flex items-center gap-1 text-xs font-medium",
          isAumento ? "text-destructive" : "text-success"
        )}>
          {isAumento ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
          <span>
            {isAumento ? '+' : ''}{diferencaPercent.toFixed(1)}% vs mês anterior
          </span>
        </div>
      )}

      {/* Mini sparkline area - simplified visual */}
      <div className="mt-4 h-12 flex items-end gap-1">
        {[...Array(12)].map((_, i) => {
          const height = 20 + Math.random() * 60;
          const isLast = i === 11;
          return (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-t transition-all",
                isLast 
                  ? "bg-destructive/60" 
                  : "bg-muted"
              )}
              style={{ height: `${height}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}
