import { useState, useMemo, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, CalendarCheck, Repeat, Shield, Building2, DollarSign, Info, X, Settings } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillTracker, PotentialFixedBill, BillSourceType, formatCurrency, generateBillId, TransactionLinks, OperationType, BillDisplayItem, ExternalPaidBill } from "@/types/finance";
import { BillsTrackerList } from "./BillsTrackerList";
import { FixedBillsList } from "./FixedBillsList";
import { BillsSidebarKPIs } from "./BillsSidebarKPIs"; // NEW IMPORT
import { FixedBillSelectorModal } from "./FixedBillSelectorModal"; // NEW IMPORT
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { parseDateLocal } from "@/lib/utils";
import { ResizableDialogContent } from "../ui/ResizableDialogContent"; // IMPORTANDO

interface BillsTrackerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Tipo auxiliar para links parciais
type PartialTransactionLinks = Partial<TransactionLinks>;

export function BillsTrackerModal({ open, onOpenChange }: BillsTrackerModalProps) {
  const { 
    billsTracker, 
    setBillsTracker, 
    updateBill, 
    deleteBill, 
    getBillsForMonth, 
    getPotentialFixedBillsForMonth,
    getFutureFixedBills,
    getOtherPaidExpensesForMonth, // <-- NOVO
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
  
  // NEW: Obter pagamentos externos (somente leitura)
  const externalPaidBills = useMemo(() => 
    getOtherPaidExpensesForMonth(currentDate) 
  , [getOtherPaidExpensesForMonth, currentDate]);
  
  // NEW: Lista combinada e ordenada para exibição
  const combinedBills: BillDisplayItem[] = useMemo(() => {
    // 1. Criar um mapa de IDs de transações pagas pelo tracker para deduplicação
    const trackerPaidTxIds = new Set(trackerManagedBills
        .filter(b => b.isPaid && b.transactionId)
        .map(b => b.transactionId!)
    );
    
    // 2. Adicionar contas gerenciadas pelo tracker (pendentes e pagas)
    const trackerBills: BillDisplayItem[] = trackerManagedBills;
    
    // 3. Adicionar contas pagas externamente, garantindo que não sejam duplicatas
    const externalBills: BillDisplayItem[] = externalPaidBills.filter(externalBill => 
        !trackerPaidTxIds.has(externalBill.id)
    );
    
    // 4. Combinar
    return [...trackerBills, ...externalBills];
  }, [trackerManagedBills, externalPaidBills]);
  
  const potentialFixedBills = useMemo(() => 
    getPotentialFixedBillsForMonth(currentDate, trackerManagedBills)
  , [getPotentialFixedBillsForMonth, currentDate, trackerManagedBills]);
  
  const futureFixedBills = useMemo(() => 
    getFutureFixedBills(currentDate, trackerManagedBills)
  , [getFutureFixedBills, currentDate, trackerManagedBills]);
  
  const totalPendingBills = useMemo(() => 
    trackerManagedBills.filter(b => !b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0)
  , [trackerManagedBills]);

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
  
  const handleAddBill = useCallback((bill: Omit<BillTracker, "id" | "isPaid">) => {
    const newBill: BillTracker = {
      ...bill,
      id: generateBillId(),
      isPaid: false,
      isExcluded: false,
    };
    setBillsTracker(prev => [...prev, newBill]);
  }, [setBillsTracker]);
  
  const handleTogglePaid = useCallback((bill: BillTracker, isChecked: boolean) => {
    // Esta função só deve ser chamada para BillTracker, não ExternalPaidBill
    if ((bill as BillDisplayItem).type === 'external_paid') return;
    
    const trackerBill = bill as BillTracker;

    if (isChecked) {
      // Mark as paid and create transaction
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
      
      // Usar o tipo auxiliar para links
      const baseLinks: PartialTransactionLinks = {};
      let description = trackerBill.description;
      
      const operationType: OperationType = trackerBill.sourceType === 'loan_installment' ? 'pagamento_emprestimo' : 'despesa';
      const domain = trackerBill.sourceType === 'loan_installment' ? 'financing' : 'operational';
      
      if (trackerBill.sourceType === 'loan_installment' && trackerBill.sourceRef && trackerBill.parcelaNumber) {
        const loanId = parseInt(trackerBill.sourceRef);
        const scheduleItem = calculateLoanAmortizationAndInterest(loanId, trackerBill.parcelaNumber);
        
        if (scheduleItem) {
            // Link to loan and parcela
            baseLinks.loanId = `loan_${loanId}`;
            baseLinks.parcelaId = String(trackerBill.parcelaNumber);
            
            // Update description to reflect payment details
            const loan = emprestimos.find(e => e.id === loanId);
            description = `Pagamento Empréstimo ${loan?.contrato || 'N/A'} - P${trackerBill.parcelaNumber}/${loan?.meses || 'N/A'}`;
            
            // ** AÇÃO CRÍTICA: Atualizar Entidade V2 (Empréstimo) **
            markLoanParcelPaid(loanId, trackerBill.expectedAmount, format(new Date(), 'yyyy-MM-dd'), trackerBill.parcelaNumber);
        }
      }
      
      if (trackerBill.sourceType === 'insurance_installment' && trackerBill.sourceRef && trackerBill.parcelaNumber) {
        // Link to vehicle transaction (Seguro ID_Parcela Num)
        baseLinks.vehicleTransactionId = `${trackerBill.sourceRef}_${trackerBill.parcelaNumber}`;
        
        const seguroId = parseInt(trackerBill.sourceRef);
        const seguro = segurosVeiculo.find(s => s.id === seguroId);
        description = `Pagamento Seguro ${seguro?.numeroApolice || 'N/A'} - P${trackerBill.parcelaNumber}/${seguro?.numeroParcelas || 'N/A'}`;
        
        // ** AÇÃO CRÍTICA: Atualizar Entidade V2 (Seguro) **
        markSeguroParcelPaid(seguroId, trackerBill.parcelaNumber, transactionId);
      }
      
      const newTransaction = {
        id: transactionId,
        date: format(new Date(), 'yyyy-MM-dd'), // Use today's date as payment date
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
      
      // Update Bill Tracker
      updateBill(trackerBill.id, { 
        isPaid: true, 
        transactionId, 
        paymentDate: format(new Date(), 'yyyy-MM-dd') 
      });
      
      toast.success(`Conta "${trackerBill.description}" paga e transação criada!`);
      
    } else {
      // Unmark as paid and delete transaction
      if (trackerBill.transactionId) {
        
        // ** AÇÃO CRÍTICA: Reverter Entidade V2 (Seguro/Empréstimo) **
        if (trackerBill.sourceType === 'loan_installment' && trackerBill.sourceRef && trackerBill.parcelaNumber) {
            const loanId = parseInt(trackerBill.sourceRef);
            unmarkLoanParcelPaid(loanId); 
        }
        
        if (trackerBill.sourceType === 'insurance_installment' && trackerBill.sourceRef && trackerBill.parcelaNumber) {
            const seguroId = parseInt(trackerBill.sourceRef);
            unmarkSeguroParcelPaid(seguroId, trackerBill.parcelaNumber);
        }
        
        // Remove transaction ID from bill tracker
        setBillsTracker(prev => prev.map(b => {
            if (b.id === trackerBill.id) {
                return { ...b, isPaid: false, transactionId: undefined, paymentDate: undefined };
            }
            return b;
        }));
        
        // Remove a transação real
        setTransacoesV2(prev => prev.filter(t => t.id !== trackerBill.transactionId));
        
        toast.info("Conta desmarcada como paga e transação excluída.");
        
      } else {
        updateBill(trackerBill.id, { isPaid: false, paymentDate: undefined });
      }
    }
  }, [updateBill, addTransacaoV2, contasMovimento, categoriasV2, emprestimos, segurosVeiculo, calculateLoanAmortizationAndInterest, setBillsTracker, markSeguroParcelPaid, markLoanParcelPaid, unmarkSeguroParcelPaid, unmarkLoanParcelPaid, setTransacoesV2]);
  
  const handleToggleFixedBill = useCallback((potentialBill: PotentialFixedBill, isChecked: boolean) => {
    const { sourceType, sourceRef, parcelaNumber, dueDate, expectedAmount, description, isPaid } = potentialBill;
    
    // 1. Se for para incluir (marcar)
    if (isChecked) {
        // Lógica de adiantamento: Se for uma conta futura E não estiver paga
        const isFutureBill = parseDateLocal(dueDate) > endOfMonth(currentDate);
        
        const newBill: BillTracker = {
            id: generateBillId(),
            description,
            dueDate, // Mantém a data de vencimento original
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
            
            // *** LÓGICA DE ADIANTAMENTO APLICADA AQUI ***
            isPaid: isFutureBill && !isPaid,
            paymentDate: isFutureBill && !isPaid ? format(new Date(), 'yyyy-MM-dd') : undefined,
            transactionId: isFutureBill && !isPaid ? `bill_tx_temp_${generateBillId()}` : undefined, // ID temporário para rastreamento
        };
        
        // Se for adiantamento, criamos a transação imediatamente
        if (newBill.isPaid && newBill.transactionId) {
            // Se for adiantamento, criamos a transação real imediatamente
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
            
            // Lógica de vinculação e atualização de entidades V2 (Empréstimo/Seguro)
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
            // Se for uma conta do mês atual ou já paga (apenas marcando a inclusão)
            setBillsTracker(prev => [...prev, newBill]);
            toast.success("Conta fixa incluída na lista do mês.");
        }
        
    } else {
        // 2. Se for para excluir (desmarcar)
        const billToRemove = billsTracker.find(b => 
            b.sourceType === sourceType && 
            b.sourceRef === sourceRef && 
            b.parcelaNumber === parcelaNumber
        );
        
        if (billToRemove) {
            if (billToRemove.isPaid) {
                // Se a conta foi paga (adiantada ou não), precisamos reverter o pagamento
                if (billToRemove.transactionId) {
                    // Reverter Entidade V2 (Empréstimo/Seguro)
                    if (billToRemove.sourceType === 'loan_installment' && billToRemove.sourceRef && billToRemove.parcelaNumber) {
                        unmarkLoanParcelPaid(parseInt(billToRemove.sourceRef)); 
                    }
                    if (billToRemove.sourceType === 'insurance_installment' && billToRemove.sourceRef && billToRemove.parcelaNumber) {
                        unmarkSeguroParcelPaid(parseInt(billToRemove.sourceRef), billToRemove.parcelaNumber);
                    }
                    
                    // Remover a transação gerada pelo Bill Tracker
                    setTransacoesV2(prev => prev.filter(t => t.id !== billToRemove.transactionId));
                    
                    // Remove a conta do Bills Tracker
                    setBillsTracker(prev => prev.filter(b => b.id !== billToRemove.id));
                    toast.info("Adiantamento estornado e parcela removida.");
                    return;
                }
                
                toast.error("Não é possível remover contas fixas já pagas sem Transaction ID.");
                return;
            }
            
            // Remove completamente se for uma conta futura (que não deveria estar no billsTracker)
            // Ou marca como excluída se for uma conta do mês atual (para não aparecer na lista)
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
          
          {/* NOVO LAYOUT: Sidebar + Main Content */}
          <div className="flex flex-1 overflow-hidden p-6 pt-4 gap-6">
            
            {/* Sidebar KPIs (25% width) */}
            <div className="w-1/4 shrink-0 overflow-y-auto">
                <BillsSidebarKPIs 
                    currentDate={currentDate}
                    totalPendingBills={totalPendingBills}
                />
            </div>
            
            {/* Main Content (75% width) */}
            <div className="flex-1 flex flex-col min-w-0 space-y-4">
                
                {/* Botões de Gerenciamento Fixo */}
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
                
                {/* Lista de Contas */}
                <div className="flex-1 min-h-0">
                    <BillsTrackerList
                        bills={combinedBills} {/* <-- USANDO LISTA COMBINADA */}
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
      
      {/* Fixed Bill Selector Modal */}
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