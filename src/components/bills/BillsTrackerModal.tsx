import { useState, useMemo, useEffect, useCallback } from "react";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, Clock, Menu, X, Save } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillsTrackerList } from "./BillsTrackerList";
import { BillsContextSidebar } from "./BillsContextSidebar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BillTracker, TransacaoCompleta, getDomainFromOperation, generateTransactionId } from "@/types/finance";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { toast } from "sonner";
import { ResizableSidebar } from "../transactions/ResizableSidebar";
import { ResizableDialogContent } from "../ui/ResizableDialogContent";
import { parseDateLocal } from "@/lib/utils";
import { isSameMonth } from "date-fns";

interface BillsTrackerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillsTrackerModal({ open, onOpenChange }: BillsTrackerModalProps) {
  const { 
    billsTracker, 
    setBillsTracker, 
    addBill, 
    getBillsForMonth, 
    generateInstallmentBills,
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
    transacoesV2,
  } = useFinance();
  
  const referenceDate = dateRanges.range1.to || new Date();
  
  const [localBills, setLocalBills] = useState<BillTracker[]>([]);
  
  const [originalMonthBills, setOriginalMonthBills] = useState<BillTracker[]>([]);
  
  const previousMonthRevenue = useMemo(() => {
    return getRevenueForPreviousMonth(referenceDate);
  }, [getRevenueForPreviousMonth, referenceDate]);
  
  const [localRevenueForecast, setLocalRevenueForecast] = useState(monthlyRevenueForecast || previousMonthRevenue);
  
  useEffect(() => {
    if (!open) return;
    
    const persistedBills = getBillsForMonth(referenceDate);
    const persistedMap = new Map(persistedBills.map(b => [b.id, b]));
    
    const generatedInstallments = generateInstallmentBills(referenceDate);
    
    const mergedBills: BillTracker[] = [];
    const processedIds = new Set<string>();
    
    persistedBills.forEach(bill => {
        mergedBills.push(bill);
        processedIds.add(bill.id);
    });
    
    generatedInstallments.forEach(generatedBill => {
        if (!processedIds.has(generatedBill.id)) {
            mergedBills.push(generatedBill);
        }
    });
    
    setLocalBills(mergedBills);
    setOriginalMonthBills(mergedBills.map(b => ({ ...b }))); 
    
    setLocalRevenueForecast(monthlyRevenueForecast || previousMonthRevenue);
    
  }, [open, referenceDate, getBillsForMonth, generateInstallmentBills, monthlyRevenueForecast, previousMonthRevenue]);

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
    addBill(bill);
    
    const tempId = generateTransactionId();
    const newBill: BillTracker = {
        ...bill,
        id: tempId,
        isPaid: false,
    };
    
    setLocalBills(prev => [...prev, newBill]);
    
  }, [addBill]);

  const handleSaveAndClose = () => {
    setMonthlyRevenueForecast(localRevenueForecast);
    
    const originalBillsMap = new Map(originalMonthBills.map(b => [b.id, b]));
    
    const newTransactions: TransacaoCompleta[] = [];
    const transactionsToRemove: string[] = [];
    
    let finalBillsTracker: BillTracker[] = billsTracker.filter(b => {
        const billDate = parseDateLocal(b.dueDate);
        return !isSameMonth(billDate, referenceDate);
    });
    
    const currentMonthBillsMap = new Map<string, BillTracker>();
    
    localBills.forEach(localVersion => {
        const original = originalBillsMap.get(localVersion.id);
        
        const wasPaid = original?.isPaid || false;
        const isNowPaid = localVersion.isPaid;
        
        const isInstallment = localVersion.sourceType === 'loan_installment' || localVersion.sourceType === 'insurance_installment';
        
        const hasNonPaymentChanges = 
            localVersion.isExcluded !== original?.isExcluded || 
            localVersion.expectedAmount !== original?.expectedAmount || 
            localVersion.suggestedAccountId !== original?.suggestedAccountId ||
            localVersion.sourceType === 'ad_hoc';

        if (isNowPaid && !wasPaid) {
            const bill = localVersion;
            const transactionId = bill.transactionId || generateTransactionId();
            const paymentDate = bill.paymentDate || format(new Date(), "yyyy-MM-dd");

            const account = contasMovimento.find(c => c.id === bill.suggestedAccountId);
            if (!account) {
                toast.error(`Conta sugerida para ${bill.description} não encontrada.`);
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
                    bill.parcelaNumber
                );
            }

            if (bill.sourceType === "insurance_installment" && bill.sourceRef) {
                operationType = "despesa";
                vehicleTransactionId = `${bill.sourceRef}_${bill.parcelaNumber}`;
                markSeguroParcelPaid(
                    Number(bill.sourceRef),
                    bill.parcelaNumber,
                    transactionId
                );
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
            currentMonthBillsMap.set(updatedBill.id, updatedBill);
            
        } else if (wasPaid && !isNowPaid) {
            if (original?.transactionId) {
                transactionsToRemove.push(original.transactionId);

                if (localVersion.sourceType === "loan_installment" && localVersion.sourceRef) {
                    unmarkLoanParcelPaid(Number(localVersion.sourceRef));
                }

                if (localVersion.sourceType === "insurance_installment" && localVersion.sourceRef) {
                    unmarkSeguroParcelPaid(
                        Number(localVersion.sourceRef),
                        localVersion.parcelaNumber
                    );
                }
            }

            const updatedBill = {
                ...localVersion,
                isPaid: false,
                paymentDate: undefined,
                transactionId: undefined
            };
            
            if (isInstallment && !hasNonPaymentChanges) {
            } else {
                currentMonthBillsMap.set(updatedBill.id, updatedBill);
            }
        } else if (hasNonPaymentChanges) {
            currentMonthBillsMap.set(localVersion.id, localVersion);
        } else if (localVersion.sourceType === 'ad_hoc') {
             currentMonthBillsMap.set(localVersion.id, localVersion);
        }
    });
    
    const currentMonthBillsArray = Array.from(currentMonthBillsMap.values()).filter(b => 
        !(b.sourceType === 'ad_hoc' && b.isExcluded)
    );
    
    setBillsTracker([...finalBillsTracker, ...currentMonthBillsArray]);
    
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
            />
          </ResizableSidebar>

          <div className="flex-1 overflow-y-auto px-4 pt-2 pb-2">
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
      </ResizableDialogContent>
    </Dialog>
  );
}