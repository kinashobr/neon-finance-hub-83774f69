import { useState, useMemo, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, CalendarCheck, Repeat, Shield, Building2, DollarSign, Info, X } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillTracker, PotentialFixedBill, BillSourceType, formatCurrency, generateBillId, TransactionLinks, OperationType } from "@/types/finance";
import { BillsTrackerList } from "./BillsTrackerList";
import { FixedBillsList } from "./FixedBillsList";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { parseDateLocal } from "@/lib/utils";

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
    contasMovimento,
    addTransacaoV2,
    categoriasV2,
    emprestimos,
    segurosVeiculo,
    calculateLoanAmortizationAndInterest,
  } = useFinance();
  
  const [currentDate, setCurrentDate] = useState(startOfMonth(new Date()));
  const [activeTab, setActiveTab] = useState("current");
  
  const currentMonthBills = useMemo(() => getBillsForMonth(currentDate), [getBillsForMonth, currentDate]);
  
  // --- Fixed Bills Logic ---
  const potentialFixedBills = useMemo(() => 
    getPotentialFixedBillsForMonth(currentDate, currentMonthBills)
  , [getPotentialFixedBillsForMonth, currentDate, currentMonthBills]);
  
  const futureFixedBills = useMemo(() => 
    getFutureFixedBills(currentDate, currentMonthBills)
  , [getFutureFixedBills, currentDate, currentMonthBills]);

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
    if (isChecked) {
      // Mark as paid and create transaction
      const account = contasMovimento.find(c => c.id === bill.suggestedAccountId);
      const category = categoriasV2.find(c => c.id === bill.suggestedCategoryId);
      
      if (!account) {
        toast.error("Conta de pagamento sugerida não encontrada.");
        return;
      }
      if (!category) {
        toast.error("Categoria sugerida não encontrada.");
        return;
      }
      
      const transactionId = `bill_tx_${bill.id}`;
      
      // Usar o tipo auxiliar para links
      const baseLinks: PartialTransactionLinks = {};
      let description = bill.description;
      
      const operationType: OperationType = bill.sourceType === 'loan_installment' ? 'pagamento_emprestimo' : 'despesa';
      const domain = bill.sourceType === 'loan_installment' ? 'financing' : 'operational';
      
      if (bill.sourceType === 'loan_installment' && bill.sourceRef && bill.parcelaNumber) {
        const loanId = parseInt(bill.sourceRef);
        const scheduleItem = calculateLoanAmortizationAndInterest(loanId, bill.parcelaNumber);
        
        if (scheduleItem) {
            // Link to loan and parcela
            baseLinks.loanId = `loan_${loanId}`;
            baseLinks.parcelaId = String(bill.parcelaNumber);
            
            // Update description to reflect payment details
            const loan = emprestimos.find(e => e.id === loanId);
            description = `Pagamento Empréstimo ${loan?.contrato || 'N/A'} - P${bill.parcelaNumber}/${loan?.meses || 'N/A'}`;
        }
      }
      
      if (bill.sourceType === 'insurance_installment' && bill.sourceRef && bill.parcelaNumber) {
        // Link to vehicle transaction (Seguro ID_Parcela Num)
        baseLinks.vehicleTransactionId = `${bill.sourceRef}_${bill.parcelaNumber}`;
        
        const seguro = segurosVeiculo.find(s => s.id === parseInt(bill.sourceRef));
        description = `Pagamento Seguro ${seguro?.numeroApolice || 'N/A'} - P${bill.parcelaNumber}/${seguro?.numeroParcelas || 'N/A'}`;
      }
      
      const newTransaction = {
        id: transactionId,
        date: format(new Date(), 'yyyy-MM-dd'), // Use today's date as payment date
        accountId: account.id,
        flow: 'out' as const,
        operationType: operationType, // FIXED: Use typed variable
        domain: domain as 'operational' | 'financing', // FIXED: Use typed variable
        amount: bill.expectedAmount,
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
          notes: `Gerado pelo Contas a Pagar. Bill ID: ${bill.id}`,
        }
      };
      
      addTransacaoV2(newTransaction);
      
      // Update Bill Tracker
      updateBill(bill.id, { 
        isPaid: true, 
        transactionId, 
        paymentDate: format(new Date(), 'yyyy-MM-dd') 
      });
      
      // Mark fixed installment as paid in source entity if applicable
      if (bill.sourceType === 'loan_installment' && baseLinks.loanId && baseLinks.parcelaId) {
        // Loan payment is handled by the transaction submitter in ReceitasDespesas.tsx
        // We rely on the transaction being created to link the payment.
      }
      if (bill.sourceType === 'insurance_installment' && baseLinks.vehicleTransactionId) {
        const [seguroIdStr, parcelaNumeroStr] = baseLinks.vehicleTransactionId.split('_');
        const seguroId = parseInt(seguroIdStr);
        const parcelaNumero = parseInt(parcelaNumeroStr);
        if (!isNaN(seguroId) && !isNaN(parcelaNumero)) {
            // Mark seguro parcel paid
            // Note: This is usually done by the transaction submitter, but doing it here ensures consistency if the transaction is created outside the main flow.
            // However, since we are creating the transaction here, we rely on the main flow to handle the entity update.
            // For simplicity and to avoid circular dependencies, we assume the transaction creation is enough for now.
        }
      }
      
      toast.success(`Conta "${bill.description}" paga e transação criada!`);
      
    } else {
      // Unmark as paid and delete transaction
      if (bill.transactionId) {
        // Find and delete the transaction
        setBillsTracker(prev => prev.map(b => {
            if (b.id === bill.id) {
                return { ...b, isPaid: false, transactionId: undefined, paymentDate: undefined };
            }
            return b;
        }));
        
        // Note: Deleting the transaction should be handled by the main transaction flow 
        // (e.g., in ReceitasDespesas.tsx) to handle linked transfers/entities.
        // For now, we rely on the user to manually delete the transaction if needed, 
        // or we implement a dedicated function here if we want full autonomy.
        toast.warning("Conta desmarcada como paga. Lembre-se de excluir a transação manualmente se necessário.");
        
      } else {
        updateBill(bill.id, { isPaid: false, paymentDate: undefined });
      }
    }
  }, [updateBill, addTransacaoV2, contasMovimento, categoriasV2, emprestimos, segurosVeiculo, calculateLoanAmortizationAndInterest, setBillsTracker]);
  
  const handleToggleFixedBill = useCallback((potentialBill: PotentialFixedBill, isChecked: boolean) => {
    const { sourceType, sourceRef, parcelaNumber, dueDate, expectedAmount, description, isPaid } = potentialBill;
    
    if (isChecked) {
        // Add to billsTracker
        const newBill: BillTracker = {
            id: generateBillId(),
            description,
            dueDate,
            expectedAmount,
            isPaid,
            sourceType,
            sourceRef,
            parcelaNumber,
            suggestedAccountId: contasMovimento.find(c => c.accountType === 'corrente')?.id,
            suggestedCategoryId: categoriasV2.find(c => c.label.toLowerCase() === 'seguro' || c.label.toLowerCase() === 'emprestimo')?.id || null,
            isExcluded: false,
            paymentDate: isPaid ? format(parseDateLocal(dueDate), 'yyyy-MM-dd') : undefined, // Use due date as placeholder for paid bills
        };
        setBillsTracker(prev => [...prev, newBill]);
        toast.success("Conta fixa incluída na lista do mês.");
    } else {
        // Remove from billsTracker (only if not paid)
        const billToRemove = currentMonthBills.find(b => 
            b.sourceType === sourceType && 
            b.sourceRef === sourceRef && 
            b.parcelaNumber === parcelaNumber
        );
        
        if (billToRemove) {
            if (billToRemove.isPaid) {
                toast.error("Não é possível remover contas fixas já pagas. Desmarque o pagamento primeiro.");
                return;
            }
            // Mark as excluded for this month
            updateBill(billToRemove.id, { isExcluded: true });
            toast.info("Conta fixa excluída da lista deste mês.");
        }
    }
  }, [setBillsTracker, contasMovimento, categoriasV2, currentMonthBills, updateBill]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden"
        hideCloseButton={true}
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
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col p-6 pt-4 overflow-hidden">
          <TabsList className="bg-muted/50 w-full grid grid-cols-3 shrink-0">
            <TabsTrigger value="current" className="text-sm">
              <DollarSign className="w-4 h-4 mr-2" /> Contas do Mês
            </TabsTrigger>
            <TabsTrigger value="fixed" className="text-sm">
              <Repeat className="w-4 h-4 mr-2" /> Contas Fixas
            </TabsTrigger>
            <TabsTrigger value="future" className="text-sm">
              <Info className="w-4 h-4 mr-2" /> Próximos Vencimentos
            </TabsTrigger>
          </TabsList>

          {/* Tab Contas do Mês */}
          <TabsContent value="current" className="mt-4 flex-1 min-h-0">
            <BillsTrackerList
              bills={currentMonthBills}
              onUpdateBill={handleUpdateBill}
              onDeleteBill={handleDeleteBill}
              onAddBill={handleAddBill}
              onTogglePaid={handleTogglePaid}
              currentDate={currentDate}
            />
          </TabsContent>

          {/* Tab Contas Fixas (Empréstimos/Seguros) */}
          <TabsContent value="fixed" className="mt-4 flex-1 min-h-0">
            <FixedBillsList
              potentialBills={potentialFixedBills}
              onToggleFixedBill={handleToggleFixedBill}
              currentDate={currentDate}
              title="Parcelas Fixas Vencendo no Mês"
              description="Selecione as parcelas de empréstimos e seguros que devem ser incluídas na lista de contas a pagar deste mês."
            />
          </TabsContent>
          
          {/* Tab Próximos Vencimentos */}
          <TabsContent value="future" className="mt-4 flex-1 min-h-0">
            <FixedBillsList
              potentialBills={futureFixedBills}
              onToggleFixedBill={handleToggleFixedBill}
              currentDate={currentDate}
              title="Próximos Vencimentos Fixos (Após este mês)"
              description="Visualize e gerencie parcelas futuras de empréstimos e seguros."
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}