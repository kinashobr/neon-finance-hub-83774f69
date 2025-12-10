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
  CreditCard, AlertTriangle, Check, Plus, Info, Car, Banknote, DollarSign
} from "lucide-react";
import { 
  OperationType, ContaCorrente, Categoria, AccountType,
  TransacaoCompleta, formatCurrency, generateTransactionId,
  generateTransferGroupId, getFlowTypeFromOperation, getDomainFromOperation,
  TransferGroup
} from "@/types/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LoanParcela {
  numero: number;
  vencimento: string;
  valor: number;
  pago: boolean;
  dataPagamento?: string;
}

interface LoanInfo {
  id: string;
  institution: string;
  numeroContrato?: string;
  parcelas?: LoanParcela[];
  valorParcela?: number;
  totalParcelas?: number;
}

interface MovimentarContaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: ContaCorrente[];
  categories: Categoria[];
  investments: Array<{ id: string; name: string }>;
  loans: LoanInfo[];
  selectedAccountId?: string;
  onSubmit: (transaction: TransacaoCompleta, transferGroup?: TransferGroup) => void;
  editingTransaction?: TransacaoCompleta;
}

// Operações disponíveis por tipo de conta
const getOperationsForAccountType = (accountType: AccountType): OperationType[] => {
  switch (accountType) {
    case 'conta_corrente':
      // Conta corrente: Receita, Despesa, Aplicação, Resgate, Pagamento/Liberação Empréstimo, Veículos
      return ['receita', 'despesa', 'aplicacao', 'resgate', 'pagamento_emprestimo', 'liberacao_emprestimo', 'veiculo'];
    case 'aplicacao_renda_fixa':
    case 'poupanca':
    case 'reserva_emergencia':
    case 'objetivos_financeiros':
      // Investimentos com rendimentos: apenas rendimentos (aplicação/resgate via conta corrente)
      return ['rendimento'];
    case 'criptoativos':
      // Criptoativos: sem operações diretas, tudo via conta corrente
      return [];
    default:
      return ['receita', 'despesa'];
  }
};

const OPERATION_CONFIG: Record<OperationType, { label: string; icon: typeof TrendingUp; color: string }> = {
  receita: { label: 'Receita', icon: TrendingUp, color: 'text-success' },
  despesa: { label: 'Despesa', icon: TrendingDown, color: 'text-destructive' },
  transferencia: { label: 'Transferência', icon: ArrowLeftRight, color: 'text-primary' },
  aplicacao: { label: 'Aplicação', icon: PiggyBank, color: 'text-purple-500' },
  resgate: { label: 'Resgate', icon: Wallet, color: 'text-amber-500' },
  pagamento_emprestimo: { label: 'Pagar Empréstimo', icon: CreditCard, color: 'text-orange-500' },
  liberacao_emprestimo: { label: 'Liberação Empréstimo', icon: Banknote, color: 'text-emerald-500' },
  veiculo: { label: 'Veículos', icon: Car, color: 'text-blue-500' },
  rendimento: { label: 'Rendimento', icon: DollarSign, color: 'text-teal-500' },
};

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
  const [numeroContrato, setNumeroContrato] = useState('');

  const isEditing = !!editingTransaction;

  const selectedAccount = useMemo(() => 
    accounts.find(a => a.id === accountId),
    [accounts, accountId]
  );

  // Operações disponíveis baseadas no tipo da conta selecionada
  const availableOperations = useMemo(() => {
    if (!selectedAccount) return ['receita', 'despesa'] as OperationType[];
    return getOperationsForAccountType(selectedAccount.accountType);
  }, [selectedAccount]);

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
        setNumeroContrato(editingTransaction.meta.numeroContrato || '');
      } else {
        const defaultAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0];
        setAccountId(defaultAccount?.id || '');
        
        // Set default operation based on account type
        if (defaultAccount) {
          const ops = getOperationsForAccountType(defaultAccount.accountType);
          setOperationType(ops[0] || 'receita');
        } else {
          setOperationType('receita');
        }
        
        setDate(new Date().toISOString().split('T')[0]);
        setAmount('');
        setDescription('');
        setCategoryId('');
        setAccountDestinoId('');
        setInvestmentId('');
        setLoanId('');
        setParcelaId('');
        setVehicleOperation('compra');
        setNumeroContrato('');
      }
    }
  }, [open, selectedAccountId, accounts, editingTransaction]);

  // Update operation when account changes
  useEffect(() => {
    if (selectedAccount && !isEditing) {
      const ops = getOperationsForAccountType(selectedAccount.accountType);
      if (!ops.includes(operationType)) {
        setOperationType(ops[0] || 'receita');
      }
    }
  }, [selectedAccount, isEditing, operationType]);

  const selectedLoan = useMemo(() =>
    loans.find(l => l.id === loanId),
    [loans, loanId]
  );

  // Calculate current balance including all transactions
  const currentBalance = useMemo(() => {
    if (!selectedAccount) return 0;
    // Note: This is a simplified calculation. In production, you'd get this from context
    // For now, we use initialBalance as the modal doesn't have access to all transactions
    return selectedAccount.initialBalance;
  }, [selectedAccount]);

  const parsedAmount = useMemo(() => {
    const parsed = parseFloat(amount.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  }, [amount]);

  const projectedBalance = useMemo(() => {
    const op = operationType;
    const isIncoming = op === 'receita' || op === 'resgate' || op === 'liberacao_emprestimo' || 
                       op === 'rendimento' || (op === 'veiculo' && vehicleOperation === 'venda');
    
    if (isIncoming) {
      return currentBalance + parsedAmount;
    } else {
      return currentBalance - parsedAmount;
    }
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

  // Contas de investimento disponíveis para aplicação/resgate
  const investmentAccounts = useMemo(() => 
    accounts.filter(a => 
      a.accountType === 'aplicacao_renda_fixa' || 
      a.accountType === 'poupanca' || 
      a.accountType === 'criptoativos' ||
      a.accountType === 'reserva_emergencia' ||
      a.accountType === 'objetivos_financeiros'
    ),
    [accounts]
  );

  const canSubmit = useMemo(() => {
    if (!accountId || !date) return false;
    if (parsedAmount <= 0) return false; // Validation: no negative or zero values
    
    if (operationType === 'transferencia' && !accountDestinoId) return false;
    if (operationType === 'transferencia' && accountId === accountDestinoId) return false;
    if ((operationType === 'receita' || operationType === 'despesa') && !categoryId) return false;
    if ((operationType === 'aplicacao' || operationType === 'resgate') && !investmentId) return false;
    if (operationType === 'pagamento_emprestimo' && (!loanId || !parcelaId)) return false;
    if (operationType === 'liberacao_emprestimo' && !numeroContrato.trim()) return false;

    return true;
  }, [accountId, parsedAmount, date, operationType, accountDestinoId, categoryId, investmentId, loanId, parcelaId, numeroContrato]);

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

    // Determine flow type
    const isIncoming = operationType === 'receita' || operationType === 'resgate' || 
                       operationType === 'liberacao_emprestimo' || operationType === 'rendimento' ||
                       (operationType === 'veiculo' && vehicleOperation === 'venda');

    const transaction: TransacaoCompleta = {
      id: transactionId,
      date,
      accountId,
      flow: isIncoming ? 'in' : 'out',
      operationType,
      domain: getDomainFromOperation(operationType),
      amount: parsedAmount,
      categoryId: (operationType === 'receita' || operationType === 'despesa') ? categoryId : null,
      description: description || `${OPERATION_CONFIG[operationType]?.label || operationType} - ${formatCurrency(parsedAmount)}`,
      links: {
        investmentId: (operationType === 'aplicacao' || operationType === 'resgate') ? investmentId : null,
        loanId: (operationType === 'pagamento_emprestimo' || operationType === 'liberacao_emprestimo') ? loanId || `loan_pending_${transactionId}` : null,
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
        vehicleOperation: operationType === 'veiculo' ? vehicleOperation : undefined,
        numeroContrato: operationType === 'liberacao_emprestimo' ? numeroContrato : undefined,
        pendingLoanConfig: operationType === 'liberacao_emprestimo' ? true : undefined
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

  // Renderização condicional baseada no tipo de conta
  const renderOperationOptions = () => {
    if (availableOperations.length === 0) {
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Esta conta não suporta operações diretas. Use "Aplicação" ou "Resgate" a partir de uma Conta Corrente.
          </AlertDescription>
        </Alert>
      );
    }

    // Para contas de renda fixa - mostrar apenas Rendimento com layout simplificado
    if (availableOperations.length === 1 && availableOperations[0] === 'rendimento') {
      return (
        <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
            <DollarSign className="w-5 h-5" />
            <span className="font-medium">Adicionar Rendimento</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Registre rendimentos (juros, dividendos) desta aplicação financeira.
          </p>
        </div>
      );
    }

    // Para conta corrente - grid de operações
    return (
      <div className="space-y-2">
        <Label>Tipo de Operação</Label>
        <div className="grid grid-cols-3 gap-2">
          {availableOperations.map((opType) => {
            const config = OPERATION_CONFIG[opType];
            if (!config) return null;
            const Icon = config.icon;
            
            return (
              <Button
                key={opType}
                type="button"
                variant={operationType === opType ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex flex-col items-center gap-1 h-auto py-2",
                  operationType === opType && "ring-2 ring-primary"
                )}
                onClick={() => setOperationType(opType)}
              >
                <Icon className={cn("w-4 h-4", operationType === opType ? "text-primary-foreground" : config.color)} />
                <span className="text-xs">{config.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    );
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
            {selectedAccount?.accountType === 'conta_corrente' 
              ? "Registre receitas, despesas, aplicações e operações de empréstimo."
              : "Registre movimentações nesta conta."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Conta */}
          <div className="space-y-2">
            <Label htmlFor="accountId">Conta *</Label>
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

          <Separator />

          {/* Tipo de Operação */}
          {renderOperationOptions()}

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

          {/* Liberação de Empréstimo - campos específicos */}
          {operationType === 'liberacao_emprestimo' && (
            <div className="space-y-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Banknote className="w-4 h-4" />
                <span className="text-sm font-medium">Pré-cadastro de Empréstimo</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="numeroContrato">Número do Contrato *</Label>
                <Input
                  id="numeroContrato"
                  placeholder="Ex: 123456789"
                  value={numeroContrato}
                  onChange={e => setNumeroContrato(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                <Info className="w-3 h-3 inline mr-1" />
                O empréstimo aparecerá como "Pendente de Configuração" na aba Empréstimos.
              </p>
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
              <Label htmlFor="investmentId">Conta de Investimento *</Label>
              <Select value={investmentId} onValueChange={setInvestmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta destino..." />
                </SelectTrigger>
                <SelectContent>
                  {investmentAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                  {investmentAccounts.length === 0 && (
                    <SelectItem value="new" disabled>
                      Nenhuma conta de investimento cadastrada
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                <Info className="w-3 h-3 inline mr-1" />
                {operationType === 'aplicacao' 
                  ? "Transfere dinheiro desta conta para o investimento." 
                  : "Resgata dinheiro do investimento para esta conta."}
              </p>
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
                        {loan.institution} {loan.numeroContrato ? `(${loan.numeroContrato})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedLoan && (
                <div className="space-y-2">
                  <Label htmlFor="parcelaId">Número da Parcela *</Label>
                  {selectedLoan.parcelas && selectedLoan.parcelas.length > 0 ? (
                    <Select value={parcelaId} onValueChange={setParcelaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a parcela..." />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedLoan.parcelas
                          .filter(p => !p.pago)
                          .map(parcela => (
                            <SelectItem key={parcela.numero.toString()} value={parcela.numero.toString()}>
                              Parcela {parcela.numero} - Venc: {new Date(parcela.vencimento).toLocaleDateString('pt-BR')} - {formatCurrency(parcela.valor)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="parcelaId"
                      type="number"
                      min="1"
                      placeholder="Ex: 1"
                      value={parcelaId}
                      onChange={e => setParcelaId(e.target.value)}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    <Info className="w-3 h-3 inline mr-1" />
                    Informe o número da parcela para reconciliação automática.
                  </p>
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
