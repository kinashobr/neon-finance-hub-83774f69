import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarCheck, RefreshCw, X, ListChecks } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillTracker, PotentialFixedBill, formatCurrency, generateBillId, TransacaoCompleta } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format, isPast, isSameMonth, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { toast } from "sonner";
import { BillsContextSidebar } from "./BillsContextSidebar";
import { BillsTrackerList } from "./BillsTrackerList";
import { AllInstallmentsReviewModal } from "./AllInstallmentsReviewModal";
import { MonthlyTransactionSummary } from "./MonthlyTransactionSummary"; // Mantendo o import

interface BillsTrackerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillsTrackerModal({ open, onOpenChange }: BillsTrackerModalProps) {
  const { 
    billsTracker, 
    setBillsTracker, 
    updateBill, 
    deleteBill, 
    getBillsForMonth,
    getPotentialFixedBillsForMonth,
    getFutureFixedBills,
    getContasCorrentesTipo,
    addTransacaoV2,
    markLoanParcelPaid,
    markSeguroParcelPaid,
    unmarkLoanParcelPaid,
    unmarkSeguroParcelPaid,
    transacoesV2,
    setTransacoesV2, // <-- CORRIGIDO: Adicionado setTransacoesV2
    categoriasV2,
    monthlyRevenueForecast,
    setMonthlyRevenueForecast,
    getRevenueForPreviousMonth,
    getTransactionsForMonth,
  } = useFinance();
  
  const [referenceDate, setReferenceDate] = useState(startOfMonth(new Date()));
  const [showInstallmentsModal, setShowInstallmentsModal] = useState(false);
  
  const contasCorrentes = getContasCorrentesTipo();
  const categoriesMap = useMemo(() => new Map(categoriasV2.map(c => [c.id, c])), [categoriasV2]);

  // 1. Contas Fixas/Recorrentes (BillsTracker)
  const localBills = useMemo(() => getBillsForMonth(referenceDate), [getBillsForMonth, referenceDate]);
  
  // 2. Contas Potenciais (Empréstimos/Seguros) - Usado para o modal de revisão
  const potentialBills = useMemo(() => getPotentialFixedBillsForMonth(referenceDate, billsTracker), [getPotentialFixedBillsForMonth, referenceDate, billsTracker]);
  
  // 3. Transações Reais do Mês (para o resumo)
  const monthlyTransactions = useMemo(() => getTransactionsForMonth(referenceDate), [getTransactionsForMonth, referenceDate]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setReferenceDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };
  
  const handleTogglePaid = useCallback((bill: BillTracker, isChecked: boolean) => {
    if (isChecked) {
      handleMarkPaid(bill);
    } else {
      handleUnmarkPaid(bill);
    }
  }, [updateBill, addTransacaoV2, markLoanParcelPaid, markSeguroParcelPaid, unmarkLoanParcelPaid, unmarkSeguroParcelPaid, setTransacoesV2]);

  const handleMarkPaid = (bill: BillTracker) => {
    if (!bill.suggestedAccountId) {
      toast.error("Selecione uma conta de débito antes de marcar como pago.");
      return;
    }
    
    const paymentDate = format(new Date(), 'yyyy-MM-dd');
    const transactionId = generateBillId();
    
    const newTx: TransacaoCompleta = {
      id: transactionId,
      date: paymentDate,
      accountId: bill.suggestedAccountId,
      flow: 'out',
      operationType: bill.sourceType === 'loan_installment' ? 'pagamento_emprestimo' : bill.sourceType === 'insurance_installment' ? 'despesa' : 'despesa',
      domain: bill.sourceType === 'loan_installment' ? 'financing' : 'operational',
      amount: bill.expectedAmount,
      categoryId: bill.suggestedCategoryId || null,
      description: bill.description,
      links: {
        investmentId: null,
        loanId: bill.sourceType === 'loan_installment' ? `loan_${bill.sourceRef}` : null,
        transferGroupId: null,
        parcelaId: bill.sourceType === 'loan_installment' ? String(bill.parcelaNumber) : null,
        vehicleTransactionId: bill.sourceType === 'insurance_installment' ? `${bill.sourceRef}_${bill.parcelaNumber}` : null,
      },
      conciliated: false,
      attachments: [],
      meta: {
        createdBy: 'bill_tracker',
        source: 'bill_tracker',
        createdAt: new Date().toISOString(),
      }
    };
    
    addTransacaoV2(newTx);
    
    updateBill(bill.id, {
      isPaid: true,
      paymentDate,
      transactionId,
    });
    
    if (bill.sourceType === 'loan_installment' && bill.sourceRef && bill.parcelaNumber) {
      const loanId = parseInt(bill.sourceRef);
      if (!isNaN(loanId)) {
        markLoanParcelPaid(loanId, bill.expectedAmount, paymentDate, bill.parcelaNumber);
      }
    }
    if (bill.sourceType === 'insurance_installment' && bill.sourceRef && bill.parcelaNumber) {
      const seguroId = parseInt(bill.sourceRef);
      if (!isNaN(seguroId)) {
        markSeguroParcelPaid(seguroId, bill.parcelaNumber, transactionId);
      }
    }
    
    toast.success(`Conta ${bill.description} marcada como paga!`);
  };
  
  const handleUnmarkPaid = (bill: BillTracker) => {
    if (!bill.transactionId) return;
    
    setTransacoesV2(prev => prev.filter(t => t.id !== bill.transactionId));
    
    updateBill(bill.id, {
      isPaid: false,
      paymentDate: undefined,
      transactionId: undefined,
    });
    
    if (bill.sourceType === 'loan_installment' && bill.sourceRef) {
      const loanId = parseInt(bill.sourceRef);
      if (!isNaN(loanId)) {
        unmarkLoanParcelPaid(loanId);
      }
    }
    if (bill.sourceType === 'insurance_installment' && bill.sourceRef && bill.parcelaNumber) {
      const seguroId = parseInt(bill.sourceRef);
      if (!isNaN(seguroId)) {
        unmarkSeguroParcelPaid(seguroId, bill.parcelaNumber);
      }
    }
    
    toast.info(`Pagamento de ${bill.description} estornado.`);
  };
  
  const handleAddBill = (bill: Omit<BillTracker, "id" | "isPaid">) => {
    const newBill: BillTracker = {
      ...bill,
      id: generateBillId(),
      isPaid: false,
      isExcluded: false,
    };
    setBillsTracker(prev => [...prev, newBill]);
  };
  
  const handleSaveAndClose = () => {
    onOpenChange(false);
  };
  
  const handleToggleInstallment = useCallback((potentialBill: PotentialFixedBill, isChecked: boolean) => {
    const existingBill = billsTracker.find(b => 
        b.sourceType === potentialBill.sourceType && 
        b.sourceRef === potentialBill.sourceRef && 
        b.parcelaNumber === potentialBill.parcelaNumber
    );
    
    if (isChecked) {
        if (!existingBill) {
            const newBill: BillTracker = {
                id: generateBillId(),
                description: potentialBill.description,
                dueDate: potentialBill.dueDate,
                expectedAmount: potentialBill.expectedAmount,
                isPaid: potentialBill.isPaid,
                paymentDate: potentialBill.isPaid ? format(new Date(), 'yyyy-MM-dd') : undefined,
                transactionId: undefined,
                sourceType: potentialBill.sourceType,
                sourceRef: potentialBill.sourceRef,
                parcelaNumber: potentialBill.parcelaNumber,
                suggestedAccountId: contasCorrentes[0]?.id,
                suggestedCategoryId: categoriesMap.get('cat_seguro')?.id || categoriesMap.get('cat_alimentacao')?.id,
                isExcluded: false,
            };
            setBillsTracker(prev => [...prev, newBill]);
            toast.success(`Parcela ${potentialBill.description} incluída.`);
        } else if (existingBill.isExcluded) {
            updateBill(existingBill.id, { isExcluded: false });
            toast.success(`Parcela ${potentialBill.description} reativada.`);
        }
    } else {
        if (existingBill && !existingBill.isPaid) {
            updateBill(existingBill.id, { isExcluded: true });
            toast.info(`Parcela ${potentialBill.description} excluída da lista deste mês.`);
        } else if (existingBill && existingBill.isPaid) {
            toast.error("Não é possível excluir parcelas já pagas. Estorne o pagamento primeiro.");
        }
    }
  }, [billsTracker, setBillsTracker, updateBill, contasCorrentes, categoriesMap]);

  // Cálculos para o Sidebar
  const totalExpectedExpense = localBills.filter(b => !b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0);
  const totalPaid = localBills.filter(b => b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0);
  const pendingCount = localBills.filter(b => !b.isPaid).length;
  
  const totalMonthlyOut = monthlyTransactions
    .filter(t => t.flow === 'out' && t.operationType !== 'initial_balance')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const totalMonthlyIn = monthlyTransactions
    .filter(t => t.flow === 'in' && t.operationType !== 'initial_balance')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const netForecast = monthlyRevenueForecast - totalExpectedExpense;
  const previousMonthRevenue = getRevenueForPreviousMonth(referenceDate);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarCheck className="w-5 h-5 text-primary" />
                <div>
                  <DialogTitle className="text-xl">Controle de Contas a Pagar</DialogTitle>
                  <DialogDescription className="text-sm">
                    Planejamento e acompanhamento de despesas do mês
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleMonthChange('prev')}>
                  <RefreshCw className="w-4 h-4 rotate-180" />
                </Button>
                <h4 className="font-semibold text-lg w-32 text-center">
                  {format(referenceDate, 'MMMM/yy')}
                </h4>
                <Button variant="outline" size="sm" onClick={() => handleMonthChange('next')}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            
            {/* Coluna 1: Sidebar de Contexto */}
            <div className="w-[300px] shrink-0 h-full overflow-y-auto">
              <BillsContextSidebar
                localRevenueForecast={monthlyRevenueForecast}
                setLocalRevenueForecast={setMonthlyRevenueForecast}
                previousMonthRevenue={previousMonthRevenue}
                totalExpectedExpense={totalExpectedExpense}
                totalPaid={totalPaid}
                pendingCount={pendingCount}
                netForecast={netForecast}
                onSaveAndClose={handleSaveAndClose}
                onOpenAllInstallments={() => setShowInstallmentsModal(true)}
              />
              
              {/* Adicionando o resumo de transações reais aqui, abaixo do sidebar de contexto */}
              <div className="p-4 pt-0">
                <MonthlyTransactionSummary 
                  transactions={monthlyTransactions} 
                  referenceDate={referenceDate} 
                />
              </div>
            </div>

            {/* Coluna 2: Lista de Contas */}
            <div className="flex-1 min-w-0 h-full overflow-y-auto">
              <BillsTrackerList
                bills={localBills}
                onUpdateBill={updateBill}
                onDeleteBill={deleteBill}
                onAddBill={handleAddBill}
                onTogglePaid={handleTogglePaid}
                currentDate={referenceDate}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Revisão de Parcelas Fixas */}
      <AllInstallmentsReviewModal
        open={showInstallmentsModal}
        onOpenChange={setShowInstallmentsModal}
        referenceDate={referenceDate}
        localBills={billsTracker}
        onToggleInstallment={handleToggleInstallment}
      />
    </>
  );
}