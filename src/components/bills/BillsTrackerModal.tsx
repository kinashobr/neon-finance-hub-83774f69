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

// Helper para verificar se é um template gerado automaticamente (agora, apenas ad_hoc é esperado)
const isGeneratedTemplate = (bill: BillTracker) => 
    bill.sourceType !== 'ad_hoc' && bill.sourceRef;

export function BillsTrackerModal({ open, onOpenChange }: BillsTrackerModalProps) {
  const { 
    billsTracker, 
    setBillsTracker, 
    addBill, 
    updateBill, 
    deleteBill, 
    getBillsForMonth, 
    generateInstallmentBills, // NEW IMPORT
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
  
  // Estado local para manipulação
  const [localBills, setLocalBills] = useState<BillTracker[]>([]);
  
  // NOVO ESTADO: Snapshot imutável das contas do mês na abertura
  const [originalMonthBills, setOriginalMonthBills] = useState<BillTracker[]>([]);
  
  // Receita do mês anterior (para sugestão)
  const previousMonthRevenue = useMemo(() => {
    return getRevenueForPreviousMonth(referenceDate);
  }, [getRevenueForPreviousMonth, referenceDate]);
  
  // Estado local para a previsão de receita
  const [localRevenueForecast, setLocalRevenueForecast] = useState(monthlyRevenueForecast || previousMonthRevenue);
  
  // --- Refresh Logic (REMOVIDA) ---
  // const handleRefreshList = useCallback(() => { ... }, [...]);

  // Initial load when modal opens
  useEffect(() => {
    if (!open) return;
    
    // 1. Carrega a lista de contas persistidas para o mês (ad-hoc e salvas)
    const persistedBills = getBillsForMonth(referenceDate);
    const persistedMap = new Map(persistedBills.map(b => [b.id, b]));
    
    // 2. Gera as parcelas de empréstimos e seguros para o mês
    const generatedInstallments = generateInstallmentBills(referenceDate);
    
    // 3. Mescla: As contas persistidas (incluindo pagamentos/modificações) têm prioridade.
    const mergedBills: BillTracker[] = [];
    const processedIds = new Set<string>();
    
    // Adiciona as contas persistidas (ad-hoc e modificações salvas)
    persistedBills.forEach(bill => {
        mergedBills.push(bill);
        processedIds.add(bill.id);
    });
    
    // Adiciona as parcelas geradas, exceto se já estiverem na lista persistida
    generatedInstallments.forEach(generatedBill => {
        if (!processedIds.has(generatedBill.id)) {
            mergedBills.push(generatedBill);
        }
    });
    
    // 4. Define o estado local e o snapshot imutável
    setLocalBills(mergedBills);
    setOriginalMonthBills(mergedBills.map(b => ({ ...b }))); 
    
    // 5. Define a previsão de receita
    setLocalRevenueForecast(monthlyRevenueForecast || previousMonthRevenue);
    
  }, [open, referenceDate, getBillsForMonth, generateInstallmentBills, monthlyRevenueForecast, previousMonthRevenue]); // Dependência em 'open' e 'referenceDate'

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
  
  // NEW HANDLER: Add Bill and Refresh Local State
  const handleAddBillAndRefresh = useCallback((bill: Omit<BillTracker, "id" | "isPaid">) => {
    // 1. Add to global state (context handles ID generation and persistence)
    addBill(bill);
    
    // 2. Since we removed template generation, we just update the local state directly
    // with the new bill (assuming addBill updates the global state quickly).
    // We generate a temporary ID for immediate display.
    const tempId = generateBillId();
    const newBill: BillTracker = {
        ...bill,
        id: tempId,
        isPaid: false,
    };
    
    setLocalBills(prev => [...prev, newBill]);
    
    // Note: The actual ID will be resolved on the next modal open/refresh, 
    // but for ad-hoc bills, the ID generated by addBill is usually the one used.
    // We rely on the next open/close cycle to fully sync the local state with the global one.
    
  }, [addBill]);

  // Lógica de Persistência (Salvar e Sair)
  const handleSaveAndClose = () => {
    // 1. Persiste a previsão de receita
    setMonthlyRevenueForecast(localRevenueForecast);
    
    // 2. Setup para comparação e persistência
    const originalBillsMap = new Map(originalMonthBills.map(b => [b.id, b]));
    
    const newTransactions: TransacaoCompleta[] = [];
    const transactionsToRemove: string[] = [];
    
    // Filtra o billsTracker global para manter apenas contas de outros meses
    let finalBillsTracker: BillTracker[] = billsTracker.filter(b => {
        const billDate = parseDateLocal(b.dueDate);
        const isCurrentMonth = isSameMonth(billDate, referenceDate);
        // Mantém contas de outros meses
        return !isCurrentMonth;
    });
    
    // 3. Processa as contas LOCAIS (localBills)
    localBills.forEach(localVersion => {
        const original = originalBillsMap.get(localVersion.id);
        
        const wasPaid = original?.isPaid || false;
        const isNowPaid = localVersion.isPaid;
        
        // Verifica se houve qualquer alteração que precise ser persistida
        const isInstallment = localVersion.sourceType === 'loan_installment' || localVersion.sourceType === 'insurance_installment';
        
        // Para parcelas, só precisamos persistir se houver pagamento/estorno ou exclusão
        const hasNonPaymentChanges = 
            localVersion.isExcluded !== original?.isExcluded || 
            localVersion.expectedAmount !== original?.expectedAmount || 
            localVersion.suggestedAccountId !== original?.suggestedAccountId;

        // --- A. Handle Payment (isNowPaid && !wasPaid) ---
        if (isNowPaid && !wasPaid) {
            const bill = localVersion;
            const transactionId = bill.transactionId || generateTransactionId();
            const paymentDate = bill.paymentDate || format(new Date(), "yyyy-MM-dd");

            const account = contasMovimento.find(
                c => c.id === bill.suggestedAccountId
            );
            if (!account) return;

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
                vehicleTransactionId = `${bill.sourceRef}_${bill.parcelaNumber}`;
                markSeguroParcelPaid(
                    Number(bill.sourceRef),
                    bill.parcelaNumber!,
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
            
            // Persiste a versão paga no billsTracker global (necessário para histórico e desmarcar)
            const updatedBill = { ...localVersion, transactionId };
            finalBillsTracker.push(updatedBill);
            
        } 
        // --- B. Handle Unpayment (wasPaid && !isNowPaid) ---
        else if (wasPaid && !isNowPaid) {
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

            // Persiste a versão pendente no billsTracker global
            const updatedBill = {
                ...localVersion,
                isPaid: false,
                paymentDate: undefined,
                transactionId: undefined
            };
            
            // Se for uma parcela, só a persistimos se ela foi modificada (excluída ou valor/conta alterada)
            // Caso contrário, ela será gerada novamente como template na próxima abertura.
            if (isInstallment && !hasNonPaymentChanges) {
                // Não persiste a parcela não paga e não modificada.
            } else {
                finalBillsTracker.push(updatedBill);
            }
        } 
        // --- C. Handle Non-Payment Changes (Exclusion/Value/Account) ---
        else if (hasNonPaymentChanges) {
            // Se houve qualquer alteração (exclusão, valor, conta), salva a versão local
            finalBillsTracker.push(localVersion);
        }
        // --- D. Handle Unmodified Bills ---
        // Se for ad-hoc e não modificada, salva. Se for parcela e não modificada/paga, descarta (será regenerada).
        else if (localVersion.sourceType === 'ad_hoc') {
             finalBillsTracker.push(localVersion);
        }
    });
    
    // 4. Filtra bills excluídas permanentemente (apenas ad-hoc)
    finalBillsTracker = finalBillsTracker.filter(b => 
        !(b.sourceType === 'ad_hoc' && b.isExcluded)
    );
    
    // 5. Persiste o billsTracker atualizado
    setBillsTracker(finalBillsTracker);
    
    // 6. ATOMIZAÇÃO: Remove transações estornadas e adiciona novas em um único setState
    setTransacoesV2(prev => {
        // Filtra as transações a serem removidas
        const filtered = prev.filter(t => !transactionsToRemove.includes(t.id));
        
        // Adiciona as novas transações
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