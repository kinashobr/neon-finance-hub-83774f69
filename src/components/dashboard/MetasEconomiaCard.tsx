import { PiggyBank, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MetasEconomiaCardProps {
  reservaAtual: number;
  metaReserva: number;
  titulo?: string;
}

export function MetasEconomiaCard({ 
  reservaAtual, 
  metaReserva, 
  titulo = "Reserva de Emergência" 
}: MetasEconomiaCardProps) {
  const percentual = metaReserva > 0 ? (reservaAtual / metaReserva) * 100 : 0;
  const percentualClamped = Math.min(percentual, 100);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`;
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="glass-card p-5 md:p-6 rounded-2xl">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <PiggyBank className="w-5 h-5 text-primary" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Metas de Economia</span>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10">
            <Target className="w-4 h-4 text-success" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{titulo}</p>
            <p className="text-xs text-muted-foreground">
              Meta: {formatCurrency(metaReserva)}
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-foreground font-semibold">
              {formatCurrency(reservaAtual)}
              <span className="text-muted-foreground font-normal ml-1">poupado</span>
            </span>
            <span className={cn(
              "font-bold",
              percentual >= 100 ? "text-success" : "text-primary"
            )}>
              {percentual.toFixed(0)}%
            </span>
          </div>
          
          <Progress 
            value={percentualClamped} 
            className="h-3 rounded-full"
          />
        </div>
        
        {percentual >= 100 && (
          <div className="text-xs text-success font-medium flex items-center gap-1 mt-2">
            <span>🎉</span> Meta atingida!
          </div>
        )}
        
        {percentual < 100 && metaReserva > 0 && (
          <p className="text-xs text-muted-foreground">
            Faltam {formatCurrency(metaReserva - reservaAtual)} para atingir a meta
          </p>
        )}
      </div>
    </div>
  );
}
