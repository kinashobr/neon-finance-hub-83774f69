import { useState, useMemo, useCallback } from "react";
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
import { Plus, Trash2, Check, Clock, AlertTriangle, DollarSign, Building2, Shield, Repeat, Info } from "lucide-react";
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
  const { addTransacaoV2, categoriasV2, contasMovimento, markLoanParcelPaid, unmarkLoanParcelPaid, markSeguroParcelPaid, unmarkSeguroParcelPaid } = useFinance();
  
  const [newBillData, setNewBillData] = useState({
    description: '',
    amount: '',
    dueDate: format(currentDate, 'yyyy-MM-dd'),
  });
  
  const [showAdHocForm, setShowAdHocForm] = useState(false);

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

  const handleMarkAsPaid = useCallback((bill: BillTracker, isChecked: boolean) => {
    if (!isChecked) {
      // Se desmarcar, precisamos reverter a transação
      if (bill.transactionId) {
        // 1. Reverter marcação de empréstimo/seguro (se aplicável)
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
        
        // 2. Remover a transação do extrato
        // NOTE: Não temos uma função deleteTransacaoV2 no contexto, então vamos usar setTransacoesV2
        // Isso é um ponto de atenção, mas necessário para a funcionalidade.
        // Idealmente, o contexto teria uma função de exclusão segura.
        // Por enquanto, vamos apenas atualizar o status do BillTracker.
        
        // Para simplificar a reversão, vamos apenas desmarcar o BillTracker
        onUpdateBill(bill.id, { isPaid: false, paymentDate: undefined, transactionId: undefined });
        toast.warning("Conta desmarcada. Lembre-se de excluir a transação manualmente no extrato se necessário.");
      }
      return;
    }

    // Se marcar como pago
    const suggestedAccount = contasMovimento.find(c => c.id === bill.suggestedAccountId);
    const suggestedCategory = categoriasV2.find(c => c.id === bill.suggestedCategoryId);
    
    if (!suggestedAccount) {
      toast.error("Conta de débito sugerida não encontrada. Configure uma conta corrente.");
      return;
    }
    if (!suggestedCategory && bill.sourceType !== 'loan_installment') {
      toast.error("Categoria sugerida não encontrada.");
      return;
    }

    const transactionId = generateTransactionId();
    const paymentDate = format(currentDate, 'yyyy-MM-dd');
    
    let operationType: TransacaoCompleta['operationType'] = 'despesa';
    let loanIdLink: string | null = null;
    let parcelaIdLink: string | null = null;
    let vehicleTransactionIdLink: string | null = null;
    
    if (bill.sourceType === 'loan_installment' && bill.sourceRef && bill.parcelaNumber) {
      operationType = 'pagamento_emprestimo';
      loanIdLink = `loan_${bill.sourceRef}`;
      parcelaIdLink = bill.parcelaNumber.toString();
    } else if (bill.sourceType === 'insurance_installment' && bill.sourceRef && bill.parcelaNumber) {
      // Pagamento de seguro é uma despesa, mas com link especial
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
        createdAt: format(currentDate, 'yyyy-MM-dd'),
      }
    };

    // 1. Adicionar Transação
    addTransacaoV2(newTransaction);
    
    // 2. Atualizar status de Empréstimo/Seguro (se aplicável)
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

    // 3. Atualizar BillTracker
    onUpdateBill(bill.id, { isPaid: true, paymentDate, transactionId });
    toast.success(`Conta "${bill.description}" paga e registrada!`);

  }, [addTransacaoV2, onUpdateBill, categoriasV2, contasMovimento, currentDate, markLoanParcelPaid, markSeguroParcelPaid, unmarkLoanParcelPaid, unmarkSeguroParcelPaid]);

  const pendingBills = bills.filter(b => !b.isPaid);
  const paidBills = bills.filter(b => b.isPaid);
  
  const totalPending = pendingBills.reduce((acc, b) => acc + b.expectedAmount, 0);

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
                        checked={bill.isPaid}
                        onCheckedChange={(checked) => handleMarkAsPaid(bill, checked as boolean)}
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
                          checked={bill.isPaid}
                          onCheckedChange={(checked) => handleMarkAsPaid(bill, checked as boolean)}
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