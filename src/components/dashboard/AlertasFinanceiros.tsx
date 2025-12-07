"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, Info, CheckCircle, X, ChevronRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";

interface Alerta {
  id: string;
  tipo: "warning" | "danger" | "info" | "success";
  mensagem: string;
  detalhe?: string;
}

interface AlertasFinanceirosProps {
  alertas: Alerta[];
  onVerDetalhes?: (alertaId: string) => void;
  onIgnorar?: (alertaId: string) => void;
}

export function AlertasFinanceiros({ alertas: initialAlertas, onVerDetalhes, onIgnorar }: AlertasFinanceirosProps) {
  const { transacoes, emprestimos } = useFinance();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const alertas = useMemo(() => {
    if (!Array.isArray(transacoes) || transacoes.length === 0) return initialAlertas;

    const hoje = new Date();
    const mes = hoje.getMonth();
    const ano = hoje.getFullYear();

    const transacoesMes = transacoes.filter(t => {
      if (!t?.data) return false;
      const d = new Date(t.data);
      return d.getMonth() === mes && d.getFullYear() === ano;
    });

    if (transacoesMes.length === 0) return initialAlertas;

    const receitasMes = transacoesMes
      .filter(t => t.tipo === "receita")
      .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

    const despesasMes = transacoesMes
      .filter(t => t.tipo === "despesa")
      .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

    const alertasDinamicos: Alerta[] = [];

    if (receitasMes > 0 && despesasMes > receitasMes) {
      alertasDinamicos.push({
        id: "saldo-negativo",
        tipo: "danger",
        mensagem: "Saldo negativo no mês",
        detalhe: `Despesas R$ ${despesasMes.toLocaleString("pt-BR")} > Receitas R$ ${receitasMes.toLocaleString("pt-BR")}`
      });
    }

    if (Array.isArray(emprestimos) && emprestimos.length > 0) {
      alertasDinamicos.push({
        id: "emprestimos-ativos",
        tipo: "info",
        mensagem: "Empréstimos cadastrados",
        detalhe: `${emprestimos.length} ativo(s)`
      });
    }

    const merged = new Map<string, Alerta>();
    initialAlertas.forEach(a => merged.set(a.id, a));
    alertasDinamicos.forEach(a => merged.set(a.id, a));

    return Array.from(merged.values());
  }, [transacoes, emprestimos, initialAlertas]);

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
          <h3 className="text-lg font-semibold">Alertas Financeiros</h3>
        </div>
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <CheckCircle className="h-5 w-5 mr-2 text-success" />
          Nenhum alerta no momento
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Alertas Financeiros</h3>
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
                  <p className="text-sm font-medium">{alerta.mensagem}</p>
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

