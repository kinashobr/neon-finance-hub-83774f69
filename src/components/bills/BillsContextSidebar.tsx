import { useMemo } from "react";
import { TrendingUp, TrendingDown, DollarSign, Calculator, CheckCircle2, Clock, Target, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/types/finance";
import { EditableCell } from "../EditableCell";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";

interface BillsContextSidebarProps {
  localRevenueForecast: number;
  setLocalRevenueForecast: (value: number) => void;
  previousMonthRevenue: number;
  totalExpectedExpense: number;
  totalPaid: number;
  pendingCount: number;
  netForecast: number;
  isMobile?: boolean;
}

export function BillsContextSidebar({
  localRevenueForecast,
  setLocalRevenueForecast,
  previousMonthRevenue,
  totalExpectedExpense,
  totalPaid,
  pendingCount,
  netForecast,
  isMobile = false,
}: BillsContextSidebarProps) {
  
  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(2);
  };

  const items = [
    {
      id: 'receita',
      label: 'Receita Prev.',
      icon: TrendingUp,
      value: localRevenueForecast,
      color: 'text-success',
      editable: true,
      suggestion: previousMonthRevenue,
      tooltip: 'Previsão de entradas para o mês. Clique para editar.',
    },
    {
      id: 'a_pagar',
      label: 'A Pagar',
      icon: Clock,
      value: totalExpectedExpense,
      color: 'text-destructive',
      tooltip: 'Total de despesas e parcelas ainda não registradas como pagas.',
    },
    {
      id: 'pago',
      label: 'Total Pago',
      icon: CheckCircle2,
      value: totalPaid,
      color: 'text-success',
      tooltip: 'Total de contas registradas como pagas no mês.',
    },
  ];

  return (
    <div className={cn(
      "space-y-3",
      isMobile ? "p-4" : "p-2 border-r border-border h-full" // Reduzido padding para p-2
    )}>
      <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
        <Target className="w-3 h-3" />
        Contexto
      </h3>
      
      {/* Saldo Previsto (Maior Destaque) */}
      <Card className={cn(
        "p-2 shadow-lg", // Reduzido padding para p-2
        netForecast >= 0 ? "stat-card-positive" : "stat-card-negative"
      )}>
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-medium flex items-center gap-1">
            <Calculator className="w-3 h-3" />
            SALDO PREVISTO
          </Label>
          <span className="text-[10px] text-muted-foreground">
            {pendingCount} pend.
          </span>
        </div>
        <p className={cn(
          "text-base font-bold mt-0.5", // Reduzido para text-base
          netForecast >= 0 ? "text-success" : "text-destructive"
        )}>
          {formatCurrency(netForecast)}
        </p>
      </Card>

      <Separator />

      {/* Itens de Apoio */}
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="space-y-0.5">
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <item.icon className={cn("w-3 h-3", item.color)} />
              {item.label}
            </Label>
            {item.editable ? (
              <>
                <EditableCell 
                  value={item.value} 
                  type="currency" 
                  onSave={setLocalRevenueForecast}
                  className={cn("text-sm font-bold", item.color)} // Mantido em text-sm
                />
                <p className="text-[9px] text-muted-foreground">
                  Sugestão: {formatCurrency(item.suggestion)}
                </p>
              </>
            ) : (
              <p className={cn("text-sm font-bold", item.color)}>
                {formatCurrency(item.value)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}