import { useState, useMemo, useEffect, useCallback } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, Clock, TrendingUp, TrendingDown, DollarSign, Calculator, Menu, LogOut, X, Save } from "lucide-react";
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
    getBillsForPeriod, 
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
  
  // Geração da lista de contas a pagar para o mês de referência
  const billsForPeriod = useMemo(() => {
    return getBillsForPeriod(referenceDate);
  }, [getBillsForPeriod, referenceDate]);
  
  // Estado local para manipulação (inicializa com o estado do contexto)
  const [localBills, setLocalBills] = useState<BillTracker[]>([]);
  
  // Receita do mês anterior (para sugestão)
  const previousMonthRevenue = useMemo(() => {
    return getRevenueForPreviousMonth(referenceDate);
  }, [getRevenueForPreviousMonth, referenceDate]);
  
  // Estado local para a previsão de receita
  const [localRevenueForecast, setLocalRevenueForecast] = useState(monthlyRevenueForecast || previousMonthRevenue);
  
  // Sincroniza o estado local ao abrir o modal
  useEffect(() => {
    if (open) {
        setLocalBills(billsForPeriod);
        setLocalRevenueForecast(monthlyRevenueForecast || previousMonthRevenue);
    }
  }, [open, billsForPeriod, monthlyRevenueForecast, previousMonthRevenue]);

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
    setLocalBills(prev => prev.filter(b => b.id !== id));
  }, []);

  const handleAddBillLocal = useCallback((bill: Omit<BillTracker, "id" | "isPaid">) => {
    const newBill: BillTracker = {
        ...bill,
        id: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        isPaid: false,
    };
    setLocalBills(prev => [...prev, newBill]);
  }, []);
  
  const handleTogglePaidLocal = useCallback((bill: BillTracker, isChecked: boolean) => {
    setLocalBills(prev => prev.map(b => {
        if (b.id === bill.id) {
            return { 
                ...b, 
                isPaid: isChecked,
                // Limpa dados de pagamento se desmarcado
                paymentDate: isChecked ? format(referenceDate, 'yyyy-MM-dd') : undefined,
                transactionId: isChecked ? b.transactionId || generateTransactionId() : undefined,
            };
        }
        return b;
    }));
  }, [referenceDate]);

  // Lógica de Persistência (Salvar e Sair)
  const handleSaveAndClose = () => {
    // 1. Persiste a previsão de receita
    setMonthlyRevenueForecast(localRevenueForecast);
    
    // 2. Sincroniza o estado local com o estado global (BillsTracker)
    // Filtra as contas que foram excluídas localmente (isExcluded)
    const billsToPersist = localBills.filter(b => !b.isExcluded);
    
    // 3. Processa as mudanças de pagamento e gera transações
    const newTransactions: TransacaoCompleta[] = [];
    const updatedBillsTracker: BillTracker[] = [];
    
    const paidBills = new Map(localBills.filter(b => b.isPaid).map(b => [b.id, b]));
    const unpaidBills = new Map(localBills.filter(b => !b.isPaid).map(b => [b.id, b]));
    
    // Bills do contexto original (para comparação)
    const originalBillsMap = new Map(billsForPeriod.map(b => [b.id, b]));
    
    // Itera sobre as contas originais para ver o que mudou
    billsForPeriod.forEach(originalBill => {
        const localVersion = localBills.find(b => b.id === originalBill.id);
        
        if (!localVersion || localVersion.isExcluded) {
            // Se excluído localmente, não faz nada (será filtrado na próxima chamada de getBillsForPeriod)
            return;
        }
        
        const wasPaid = originalBill.isPaid;
        const isNowPaid = localVersion.isPaid;
        
        if (isNowPaid && !wasPaid) {
            // A. MARCAR COMO PAGO (Cria Transação)
            const bill = localVersion;
            const paymentDate = bill.paymentDate || format(referenceDate, 'yyyy-MM-dd');
            const transactionId = bill.transactionId || generateTransactionId();
            
            const suggestedAccount = contasMovimento.find(c => c.id === bill.suggestedAccountId);
            const suggestedCategory = categoriasV2.find(c => c.id === bill.suggestedCategoryId);
            
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
                createdAt: format(referenceDate, 'yyyy-MM-dd'),
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
            
            // Atualiza o Bill Tracker com o transactionId e status final
            updatedBillsTracker.push({ ...localVersion, transactionId });
            
        } else if (!isNowPaid && wasPaid) {
            // B. DESMARCAR COMO PAGO (Remove Transação)
            const bill = originalBill;
            
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
            
            // Atualiza o Bill Tracker com status final
            updatedBillsTracker.push({ ...localVersion, isPaid: false, paymentDate: undefined, transactionId: undefined });
            
        } else {
            // C. Nenhuma mudança de status de pagamento, mas pode ter mudado suggestedAccountId/expectedAmount
            updatedBillsTracker.push(localVersion);
        }
    });
    
    // 4. Adiciona novas transações ao contexto
    newTransactions.forEach(t => addTransacaoV2(t));
    
    // 5. Atualiza o BillsTracker no contexto (apenas para Bills Ad-Hoc e atualizações de suggestedAccountId/expectedAmount)
    
    // Bills que precisam de update/delete no contexto
    const billsToUpdateOrDelete = localBills.filter(b => originalBillsMap.has(b.id) && (b.isPaid !== originalBillsMap.get(b.id)?.isPaid || b.isExcluded || b.suggestedAccountId !== originalBillsMap.get(b.id)?.suggestedAccountId || b.expectedAmount !== originalBillsMap.get(b.id)?.expectedAmount));
    
    // Bills que precisam ser adicionadas (novas Ad-Hoc)
    const billsToAddNew = localBills.filter(b => !originalBillsMap.has(b.id));
    
    // Executa as operações no contexto global
    billsToUpdateOrDelete.forEach(b => {
        if (b.isExcluded) {
            deleteBill(b.id);
        } else {
            updateBill(b.id, b);
        }
    });
    billsToAddNew.forEach(b => {
        // Adiciona apenas as propriedades necessárias para o addBill
        const { id, isPaid, ...rest } = b;
        addBill(rest);
    });
    
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
            <BillsTrackerList
              bills={localBills} // Usa o estado local
              onUpdateBill={handleUpdateBillLocal}
              onDeleteBill={handleDeleteBillLocal}
              onAddBill={handleAddBillLocal}
              onTogglePaid={handleTogglePaidLocal} // Novo handler
              currentDate={referenceDate}
            />
          </div>
        </div>
      </ResizableDialogContent>
    </Dialog>
  );
}