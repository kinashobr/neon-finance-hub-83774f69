import { useState, useMemo, useEffect, useCallback } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, Clock, TrendingUp, TrendingDown, DollarSign, Calculator, Menu, LogOut, X, Save, RefreshCw } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillsTrackerList } from "./BillsTrackerList";
import { BillsContextSidebar } from "./BillsContextSidebar";
// import { FixedInstallmentSelector } from "./FixedInstallmentSelector"; // REMOVED
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BillTracker, formatCurrency, TransacaoCompleta, getDomainFromOperation, generateTransactionId, generateBillId, PotentialFixedBill } from "@/types/finance";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { toast } from "sonner";
import { ResizableSidebar } from "../transactions/ResizableSidebar";
import { ResizableDialogContent } from "../ui/ResizableDialogContent";
import { parseDateLocal } from "@/lib/utils";
import { isSameMonth } from "date-fns";
import { AllInstallmentsReviewModal } from "./AllInstallmentsReviewModal";

interface BillsTrackerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isGeneratedTemplate = (bill: BillTracker) => 
    bill.sourceType !== 'ad_hoc' && bill.sourceRef;

export function BillsTrackerModal({ open, onOpenChange }: BillsTrackerModalProps) {
  const { 
    billsTracker, 
    setBillsTracker, 
    updateBill, 
    deleteBill, 
    getBillsForMonth, 
    getPotentialFixedBillsForMonth,
    dateRanges,
    monthlyRevenueForecast,
    setMonthlyRevenueForecast,
    getRevenueForPreviousMonth,
    markLoanParcelPaid,
    unmarkLoanParcelPaid,
    markSeguroParcelPaid,
    unmarkSeguroParcelPaid,
    setTransacoesV2,
    contasMovimento, 
    categoriasV2, 
    transacoesV2,
  } = useFinance();
  
  const referenceDate = dateRanges.range1.to || new Date();
  
  const [localBills, setLocalBills] = useState<BillTracker[]>([]);
  const [originalMonthBills, setOriginalMonthBills] = useState<BillTracker[]>([]);
  
  const previousMonthRevenue = useMemo(() => {
    return getRevenueForPreviousMonth(referenceDate);
  }, [getRevenueForPreviousMonth, referenceDate]);
  
  const [localRevenueForecast, setLocalRevenueForecast] = useState(monthlyRevenueForecast || previousMonthRevenue);
  
  // NEW STATE for the All Installments Review Modal
  const [showAllInstallmentsModal, setShowAllInstallmentsModal] = useState(false);
  
  useEffect(() => {
    if (!open) return;
    
    // 1. Carrega APENAS as contas persistidas (ad-hoc, vencidas no mês, ou pagas no mês)
    const persistedBills = getBillsForMonth(referenceDate);
    
    setLocalBills(persistedBills);
    setOriginalMonthBills(persistedBills.map(b => ({ ...b }))); 
    
    setLocalRevenueForecast(monthlyRevenueForecast || previousMonthRevenue);
    
  }, [open, referenceDate, getBillsForMonth, monthlyRevenueForecast, previousMonthRevenue]);

  // Calcula as parcelas fixas potenciais (Empréstimos/Seguros) - Mantido para a lógica de inclusão/exclusão
  const potentialFixedBills = useMemo(() => {
    // Passa localBills para que o seletor saiba quais já estão incluídas
    return getPotentialFixedBillsForMonth(referenceDate, localBills);
  }, [getPotentialFixedBillsForMonth, referenceDate, localBills]);

  const totalExpectedExpense = useMemo(() => 
    localBills.filter(b => !b.isExcluded).reduce((acc, b) => acc + b.expectedAmount, 0),
    [localBills]
  );
  
  const totalPaid = useMemo(() => 
    localBills.filter(b => b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0),
    [localBills]
  );
  
  const totalBills = localBills.length;
  const paidCount = localBills.filter(b => b.isPaid).length;
  const pendingCount = totalBills - paidCount;
  
  const netForecast = localRevenueForecast - totalExpectedExpense;

  const handleUpdateBillLocal = useCallback((id: string, updates: Partial<BillTracker>) => {
    setLocalBills(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const handleDeleteBillLocal = useCallback((id: string) => {
    setLocalBills(prev => prev.filter(b => b.id !== id));
  }, []);

  const handleTogglePaidLocal = useCallback((bill: BillTracker, isChecked: boolean) => {
    const today = new Date();
    
    setLocalBills(prev => prev.map(b => {
        if (b.id === bill.id) {
            return { 
                ...b, 
                isPaid: isChecked,
                paymentDate: isChecked ? format(today, 'yyyy-MM-dd') : undefined,
                transactionId: isChecked ? b.transactionId || generateTransactionId() : undefined,
            };
        }
        return b;
    }));
  }, []);
  
  const handleAddBillAndRefresh = useCallback((bill: Omit<BillTracker, "id" | "isPaid">) => {
    const tempId = generateBillId();
    const newBill: BillTracker = {
        ...bill,
        id: tempId,
        isPaid: false,
    };
    
    setLocalBills(prev => [...prev, newBill]);
    
    toast.success("Conta avulsa adicionada localmente. Salve para persistir.");
    
  }, []);
  
  const handleToggleFixedBill = useCallback((potentialBill: PotentialFixedBill, isChecked: boolean) => {
    const existingBill = localBills.find(b => 
        b.sourceType === potentialBill.sourceType &&
        b.sourceRef === potentialBill.sourceRef &&
        b.parcelaNumber === potentialBill.parcelaNumber
    );
    
    if (isChecked) {
        if (existingBill && existingBill.isPaid) {
            toast.error("Esta parcela já foi paga e não pode ser removida.");
            return;
        }
        
        if (existingBill && existingBill.isExcluded) {
            // Se já existe e estava excluída, reativa
            setLocalBills(prev => prev.map(b => 
                b.id === existingBill.id ? { ...b, isExcluded: false } : b
            ));
            toast.info("Parcela reativada no planejamento.");
            return;
        }
        
        if (!existingBill) {
            // Cria uma nova conta (BillTracker) a partir do potencial
            const newBill: BillTracker = {
                id: generateBillId(),
                description: potentialBill.description,
                dueDate: potentialBill.dueDate,
                expectedAmount: potentialBill.expectedAmount,
                isPaid: false,
                sourceType: potentialBill.sourceType,
                sourceRef: potentialBill.sourceRef,
                parcelaNumber: potentialBill.parcelaNumber,
                suggestedAccountId: contasMovimento.find(c => c.accountType === 'conta_corrente')?.id,
                suggestedCategoryId: potentialBill.sourceType === 'loan_installment' 
                    ? categoriasV2.find(c => c.nature === 'despesa_fixa' && c.label.toLowerCase().includes('empréstimo'))?.id || null
                    : categoriasV2.find(c => c.nature === 'despesa_fixa' && c.label.toLowerCase().includes('seguro'))?.id || null,
                isExcluded: false,
            };
            setLocalBills(prev => [...prev, newBill]);
            toast.success("Parcela fixa incluída no planejamento.");
        }
        
    } else {
        if (existingBill) {
            if (existingBill.isPaid) {
                toast.error("Desmarque o pagamento na lista principal antes de excluir.");
                return;
            }
            
            // Marca como excluída (isExcluded: true) para que não reapareça ao reabrir o modal
            setLocalBills(prev => prev.map(b => 
                b.id === existingBill.id ? { ...b, isExcluded: true } : b
            ));
            toast.info("Parcela fixa excluída do planejamento deste mês.");
        }
    }
  }, [localBills, contasMovimento, categoriasV2]);

  const handleSaveAndClose = () => {
    setMonthlyRevenueForecast(localRevenueForecast);
    
    const originalBillsMap = new Map(originalMonthBills.map(b => [b.id, b]));
    const localBillIds = new Set(localBills.map(b => b.id));
    
    const newTransactions: TransacaoCompleta[] = [];
    const transactionsToRemove: string[] = [];
    
    // 1. Filtra o billsTracker original, removendo APENAS as contas que foram carregadas no localBills
    // Isso garante que contas de outros meses (futuras não pagas, ou passadas) permaneçam.
    let finalBillsTracker: BillTracker[] = billsTracker.filter(b => {
        // Se a conta não está no localBills, ela é de outro mês ou é uma conta fixa futura/passada que não foi carregada.
        // Se a conta está no localBills, ela será tratada no loop abaixo.
        return !localBillIds.has(b.id);
    });
    
    // 2. Processa as contas locais (do mês atual, incluindo adiantadas)
    localBills.forEach(localVersion => {
        const original = originalBillsMap.get(localVersion.id);
        
        const wasPaid = original?.isPaid || false;
        const isNowPaid = localVersion.isPaid;

        if (isNowPaid && !wasPaid) {
            // Ação: Pagamento (Cria transação)
            const bill = localVersion;
            const transactionId = bill.transactionId || generateTransactionId();
            const paymentDate = bill.paymentDate || format(new Date(), "yyyy-MM-dd");

            const account = contasMovimento.find(
                c => c.id === bill.suggestedAccountId
            );
            if (!account) {
                toast.error(`Conta de pagamento não encontrada para ${bill.description}.`);
                return;
            }

            let operationType: TransacaoCompleta["operationType"] = "despesa";
            let loanId: string | null = null;
            let parcelaId: string | null = null;
            let vehicleTransactionId: string | null = null;

            if (bill.sourceType === "loan_installment" && bill.sourceRef) {
                operationType = "pagamento_emprestimo";
                loanId = `loan_${bill.sourceRef}`;
                parcelaId = String(bill.parcelaNumber);
                markLoanParcelPaid(
                    Number(bill.sourceRef),
                    bill.expectedAmount,
                    paymentDate,
                    bill.parcelaNumber!
                );
            }

            if (bill.sourceType === "insurance_installment" && bill.sourceRef) {
                // Para seguro, a transação é uma despesa normal, mas com link
                operationType = "despesa";
                vehicleTransactionId = `${bill.sourceRef}_${bill.parcelaNumber}`;
                markSeguroParcelPaid(
                    Number(bill.sourceRef),
                    bill.parcelaNumber!,
                    transactionId
                );
            }
            
            // Se for despesa fixa/variável, garante que a operação seja 'despesa'
            if (bill.sourceType === 'fixed_expense' || bill.sourceType === 'variable_expense' || bill.sourceType === 'ad_hoc') {
                operationType = 'despesa';
            }

            newTransactions.push({
                id: transactionId,
                date: paymentDate,
                accountId: account.id,
                flow: "out",
                operationType,
                domain: getDomainFromOperation(operationType),
                amount: bill.expectedAmount,
                categoryId: bill.suggestedCategoryId || null,
                description: bill.description,
                links: {
                    investmentId: null,
                    loanId,
                    transferGroupId: null,
                    parcelaId,
                    vehicleTransactionId
                },
                conciliated: false,
                attachments: [],
                meta: {
                    createdBy: "system",
                    source: "bill_tracker",
                    createdAt: format(new Date(), "yyyy-MM-dd")
                }
            });
            
            const updatedBill = { ...localVersion, transactionId };
            finalBillsTracker.push(updatedBill);
            
        } 
        else if (wasPaid && !isNowPaid) {
            // Ação: Estorno (Remove transação)
            if (original?.transactionId) {
                transactionsToRemove.push(original.transactionId);

                if (localVersion.sourceType === "loan_installment" && localVersion.sourceRef) {
                    unmarkLoanParcelPaid(Number(localVersion.sourceRef));
                }

                if (localVersion.sourceType === "insurance_installment" && localVersion.sourceRef) {
                    unmarkSeguroParcelPaid(
                        Number(localVersion.sourceRef),
                        localVersion.parcelaNumber!
                    );
                }
            }

            const updatedBill = {
                ...localVersion,
                isPaid: false,
                paymentDate: undefined,
                transactionId: undefined
            };
            finalBillsTracker.push(updatedBill);
        } 
        else {
            // Ação: Manutenção de estado (Ad-hoc, ou fixas que mudaram isExcluded, ou pagas que não mudaram)
            // Se a conta não foi excluída, ou se é uma conta fixa (loan/insurance) que foi paga/excluída, mantemos o registro local.
            
            // Contas ad-hoc/fixed/variable que foram excluídas (isExcluded: true) e não pagas são descartadas.
            if (localVersion.isPaid || !localVersion.isExcluded || localVersion.sourceType === 'loan_installment' || localVersion.sourceType === 'insurance_installment') {
                finalBillsTracker.push(localVersion);
            }
        }
    });
    
    setBillsTracker(finalBillsTracker);
    
    setTransacoesV2(prev => {
        const filtered = prev.filter(t => !transactionsToRemove.includes(t.id));
        return [...filtered, ...newTransactions];
    });

    onOpenChange(false);
    toast.success("Contas salvas com sucesso.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ResizableDialogContent 
        storageKey="bills_tracker_modal"
        initialWidth={1000}
        initialHeight={700}
        minWidth={700}
        minHeight={500}
        hideCloseButton={true} 
      >
        
        <DialogHeader className="border-b pb-2 pt-3 px-4 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              Contas a Pagar - {format(referenceDate, 'MMMM/yyyy')}
            </DialogTitle>
            
            <div className="flex items-center gap-3 text-sm">
              <Drawer>
                <DrawerTrigger asChild className="lg:hidden">
                  <Button variant="outline" size="sm" className="gap-1 h-8 text-xs">
                    <Menu className="w-4 h-4" />
                    Contexto
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <div className="mx-auto w-full max-w-md">
                    <BillsContextSidebar
                      localRevenueForecast={localRevenueForecast}
                      setLocalRevenueForecast={setLocalRevenueForecast}
                      previousMonthRevenue={previousMonthRevenue}
                      totalExpectedExpense={totalExpectedExpense}
                      totalPaid={totalPaid}
                      pendingCount={pendingCount}
                      netForecast={netForecast}
                      isMobile={true}
                      onSaveAndClose={handleSaveAndClose}
                      onOpenAllInstallments={() => setShowAllInstallmentsModal(true)}
                    />
                  </div>
                </DrawerContent>
              </Drawer>
              
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-1 text-destructive">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">{pendingCount} Pendentes</span>
                </div>
                <div className="flex items-center gap-1 text-success">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="text-xs">{paidCount} Pagas</span>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleSaveAndClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex flex-1 overflow-hidden">
          
          <ResizableSidebar
            initialWidth={240}
            minWidth={200}
            maxWidth={350}
            storageKey="bills_sidebar_width"
          >
            <BillsContextSidebar
              localRevenueForecast={localRevenueForecast}
              setLocalRevenueForecast={setLocalRevenueForecast}
              previousMonthRevenue={previousMonthRevenue}
              totalExpectedExpense={totalExpectedExpense}
              totalPaid={totalPaid}
              pendingCount={pendingCount}
              netForecast={netForecast}
              onSaveAndClose={handleSaveAndClose}
              onOpenAllInstallments={() => setShowAllInstallmentsModal(true)}
            />
          </ResizableSidebar>

          <div className="flex-1 overflow-y-auto px-4 pt-2 pb-2 space-y-4">
            
            {/* FixedInstallmentSelector REMOVED */}
            
            <BillsTrackerList
              bills={localBills}
              onUpdateBill={handleUpdateBillLocal}
              onDeleteBill={handleDeleteBillLocal}
              onAddBill={handleAddBillAndRefresh}
              onTogglePaid={handleTogglePaidLocal}
              currentDate={referenceDate}
            />
          </div>
        </div>
        
        {/* All Installments Review Modal */}
        <AllInstallmentsReviewModal
            open={showAllInstallmentsModal}
            onOpenChange={setShowAllInstallmentsModal}
            referenceDate={referenceDate}
            localBills={localBills}
            onToggleInstallment={handleToggleFixedBill}
        />
        
      </ResizableDialogContent>
    </Dialog>
  );
}