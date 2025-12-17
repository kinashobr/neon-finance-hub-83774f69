import { useState, useMemo, useEffect, useCallback } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, Clock, TrendingUp, TrendingDown, DollarSign, Calculator, Menu, LogOut, X, Save, RefreshCw } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillsTrackerList } from "./BillsTrackerList";
import { BillsContextSidebar } from "./BillsContextSidebar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BillTracker, formatCurrency, TransacaoCompleta, getDomainFromOperation, generateTransactionId } from "@/types/finance";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { toast } from "sonner";
import { ResizableSidebar } from "../transactions/ResizableSidebar";
import { ResizableDialogContent } from "../ui/ResizableDialogContent"; // NEW IMPORT
import { parseDateLocal } from "@/lib/utils";

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
    getBillsForMonth, // <-- UPDATED
    dateRanges,
    monthlyRevenueForecast,
    setMonthlyRevenueForecast,
    getRevenueForPreviousMonth,
    addTransacaoV2,
    markLoanParcelPaid,
    unmarkLoanParcelPaid,
    markSeguroParcelPaid,
    unmarkSeguroParcelPaid,
    setTransacoesV2,
    contasMovimento, // ADDED
    categoriasV2, // ADDED
  } = useFinance();
  
  const referenceDate = dateRanges.range1.to || new Date();
  
  // Estado local para manipulação (inicializa com o estado do contexto)
  const [localBills, setLocalBills] = useState<BillTracker[]>([]);
  const [isListGenerated, setIsListGenerated] = useState(false); // NEW STATE
  
  // Receita do mês anterior (para sugestão)
  const previousMonthRevenue = useMemo(() => {
    return getRevenueForPreviousMonth(referenceDate);
  }, [getRevenueForPreviousMonth, referenceDate]);
  
  // Estado local para a previsão de receita
  const [localRevenueForecast, setLocalRevenueForecast] = useState(monthlyRevenueForecast || previousMonthRevenue);
  
  // --- Initialization Logic ---
  const initializeLocalBills = useCallback(() => {
    // Load only user-modified bills (ad-hoc, paid, excluded) on open.
    const initialBills = getBillsForMonth(referenceDate, false); 
    setLocalBills(initialBills);
    
    // Check if any templates were previously generated and saved (i.e., if any generated bill exists in billsTracker)
    const monthYear = format(referenceDate, 'yyyy-MM');
    const hasGeneratedBillsSaved = billsTracker.some(b => 
        b.sourceType !== 'ad_hoc' && 
        b.sourceRef && // Must have a sourceRef if generated
        format(parseDateLocal(b.dueDate), 'yyyy-MM') === monthYear
    );
    
    // If there are saved templates for this month, assume the list is generated.
    setIsListGenerated(hasGeneratedBillsSaved);
    
  }, [getBillsForMonth, referenceDate, billsTracker, monthlyRevenueForecast, previousMonthRevenue]);

  // Sincroniza o estado local ao abrir o modal
  useEffect(() => {
    if (open) {
        initializeLocalBills();
        setLocalRevenueForecast(monthlyRevenueForecast || previousMonthRevenue);
    }
  }, [open, initializeLocalBills, monthlyRevenueForecast, previousMonthRevenue]);

  // --- Manual Generation Handler ---
  const handleGenerateList = useCallback(() => {
    // Generate the full list including templates
    const generatedBills = getBillsForMonth(referenceDate, true);
    setLocalBills(generatedBills);
    setIsListGenerated(true);
    toast.info("Lista de contas gerada com base nos templates e mês anterior.");
  }, [getBillsForMonth, referenceDate]);
  
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

  const handleAddBillLocal = useCallback((bill: Omit<BillTracker, "id" | "isPaid">) => {
    const newBill: BillTracker = {
        ...bill,
        id: generateBillId(),
        isPaid: false,
    };
    setLocalBills(prev => [...prev, newBill]);
  }, []);
  
  const handleTogglePaidLocal = useCallback((bill: BillTracker, isChecked: boolean) => {
    // Usa a data atual do sistema para o pagamento
    const today = new Date();
    
    setLocalBills(prev => prev.map(b => {
        if (b.id === bill.id) {
            return { 
                ...b, 
                isPaid: isChecked,
                // Usa a data atual do sistema para o pagamento
                paymentDate: isChecked ? format(today, 'yyyy-MM-dd') : undefined,
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
    
    const originalBillsMap = new Map(billsTracker.map(b => [b.id, b]));
    const newTransactions: TransacaoCompleta[] = [];
    
    // Bills que pertencem ao mês atual (para exclusão/atualização)
    const monthYear = format(referenceDate, 'yyyy-MM');
    
    // IDs de bills que devem ser mantidos no billsTracker (pagos, ad-hoc de outros meses, templates de outros meses)
    const billsToKeepIds = new Set(billsTracker
        .filter(b => {
            const isCurrentMonth = format(parseDateLocal(b.dueDate), 'yyyy-MM') === monthYear;
            // Keep bills from other months OR paid bills OR ad-hoc bills from other months
            return !isCurrentMonth || b.isPaid || b.sourceType === 'ad_hoc';
        })
        .map(b => b.id)
    );
    
    // Lista de bills que serão o novo billsTracker
    let updatedBillsTracker = billsTracker.filter(b => billsToKeepIds.has(b.id));
    
    // Itera sobre as contas locais para ver o que mudou/adicionou
    localBills.forEach(localVersion => {
        const originalBill = originalBillsMap.get(localVersion.id);
        
        const wasPaid = originalBill?.isPaid || false;
        const isNowPaid = localVersion.isPaid;
        const isGeneratedTemplate = localVersion.sourceType !== 'ad_hoc' && localVersion.sourceRef;
        
        // --- A. Handle Payment/Unpayment ---
        if (isNowPaid && !wasPaid) {
            const bill = localVersion;
            const paymentDate = bill.paymentDate || format(new Date(), 'yyyy-MM-dd'); 
            const transactionId = bill.transactionId || generateTransactionId();
            
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
            
            // Atualiza o Bill Tracker global para persistir o status de pagamento/exclusão/ajustes
            // Se for um template gerado, adicionamos ele ao billsTracker para persistir o status de pago
            if (isGeneratedTemplate || localVersion.sourceType === 'ad_hoc') {
                updatedBillsTracker = updatedBillsTracker.filter(b => b.id !== localVersion.id);
                updatedBillsTracker.push({ ...localVersion, transactionId });
            }
            
        } 
        // --- B. Processamento de Estorno ---
        else if (!isNowPaid && wasPaid) {
            const bill = originalBill!; 
            
            if (bill.transactionId) {
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
                
                // Remove a transação do contexto global
                setTransacoesV2(prev => prev.filter(t => t.id !== bill.transactionId));
            }
            
            // Atualiza o Bill Tracker global
            const updatedBill = { ...localVersion, isPaid: false, paymentDate: undefined, transactionId: undefined };
            
            if (isGeneratedTemplate) {
                // Se for template, atualiza o status de pago/transactionId
                updatedBillsTracker = updatedBillsTracker.filter(b => b.id !== localVersion.id);
                updatedBillsTracker.push(updatedBill);
            } else if (localVersion.sourceType === 'ad_hoc') {
                // Se for ad-hoc, atualiza
                updatedBillsTracker = updatedBillsTracker.filter(b => b.id !== localVersion.id);
                updatedBillsTracker.push(updatedBill);
            }
        } 
        // --- C. Processamento de Alterações (Exclusão/Valor/Conta) ---
        else {
            const hasNonPaymentChanges = 
                localVersion.isExcluded !== originalBill?.isExcluded || 
                localVersion.expectedAmount !== originalBill?.expectedAmount || 
                localVersion.suggestedAccountId !== originalBill?.suggestedAccountId ||
                localVersion.sourceType === 'ad_hoc' && !originalBill; // New ad-hoc bill
                
            if (hasNonPaymentChanges) {
                
                if (localVersion.sourceType === 'ad_hoc') {
                    // Se for ad-hoc e excluído, deleta permanentemente
                    if (localVersion.isExcluded) {
                        deleteBill(localVersion.id); // Use context delete to remove from billsTracker
                    } else {
                        // Se for ad-hoc e modificado/novo, atualiza/adiciona
                        updatedBillsTracker = updatedBillsTracker.filter(b => b.id !== localVersion.id);
                        updatedBillsTracker.push(localVersion);
                    }
                } else if (isGeneratedTemplate) {
                    // Se for template gerado e modificado (ex: isExcluded, expectedAmount), persistimos a modificação
                    updatedBillsTracker = updatedBillsTracker.filter(b => b.id !== localVersion.id);
                    updatedBillsTracker.push(localVersion);
                }
            }
        }
    });
    
    // 3. Persiste o billsTracker atualizado
    setBillsTracker(updatedBillsTracker);
    
    // 4. Adiciona novas transações ao contexto
    newTransactions.forEach(t => addTransacaoV2(t));
    
    onOpenChange(false);
    toast.success("Contas pagas e alterações salvas!");
  };
  
  // Componente Sidebar para reutilização
  const SidebarContent = (
    <BillsContextSidebar
      localRevenueForecast={localRevenueForecast}
      setLocalRevenueForecast={setLocalRevenueForecast}
      previousMonthRevenue={previousMonthRevenue}
      totalExpectedExpense={totalExpectedExpense}
      totalPaid={totalPaid}
      pendingCount={pendingCount}
      netForecast={netForecast}
      onSaveAndClose={handleSaveAndClose}
      // NEW PROP: Manual Generation Button
      onGenerateList={handleGenerateList} 
      isListGenerated={isListGenerated}
    />
  );

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
                      onGenerateList={handleGenerateList} // NEW PROP
                      isListGenerated={isListGenerated} // NEW PROP
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
            {SidebarContent}
          </ResizableSidebar>

          {/* Coluna 2: Lista de Transações (Ocupa o espaço restante) */}
          <div className="flex-1 overflow-y-auto px-4 pt-2 pb-2">
            {isListGenerated ? (
                <BillsTrackerList
                  bills={localBills} // Usa o estado local
                  onUpdateBill={handleUpdateBillLocal}
                  onDeleteBill={handleDeleteBillLocal}
                  onAddBill={handleAddBillLocal}
                  onTogglePaid={handleTogglePaidLocal} // Novo handler
                  currentDate={referenceDate}
                />
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                    <Calendar className="w-12 h-12 mb-4" />
                    <p className="text-lg font-semibold">Lista de Contas Pendente</p>
                    <p className="text-sm text-center mt-2">
                        Clique em "Gerar Lista do Mês" na barra lateral para carregar as contas recorrentes e estimativas para o mês.
                    </p>
                </div>
            )}
          </div>
        </div>
      </ResizableDialogContent>
    </Dialog>
  );
}