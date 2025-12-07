import { useState } from "react";
import { AlertTriangle, Info, CheckCircle, X, ChevronRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Alerta {
  id: string;
  tipo: "warning" | "danger" | "info" | "success";
  mensagem: string;
  detalhe?: string;
  data?: string;
}

interface AlertasFinanceirosProps {
  alertas: Alerta[];
  onVerDetalhes?: (alertaId: string) => void;
  onIgnorar?: (alertaId: string) => void;
}

export function AlertasFinanceiros({ alertas: initialAlertas, onVerDetalhes, onIgnorar }: AlertasFinanceirosProps) {
  const [alertas, setAlertas] = useState(initialAlertas);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleAlertas = alertas.filter(a => !dismissed.has(a.id));

  const handleDismiss = (alertaId: string) => {
    setDismissed(prev => new Set([...prev, alertaId]));
    onIgnorar?.(alertaId);
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case "danger": return AlertTriangle;
      case "warning": return AlertTriangle;
      case "success": return CheckCircle;
      default: return Info;
    }
  };

  const getStyles = (tipo: string) => {
    switch (tipo) {
      case "danger": return "border-l-destructive bg-destructive/10 text-destructive";
      case "warning": return "border-l-warning bg-warning/10 text-warning";
      case "success": return "border-l-success bg-success/10 text-success";
      default: return "border-l-primary bg-primary/10 text-primary";
    }
  };

  if (visibleAlertas.length === 0) {
    return (
      <div className="glass-card p-5 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Alertas Financeiros</h3>
        </div>
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <CheckCircle className="h-5 w-5 mr-2 text-success" />
          Nenhum alerta no momento. Suas finanças estão em ordem!
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Alertas Financeiros</h3>
          <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">
            {visibleAlertas.length}
          </span>
        </div>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
        {visibleAlertas.map((alerta) => {
          const Icon = getIcon(alerta.tipo);
          return (
            <div
              key={alerta.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border-l-4 transition-all hover:scale-[1.01]",
                getStyles(alerta.tipo)
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{alerta.mensagem}</p>
                  {alerta.detalhe && (
                    <p className="text-xs text-muted-foreground mt-0.5">{alerta.detalhe}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onVerDetalhes?.(alerta.id)}
                >
                  Ver <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDismiss(alerta.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
