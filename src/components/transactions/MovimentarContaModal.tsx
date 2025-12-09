import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, TrendingDown, ArrowLeftRight, PiggyBank, Wallet, 
  CreditCard, AlertTriangle, Check, Plus, Info, Car
} from "lucide-react";
import { 
  OperationType, ContaCorrente, Categoria, 
  TransacaoCompleta, formatCurrency, generateTransactionId,
  generateTransferGroupId, getFlowTypeFromOperation, getDomainFromOperation,
  TransferGroup
} from "@/types/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MovimentarContaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: ContaCorrente[];
  categories: Categoria[];
  investments: Array<{ id: string; name: string }>;
  loans: Array<{ id: string; institution: string; parcelas?: Array<{ id: string; numero: number; pago: boolean }> }>;
  selectedAccountId?: string;
  onSubmit: (transaction: TransacaoCompleta, transferGroup?: TransferGroup) => void;
  editingTransaction?: TransacaoCompleta;
}

const OPERATION_TYPES: { value: OperationType; label: string; icon: typeof TrendingUp; color: string }[] = [
  { value: 'receita', label: 'Receita', icon: TrendingUp, color: 'text-success' },
  { value: 'despesa', label: 'Despesa', icon: TrendingDown, color: 'text-destructive' },
  { value: 'transferencia', label: 'Transferência', icon: ArrowLeftRight, color: 'text-primary' },
  { value: 'aplicacao', label: 'Aplicação', icon: PiggyBank, color: 'text-purple-500' },
  { value: 'resgate', label: 'Resgate', icon: Wallet, color: 'text-amber-500' },
  { value: 'pagamento_emprestimo', label: 'Pagar Empréstimo', icon: CreditCard, color: 'text-orange-500' },
  { value: 'veiculo', label: 'Veículos', icon: Car, color: 'text-blue-500' },
];

export function MovimentarContaModal({
  open,
  onOpenChange,
  accounts,
  categories,
  investments,
  loans,
  selectedAccountId,
  onSubmit,
  editingTransaction
}: MovimentarContaModalProps) {
  const [operationType, setOperationType] = useState<OperationType>('receita');
  const [accountId, setAccountId] = useState(selectedAccountId || '');
  const [accountDestinoId, setAccountDestinoId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [investmentId, setInvestmentId] = useState('');
  const [loanId, setLoanId] = useState('');
  const [parcelaId, setParcelaId] = useState('');
  const [vehicleOperation, setVehicleOperation] = useState<'compra' | 'venda'>('compra');

  const isEditing = !!editingTransaction;

  // Reset ou preencher quando modal abre
  useEffect(() => {
    if (open) {
      if (editingTransaction) {
        setOperationType(editingTransaction.operationType);
        setAccountId(editingTransaction.accountId);
        setDate(editingTransaction.date);
        setAmount(editingTransaction.amount.toString());
        setDescription(editingTransaction.description);
        setCategoryId(editingTransaction.categoryId || '');
        setInvestmentId(editingTransaction.links.investmentId || '');
        setLoanId(editingTransaction.links.loanId || '');
        setParcelaId(editingTransaction.links.parcelaId || '');
        setVehicleOperation(editingTransaction.meta.vehicleOperation || 'compra');
      } else {
        setAccountId(selectedAccountId || accounts[0]?.id || '');
        setOperationType('receita');
        setDate(new Date().toISOString().split('T')[0]);
        setAmount('');
        setDescription('');
        setCategoryId('');
        setAccountDestinoId('');
        setInvestmentId('');
        setLoanId('');
        setParcelaId('');
        setVehicleOperation('compra');
      }
    }
  }, [open, selectedAccountId, accounts, editingTransaction]);

  const selectedAccount = useMemo(() => 
    accounts.find(a => a.id === accountId),
    [accounts, accountId]
  );

  const selectedLoan = useMemo(() =>
    loans.find(l => l.id === loanId),
    [loans, loanId]
  );

  const currentBalance = useMemo(() => {
    if (!selectedAccount) return 0;
    return selectedAccount.initialBalance;
  }, [selectedAccount]);

  const parsedAmount = useMemo(() => {
    const parsed = parseFloat(amount.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  }, [amount]);

  const projectedBalance = useMemo(() => {
    const op = operationType;
    if (op === 'receita' || op === 'resgate' || (op === 'veiculo' && vehicleOperation === 'venda')) {
      return currentBalance + parsedAmount;
    } else if (op === 'despesa' || op === 'aplicacao' || op === 'pagamento_emprestimo' || op === 'transferencia' || (op === 'veiculo' && vehicleOperation === 'compra')) {
      return currentBalance - parsedAmount;
    }
    return currentBalance;
  }, [currentBalance, parsedAmount, operationType, vehicleOperation]);

  const isNegativeBalance = projectedBalance < 0;

  const filteredCategories = useMemo(() => {
    if (operationType === 'receita') {
      return categories.filter(c => c.nature === 'receita' || c.type === 'income' || c.type === 'both');
    } else if (operationType === 'despesa') {
      return categories.filter(c => c.nature === 'despesa_fixa' || c.nature === 'despesa_variavel' || c.type === 'expense' || c.type === 'both');
    }
    return categories;
  }, [categories, operationType]);

  const canSubmit = useMemo(() => {
    if (!accountId || parsedAmount <= 0 || !date) return false;
    
    if (operationType === 'transferencia' && !accountDestinoId) return false;
    if (operationType === 'transferencia' && accountId === accountDestinoId) return false;
    if ((operationType === 'receita' || operationType === 'despesa') && !categoryId) return false;
    if ((operationType === 'aplicacao' || operationType === 'resgate') && !investmentId) return false;
    if (operationType === 'pagamento_emprestimo' && !loanId) return false;

    return true;
  }, [accountId, parsedAmount, date, operationType, accountDestinoId, categoryId, investmentId, loanId]);

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (isNegativeBalance && !isEditing) {
      const confirmed = window.confirm(
        `Atenção: Esta operação deixará a conta com saldo negativo (${formatCurrency(projectedBalance)}). Deseja continuar?`
      );
      if (!confirmed) return;
    }

    const transactionId = editingTransaction?.id || generateTransactionId();
    const now = new Date().toISOString();

    const transaction: TransacaoCompleta = {
      id: transactionId,
      date,
      accountId,
      flow: getFlowTypeFromOperation(operationType, operationType === 'veiculo' ? vehicleOperation : undefined),
      operationType,
      domain: getDomainFromOperation(operationType),
      amount: parsedAmount,
      categoryId: (operationType === 'receita' || operationType === 'despesa') ? categoryId : null,
      description: description || `${operationType} - ${formatCurrency(parsedAmount)}`,
      links: {
        investmentId: (operationType === 'aplicacao' || operationType === 'resgate') ? investmentId : null,
        loanId: operationType === 'pagamento_emprestimo' ? loanId : null,
        transferGroupId: null,
        parcelaId: operationType === 'pagamento_emprestimo' ? parcelaId || null : null,
        vehicleTransactionId: operationType === 'veiculo' ? `veh_${transactionId}` : null
      },
      conciliated: editingTransaction?.conciliated || false,
      attachments: editingTransaction?.attachments || [],
      meta: {
        createdBy: 'user',
        source: 'manual',
        createdAt: editingTransaction?.meta.createdAt || now,
        updatedAt: isEditing ? now : undefined,
        vehicleOperation: operationType === 'veiculo' ? vehicleOperation : undefined
      }
    };

    let transferGroup: TransferGroup | undefined;
    if (operationType === 'transferencia') {
      const groupId = generateTransferGroupId();
      transaction.links.transferGroupId = groupId;
      transaction.flow = 'transfer_out';

      transferGroup = {
        id: groupId,
        fromAccountId: accountId,
        toAccountId: accountDestinoId,
        amount: parsedAmount,
        date,
        description
      };
    }

    onSubmit(transaction, transferGroup);
    onOpenChange(false);
    toast.success(isEditing ? "Transação atualizada!" : "Movimentação registrada!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            {isEditing ? "Editar Transação" : "Movimentar Conta"}
          </DialogTitle>
          <DialogDescription>
            Registre receitas, despesas, transferências e operações vinculadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Tipo de Operação */}
          <div className="space-y-2">
            <Label>Tipo de Operação</Label>
            <div className="grid grid-cols-4 gap-2">
              {OPERATION_TYPES.map(({ value, label, icon: Icon, color }) => (
                <Button
                  key={value}
                  type="button"
                  variant={operationType === value ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "flex flex-col items-center gap-1 h-auto py-2",
                    operationType === value && "ring-2 ring-primary"
                  )}
                  onClick={() => setOperationType(value)}
                >
                  <Icon className={cn("w-4 h-4", operationType === value ? "text-primary-foreground" : color)} />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Operação de Veículo */}
          {operationType === 'veiculo' && (
            <div className="space-y-2">
              <Label>Tipo de Operação com Veículo</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={vehicleOperation === 'compra' ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setVehicleOperation('compra')}
                >
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Compra de Veículo
                </Button>
                <Button
                  type="button"
                  variant={vehicleOperation === 'venda' ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setVehicleOperation('venda')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Venda de Veículo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                <Info className="w-3 h-3 inline mr-1" />
                O vínculo com o veículo será feito na tela de Veículos.
              </p>
            </div>
          )}

          {/* Conta Origem */}
          <div className="space-y-2">
            <Label htmlFor="accountId">Conta {operationType === 'transferencia' ? 'Origem' : ''} *</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} - {formatCurrency(account.initialBalance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conta Destino (só para transferência) */}
          {operationType === 'transferencia' && (
            <div className="space-y-2">
              <Label htmlFor="accountDestinoId">Conta Destino *</Label>
              <Select value={accountDestinoId} onValueChange={setAccountDestinoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta destino..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter(a => a.id !== accountId)
                    .map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {accountId === accountDestinoId && accountDestinoId && (
                <p className="text-xs text-destructive">Conta destino deve ser diferente da origem</p>
              )}
            </div>
          )}

          {/* Data e Valor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva a movimentação..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Categoria (para receita/despesa) */}
          {(operationType === 'receita' || operationType === 'despesa') && (
            <div className="space-y-2">
              <Label htmlFor="categoryId">Categoria *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        {cat.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Investimento (para aplicação/resgate) */}
          {(operationType === 'aplicacao' || operationType === 'resgate') && (
            <div className="space-y-2">
              <Label htmlFor="investmentId">Investimento *</Label>
              <Select value={investmentId} onValueChange={setInvestmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o investimento..." />
                </SelectTrigger>
                <SelectContent>
                  {investments.map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">
                    <span className="flex items-center gap-2 text-primary">
                      <Plus className="w-3 h-3" />
                      Criar novo investimento
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {investmentId === 'new' && (
                <p className="text-xs text-muted-foreground">
                  <Info className="w-3 h-3 inline mr-1" />
                  Um rascunho será criado. Complete os dados na tela de Investimentos.
                </p>
              )}
            </div>
          )}

          {/* Empréstimo (para pagamento) */}
          {operationType === 'pagamento_emprestimo' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="loanId">Empréstimo *</Label>
                <Select value={loanId} onValueChange={setLoanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o empréstimo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loans.map(loan => (
                      <SelectItem key={loan.id} value={loan.id}>
                        {loan.institution}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedLoan?.parcelas && selectedLoan.parcelas.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="parcelaId">Parcela (opcional)</Label>
                  <Select value={parcelaId} onValueChange={setParcelaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a parcela..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedLoan.parcelas
                        .filter(p => !p.pago)
                        .map(parcela => (
                          <SelectItem key={parcela.id} value={parcela.id}>
                            Parcela {parcela.numero}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <Separator />

          {/* Preview de Impacto */}
          {selectedAccount && parsedAmount > 0 && (
            <Alert className={isNegativeBalance ? "border-warning" : "border-success/30"}>
              {isNegativeBalance && <AlertTriangle className="h-4 w-4 text-warning" />}
              <AlertDescription>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Saldo atual:</span>
                    <span className="font-medium">{formatCurrency(currentBalance)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Após operação:</span>
                    <span className={cn(
                      "font-bold",
                      isNegativeBalance ? "text-destructive" : "text-success"
                    )}>
                      {formatCurrency(projectedBalance)}
                    </span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Botão de Submissão */}
          <Button 
            className="w-full" 
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            <Check className="w-4 h-4 mr-2" />
            {isEditing ? "Salvar Alterações" : "Registrar Movimentação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
