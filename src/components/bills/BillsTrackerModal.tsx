import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, CalendarCheck, Repeat, Shield, Building2, DollarSign, Info, X, Settings } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillTracker, PotentialFixedBill, BillSourceType, formatCurrency, generateBillId, TransactionLinks, OperationType, BillDisplayItem, ExternalPaidBill } from "@/types/finance";
import { BillsTrackerList } from "./BillsTrackerList";
import { FixedBillsList } from "./FixedBillsList";
import { BillsSidebarKPIs } from "./BillsSidebarKPIs";
import { FixedBillSelectorModal } from "./FixedBillSelectorModal";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { parseDateLocal } from "@/lib/utils";
import { ResizableDialogContent } from "../ui/ResizableDialogContent";

interface BillsTrackerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Tipo auxiliar para links parciais
type PartialTransactionLinks = Partial<TransactionLinks>;

// Predicado de tipo para BillTracker
const isBillTracker = (bill: BillDisplayItem): bill is BillTracker => {
    return bill.type === 'tracker';
};

export function BillsTrackerModal({ open, onOpenChange }: BillsTrackerModalProps) {
  const { 
    billsTracker, 
    setBillsTracker, 
    updateBill, 
    deleteBill, 
    getBillsForMonth, 
    getPotentialFixedBillsForMonth,
    getFutureFixedBills,
    getOtherPaidExpensesForMonth,
    contasMovimento,
    addTransacaoV2,
    setTransacoesV2,
    categoriasV2,
    emprestimos,
    segurosVeiculo,
    calculateLoanAmortizationAndInterest,
    markSeguroParcelPaid,
    markLoanParcelPaid,
    unmarkSeguroParcelPaid,
    unmarkLoanParcelPaid,
  } = useFinance();
  
  const [currentDate, setCurrentDate] = useState(startOfMonth(new Date()));
  const [showFixedBillSelector, setShowFixedBillSelector] = useState(false);
  const [fixedBillSelectorMode, setFixedBillSelectorMode] = useState<'current' | 'future'>('current');
  
  // Contas gerenciadas pelo tracker (pendentes e pagas via tracker)
  const trackerManagedBills = useMemo(() => getBillsForMonth(currentDate), [getBillsForMonth, currentDate]);
  
  // Obter pagamentos externos (somente leitura)
  const externalPaidBills = useMemo(() => 
    getOtherPaidExpensesForMonth(currentDate) 
  , [getOtherPaidExpensesForMonth, currentDate]);
  
  // Lista combinada e ordenada para exibição
  const combinedBills: BillDisplayItem[] = useMemo(() => {
    const trackerPaidTxIds = new Set(trackerManagedBills
        .filter(b => b.isPaid && b.transactionId)
        .map(b => b.transactionId!)
    );
    
    const trackerBills: BillDisplayItem[] = trackerManagedBills;
    
    const externalBills: BillDisplayItem[] = externalPaidBills.filter(externalBill => 
        !trackerPaidTxIds.has(externalBill.id)
    );
    
    return [...trackerBills, ...externalBills];
  }, [trackerManagedBills, externalPaidBills]);
  
  const potentialFixedBills = useMemo(() => 
    getPotentialFixedBillsForMonth(currentDate, trackerManagedBills)
  , [getPotentialFixedBillsForMonth, currentDate, trackerManagedBills]);
  
  const futureFixedBills = useMemo(() => 
    getFutureFixedBills(currentDate, trackerManagedBills)
  , [getFutureFixedBills, currentDate, trackerManagedBills]);
  
  // CÁLCULOS AJUSTADOS PARA O SIDEBAR
  // A pagar (Pendentes): Apenas itens do trackerManagedBills que não estão pagos e não estão excluídos
  const totalUnpaidBills = useMemo(() => 
    trackerManagedBills
      .filter(b => !b.isPaid && !b.isExcluded)
      .reduce((acc, b) => acc + b.expectedAmount, 0)
  , [trackerManagedBills]);
  
  // Total Pago: Itens do tracker marcados como pagos + itens externos (extrato)
  const totalPaidBills = useMemo(() => {
    const trackerPaid = trackerManagedBills.filter(b => b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0);
    const externalPaid = externalPaidBills.reduce((acc, b) => acc + b.expectedAmount, 0);
    return trackerPaid + externalPaid;
  }, [trackerManagedBills, externalPaidBills]);

  // --- Handlers ---
  
  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };
  
  const handleUpdateBill = useCallback((id: string, updates: Partial<BillTracker>) => {
    updateBill(id, updates);
  }, [updateBill]);

  const handleDeleteBill = useCallback((id: string) => {
    deleteBill(id);
  }, [deleteBill]);
  
  const handleAddBill = useCallback((bill: Omit<BillTracker, "id" | "isPaid" | "type">) => {
    const newBill: BillTracker = {
      ...bill,
      id: generateBillId(),
      type: 'tracker',
      isPaid: false,
      isExcluded: false,
    };
    setBillsTracker(prev => [...prev, newBill]);
  }, [setBillsTracker]);
  
  const handleTogglePaid = useCallback((bill: BillTracker, isChecked: boolean) => {
    if (!isBillTracker(bill)) return;
    
    const trackerBill = bill as BillTracker;

    if (isChecked) {
      const account = contasMovimento.find(c => c.id === trackerBill.suggestedAccountId);
      const category = categoriasV2.find(c => c.id === trackerBill.suggestedCategoryId);
      
      if (!account) {
        toast.error("Conta de pagamento sugerida não encontrada.");
        return;
      }
      if (!category) {
        toast.error("Categoria sugerida não encontrada.");
        return;
      }
      
      const transactionId = `bill_tx_${trackerBill.id}`;
      const baseLinks: PartialTransactionLinks = {};
      let description = trackerBill.description;
      
      const operationType: OperationType = trackerBill.sourceType === 'loan_installment' ? 'pagamento_emprestimo' : 'despesa';
      const domain = trackerBill.sourceType === 'loan_installment' ? 'financing' : 'operational';
      
      if (trackerBill.sourceType === 'loan_installment' && trackerBill.sourceRef && trackerBill.parcelaNumber) {
        const loanId = parseInt(trackerBill.sourceRef);
        const scheduleItem = calculateLoanAmortizationAndInterest(loanId, trackerBill.parcelaNumber);
        
        if (scheduleItem) {
            baseLinks.loanId = `loan_${loanId}`;
            baseLinks.parcelaId = String(trackerBill.parcelaNumber);
            const loan = emprestimos.find(e => e.id === loanId);
            description = `Pagamento Empréstimo ${loan?.contrato || 'N/A'} - P${trackerBill.parcelaNumber}/${loan?.meses || 'N/A'}`;
            markLoanParcelPaid(loanId, trackerBill.expectedAmount, format(new Date(), 'yyyy-MM-dd'), trackerBill.parcelaNumber);
        }
      }
      
      if (trackerBill.sourceType === 'insurance_installment' && trackerBill.sourceRef && trackerBill.parcelaNumber) {
        baseLinks.vehicleTransactionId = `${trackerBill.sourceRef}_${trackerBill.parcelaNumber}`;
        const seguroId = parseInt(trackerBill.sourceRef);
        const seguro = segurosVeiculo.find(s => s.id === seguroId);
        description = `Pagamento Seguro ${seguro?.numeroApolice || 'N/A'} - P${trackerBill.parcelaNumber}/${seguro?.numeroParcelas || 'N/A'}`;
        markSeguroParcelPaid(seguroId, trackerBill.parcelaNumber, transactionId);
      }
      
      const newTransaction = {
        id: transactionId,
        date: format(new Date(), 'yyyy-MM-dd'),
        accountId: account.id,
        flow: 'out' as const,
        operationType: operationType,
        domain: domain as 'operational' | 'financing',
        amount: trackerBill.expectedAmount,
        categoryId: category.id,
        description: description,
        links: {
          investmentId: baseLinks.investmentId || null,
          transferGroupId: baseLinks.transferGroupId || null,
          vehicleTransactionId: baseLinks.vehicleTransactionId || null,
          loanId: baseLinks.loanId || null,
          parcelaId: baseLinks.parcelaId || null,
        },
        conciliated: false,
        attachments: [],
        meta: {
          createdBy: 'bill_tracker',
          source: 'bill_tracker' as const,
          createdAt: new Date().toISOString(),
          notes: `Gerado pelo Contas a Pagar. Bill ID: ${trackerBill.id}`,
        }
      };
      
      addTransacaoV2(newTransaction);
      updateBill(trackerBill.id, { 
        isPaid: true, 
        transactionId, 
        paymentDate: format(new Date(), 'yyyy-MM-dd') 
      });
      
      toast.success(`Conta "${trackerBill.description}" paga e transação criada!`);
      
    } else {
      if (trackerBill.transactionId) {
        if (trackerBill.sourceType === 'loan_installment' && trackerBill.sourceRef && trackerBill.parcelaNumber) {
            unmarkLoanParcelPaid(parseInt(trackerBill.sourceRef)); 
        }
        if (trackerBill.sourceType === 'insurance_installment' && trackerBill.sourceRef && trackerBill.parcelaNumber) {
            unmarkSeguroParcelPaid(parseInt(trackerBill.sourceRef), trackerBill.parcelaNumber);
        }
        setBillsTracker(prev => prev.map(b => {
            if (b.id === trackerBill.id) {
                return { ...b, isPaid: false, transactionId: undefined, paymentDate: undefined };
            }
            return b;
        }));
        setTransacoesV2(prev => prev.filter(t => t.id !== trackerBill.transactionId));
        toast.info("Conta desmarcada como paga e transação excluída.");
      } else {
        updateBill(trackerBill.id, { isPaid: false, paymentDate: undefined });
      }
    }
  }, [updateBill, addTransacaoV2, contasMovimento, categoriasV2, emprestimos, segurosVeiculo, calculateLoanAmortizationAndInterest, setBillsTracker, markSeguroParcelPaid, markLoanParcelPaid, unmarkSeguroParcelPaid, unmarkLoanParcelPaid, setTransacoesV2]);
  
  const handleToggleFixedBill = useCallback((potentialBill: PotentialFixedBill, isChecked: boolean) => {
    const { sourceType, sourceRef, parcelaNumber, dueDate, expectedAmount, description, isPaid } = potentialBill;
    
    if (isChecked) {
        const isFutureBill = parseDateLocal(dueDate) > endOfMonth(currentDate);
        
        const newBill: BillTracker = {
            id: generateBillId(),
            type: 'tracker',
            description,
            dueDate,
            expectedAmount,
            sourceType,
            sourceRef,
            parcelaNumber,
            suggestedAccountId: contasMovimento.find(c => c.accountType === 'corrente')?.id,
            suggestedCategoryId: categoriasV2.find(c => 
                (sourceType === 'loan_installment' && c.label.toLowerCase().includes('emprestimo')) ||
                (sourceType === 'insurance_installment' && c.label.toLowerCase().includes('seguro'))
            )?.id || null,
            isExcluded: false,
            isPaid: isFutureBill && !isPaid,
            paymentDate: isFutureBill && !isPaid ? format(new Date(), 'yyyy-MM-dd') : undefined,
            transactionId: isFutureBill && !isPaid ? `bill_tx_temp_${generateBillId()}` : undefined,
        };
        
        if (newBill.isPaid && newBill.transactionId) {
            const account = contasMovimento.find(c => c.id === newBill.suggestedAccountId);
            const category = categoriasV2.find(c => c.id === newBill.suggestedCategoryId);
            
            if (!account || !category) {
                toast.error("Erro ao adiantar: Conta ou Categoria sugerida não encontrada.");
                return;
            }
            
            const transactionId = newBill.transactionId;
            const baseLinks: PartialTransactionLinks = {};
            let txDescription = newBill.description;
            
            const operationType: OperationType = newBill.sourceType === 'loan_installment' ? 'pagamento_emprestimo' : 'despesa';
            const domain = newBill.sourceType === 'loan_installment' ? 'financing' : 'operational';
            
            if (newBill.sourceType === 'loan_installment' && newBill.sourceRef && newBill.parcelaNumber) {
                const loanId = parseInt(newBill.sourceRef);
                baseLinks.loanId = `loan_${loanId}`;
                baseLinks.parcelaId = String(newBill.parcelaNumber);
                markLoanParcelPaid(loanId, newBill.expectedAmount, newBill.paymentDate!, newBill.parcelaNumber);
            }
            
            if (newBill.sourceType === 'insurance_installment' && newBill.sourceRef && newBill.parcelaNumber) {
                baseLinks.vehicleTransactionId = `${newBill.sourceRef}_${newBill.parcelaNumber}`;
                const seguroId = parseInt(newBill.sourceRef);
                markSeguroParcelPaid(seguroId, newBill.parcelaNumber, transactionId);
            }
            
            const newTransaction = {
                id: transactionId,
                date: newBill.paymentDate!,
                accountId: account.id,
                flow: 'out' as const,
                operationType: operationType,
                domain: domain as 'operational' | 'financing',
                amount: newBill.expectedAmount,
                categoryId: category.id,
                description: txDescription,
                links: {
                    investmentId: baseLinks.investmentId || null,
                    transferGroupId: baseLinks.transferGroupId || null,
                    vehicleTransactionId: baseLinks.vehicleTransactionId || null,
                    loanId: baseLinks.loanId || null,
                    parcelaId: baseLinks.parcelaId || null,
                },
                conciliated: false,
                attachments: [],
                meta: {
                    createdBy: 'bill_tracker',
                    source: 'bill_tracker' as const,
                    createdAt: new Date().toISOString(),
                    notes: `Adiantamento gerado pelo Contas a Pagar. Bill ID: ${newBill.id}`,
                }
            };
            
            addTransacaoV2(newTransaction);
            setBillsTracker(prev => [...prev, newBill]);
            toast.success(`Adiantamento de parcela futura registrado e pago hoje!`);
            
        } else {
            setBillsTracker(prev => [...prev, newBill]);
            toast.success("Conta fixa incluída na lista do mês.");
        }
        
    } else {
        const billToRemove = billsTracker.find(b => 
            b.sourceType === sourceType && 
            b.sourceRef === sourceRef && 
            b.parcelaNumber === parcelaNumber
        );
        
        if (billToRemove) {
            if (billToRemove.isPaid) {
                if (billToRemove.transactionId) {
                    if (billToRemove.sourceType === 'loan_installment' && billToRemove.sourceRef && billToRemove.parcelaNumber) {
                        unmarkLoanParcelPaid(parseInt(billToRemove.sourceRef)); 
                    }
                    if (billToRemove.sourceType === 'insurance_installment' && billToRemove.sourceRef && billToRemove.parcelaNumber) {
                        unmarkSeguroParcelPaid(parseInt(billToRemove.sourceRef), billToRemove.parcelaNumber);
                    }
                    setTransacoesV2(prev => prev.filter(t => t.id !== billToRemove.transactionId));
                    setBillsTracker(prev => prev.filter(b => b.id !== billToRemove.id));
                    toast.info("Adiantamento estornado e parcela removida.");
                    return;
                }
                toast.error("Não é possível remover contas fixas já pagas sem Transaction ID.");
                return;
            }
            const isFutureBill = parseDateLocal(dueDate) > endOfMonth(currentDate);
            if (isFutureBill) {
                setBillsTracker(prev => prev.filter(b => b.id !== billToRemove.id));
                toast.info("Parcela futura removida da lista.");
            } else {
                updateBill(billToRemove.id, { isExcluded: true });
                toast.info("Conta fixa excluída da lista deste mês.");
            }
        }
    }
  }, [setBillsTracker, contasMovimento, categoriasV2, billsTracker, updateBill, currentDate, addTransacaoV2, markLoanParcelPaid, markSeguroParcelPaid, unmarkLoanParcelPaid, unmarkSeguroParcelPaid, setTransacoesV2]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <ResizableDialogContent 
          storageKey="bills_tracker_modal"
          initialWidth={1200}
          initialHeight={800}
          minWidth={800}
          minHeight={600}
          hideCloseButton={true}
          className="bg-card border-border overflow-hidden flex flex-col p-0"
        >
          <DialogHeader className="p-6 pb-0 shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarCheck className="w-6 h-6 text-primary" />
                Contas a Pagar
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleMonthChange('prev')}>
                  Anterior
                </Button>
                <h4 className="font-semibold text-lg w-40 text-center">
                  {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </h4>
                <Button variant="outline" size="sm" onClick={() => handleMonthChange('next')}>
                  Próximo
                </Button>
              </div>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                <X className="w-5 h-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-1 overflow-hidden p-6 pt-4 gap-6">
            <div className="w-1/4 shrink-0 overflow-y-auto">
                <BillsSidebarKPIs 
                    currentDate={currentDate}
                    totalPendingBills={totalUnpaidBills}
                    totalPaidBills={totalPaidBills}
                />
            </div>
            
            <div className="flex-1 flex flex-col min-w-0 space-y-4">
                <div className="flex gap-3 shrink-0">
                    <Button 
                        variant="outline" 
                        onClick={() => { setFixedBillSelectorMode('current'); setShowFixedBillSelector(true); }}
                        className="gap-2"
                    >
                        <Repeat className="w-4 h-4" /> Gerenciar Parcelas do Mês
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => { setFixedBillSelectorMode('future'); setShowFixedBillSelector(true); }}
                        className="gap-2"
                    >
                        <Settings className="w-4 h-4" /> Próximos Vencimentos
                    </Button>
                </div>
                
                <div className="flex-1 min-h-0">
                    <BillsTrackerList
                        bills={combinedBills}
                        onUpdateBill={handleUpdateBill}
                        onDeleteBill={handleDeleteBill}
                        onAddBill={handleAddBill}
                        onTogglePaid={handleTogglePaid}
                        currentDate={currentDate}
                    />
                </div>
            </div>
          </div>
        </ResizableDialogContent>
      </Dialog>
      
      {showFixedBillSelector && (
        <FixedBillSelectorModal
            open={showFixedBillSelector}
            onOpenChange={setShowFixedBillSelector}
            mode={fixedBillSelectorMode}
            currentDate={currentDate}
            potentialFixedBills={fixedBillSelectorMode === 'current' ? potentialFixedBills : futureFixedBills}
            onToggleFixedBill={handleToggleFixedBill}
        />
      )}
    </>
  );
}