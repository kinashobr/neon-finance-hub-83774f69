import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, Clock } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillsTrackerList } from "./BillsTrackerList";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BillTracker } from "@/types/finance";

interface BillsTrackerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillsTrackerModal({ open, onOpenChange }: BillsTrackerModalProps) {
  const { billsTracker, addBill, updateBill, deleteBill, getBillsForPeriod, dateRanges } = useFinance();
  
  // Usamos a data final do período 1 como referência para o mês atual
  const referenceDate = dateRanges.range1.to || new Date();
  
  // Geração da lista de contas a pagar para o mês de referência
  const billsForPeriod = useMemo(() => {
    return getBillsForPeriod(referenceDate);
  }, [getBillsForPeriod, referenceDate]);
  
  const totalPending = useMemo(() => 
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

  const handleUpdateBill = (id: string, updates: Partial<BillTracker>) => {
    updateBill(id, updates);
  };

  const handleDeleteBill = (id: string) => {
    deleteBill(id);
  };

  const handleAddBill = (bill: Omit<BillTracker, "id" | "isPaid">) => {
    addBill(bill);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-primary" />
            Contas a Pagar - {format(referenceDate, 'MMMM/yyyy')}
          </DialogTitle>
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
              Total Pendente: <span className="font-bold text-destructive">{formatCurrency(totalPending)}</span>
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
      </DialogContent>
    </Dialog>
  );
}