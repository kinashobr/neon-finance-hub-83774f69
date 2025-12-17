import { useState, useMemo, useEffect, useCallback } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, Clock, TrendingUp, TrendingDown, DollarSign, Calculator, Menu, LogOut, X, Save, RefreshCw } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillsTrackerList } from "./BillsTrackerList";
import { BillsContextSidebar } from "./BillsContextSidebar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BillTracker, formatCurrency, TransacaoCompleta, getDomainFromOperation, generateTransactionId, generateBillId } from "@/types/finance";
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
    addBill, // <-- USADO DIRETAMENTE
    updateBill, 
    deleteBill, 
    getBillsForMonth, 
    dateRanges,
    monthlyRevenueForecast,
    setMonthlyRevenueForecast,
    getRevenueForPreviousMonth,
    addTransacaoV2,
    markLoanParcelPaid,
    unmarkLoanParcelPaid,
    markSeguroParcelPaid,
    unmarkSeguroParcelPaid, // <-- FIX: Corrected spelling
    setTransacoesV2,
    contasMovimento, 
    categoriasV2, 
    transacoesV2, // <-- ADDED: Need access to global transactions for deletion
  } = useFinance();
  
  const referenceDate = dateRanges.range1.to || new Date();
  
  // Estado local para manipulação (começa vazio)
  const [localBills, setLocalBills] = useState<BillTracker[]>([]);
  
  // Receita do mês anterior (para sugestão)
  const previousMonthRevenue = useMemo(() => {
    return getRevenueForPreviousMonth(referenceDate);
  }, [getRevenueForPreviousMonth, referenceDate]);
  
  // Estado local para a previsão de receita
  const [localRevenueForecast, setLocalRevenueForecast] = useState(monthlyRevenueForecast || previousMonthRevenue);
  
  // --- Refresh Logic (Always generates the full list) ---
  const handleRefreshList = useCallback(() => {
    // Generate the full list including templates
    const generatedBills = getBillsForMonth(referenceDate, true);
    setLocalBills(generatedBills);
    setLocalRevenueForecast(monthlyRevenueForecast || previousMonthRevenue); // Ensure forecast is also refreshed
    toast.info("Lista de contas atualizada manualmente.");
  }, [getBillsForMonth, referenceDate, monthlyRevenueForecast, previousMonthRevenue]);

  // Initial load when modal opens
  useEffect(() => {
    if (open) {
      // Inicializa o estado local com a lista gerada automaticamente
      const generatedBills = getBillsForMonth(referenceDate, true);
      setLocalBills(generatedBills);
      setLocalRevenueForecast(monthlyRevenueForecast || previousMonthRevenue);
    }
  }, [open, monthlyRevenueForecast, previousMonthRevenue, getBillsForMonth, referenceDate]);

  // NEW: Handler for adding ad-hoc bills directly to context
  const handleAddBillAndRefresh = useCallback((bill: Omit<BillTracker, "id" | "isPaid">) => {
    addBill(bill);
    // Since addBill updates the global state, we need to refresh the local list immediately
    // to reflect the new ad-hoc bill.
    handleRefreshList();
  }, [addBill, handleRefreshList]);

  // Totais baseados no estado local
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

  // Handlers para BillsTrackerList (operam no estado local)
  const handleUpdateBillLocal = useCallback((id: string, updates: Partial<BillTracker>) => {
    setLocalBills(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const handleDeleteBillLocal = useCallback((id: string) => {
    // Note: This handler is currently not used by BillsTrackerList, which uses handleExcludeBill
    setLocalBills(prev => prev.filter(b => b.id !== id));
  }, []);

  const handleTogglePaidLocal = useCallback((bill: BillTracker, isChecked: boolean) => {
    // Uses the current system date for payment
    const today = new Date();
    
    setLocalBills(prev => prev.map(b => {
        if (b.id === bill.id) {
            return { 
                ...b, 
                isPaid: isChecked,
                // Uses the current system date for payment
                paymentDate: isChecked ? format(today, 'yyyy-MM-dd') : undefined,
                // Preserve existing transactionId if available, otherwise generate a new one if paying
                transactionId: isChecked ? b.transactionId || generateTransactionId() : undefined,
            };
        }
        return b;
    }));
  }, []);

  // Lógica de Persistência (Salvar e Sair)
  const handleSaveAndClose = () => {
    // 1. Persiste a previsão de receita
    setMonthlyRevenueForecast(localRevenueForecast);
    
    // 2. Sincroniza o estado local com o estado global (BillsTracker)
    
    // Mapeia o estado global atual do billsTracker
    const originalBillsMap = new Map(billsTracker.map(b => [b.id, b]));
    
    const newTransactions: TransacaoCompleta[] = [];
    const transactionsToRemove: string[] = [];
    
    // Lista de bills que serão o novo billsTracker (apenas ad-hoc e templates modificados/excluídos)
    let updatedBillsTracker: BillTracker[] = billsTracker.filter(b => {
        const isCurrentMonth = isSameMonth(parseDateLocal(b.dueDate), referenceDate);
        // Mantém bills de outros meses E bills ad-hoc do mês atual (para rastrear alterações)
        return !isCurrentMonth || b.sourceType === 'ad_hoc';
    });
    
    // Itera sobre as contas LOCAIS (localBills) para ver o que mudou
    localBills.forEach(localVersion => {
        const originalBill = originalBillsMap.get(localVersion.id);
        
        const wasPaid = originalBill?.isPaid || false;
        const isNowPaid = localVersion.isPaid;
        const isGeneratedTemplate = localVersion.sourceType !== 'ad_hoc' && localVersion.sourceRef;
        
        // --- A. Handle Payment (isNowPaid && !wasPaid) ---
        if (isNowPaid && !wasPaid) {
            const bill = localVersion;
            const paymentDate = bill.paymentDate || format(new Date(), 'yyyy-MM-dd'); 
            const transactionId = bill.transactionId || generateTransactionId(); // Use the ID from local state or generate new
            
            const suggestedAccount = contasMovimento.find(c => c.id === bill.suggestedAccountId);
            if (!suggestedAccount) {
                toast.error(`Erro: Conta de débito para ${bill.description} não encontrada.`);
                return;
            }
            
            let operationType: TransacaoCompleta['operationType'] = 'despesa';
            let loanIdLink: string | null = null;
            let parcelaIdLink: string | null = null;
            let vehicleTransactionIdLink: string | null = null;
            
            if (bill.sourceType === 'loan_installment' && bill.sourceRef && bill.parcelaNumber) {
              operationType = 'pagamento_emprestimo';
              loanIdLink = `loan_${bill.sourceRef}`;
              parcelaIdLink = bill.parcelaNumber.toString();
            } else if (bill.sourceType === 'insurance_installment' && bill.sourceRef && bill.parcelaNumber) {
              operationType = 'despesa';
              vehicleTransactionIdLink = `${bill.sourceRef}_${bill.parcelaNumber}`;
            }

            const newTransaction: TransacaoCompleta = {
              id: transactionId,
              date: paymentDate,
              accountId: suggestedAccount.id,
              flow: 'out',
              operationType,
              domain: getDomainFromOperation(operationType),
              amount: bill.expectedAmount,
              categoryId: bill.suggestedCategoryId || null,
              description: bill.description,
              links: {
                investmentId: null,
                loanId: loanIdLink,
                transferGroupId: null,
                parcelaId: parcelaIdLink,
                vehicleTransactionId: vehicleTransactionIdLink,
              },
              conciliated: false,
              attachments: [],
              meta: {
                createdBy: 'system',
                source: 'bill_tracker',
                createdAt: format(new Date(), 'yyyy-MM-dd'),
              }
            };
            
            newTransactions.push(newTransaction);
            
            // Marca no contexto (Empréstimo/Seguro)
            if (bill.sourceType === 'loan_installment' && bill.sourceRef && bill.parcelaNumber) {
                const loanId = parseInt(bill.sourceRef);
                if (!isNaN(loanId)) {
                    markLoanParcelPaid(loanId, bill.expectedAmount, paymentDate, bill.parcelaNumber);
                }
            } else if (bill.sourceType === 'insurance_installment' && bill.sourceRef && bill.parcelaNumber) {
                const seguroId = parseInt(bill.sourceRef);
                if (!isNaN(seguroId)) {
                    markSeguroParcelPaid(seguroId, bill.parcelaNumber, transactionId);
                }
            }
            
            // Se for ad-hoc, atualiza o billsTracker global com o status pago e o transactionId
            if (localVersion.sourceType === 'ad_hoc') {
                updatedBillsTracker = updatedBillsTracker.filter(b => b.id !== localVersion.id);
                updatedBillsTracker.push({ ...localVersion, transactionId });
            }
            
        } 
        // --- B. Handle Unpayment (wasPaid && !isNowPaid) ---
        else if (wasPaid && !isNowPaid) {
            const bill = originalBill!; 
            
            if (bill.transactionId) {
                transactionsToRemove.push(bill.transactionId);
                
                // Remove do contexto (Empréstimo/Seguro)
                if (bill.sourceType === 'loan_installment' && bill.sourceRef && bill.parcelaNumber) {
                    const loanId = parseInt(bill.sourceRef);
                    if (!isNaN(loanId)) {
                        unmarkLoanParcelPaid(loanId);
                    }
                } else if (bill.sourceType === 'insurance_installment' && bill.sourceRef && bill.parcelaNumber) {
                    const seguroId = parseInt(bill.sourceRef);
                    if (!isNaN(seguroId)) {
                        unmarkSeguroParcelPaid(seguroId, bill.parcelaNumber); 
                    }
                }
            }
            
            // Se for ad-hoc, atualiza o billsTracker global com o status pendente
            if (localVersion.sourceType === 'ad_hoc') {
                const updatedBill = { ...localVersion, isPaid: false, paymentDate: undefined, transactionId: undefined };
                updatedBillsTracker = updatedBillsTracker.filter(b => b.id !== localVersion.id);
                updatedBillsTracker.push(updatedBill);
            }
        } 
        // --- C. Handle Non-Payment Changes (Exclusion/Value/Account) ---
        else {
            const hasNonPaymentChanges = 
                localVersion.isExcluded !== originalBill?.isExcluded || 
                localVersion.expectedAmount !== originalBill?.expectedAmount || 
                localVersion.suggestedAccountId !== originalBill?.suggestedAccountId ||
                localVersion.sourceType === 'ad_hoc' && !originalBill; // New ad-hoc bill
                
            if (hasNonPaymentChanges) {
                
                // Se for um template gerado ou ad-hoc, salva a modificação no billsTracker
                if (localVersion.sourceType === 'ad_hoc' || isGeneratedTemplate) {
                    updatedBillsTracker = updatedBillsTracker.filter(b => b.id !== localVersion.id);
                    updatedBillsTracker.push(localVersion);
                }
            }
        }
    });
    
    // 3. Filtra bills excluídas permanentemente (apenas ad-hoc)
    const finalBillsTracker = updatedBillsTracker.filter(b => 
        !(b.sourceType === 'ad_hoc' && b.isExcluded)
    );
    
    // 4. Persiste o billsTracker atualizado
    setBillsTracker(finalBillsTracker);
    
    // 5. Remove transações estornadas do contexto global
    setTransacoesV2(prev => prev.filter(t => !transactionsToRemove.includes(t.id)));
    
    // 6. Adiciona novas transações ao contexto
    newTransactions.forEach(t => addTransacaoV2(t));
    
    onOpenChange(false);
    toast.success("Contas pagas e alterações salvas!");
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
        
        {/* Header Principal - Ultra Compacto */}
        <DialogHeader className="border-b pb-2 pt-3 px-4 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              Contas a Pagar - {format(referenceDate, 'MMMM/yyyy')}
            </DialogTitle>
            
            <div className="flex items-center gap-3 text-sm">
              {/* Botão de Menu (Apenas em telas pequenas) */}
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
                      onRefreshList={handleRefreshList} 
                    />
                  </div>
                </DrawerContent>
              </Drawer>
              
              {/* Contagem de Status (Visível em todas as telas) */}
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
              
              {/* Botão de fechar (Visível em todas as telas) */}
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
        
        {/* Conteúdo Principal (2 Colunas) */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Coluna 1: Sidebar de Contexto (Fixo em telas grandes) */}
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
              onRefreshList={handleRefreshList} 
            />
          </ResizableSidebar>

          {/* Coluna 2: Lista de Transações (Ocupa o espaço restante) */}
          <div className="flex-1 overflow-y-auto px-4 pt-2 pb-2">
            <BillsTrackerList
              bills={localBills} // Usa o estado local
              onUpdateBill={handleUpdateBillLocal}
              onDeleteBill={handleDeleteBillLocal}
              onAddBill={handleAddBillAndRefresh} // Passa o novo handler
              onTogglePaid={handleTogglePaidLocal} // Novo handler
              currentDate={referenceDate}
            />
          </div>
        </div>
      </ResizableDialogContent>
    </Dialog>
  );
}