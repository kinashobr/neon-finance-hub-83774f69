import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, Clock, TrendingUp, TrendingDown, DollarSign, Calculator } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillsTrackerList } from "./BillsTrackerList";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BillTracker, formatCurrency } from "@/types/finance";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditableCell } from "../EditableCell";

interface BillsTrackerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillsTrackerModal({ open, onOpenChange }: BillsTrackerModalProps) {
  const { 
    billsTracker, 
    addBill, 
    updateBill, 
    deleteBill, 
    getBillsForPeriod, 
    dateRanges,
    monthlyRevenueForecast,
    setMonthlyRevenueForecast,
    getRevenueForPreviousMonth,
  } = useFinance();
  
  // Usamos a data final do período 1 como referência para o mês atual
  const referenceDate = dateRanges.range1.to || new Date();
  
  // Geração da lista de contas a pagar para o mês de referência
  const billsForPeriod = useMemo(() => {
    return getBillsForPeriod(referenceDate);
  }, [getBillsForPeriod, referenceDate]);
  
  // Receita do mês anterior (para sugestão)
  const previousMonthRevenue = useMemo(() => {
    return getRevenueForPreviousMonth(referenceDate);
  }, [getRevenueForPreviousMonth, referenceDate]);
  
  // Estado local para a previsão de receita (inicializa com o valor do contexto ou do mês anterior)
  const [localRevenueForecast, setLocalRevenueForecast] = useState(monthlyRevenueForecast || previousMonthRevenue);
  
  // Atualiza o estado local quando o modal abre ou o contexto muda
  useEffect(() => {
    if (open) {
        setLocalRevenueForecast(monthlyRevenueForecast || previousMonthRevenue);
    }
  }, [open, monthlyRevenueForecast, previousMonthRevenue]);

  const totalExpectedExpense = useMemo(() => 
    billsForPeriod.filter(b => !b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0),
    [billsForPeriod]
  );
  
  const totalPaid = useMemo(() => 
    billsForPeriod.filter(b => b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0),
    [billsForPeriod]
  );
  
  const totalBills = billsForPeriod.length;
  const paidCount = billsForPeriod.filter(b => b.isPaid).length;
  const pendingCount = totalBills - paidCount;
  
  const netForecast = localRevenueForecast - totalExpectedExpense;

  const handleUpdateBill = (id: string, updates: Partial<BillTracker>) => {
    updateBill(id, updates);
  };

  const handleDeleteBill = (id: string) => {
    deleteBill(id);
  };

  const handleAddBill = (bill: Omit<BillTracker, "id" | "isPaid">) => {
    addBill(bill);
  };
  
  const handleSaveAndClose = () => {
    // Persiste o valor editado da previsão de receita no contexto
    setMonthlyRevenueForecast(localRevenueForecast);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-primary" />
            Contas a Pagar - {format(referenceDate, 'MMMM/yyyy')}
          </DialogTitle>
          
          {/* Forecast Panel */}
          <div className="grid grid-cols-3 gap-4 mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
            {/* Receita Prevista */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-success" />
                Receita Prevista (R$)
              </Label>
              <EditableCell 
                value={localRevenueForecast} 
                type="currency" 
                onSave={(v) => setLocalRevenueForecast(Number(v))}
                className="text-lg font-bold text-success"
              />
              <p className="text-xs text-muted-foreground">
                Sugestão: {formatCurrency(previousMonthRevenue)} (Mês anterior)
              </p>
            </div>
            
            {/* Despesa Prevista */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-destructive" />
                Despesa Prevista (R$)
              </Label>
              <p className="text-lg font-bold text-destructive">
                {formatCurrency(totalExpectedExpense)}
              </p>
              <p className="text-xs text-muted-foreground">
                Soma das contas pendentes
              </p>
            </div>
            
            {/* Saldo Previsto */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calculator className="w-3 h-3 text-primary" />
                Saldo Previsto (R$)
              </Label>
              <p className={cn(
                "text-2xl font-bold",
                netForecast >= 0 ? "text-primary" : "text-destructive"
              )}>
                {formatCurrency(netForecast)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm mt-2">
            <div className="flex items-center gap-1 text-destructive">
              <Clock className="w-4 h-4" />
              <span>{pendingCount} Pendentes</span>
            </div>
            <div className="flex items-center gap-1 text-success">
              <CheckCircle2 className="w-4 h-4" />
              <span>{paidCount} Pagas</span>
            </div>
            <div className="ml-auto text-muted-foreground">
              Total Pago: <span className="font-bold text-success">{formatCurrency(totalPaid)}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          <BillsTrackerList
            bills={billsForPeriod}
            onUpdateBill={handleUpdateBill}
            onDeleteBill={handleDeleteBill}
            onAddBill={handleAddBill}
            currentDate={referenceDate}
          />
        </div>
        
        <DialogFooter>
            <Button onClick={handleSaveAndClose} className="w-full">
                Salvar e Fechar
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}