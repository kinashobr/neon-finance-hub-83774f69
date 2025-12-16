import { useMemo, useCallback } from "react";
import { Calendar, FileText, Check, Clock, Pin, RefreshCw, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PeriodSelector } from "../dashboard/PeriodSelector";
import { DateRange, ComparisonDateRanges, ImportedStatement, formatCurrency } from "@/types/finance";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area"; // ADDED IMPORT

interface ReviewContextSidebarProps {
  accountId: string;
  statements: ImportedStatement[];
  pendingCount: number;
  totalCount: number;
  reviewRange: DateRange;
  onPeriodChange: (ranges: ComparisonDateRanges) => void;
  onApplyFilter: () => void;
  onContabilize: () => void;
  onClose: () => void;
  onManageRules: () => void;
}

export function ReviewContextSidebar({
  accountId,
  statements,
  pendingCount,
  totalCount,
  reviewRange,
  onPeriodChange,
  onApplyFilter,
  onContabilize,
  onClose,
  onManageRules,
}: ReviewContextSidebarProps) {
  
  const isRangeSelected = !!reviewRange.from && !!reviewRange.to;
  const isReadyToContabilize = pendingCount > 0;
  
  const dummyRanges: ComparisonDateRanges = useMemo(() => ({
    range1: reviewRange,
    range2: { from: undefined, to: undefined }
  }), [reviewRange]);

  const totalStatements = statements.length;
  const completeStatements = statements.filter(s => s.status === 'complete').length;

  return (
    <div className="space-y-4 flex flex-col p-4 border-r border-border h-full">
      
      {/* Status de Revisão (Fixed Top) */}
      <Card className={cn(
        "p-3 shadow-lg",
        pendingCount > 0 ? "stat-card-warning" : "stat-card-positive"
      )}>
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium flex items-center gap-1">
            <FileText className="w-3 h-3" />
            PENDENTES DE REVISÃO
          </Label>
          <span className="text-xs text-muted-foreground">
            {totalCount} total
          </span>
        </div>
        <p className={cn(
          "text-xl font-bold mt-0.5",
          pendingCount > 0 ? "text-warning" : "text-success"
        )}>
          {pendingCount}
        </p>
      </Card>

      {/* Scrollable Content Area */}
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-4">
          
          <Separator />

          {/* Filtro de Período */}
          <div className="space-y-3">
            <Label className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-3 h-3" />
              Período de Revisão
            </Label>
            <PeriodSelector 
              initialRanges={dummyRanges}
              onDateRangeChange={onPeriodChange}
              className="w-full h-8 text-xs"
            />
            <Button 
              onClick={onApplyFilter} 
              variant="outline" 
              size="sm" 
              className="w-full h-8 gap-2 text-xs"
              disabled={!isRangeSelected}
            >
              <RefreshCw className="w-3 h-3" />
              Aplicar Filtro
            </Button>
          </div>
          
          <Separator />

          {/* Ações e Regras */}
          <div className="space-y-3">
            <Label className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
              <Pin className="w-3 h-3" />
              Otimização
            </Label>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full h-8 gap-2 text-xs"
              onClick={onManageRules}
            >
              <Pin className="w-4 h-4" />
              Gerenciar Regras
            </Button>
            <div className="text-xs text-muted-foreground pt-1">
                <p>{totalStatements} extrato(s) importado(s)</p>
                <p>{completeStatements} extrato(s) completo(s)</p>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Botão de Contabilização (Fixed Bottom) */}
      <div className="mt-auto pt-3 shrink-0">
        <Button 
          onClick={onContabilize} 
          disabled={!isReadyToContabilize}
          className="w-full gap-2 h-9"
        >
          <Check className="w-4 h-4" />
          Contabilizar ({pendingCount})
        </Button>
        <Button 
          variant="ghost" 
          onClick={onClose} 
          className="w-full gap-2 h-8 text-xs mt-1"
        >
          <X className="w-4 h-4" />
          Fechar Revisão
        </Button>
      </div>
    </div>
  );
}