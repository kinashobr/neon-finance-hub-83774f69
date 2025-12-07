import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Indicador {
  id: string;
  nome: string;
  valor: number;
  formato: "percent" | "decimal" | "currency";
  limites: { bom: number; atencao: number };
  inverso?: boolean;
  formula: string;
}

interface IndicadoresFinanceirosProps {
  indicadores: Indicador[];
}

export function IndicadoresFinanceiros({ indicadores }: IndicadoresFinanceirosProps) {
  const getStatus = (indicador: Indicador): "success" | "warning" | "error" => {
    const { valor, limites, inverso } = indicador;
    
    if (inverso) {
      if (valor <= limites.bom) return "success";
      if (valor <= limites.atencao) return "warning";
      return "error";
    } else {
      if (valor >= limites.bom) return "success";
      if (valor >= limites.atencao) return "warning";
      return "error";
    }
  };

  const formatValue = (indicador: Indicador): string => {
    switch (indicador.formato) {
      case "percent":
        return `${indicador.valor.toFixed(1)}%`;
      case "decimal":
        return indicador.valor.toFixed(2);
      case "currency":
        return `R$ ${indicador.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
      default:
        return indicador.valor.toString();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success": return "text-success bg-success/20 border-success/30";
      case "warning": return "text-warning bg-warning/20 border-warning/30";
      case "error": return "text-destructive bg-destructive/20 border-destructive/30";
      default: return "text-muted-foreground bg-muted/20 border-border";
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case "success": return "bg-success";
      case "warning": return "bg-warning";
      case "error": return "bg-destructive";
      default: return "bg-muted-foreground";
    }
  };

  return (
    <TooltipProvider>
      <div className="glass-card p-5 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Indicadores Financeiros</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {indicadores.map((indicador, index) => {
            const status = getStatus(indicador);
            return (
              <div
                key={indicador.id}
                className={cn(
                  "relative p-3 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer group",
                  getStatusColor(status)
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* Status dot */}
                <div className={cn("w-2 h-2 rounded-full absolute top-2 left-2", getStatusDot(status))} />

                {/* Name with tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 mb-2 pl-4">
                      <span className="text-xs font-medium truncate">{indicador.nome}</span>
                      <Info className="h-3 w-3 opacity-50" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{indicador.formula}</p>
                  </TooltipContent>
                </Tooltip>

                {/* Value */}
                <div className="text-lg font-bold pl-4">{formatValue(indicador)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}