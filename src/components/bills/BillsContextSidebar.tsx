import { useMemo } from "react";
import { TrendingUp, TrendingDown, DollarSign, Calculator, CheckCircle2, Clock, Target, Info, Save, LogOut, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/types/finance";
import { EditableCell } from "../EditableCell";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Import Button

interface BillsContextSidebarProps {
  localRevenueForecast: number;
  setLocalRevenueForecast: (value: number) => void;
  previousMonthRevenue: number;
  totalExpectedExpense: number; // Total PENDENTE
  totalPaid: number;
  pendingCount: number;
  netForecast: number; // Saldo Previsto (Receita - Total PENDENTE)
  isMobile?: boolean;
  onSaveAndClose: () => void;
  onGenerateList: () => void; // NEW PROP
  isListGenerated: boolean; // NEW PROP
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
  onSaveAndClose,
  onGenerateList, // USED
  isListGenerated, // USED
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
      "space-y-4 flex flex-col", // Increased space-y from 3 to 4
      isMobile ? "p-4" : "p-4 border-r border-border h-full" // Increased desktop padding from p-2 to p-4
    )}>
      <div className={cn("space-y-4", isMobile ? "flex-1" : "flex-grow")}> {/* Increased space-y from 3 to 4 */}
        <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
          <Target className="w-3 h-3" />
          Contexto
        </h3>
        
        {/* Saldo Previsto (Maior Destaque) */}
        <Card className={cn(
          "p-3 shadow-lg", // Increased padding from p-2 to p-3
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
            "text-xl font-bold mt-0.5", // Increased text size from text-base to text-xl
            netForecast >= 0 ? "text-success" : "text-destructive"
          )}>
            {formatCurrency(netForecast)}
          </p>
        </Card>

        <Separator />

        {/* Botão de Geração Manual */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Lista de Contas
          </Label>
          <Button 
            onClick={onGenerateList} 
            className="w-full gap-2"
            variant={isListGenerated ? "outline" : "default"}
            disabled={isListGenerated}
          >
            <RefreshCw className="w-4 h-4" />
            {isListGenerated ? "Lista Gerada" : "Gerar Lista do Mês"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {isListGenerated 
              ? "Lista gerada. Faça ajustes e salve."
              : "Gere a lista com base nos templates e mês anterior."
            }
          </p>
        </div>

        <Separator />

        {/* Itens de Apoio */}
        <div className="space-y-3"> {/* Increased space-y from 2 to 3 */}
          {items.map(item => (
            <div key={item.id} className="space-y-0.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <item.icon className={cn("w-3 h-3", item.color)} />
                {item.label}
              </Label>
              {item.editable ? (
                <>
                  <EditableCell 
                    value={item.value} 
                    type="currency" 
                    onSave={setLocalRevenueForecast}
                    className={cn("text-base font-bold", item.color)} // Increased text size from text-sm to text-base
                  />
                  <p className="text-[9px] text-muted-foreground">
                    Sugestão: {formatCurrency(item.suggestion)}
                  </p>
                </>
              ) : (
                <p className={cn("text-base font-bold", item.color)}> {/* Increased text size from text-sm to text-base */}
                  {formatCurrency(item.value)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Botão Salvar e Sair (Fixo no final) */}
      <div className={cn("mt-auto pt-3", isMobile && "pt-0")}>
        <Button onClick={onSaveAndClose} className="w-full gap-2">
          <Save className="w-4 h-4" />
          Salvar e Sair
        </Button>
      </div>
    </div>
  );
}