import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, CalendarCheck, Repeat, Shield, Building2, DollarSign, Info, Settings, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillTracker, PotentialFixedBill, BillSourceType, formatCurrency, generateBillId, TransactionLinks, OperationType, BillDisplayItem, ExternalPaidBill } from "@/types/finance";
import { BillsTrackerList } from "./BillsTrackerList";
import { FixedBillsList } from "./FixedBillsList";
import { BillsSidebarKPIs } from "./BillsSidebarKPIs";
import { FixedBillSelectorModal } from "./FixedBillSelectorModal";
import { AddPurchaseInstallmentDialog } from "./AddPurchaseInstallmentDialog";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { parseDateLocal } from "@/lib/utils";
import { ResizableDialogContent } from "../ui/ResizableDialogContent";

type PartialTransactionLinks = Partial<TransactionLinks>;

const isBillTracker = (bill: BillDisplayItem): bill is BillTracker => {
    return bill.type === 'tracker';
};

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
    transacoesV2, 
  } = useFinance();
  
  const [currentDate, setCurrentDate] = useState(startOfMonth(new Date()));
  const [showFixedBillSelector, setShowFixedBillSelector] = useState(false);
  const [fixedBillSelectorMode, setFixedBillSelectorMode] = useState<'current' | 'future'>('current');
  const [showAddPurchaseDialog, setShowAddPurchaseDialog] = useState(false);
  
  const trackerManagedBills = useMemo(() => getBillsForMonth(currentDate), [getBillsForMonth, currentDate]);
  const externalPaidBills = useMemo(() => getOtherPaidExpensesForMonth(currentDate), [getOtherPaidExpensesForMonth, currentDate]);
  
  const combinedBills: BillDisplayItem[] = useMemo(() => {
    const trackerPaidTxIds = new Set(trackerManagedBills
        .filter(b => b.isPaid && b.transactionId)
        .map(b => b.transactionId!)
    );
    const trackerBills: BillDisplayItem[] = trackerManagedBills;
    const externalBills: BillDisplayItem[] = externalPaidBills.filter(externalBill => !trackerPaidTxIds.has(externalBill.id));
    return [...trackerBills, ...externalBills];
  }, [trackerManagedBills, externalPaidBills]);
  
  const potentialFixedBills = useMemo(() => getPotentialFixedBillsForMonth(currentDate, trackerManagedBills), [getPotentialFixedBillsForMonth, currentDate, trackerManagedBills]);
  const futureFixedBills = useMemo(() => getFutureFixedBills(currentDate, trackerManagedBills), [getFutureFixedBills, currentDate, trackerManagedBills]);
  
  const totalUnpaidBills = useMemo(() => {
    const creditCardAccountIds = new Set(contasMovimento.filter(c => c.accountType === 'cartao_credito').map(c => c.id));
    return combinedBills.reduce((acc, b) => {
        const isCC = b.suggestedAccountId && creditCardAccountIds.has(b.suggestedAccountId);
        if (!b.isPaid || isCC) return acc + b.expectedAmount;
        return acc;
    }, 0);
  }, [combinedBills, contasMovimento]);
  
  const totalPaidBills = useMemo(() => {
    const creditCardAccountIds = new Set(contasMovimento.filter(c => c.accountType === 'cartao_credito').map(c => c.id));
    return combinedBills.reduce((acc, b) => {
        const isCC = b.suggestedAccountId && creditCardAccountIds.has(b.suggestedAccountId);
        if (b.isPaid && !isCC) return acc + b.expectedAmount;
        return acc;
    }, 0);
  }, [combinedBills, contasMovimento]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };
  
  const handleUpdateBill = useCallback((id: string, updates: Partial<BillTracker>) => {
    updateBill(id, updates);
  }, [updateBill]);

  const handleDeleteBill = useCallback((id: string) => { deleteBill(id); }, [deleteBill]);
  const handleAddBill = useCallback((bill: Omit<BillTracker, "id" | "isPaid" | "type">) => { setBillsTracker(prev => [...prev, { ...bill, id: generateBillId(), type: 'tracker', isPaid: false, isExcluded: false }]); }, [setBillsTracker]);
  
  const handleTogglePaid = useCallback((bill: BillDisplayItem, isChecked: boolean) => {
    if (!isBillTracker(bill)) { toast.error("Não é possível alterar o status de pagamento de transações do extrato."); return; }
    const trackerBill = bill as BillTracker;
    if (isChecked) {
      const account = contasMovimento.find(c => c.id === trackerBill.suggestedAccountId);
      const category = categoriasV2.find(c => c.id === trackerBill.suggestedCategoryId);
      if (!account || !category) { toast.error("Conta ou categoria sugerida não encontrada."); return; }
      const transactionId = `bill_tx_${trackerBill.id}`;
      const baseLinks: Partial<TransactionLinks> = {};
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
        markSeguroParcelPaid(seguroId, trackerBill.parcelaNumber, transactionId);
      }
      addTransacaoV2({ id: transactionId, date: format(new Date(), 'yyyy-MM-dd'), accountId: account.id, flow: 'out', operationType, domain, amount: trackerBill.expectedAmount, categoryId: category.id, description, links: { investmentId: null, transferGroupId: null, vehicleTransactionId: baseLinks.vehicleTransactionId || null, loanId: baseLinks.loanId || null, parcelaId: baseLinks.parcelaId || null }, conciliated: false, attachments: [], meta: { createdBy: 'bill_tracker', source: 'bill_tracker', createdAt: new Date().toISOString(), notes: `Gerado pelo Contas a Pagar. Bill ID: ${trackerBill.id}` } });
      updateBill(trackerBill.id, { isPaid: true, transactionId, paymentDate: format(new Date(), 'yyyy-MM-dd') });
      toast.success(`Conta "${trackerBill.description}" paga!`);
    } else {
      if (trackerBill.transactionId) {
        if (trackerBill.sourceType === 'loan_installment' && trackerBill.sourceRef && trackerBill.parcelaNumber) { unmarkLoanParcelPaid(parseInt(trackerBill.sourceRef)); }
        if (trackerBill.sourceType === 'insurance_installment' && trackerBill.sourceRef && trackerBill.parcelaNumber) { unmarkSeguroParcelPaid(parseInt(trackerBill.sourceRef), trackerBill.parcelaNumber); }
        setBillsTracker(prev => prev.map(b => b.id === trackerBill.id ? { ...b, isPaid: false, transactionId: undefined, paymentDate: undefined } : b));
        setTransacoesV2(prev => prev.filter(t => t.id !== trackerBill.transactionId));
        toast.info("Conta desmarcada e transação excluída.");
      } else {
        updateBill(trackerBill.id, { isPaid: false, paymentDate: undefined });
      }
    }
  }, [updateBill, addTransacaoV2, contasMovimento, categoriasV2, emprestimos, segurosVeiculo, calculateLoanAmortizationAndInterest, setBillsTracker, markSeguroParcelPaid, markLoanParcelPaid, unmarkSeguroParcelPaid, unmarkLoanParcelPaid, setTransacoesV2]);
  
  const handleToggleFixedBill = useCallback((potentialBill: PotentialFixedBill, isChecked: boolean) => {
    const { sourceType, sourceRef, parcelaNumber, dueDate, expectedAmount, description, isPaid } = potentialBill;
    if (transacoesV2.some(t => (sourceType === 'loan_installment' && t.links?.loanId === `loan_${sourceRef}` && t.links?.parcelaId === String(parcelaNumber)) || (sourceType === 'insurance_installment' && t.links?.vehicleTransactionId === `${sourceRef}_${parcelaNumber}`))) { toast.info("Esta parcela já possui transação vinculada."); return; }
    if (isChecked) {
        const isFutureBill = parseDateLocal(dueDate) > endOfMonth(currentDate);
        const newBill: BillTracker = { id: generateBillId(), type: 'tracker', description, dueDate, expectedAmount, sourceType, sourceRef, parcelaNumber, suggestedAccountId: contasMovimento.find(c => c.accountType === 'corrente')?.id, suggestedCategoryId: categoriasV2.find(c => (sourceType === 'loan_installment' && c.label.toLowerCase().includes('emprestimo')) || (sourceType === 'insurance_installment' && c.label.toLowerCase().includes('seguro')))?.id || null, isExcluded: false, isPaid: isFutureBill && !isPaid, paymentDate: isFutureBill && !isPaid ? format(new Date(), 'yyyy-MM-dd') : undefined, transactionId: isFutureBill && !isPaid ? `bill_tx_temp_${generateBillId()}` : undefined };
        if (newBill.isPaid && newBill.transactionId) {
            const account = contasMovimento.find(c => c.id === newBill.suggestedAccountId);
            const category = categoriasV2.find(c => c.id === newBill.suggestedCategoryId);
            if (!account || !category) return;
            const transactionId = newBill.transactionId;
            const baseLinks: Partial<TransactionLinks> = {};
            if (newBill.sourceType === 'loan_installment' && newBill.sourceRef && newBill.parcelaNumber) {
                const loanId = parseInt(newBill.sourceRef);
                baseLinks.loanId = `loan_${loanId}`; baseLinks.parcelaId = String(newBill.parcelaNumber);
                markLoanParcelPaid(loanId, newBill.expectedAmount, newBill.paymentDate!, newBill.parcelaNumber);
            }
            if (newBill.sourceType === 'insurance_installment' && newBill.sourceRef && newBill.parcelaNumber) {
                baseLinks.vehicleTransactionId = `${newBill.sourceRef}_${newBill.parcelaNumber}`;
                markSeguroParcelPaid(parseInt(newBill.sourceRef), newBill.parcelaNumber, transactionId);
            }
            addTransacaoV2({ id: transactionId, date: newBill.paymentDate!, accountId: account.id, flow: 'out', operationType: newBill.sourceType === 'loan_installment' ? 'pagamento_emprestimo' : 'despesa', domain: newBill.sourceType === 'loan_installment' ? 'financing' : 'operational', amount: newBill.expectedAmount, categoryId: category.id, description: newBill.description, links: { investmentId: null, transferGroupId: null, vehicleTransactionId: baseLinks.vehicleTransactionId || null, loanId: baseLinks.loanId || null, parcelaId: baseLinks.parcelaId || null }, conciliated: false, attachments: [], meta: { createdBy: 'bill_tracker', source: 'bill_tracker', createdAt: new Date().toISOString(), notes: `Adiantamento. Bill ID: ${newBill.id}` } });
            setBillsTracker(prev => [...prev, newBill]);
            toast.success(`Adiantamento registrado!`);
        } else {
            setBillsTracker(prev => [...prev, newBill]);
            toast.success("Conta fixa incluída.");
        }
    } else {
        setBillsTracker(prev => prev.filter(b => !(b.sourceType === sourceType && b.sourceRef === sourceRef && b.parcelaNumber === parcelaNumber)));
        const billToRemove = billsTracker.find(b => b.sourceType === sourceType && b.sourceRef === sourceRef && b.parcelaNumber === parcelaNumber);
        if (billToRemove && billToRemove.isPaid && billToRemove.transactionId) {
            if (billToRemove.sourceType === 'loan_installment' && billToRemove.sourceRef) unmarkLoanParcelPaid(parseInt(billToRemove.sourceRef));
            if (billToRemove.sourceType === 'insurance_installment' && billToRemove.sourceRef && billToRemove.parcelaNumber) unmarkSeguroParcelPaid(parseInt(billToRemove.sourceRef), billToRemove.parcelaNumber);
            setTransacoesV2(prev => prev.filter(t => t.id !== billToRemove.transactionId));
        }
    }
  }, [setBillsTracker, billsTracker, contasMovimento, categoriasV2, currentDate, addTransacaoV2, markLoanParcelPaid, markSeguroParcelPaid, unmarkLoanParcelPaid, unmarkSeguroParcelPaid, setTransacoesV2, transacoesV2]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <ResizableDialogContent 
          storageKey="bills_tracker_modal"
          initialWidth={1300}
          initialHeight={800}
          minWidth={900}
          minHeight={600}
          hideCloseButton={true}
          className="bg-card border-border overflow-hidden flex flex-col p-0"
        >
          <div className="modal-viewport">
            <DialogHeader className="px-6 pt-3 pb-3 border-b shrink-0 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                      <CalendarCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="cq-text-lg font-bold">Contas a Pagar</DialogTitle>
                    <p className="cq-text-xs text-muted-foreground">
                      Gestão de despesas de {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar de KPIs com largura proporcional reduzida em 30% */}
              <div className="w-[20%] min-w-[200px] max-w-[320px] shrink-0 border-r border-border bg-muted/10">
                <div className="p-4 overflow-y-auto h-full">
                  <BillsSidebarKPIs 
                    currentDate={currentDate}
                    totalPendingBills={totalUnpaidBills}
                    totalPaidBills={totalPaidBills}
                  />
                </div>
              </div>

              {/* Conteúdo Principal Flexível */}
              <div className="flex-1 flex flex-col cq-p-md overflow-hidden bg-background">
                <div className="flex items-center justify-between mb-4 shrink-0 cq-gap-md flex-wrap">
                  <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border/50">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMonthChange('prev')}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="px-4 min-w-[120px] text-center">
                      <span className="cq-text-sm font-bold text-foreground capitalize">
                        {format(currentDate, 'MMMM', { locale: ptBR })}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMonthChange('next')}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowAddPurchaseDialog(true)} className="cq-text-xs h-8">
                      <ShoppingCart className="w-3 h-3 mr-1.5" /> Compra Parcelada
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setFixedBillSelectorMode('current'); setShowFixedBillSelector(true); }} className="cq-text-xs h-8">
                      <Settings className="w-3 h-3 mr-1.5" /> Gerenciar Fixas
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setFixedBillSelectorMode('future'); setShowFixedBillSelector(true); }} className="cq-text-xs h-8">
                      <Plus className="w-3 h-3 mr-1.5" /> Adiantar
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
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
          </div>
        </ResizableDialogContent>
      </Dialog>

      <FixedBillSelectorModal open={showFixedBillSelector} onOpenChange={setShowFixedBillSelector} mode={fixedBillSelectorMode} currentDate={currentDate} potentialFixedBills={fixedBillSelectorMode === 'current' ? potentialFixedBills : futureFixedBills} onToggleFixedBill={handleToggleFixedBill} />
      <AddPurchaseInstallmentDialog open={showAddPurchaseDialog} onOpenChange={setShowAddPurchaseDialog} currentDate={currentDate} />
    </>
  );
}