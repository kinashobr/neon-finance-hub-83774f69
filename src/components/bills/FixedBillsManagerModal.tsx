import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Repeat, X } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillTracker, PotentialFixedBill, formatCurrency, generateBillId, BillSourceType } from "@/types/finance";
import { FixedBillsList } from "./FixedBillsList";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { parseDateLocal } from "@/lib/utils";

interface FixedBillsManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: Date;
}

export function FixedBillsManagerModal({ open, onOpenChange, currentDate }: FixedBillsManagerModalProps) {
  const { 
    billsTracker, 
    setBillsTracker, 
    updateBill, 
    getPotentialFixedBillsForMonth,
    contasMovimento,
    categoriasV2,
  } = useFinance();
  
  // Bills already included in the tracker for the current month
  const currentMonthBills = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    // Filter bills that are relevant to the current month (due or paid in this month)
    return billsTracker.filter(b => {
        const billDueDate = parseDateLocal(b.dueDate);
        const isDueInMonth = parseDateLocal(b.dueDate) >= monthStart && parseDateLocal(b.dueDate) <= currentDate;
        const isPaidInMonth = b.isPaid && b.paymentDate && parseDateLocal(b.paymentDate) >= monthStart && parseDateLocal(b.paymentDate) <= currentDate;
        
        return (b.sourceType === 'loan_installment' || b.sourceType === 'insurance_installment') && (isDueInMonth || isPaidInMonth);
    });
  }, [billsTracker, currentDate]);
  
  // Potential fixed bills for the current month
  const potentialFixedBills = useMemo(() => 
    getPotentialFixedBillsForMonth(currentDate, currentMonthBills)
  , [getPotentialFixedBillsForMonth, currentDate, currentMonthBills]);

  const handleToggleFixedBill = useCallback((potentialBill: PotentialFixedBill, isChecked: boolean) => {
    const { sourceType, sourceRef, parcelaNumber, dueDate, expectedAmount, description, isPaid } = potentialBill;
    
    if (isChecked) {
        // Add to billsTracker
        const newBill: BillTracker = {
            id: generateBillId(),
            description,
            dueDate,
            expectedAmount,
            isPaid,
            sourceType,
            sourceRef,
            parcelaNumber,
            suggestedAccountId: contasMovimento.find(c => c.accountType === 'corrente')?.id,
            suggestedCategoryId: categoriasV2.find(c => c.label.toLowerCase() === 'seguro' || c.label.toLowerCase() === 'emprestimo')?.id || null,
            isExcluded: false,
            paymentDate: isPaid ? format(parseDateLocal(dueDate), 'yyyy-MM-dd') : undefined,
        };
        setBillsTracker(prev => [...prev, newBill]);
        toast.success("Conta fixa incluída na lista do mês.");
    } else {
        // Remove from billsTracker (by marking as excluded for this month)
        const billToRemove = currentMonthBills.find(b => 
            b.sourceType === sourceType && 
            b.sourceRef === sourceRef && 
            b.parcelaNumber === parcelaNumber
        );
        
        if (billToRemove) {
            if (billToRemove.isPaid) {
                toast.error("Não é possível remover contas fixas já pagas. Desmarque o pagamento primeiro.");
                return;
            }
            // Mark as excluded for this month
            updateBill(billToRemove.id, { isExcluded: true });
            toast.info("Conta fixa excluída da lista deste mês.");
        }
    }
  }, [setBillsTracker, contasMovimento, categoriasV2, currentMonthBills, updateBill]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0 shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Repeat className="w-6 h-6 text-primary" />
              Gerenciar Contas Fixas ({format(currentDate, 'MMMM yyyy', { locale: ptBR })})
            </div>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="w-5 h-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 p-6 pt-4 overflow-y-auto">
            <FixedBillsList
              potentialBills={potentialFixedBills}
              onToggleFixedBill={handleToggleFixedBill}
              currentDate={currentDate}
              title="Parcelas Fixas Vencendo no Mês"
              description="Selecione as parcelas de empréstimos e seguros que devem ser incluídas na lista de contas a pagar deste mês. Contas já pagas ou excluídas não podem ser alteradas aqui."
            />
        </div>
      </DialogContent>
    </Dialog>
  );
}