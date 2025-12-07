import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";

interface DayData {
  day: number;
  receitas: number;
  despesas: number;
  transferencias: number;
  aportes: number;
}

interface FluxoCaixaHeatmapProps {
  month: string;
  year: number;
}

export function FluxoCaixaHeatmap({ month, year }: FluxoCaixaHeatmapProps) {
  const { transacoes } = useFinance();
  const [viewType, setViewType] = useState<"all" | "receitas" | "despesas" | "aportes">("all");

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  
  const calendarDays: (DayData | null)[] = useMemo(() => {
    const firstDay = new Date(year, parseInt(month) - 1, 1).getDay();
    const daysInMonth = new Date(year, parseInt(month), 0).getDate();
    
    const result: (DayData | null)[] = [];
    
    for (let i = 0; i < firstDay; i++) {
      result.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = transacoes
        .filter(t => new Date(t.data).getDate() === day && new Date(t.data).getMonth() === parseInt(month) - 1 && new Date(t.data).getFullYear() === year)
        .reduce((acc, t) => {
          if (t.tipo === "receita") acc.receitas += t.valor;
          else acc.despesas += t.valor;
          return acc;
        }, { day, receitas: 0, despesas: 0, transferencias: 0, aportes: 0 });
      
      result.push(dayData);
    }
    
    return result;
  }, [transacoes, month, year]);

  const getIntensity = (dayData: DayData | null): string => {
    if (!dayData) return "bg-transparent";
    
    let value = 0;
    switch (viewType) {
      case "receitas": value = dayData.receitas; break;
      case "despesas": value = dayData.despesas; break;
      case "aportes": value = dayData.aportes; break;
      default: value = dayData.receitas + dayData.despesas + dayData.transferencias + dayData.aportes;
    }

    if (value === 0) return "bg-muted/30";
    if (value < 500) return viewType === "despesas" ? "bg-destructive/20" : "bg-success/20";
    if (value < 2000) return viewType === "despesas" ? "bg-destructive/40" : "bg-success/40";
    if (value < 5000) return viewType === "despesas" ? "bg-destructive/60" : "bg-success/60";
    return viewType === "despesas" ? "bg-destructive/80" : "bg-success/80";
  };

  const getBorderColor = (dayData: DayData | null): string => {
    if (!dayData) return "";
    const total = dayData.receitas - dayData.despesas;
    if (total > 0) return "border-success/50";
    if (total < 0) return "border-destructive/50";
    return "border-border";
  };

  return (
    <TooltipProvider>
      <div className="glass-card p-5 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Fluxo de Caixa Mensal</h3>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted rounded-lg p-1 text-xs">
              {[
                { value: "all", label: "Tudo" },
                { value: "receitas", label: "Receitas" },
                { value: "despesas", label: "Despesas" },
                { value: "aportes", label: "Aportes" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setViewType(opt.value as typeof viewType)}
                  className={cn(
                    "px-3 py-1 rounded-md transition-colors",
                    viewType === opt.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((dayData, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all cursor-pointer hover:scale-105 border",
                    getIntensity(dayData),
                    getBorderColor(dayData),
                    !dayData && "cursor-default hover:scale-100"
                  )}
                >
                  {dayData?.day}
                </div>
              </TooltipTrigger>
              {dayData && (
                <TooltipContent className="w-48">
                  <div className="space-y-1 text-xs">
                    <p className="font-medium">Dia {dayData.day}</p>
                    <div className="flex justify-between">
                      <span className="text-success">Receitas:</span>
                      <span>R$ {dayData.receitas.toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-destructive">Despesas:</span>
                      <span>R$ {dayData.despesas.toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saldo:</span>
                      <span className={dayData.receitas - dayData.despesas >= 0 ? "text-success" : "text-destructive"}>
                        R$ {(dayData.receitas - dayData.despesas).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </div>

        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-muted/30" /> Nenhum
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success/30" /> Baixo
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success/60" /> Médio
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success/90" /> Alto
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}