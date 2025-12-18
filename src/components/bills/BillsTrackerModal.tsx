import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CalendarCheck, Clock, CheckCircle2, AlertTriangle, ArrowRight, Plus, X, RefreshCw, DollarSign } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillTracker, PotentialFixedBill, formatCurrency, BillSourceType, generateBillId, TransacaoCompleta } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format, isPast, isSameMonth, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { toast } from "sonner";
import { MonthlyTransactionSummary } from "./MonthlyTransactionSummary";

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
    getContasCorrentesTipo,
    addTransacaoV2,
    markLoanParcelPaid,
    markSeguroParcelPaid,
    unmarkLoanParcelPaid,
    unmarkSeguroParcelPaid,
    transacoesV2,
    setTransacoesV2,
    categoriasV2,
    getTransactionsForMonth,
  } = useFinance();
  
  const [referenceDate, setReferenceDate] = useState(startOfMonth(new Date()));
  const [activeTab, setActiveTab] = useState("contas");
  
  const contasCorrentes = getContasCorrentesTipo();
  const categoriesMap = useMemo(() => new Map(categoriasV2.map(c => [c.id, c])), [categoriasV2]);

  // 1. Contas Fixas/Recorrentes (BillsTracker)
  const localBills = useMemo(() => getBillsForMonth(referenceDate), [getBillsForMonth, referenceDate]);
  
  // 2. Contas Potenciais (Empréstimos/Seguros)
  const potentialBills = useMemo(() => getPotentialFixedBillsForMonth(referenceDate, localBills), [getPotentialFixedBillsForMonth, referenceDate, localBills]);
  
  // 3. Transações Reais do Mês (NOVO)
  const monthlyTransactions = useMemo(() => getTransactionsForMonth(referenceDate), [getTransactionsForMonth, referenceDate]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setReferenceDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };
  
  const handleToggleInclusion = (potentialBill: PotentialFixedBill) => {
    const existingBill = localBills.find(b => b.sourceType === potentialBill.sourceType && b.sourceRef === potentialBill.sourceRef && b.parcelaNumber === potentialBill.parcelaNumber);
    
    if (existingBill) {
      // Excluir (marcar como isExcluded)
      updateBill(existingBill.id, { isExcluded: true });
      toast.info(`Conta ${potentialBill.description} excluída da lista.`);
    } else {
      // Incluir (adicionar como nova BillTracker)
      const newBill: BillTracker = {
        id: generateBillId(),
        description: potentialBill.description,
        dueDate: potentialBill.dueDate,
        expectedAmount: potentialBill.expectedAmount,
        isPaid: potentialBill.isPaid,
        paymentDate: potentialBill.isPaid ? format(new Date(), 'yyyy-MM-dd') : undefined,
        transactionId: undefined, // Será preenchido no pagamento
        sourceType: potentialBill.sourceType,
        sourceRef: potentialBill.sourceRef,
        parcelaNumber: potentialBill.parcelaNumber,
        suggestedAccountId: contasCorrentes[0]?.id,
        suggestedCategoryId: categoriesMap.get('cat_seguro')?.id || categoriesMap.get('cat_alimentacao')?.id,
        isExcluded: false,
      };
      setBillsTracker(prev => [...prev, newBill]);
      toast.success(`Conta ${potentialBill.description} adicionada à lista.`);
    }
  };
  
  const handleMarkPaid = (bill: BillTracker) => {
    if (!bill.suggestedAccountId) {
      toast.error("Selecione uma conta de débito antes de marcar como pago.");
      return;
    }
    
    const paymentDate = format(new Date(), 'yyyy-MM-dd');
    const transactionId = generateBillId(); // Usando o mesmo gerador para ID de transação temporário
    
    // 1. Criar a transação
    const newTx: TransacaoCompleta = {
      id: transactionId,
      date: paymentDate,
      accountId: bill.suggestedAccountId,
      flow: 'out',
      operationType: bill.sourceType === 'loan_installment' ? 'pagamento_emprestimo' : bill.sourceType === 'insurance_installment' ? 'despesa' : 'despesa',
      domain: bill.sourceType === 'loan_installment' ? 'financing' : 'operational',
      amount: bill.expectedAmount,
      categoryId: bill.suggestedCategoryId || null,
      description: bill.description,
      links: {
        investmentId: null,
        loanId: bill.sourceType === 'loan_installment' ? `loan_${bill.sourceRef}` : null,
        transferGroupId: null,
        parcelaId: bill.sourceType === 'loan_installment' ? String(bill.parcelaNumber) : null,
        vehicleTransactionId: bill.sourceType === 'insurance_installment' ? `${bill.sourceRef}_${bill.parcelaNumber}` : null,
      },
      conciliated: false,
      attachments: [],
      meta: {
        createdBy: 'bill_tracker',
        source: 'bill_tracker',
        createdAt: new Date().toISOString(),
      }
    };
    
    addTransacaoV2(newTx);
    
    // 2. Marcar a conta como paga no tracker
    updateBill(bill.id, {
      isPaid: true,
      paymentDate,
      transactionId,
    });
    
    // 3. Atualizar status nas entidades (Empréstimo/Seguro)
    if (bill.sourceType === 'loan_installment' && bill.sourceRef && bill.parcelaNumber) {
      const loanId = parseInt(bill.sourceRef);
      if (!isNaN(loanId)) {
        markLoanParcelPaid(loanId, bill.expectedAmount, paymentDate, bill.parcelaNumber);
      }
    }
    if (bill.sourceType === 'insurance_installment' && bill.sourceRef && bill.parcelaNumber) {
      const seguroId = parseInt(bill.sourceRef);
      if (!isNaN(seguroId)) {
        markSeguroParcelPaid(seguroId, bill.parcelaNumber, transactionId);
      }
    }
    
    toast.success(`Conta ${bill.description} marcada como paga!`);
  };
  
  const handleUnmarkPaid = (bill: BillTracker) => {
    if (!bill.transactionId) return;
    
    // 1. Remover a transação
    setTransacoesV2(prev => prev.filter(t => t.id !== bill.transactionId));
    
    // 2. Desmarcar a conta no tracker
    updateBill(bill.id, {
      isPaid: false,
      paymentDate: undefined,
      transactionId: undefined,
    });
    
    // 3. Reverter status nas entidades (Empréstimo/Seguro)
    if (bill.sourceType === 'loan_installment' && bill.sourceRef) {
      const loanId = parseInt(bill.sourceRef);
      if (!isNaN(loanId)) {
        unmarkLoanParcelPaid(loanId);
      }
    }
    if (bill.sourceType === 'insurance_installment' && bill.sourceRef && bill.parcelaNumber) {
      const seguroId = parseInt(bill.sourceRef);
      if (!isNaN(seguroId)) {
        unmarkSeguroParcelPaid(seguroId, bill.parcelaNumber);
      }
    }
    
    toast.info(`Pagamento de ${bill.description} estornado.`);
  };
  
  const totalExpected = localBills.reduce((acc, b) => acc + b.expectedAmount, 0);
  const totalPaid = localBills.filter(b => b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0);
  const totalPending = totalExpected - totalPaid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            Contas a Pagar & Fluxo de Caixa
          </DialogTitle>
          <DialogDescription>
            Gerencie contas fixas e acompanhe o fluxo de caixa real do mês.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/50 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => handleMonthChange('prev')}>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </Button>
          <h4 className="font-semibold text-lg">
            {format(referenceDate, 'MMMM yyyy')}
          </h4>
          <Button variant="ghost" size="icon" onClick={() => handleMonthChange('next')}>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="bg-muted/50 shrink-0">
            <TabsTrigger value="contas">Contas a Pagar ({localBills.length})</TabsTrigger>
            <TabsTrigger value="potenciais">Vínculos Potenciais ({potentialBills.length})</TabsTrigger>
            <TabsTrigger value="fluxo">Fluxo de Caixa Real ({monthlyTransactions.length})</TabsTrigger>
          </TabsList>

          {/* Tab 1: Contas a Pagar */}
          <TabsContent value="contas" className="flex-1 overflow-hidden pt-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-muted-foreground">Total Previsto</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(totalExpected)}</p>
              </div>
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="text-xs text-muted-foreground">Total Pago</p>
                <p className="text-lg font-bold text-success">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-xs text-muted-foreground">Total Pendente</p>
                <p className="text-lg font-bold text-warning">{formatCurrency(totalPending)}</p>
              </div>
            </div>
            
            <ScrollArea className="h-[45vh] border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-[100px]">Vencimento</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[120px] text-right">Valor</TableHead>
                    <TableHead className="w-[120px]">Conta Débito</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localBills.map((bill) => {
                    const isOverdue = isPast(parseDateLocal(bill.dueDate)) && !bill.isPaid;
                    const account = contasCorrentes.find(c => c.id === bill.suggestedAccountId);
                    
                    return (
                      <TableRow key={bill.id} className={cn(
                        bill.isPaid && "bg-success/5 hover:bg-success/10",
                        isOverdue && "bg-destructive/5 hover:bg-destructive/10"
                      )}>
                        <TableCell className={cn("text-sm font-medium", isOverdue && "text-destructive")}>
                          {parseDateLocal(bill.dueDate).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{bill.description}</TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          {formatCurrency(bill.expectedAmount)}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={bill.suggestedAccountId || ''} 
                            onValueChange={(v) => updateBill(bill.id, { suggestedAccountId: v })}
                            disabled={bill.isPaid}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Conta..." />
                            </SelectTrigger>
                            <SelectContent>
                              {contasCorrentes.map(a => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              bill.isPaid ? "border-success text-success" : "border-warning text-warning"
                            )}
                          >
                            {bill.isPaid ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                            {bill.isPaid ? 'Paga' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {bill.isPaid ? (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() => handleUnmarkPaid(bill)}
                              title="Estornar Pagamento"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 px-2 gap-1"
                              onClick={() => handleMarkPaid(bill)}
                              disabled={!bill.suggestedAccountId}
                            >
                              Pagar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {localBills.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma conta fixa neste mês.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Tab 2: Vínculos Potenciais */}
          <TabsContent value="potenciais" className="flex-1 overflow-hidden pt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Contas geradas automaticamente a partir de empréstimos e seguros. Inclua-as na sua lista de contas a pagar.
            </p>
            <ScrollArea className="h-[45vh] border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-[100px]">Vencimento</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[120px] text-right">Valor</TableHead>
                    <TableHead className="w-[100px]">Fonte</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    <TableHead className="w-[100px]">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {potentialBills.map((bill) => {
                    const isOverdue = isPast(parseDateLocal(bill.dueDate)) && !bill.isPaid;
                    
                    return (
                      <TableRow key={bill.key} className={cn(
                        bill.isPaid && "bg-success/5",
                        isOverdue && "bg-destructive/5"
                      )}>
                        <TableCell className="text-sm font-medium">
                          {parseDateLocal(bill.dueDate).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{bill.description}</TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          {formatCurrency(bill.expectedAmount)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline">
                            {bill.sourceType === 'loan_installment' ? 'Empréstimo' : 'Seguro'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              bill.isPaid ? "border-success text-success" : "border-warning text-warning"
                            )}
                          >
                            {bill.isPaid ? 'Paga' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant={bill.isIncluded ? "destructive" : "default"} 
                            size="sm" 
                            className="h-8 px-2 gap-1 text-xs"
                            onClick={() => handleToggleInclusion(bill)}
                            disabled={bill.isPaid}
                          >
                            {bill.isIncluded ? 'Excluir' : 'Incluir'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {potentialBills.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma conta potencial neste mês.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
          
          {/* Tab 3: Fluxo de Caixa Real (NOVO) */}
          <TabsContent value="fluxo" className="flex-1 overflow-hidden pt-4">
            <MonthlyTransactionSummary 
              transactions={monthlyTransactions} 
              referenceDate={referenceDate} 
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}