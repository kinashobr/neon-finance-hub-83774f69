import { useState } from "react";
import { Target, Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ObjetivoFinanceiro } from "@/contexts/FinanceContext";

export function ObjetivosCards({ objetivos }: { objetivos: ObjetivoFinanceiro[] }) {
  const getProgress = (atual: number, meta: number) => {
    return Math.min((atual / meta) * 100, 100);
  };

  const getStatus = (atual: number, meta: number) => {
    const progress = getProgress(atual, meta);
    if (progress >= 100) return { label: "Concluído", color: "text-success" };
    if (progress >= 75) return { label: "No prazo", color: "text-success" };
    if (progress >= 50) return { label: "Em andamento", color: "text-primary" };
    if (progress >= 25) return { label: "Atenção", color: "text-warning" };
    return { label: "Atrasado", color: "text-destructive" };
  };

  const getPrevisao = (atual: number, meta: number, rentabilidade: number) => {
    if (atual >= meta) return "Concluído!";
    const falta = meta - atual;
    const meses = Math.ceil(falta / (atual * (rentabilidade / 100 / 12) + 500)); // assume aporte de 500/mês
    if (meses <= 0) return "< 1 mês";
    if (meses === 1) return "1 mês";
    if (meses < 12) return `${meses} meses`;
    const anos = Math.floor(meses / 12);
    const mesesRestantes = meses % 12;
    return `${anos}a ${mesesRestantes}m`;
  };

  return (
    <div className="glass-card p-5 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-semibold text-foreground">Objetivos Financeiros</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {objetivos.map((objetivo) => {
          const progress = getProgress(objetivo.atual, objetivo.meta);
          const status = getStatus(objetivo.atual, objetivo.meta);
          
          return (
            <div
              key={objetivo.id}
              className="relative p-4 rounded-xl border border-border bg-card/50 hover:bg-card/80 transition-all group"
            >
              {/* Content */}
              <div className="pt-2">
                <div
                  className="w-10 h-1 rounded-full mb-3"
                  style={{ backgroundColor: objetivo.cor }}
                />
                
                <h4 className="font-medium text-foreground mb-1">{objetivo.nome}</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Atual</span>
                    <span className="text-foreground font-medium">
                      R$ {objetivo.atual.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Meta</span>
                    <span className="text-foreground">
                      R$ {objetivo.meta.toLocaleString("pt-BR")}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="relative">
                    <Progress value={progress} className="h-2" />
                    <span className="absolute right-0 -top-4 text-xs text-muted-foreground">
                      {progress.toFixed(0)}%
                    </span>
                  </div>

                  {/* Status and forecast */}
                  <div className="flex justify-between items-center pt-2 border-t border-border mt-2">
                    <span className={cn("text-xs font-medium", status.color)}>
                      {status.label}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {getPrevisao(objetivo.atual, objetivo.meta, objetivo.rentabilidade)}
                    </div>
                  </div>

                  {/* Rentabilidade */}
                  <div className="flex items-center gap-1 text-xs text-success">
                    <TrendingUp className="h-3 w-3" />
                    +{objetivo.rentabilidade.toFixed(1)}% rentab.
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}