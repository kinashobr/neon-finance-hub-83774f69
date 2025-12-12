import { useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DayData {
  day: number;
  receitas: number;
  despesas: number;
  transferencias: number;
  aportes: number;
}

interface TransacaoV2 {
  id: string;
  date: string;
  amount: number;
  operationType: string;
  flow: string;
  [key: string]: any;
}

interface FluxoCaixaHeatmapProps {
  month: string;
  year: number;
  transacoes: TransacaoV2[];
}

export function FluxoCaixaHeatmap({ month, year, transacoes }: FluxoCaixaHeatmapProps) {
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
        .filter(t => {
          const txDate = new Date(t.date);
          return txDate.getDate() === day && 
                 txDate.getMonth() === parseInt(month) - 1 && 
                 txDate.getFullYear() === year;
        })
        .reduce((acc, t) => {
          if (t.operationType === "receita" || t.operationType === "rendimento") {
            acc.receitas += t.amount;
          } else if (t.operationType === "despesa" || t.operationType === "pagamento_emprestimo") {
            acc.despesas += t.amount;
          } else if (t.operationType === "transferencia") {
            acc.transferencias += t.amount;
          } else if (t.operationType === "aplicacao") {
            acc.aportes += t.amount;
          }
          return acc;
        }, { day, receitas: 0, despesas: 0, transferencias: 0, aportes: 0 });
      
      result.push(dayData);
    }
    
    return result;
  }, [transacoes, month, year]);

  // Calcular max para normalização
  const maxValue = useMemo(() => {
    const values = calendarDays
      .filter((d): d is DayData => d !== null)
      .map(d => {
        switch (viewType) {
          case "receitas": return d.receitas;
          case "despesas": return d.despesas;
          case "aportes": return d.aportes;
          default: return d.receitas + d.despesas + d.transferencias + d.aportes;
        }
      });
    return Math.max(...values, 1);
  }, [calendarDays, viewType]);

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
    
    const intensity = value / maxValue;
    if (intensity < 0.25) return viewType === "despesas" ? "bg-destructive/20" : "bg-success/20";
    if (intensity < 0.5) return viewType === "despesas" ? "bg-destructive/40" : "bg-success/40";
    if (intensity < 0.75) return viewType === "despesas" ? "bg-destructive/60" : "bg-success/60";
    return viewType === "despesas" ? "bg-destructive/80" : "bg-success/80";
  };

  const getBorderColor = (dayData: DayData | null): string => {
    if (!dayData) return "";
    const total = dayData.receitas - dayData.despesas;
    if (total > 0) return "border-success/50";
    if (total < 0) return "border-destructive/50";
    return "border-border";
  };

  const totalMes = useMemo(() => {
    return calendarDays
      .filter((d): d is DayData => d !== null)
      .reduce((acc, d) => ({
        receitas: acc.receitas + d.receitas,
        despesas: acc.despesas + d.despesas,
        saldo: acc.saldo + d.receitas - d.despesas
      }), { receitas: 0, despesas: 0, saldo: 0 });
  }, [calendarDays]);

  const formatCurrency = (value: number) => 
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <TooltipProvider>
      <div className="glass-card p-5 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Fluxo de Caixa Mensal</h3>
            <p className="text-sm text-muted-foreground">
              Saldo: <span className={cn(totalMes.saldo >= 0 ? "text-success" : "text-destructive", "font-medium")}>
                {formatCurrency(totalMes.saldo)}
              </span>
            </p>
          </div>
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

        {/* Resumo do mês */}
        <div className="grid grid-cols-3 gap-3 mb-4 p-3 rounded-lg bg-muted/30">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Receitas</p>
            <p className="text-sm font-semibold text-success">{formatCurrency(totalMes.receitas)}</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-xs text-muted-foreground">Despesas</p>
            <p className="text-sm font-semibold text-destructive">{formatCurrency(totalMes.despesas)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Balanço</p>
            <p className={cn("text-sm font-semibold", totalMes.saldo >= 0 ? "text-success" : "text-destructive")}>
              {formatCurrency(totalMes.saldo)}
            </p>
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
              {dayData && (dayData.receitas > 0 || dayData.despesas > 0 || dayData.transferencias > 0 || dayData.aportes > 0) && (
                <TooltipContent className="w-52">
                  <div className="space-y-1.5 text-xs">
                    <p className="font-semibold border-b pb-1">Dia {dayData.day}</p>
                    {dayData.receitas > 0 && (
                      <div className="flex justify-between">
                        <span className="text-success">Receitas:</span>
                        <span>{formatCurrency(dayData.receitas)}</span>
                      </div>
                    )}
                    {dayData.despesas > 0 && (
                      <div className="flex justify-between">
                        <span className="text-destructive">Despesas:</span>
                        <span>{formatCurrency(dayData.despesas)}</span>
                      </div>
                    )}
                    {dayData.transferencias > 0 && (
                      <div className="flex justify-between">
                        <span className="text-primary">Transferências:</span>
                        <span>{formatCurrency(dayData.transferencias)}</span>
                      </div>
                    )}
                    {dayData.aportes > 0 && (
                      <div className="flex justify-between">
                        <span className="text-warning">Aportes:</span>
                        <span>{formatCurrency(dayData.aportes)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t">
                      <span className="text-muted-foreground font-medium">Saldo:</span>
                      <span className={dayData.receitas - dayData.despesas >= 0 ? "text-success font-medium" : "text-destructive font-medium"}>
                        {formatCurrency(dayData.receitas - dayData.despesas)}
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