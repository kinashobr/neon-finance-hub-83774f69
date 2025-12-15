import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Check, Clock, AlertTriangle, DollarSign, Building2, Shield, Repeat, Info, Save } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillTracker, BillSourceType, formatCurrency, TransacaoCompleta, getDomainFromOperation, generateTransactionId } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface BillsTrackerListProps {
  bills: BillTracker[];
  onUpdateBill: (id: string, updates: Partial<BillTracker>) => void;
  onDeleteBill: (id: string) => void;
  onAddBill: (bill: Omit<BillTracker, "id" | "isPaid">) => void;
  currentDate: Date;
}

const SOURCE_CONFIG: Record<BillSourceType, { icon: React.ElementType; color: string; label: string }> = {
  loan_installment: { icon: Building2, color: 'text-orange-500', label: 'Empréstimo' },
  insurance_installment: { icon: Shield, color: 'text-blue-500', label: 'Seguro' },
  fixed_expense: { icon: Repeat, color: 'text-purple-500', label: 'Despesa Fixa' },
  ad_hoc: { icon: DollarSign, color: 'text-primary', label: 'Avulsa' },
};

export function BillsTrackerList({
  bills,
  onUpdateBill,
  onDeleteBill,
  onAddBill,
  currentDate,
}: BillsTrackerListProps) {
  const { 
    addTransacaoV2, 
    categoriasV2, 
    contasMovimento, 
    markLoanParcelPaid, 
    unmarkLoanParcelPaid, 
    markSeguroParcelPaid, 
    unmarkSeguroParcelPaid,
    setTransacoesV2, // Necessário para exclusão de transações
  } = useFinance();
  
  // Estado local para rastrear o status de pagamento (antes de salvar)
  const [checkedBills, setCheckedBills] = useState<Record<string, boolean>>({});
  
  // Estado local para itens ad-hoc que ainda não foram persistidos no BillsTracker
  const [newBillData, setNewBillData] = useState({
    description: '',
    amount: '',
    dueDate: format(currentDate, 'yyyy-MM-dd'),
  });
  
  const [showAdHocForm, setShowAdHocForm] = useState(false);

  // Inicializa o estado local de checkedBills com o status atual das bills
  useEffect(() => {
    const initialChecked = bills.reduce((acc, bill) => {
      acc[bill.id] = bill.isPaid;
      return acc;
    }, {} as Record<string, boolean>);
    setCheckedBills(initialChecked);
  }, [bills]);

  const formatAmount = (value: string) => {
    const cleaned = value.replace(/[^\d,]/g, '');
    const parts = cleaned.split(',');
    if (parts.length > 2) return value;
    return cleaned;
  };

  const parseAmount = (value: string): number => {
    const parsed = parseFloat(value.replace('.', '').replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleAddAdHocBill = () => {
    const amount = parseAmount(newBillData.amount);
    if (!newBillData.description || amount <= 0 || !newBillData.dueDate) {
      toast.error("Preencha a descrição, valor e data de vencimento.");
      return;
    }

    onAddBill({
      description: newBillData.description,
      dueDate: newBillData.dueDate,
      expectedAmount: amount,
      sourceType: 'ad_hoc',
      suggestedAccountId: contasMovimento.find(c => c.accountType === 'conta_corrente')?.id,
      suggestedCategoryId: categoriasV2.find(c => c.nature === 'despesa_variavel')?.id,
    });

    setNewBillData({ description: '', amount: '', dueDate: format(currentDate, 'yyyy-MM-dd') });
    setShowAdHocForm(false);
    toast.success("Conta avulsa adicionada!");
  };
  
  const handleToggleCheck = (billId: string, isChecked: boolean) => {
    setCheckedBills(prev => ({ ...prev, [billId]: isChecked }));
  };

  const handleSavePayments = useCallback(() => {
    const billsToProcess = bills.map(bill => ({
      ...bill,
      shouldBePaid: checkedBills[bill.id] || false,
    }));

    let transactionsToCreate: TransacaoCompleta[] = [];
    let billsToUpdate: { id: string; updates: Partial<BillTracker> }[] = [];
    let transactionsToExclude: string[] = [];
    let successCount = 0;
    const paymentDate = format(currentDate, 'yyyy-MM-dd');

    billsToProcess.forEach(bill => {
      const isCurrentlyPaid = bill.isPaid;
      const shouldBePaid = bill.shouldBePaid;

      if (shouldBePaid && !isCurrentlyPaid) {
        // --- MARCAR COMO PAGO ---
        const suggestedAccount = contasMovimento.find(c => c.id === bill.suggestedAccountId);
        if (!suggestedAccount) {
          toast.error(`Erro: Conta de débito para ${bill.description} não encontrada.`);
          return;
        }

        const transactionId = generateTransactionId();
        
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
            createdAt: paymentDate,
          }
        };
        
        transactionsToCreate.push(newTransaction);
        
        // Atualizar BillTracker localmente
        billsToUpdate.push({ 
          id: bill.id, 
          updates: { isPaid: true, paymentDate, transactionId } 
        });
        
        successCount++;

      } else if (!shouldBePaid && isCurrentlyPaid) {
        // --- DESMARCAR COMO PAGO (REVERTER) ---
        
        if (bill.transactionId) {
          transactionsToExclude.push(bill.transactionId);
          
          // Reverter marcação de empréstimo/seguro (será feito no contexto)
          if (bill.sourceType === 'loan_installment' && bill.sourceRef) {
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
        
        // Atualizar BillTracker localmente
        billsToUpdate.push({ 
          id: bill.id, 
          updates: { isPaid: false, paymentDate: undefined, transactionId: undefined } 
        });
      }
    });

    // 1. Processar exclusões de transações
    if (transactionsToExclude.length > 0) {
        setTransacoesV2(prev => prev.filter(t => !transactionsToExclude.includes(t.id)));
    }
    
    // 2. Processar criação de transações
    if (transactionsToCreate.length > 0) {
        transactionsToCreate.forEach(addTransacaoV2);
    }
    
    // 3. Processar atualizações do BillTracker
    billsToUpdate.forEach(update => onUpdateBill(update.id, update.updates));
    
    if (successCount > 0) {
        toast.success(`${successCount} pagamento(s) registrado(s) com sucesso!`);
    } else if (transactionsToExclude.length > 0) {
        toast.warning(`${transactionsToExclude.length} pagamento(s) revertido(s).`);
    } else {
        toast.info("Nenhuma alteração para salvar.");
    }
    
  }, [bills, checkedBills, addTransacaoV2, onUpdateBill, contasMovimento, categoriasV2, currentDate, markLoanParcelPaid, unmarkLoanParcelPaid, markSeguroParcelPaid, unmarkSeguroParcelPaid, setTransacoesV2]);

  const pendingBills = bills.filter(b => !b.isPaid);
  const paidBills = bills.filter(b => b.isPaid);
  
  const totalPending = pendingBills.reduce((acc, b) => acc + b.expectedAmount, 0);
  const totalChanges = bills.filter(b => b.isPaid !== checkedBills[b.id]).length;

  const formatDate = (dateStr: string) => {
    const date = parseDateLocal(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  return (
    <div className="space-y-6">
      {/* Adição Rápida (Ad-Hoc) */}
      <div className="glass-card p-4">
        <Button 
          variant="outline" 
          className="w-full gap-2"
          onClick={() => setShowAdHocForm(prev => !prev)}
        >
          {showAdHocForm ? <Info className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdHocForm ? "Ocultar Adição Rápida" : "Adicionar Conta Avulsa"}
        </Button>
        
        {showAdHocForm && (
          <div className="mt-4 space-y-3 p-3 border rounded-lg bg-muted/30">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <Label className="text-xs">Descrição *</Label>
                <Input
                  value={newBillData.description}
                  onChange={(e) => setNewBillData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: Presente de aniversário"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Valor (R$) *</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={newBillData.amount}
                  onChange={(e) => setNewBillData(prev => ({ ...prev, amount: formatAmount(e.target.value) }))}
                  placeholder="0,00"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Vencimento *</Label>
                <Input
                  type="date"
                  value={newBillData.dueDate}
                  onChange={(e) => setNewBillData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <Button 
                onClick={handleAddAdHocBill} 
                className="col-span-1 h-8 text-xs"
                disabled={!newBillData.description || parseAmount(newBillData.amount) <= 0 || !newBillData.dueDate}
              >
                Adicionar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Botão Salvar Pagamentos */}
      <Button 
        onClick={handleSavePayments} 
        className="w-full gap-2 bg-primary hover:bg-primary/90"
        disabled={totalChanges === 0}
      >
        <Save className="w-4 h-4" />
        Salvar Pagamentos ({totalChanges} alteração{totalChanges !== 1 ? 's' : ''})
      </Button>

      {/* Tabela de Contas Pendentes */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Contas Pendentes ({pendingBills.length})</h3>
          <Badge variant="destructive" className="text-sm">
            Total: {formatCurrency(totalPending)}
          </Badge>
        </div>
        
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground w-10 text-center">Pagar</TableHead>
                <TableHead className="text-muted-foreground w-24">Vencimento</TableHead>
                <TableHead className="text-muted-foreground">Descrição</TableHead>
                <TableHead className="text-muted-foreground w-24 text-right">Valor</TableHead>
                <TableHead className="text-muted-foreground w-24">Tipo</TableHead>
                <TableHead className="text-muted-foreground w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingBills.map((bill) => {
                const config = SOURCE_CONFIG[bill.sourceType] || SOURCE_CONFIG.ad_hoc;
                const Icon = config.icon;
                const dueDate = parseDateLocal(bill.dueDate);
                const isOverdue = dueDate < currentDate && !bill.isPaid;
                
                return (
                  <TableRow 
                    key={bill.id} 
                    className={cn(
                      "hover:bg-muted/30 transition-colors",
                      isOverdue && "bg-destructive/5 hover:bg-destructive/10"
                    )}
                  >
                    <TableCell className="text-center">
                      <Checkbox
                        checked={checkedBills[bill.id] || false}
                        onCheckedChange={(checked) => handleToggleCheck(bill.id, checked as boolean)}
                        className="w-5 h-5"
                      />
                    </TableCell>
                    <TableCell className={cn("font-medium whitespace-nowrap", isOverdue && "text-destructive")}>
                      <div className="flex items-center gap-1">
                        {isOverdue && <AlertTriangle className="w-3 h-3 text-destructive" />}
                        {formatDate(bill.dueDate)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm max-w-[250px] truncate">
                      {bill.description}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-destructive whitespace-nowrap">
                      {formatCurrency(bill.expectedAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("gap-1 text-xs", config.color)}>
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {bill.sourceType === 'ad_hoc' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => onDeleteBill(bill.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {pendingBills.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    <Check className="w-6 h-6 mx-auto mb-2 text-success" />
                    Todas as contas pendentes foram pagas!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Tabela de Contas Pagas */}
      {paidBills.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Contas Pagas ({paidBills.length})</h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground w-10 text-center">Pago</TableHead>
                  <TableHead className="text-muted-foreground w-24">Pagamento</TableHead>
                  <TableHead className="text-muted-foreground">Descrição</TableHead>
                  <TableHead className="text-muted-foreground w-24 text-right">Valor</TableHead>
                  <TableHead className="text-muted-foreground w-24">Tipo</TableHead>
                  <TableHead className="text-muted-foreground w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paidBills.map((bill) => {
                  const config = SOURCE_CONFIG[bill.sourceType] || SOURCE_CONFIG.ad_hoc;
                  const Icon = config.icon;
                  
                  return (
                    <TableRow key={bill.id} className="bg-success/5 hover:bg-success/10 transition-colors">
                      <TableCell className="text-center">
                        <Checkbox
                          checked={checkedBills[bill.id] || false}
                          onCheckedChange={(checked) => handleToggleCheck(bill.id, checked as boolean)}
                          className="w-5 h-5 border-success data-[state=checked]:bg-success"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-success whitespace-nowrap">
                        {bill.paymentDate ? formatDate(bill.paymentDate) : '-'}
                      </TableCell>
                      <TableCell className="text-sm max-w-[250px] truncate">
                        {bill.description}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-success whitespace-nowrap">
                        {formatCurrency(bill.expectedAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("gap-1 text-xs", config.color)}>
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {/* Botão para ver transação no extrato */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => toast.info(`Transação ID: ${bill.transactionId}`)}
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                        {bill.sourceType === 'ad_hoc' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => onDeleteBill(bill.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}