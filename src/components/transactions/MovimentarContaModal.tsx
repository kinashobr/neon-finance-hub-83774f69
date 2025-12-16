import { useState, useMemo, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  TrendingUp, TrendingDown, ArrowLeftRight, PiggyBank, Wallet, 
  CreditCard, AlertTriangle, Check, Plus, Info, Car, Banknote, DollarSign, Shield, X, Search
} from "lucide-react";
import { 
  OperationType, ContaCorrente, Categoria, AccountType,
  TransacaoCompleta, formatCurrency, generateTransactionId,
  generateTransferGroupId, getDomainFromOperation,
  TransferGroup, FlowType
} from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { toast } from "sonner";
import { SeguroParcelaSelector } from "./SeguroParcelaSelector";

// Interface simplificada para Empréstimo (agora passada via props)
interface LoanInfo {
  id: string;
  institution: string;
  numeroContrato?: string;
  parcelas?: {
    numero: number;
    vencimento: string;
    valor: number;
    pago: boolean;
    transactionId?: string; // Adicionado para rastrear se foi pago
  }[];
  valorParcela?: number;
  totalParcelas?: number;
}

// Interface simplificada para Investimento (agora passada via props)
interface InvestmentInfo {
  id: string;
  name: string;
}

interface MovimentarContaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: ContaCorrente[];
  categories: Categoria[];
  investments: InvestmentInfo[]; // Adicionado de volta
  loans: LoanInfo[]; // Adicionado de volta
  selectedAccountId?: string;
  onSubmit: (transaction: TransacaoCompleta, transferGroup?: TransferGroup) => void;
  editingTransaction?: TransacaoCompleta;
}

// Operações disponíveis por tipo de conta
const getOperationsForAccountType = (accountType: AccountType): OperationType[] => {
  switch (accountType) {
    case 'conta_corrente':
      return ['receita', 'despesa', 'transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo', 'liberacao_emprestimo', 'veiculo', 'rendimento'];
    case 'cartao_credito': // NOVO TIPO
      return ['despesa', 'transferencia']; // Despesa (compra) e Transferência (pagamento de fatura)
    case 'aplicacao_renda_fixa':
    case 'poupanca':
    case 'reserva_emergencia':
    case 'objetivos_financeiros':
    case 'criptoativos':
      return ['rendimento'];
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
  initial_balance: { label: 'Saldo Inicial', icon: Info, color: 'text-muted-foreground' },
};

export function MovimentarContaModal({
  open,
  onOpenChange,
  accounts,
  categories,
  investments, // Usado
  loans, // Usado
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

  // Estado para Seguro
  const [showSeguroSelector, setShowSeguroSelector] = useState(false);
  const [seguroLink, setSeguroLink] = useState<{ seguroId: number; parcelaNumero: number; valorDevido: number; valorPago: number; dataPagamento: string } | null>(null);

  // Estado para busca de categoria
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);

  const isEditing = !!editingTransaction;

  const selectedAccount = useMemo(() =>
    accounts.find(a => a.id === accountId),
    [accounts, accountId]
  );

  const rendimentoCategoryId = useMemo(() =>
    categories.find(c => c.label === 'Rendimentos sobre Investimentos')?.id,
    [categories]
  );

  // Operações disponíveis baseadas no tipo da conta selecionada
  const availableOperations = useMemo(() => {
    if (!selectedAccount) return ['receita', 'despesa'] as OperationType[];
    return getOperationsForAccountType(selectedAccount.accountType);
  }, [selectedAccount]);

  const resetForm = useCallback((keepOpen: boolean) => {
    const defaultAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0];
    setAccountId(defaultAccount?.id || '');

    let defaultOperation: OperationType = 'receita';
    if (defaultAccount) {
      const ops = getOperationsForAccountType(defaultAccount.accountType);
      defaultOperation = ops[0] || 'receita';
    }

    setOperationType(defaultOperation);
    setDate(new Date().toISOString().split('T')[0]);
    setAmount('');
    setDescription('');
    setCategoryId(defaultOperation === 'rendimento' ? rendimentoCategoryId || '' : '');
    setAccountDestinoId('');
    setInvestmentId('');
    setLoanId('');
    setParcelaId('');
    setVehicleOperation('compra');
    setNumeroContrato('');
    setSeguroLink(null);
    setCategorySearchTerm('');
    setIsCategoryPopoverOpen(false);

    if (!keepOpen) {
      onOpenChange(false);
    }
  }, [accounts, selectedAccountId, onOpenChange, rendimentoCategoryId]);

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

        if (editingTransaction.links.vehicleTransactionId) {
          const [seguroIdStr, parcelaNumeroStr] = editingTransaction.links.vehicleTransactionId.split('_');
          const seguroId = parseInt(seguroIdStr);
          const parcelaNumero = parseInt(parcelaNumeroStr);
          
          // CORREÇÃO 1: Acessar valorDevido com segurança
          const valorPago = editingTransaction.amount;
          const valorDevido = (editingTransaction.meta as any).valorDevido || valorPago; 
          const dataPagamento = editingTransaction.date;

          if (!isNaN(seguroId) && !isNaN(parcelaNumero)) {
            setSeguroLink({ seguroId, parcelaNumero, valorDevido, dataPagamento, valorPago });
          }
        } else {
          setSeguroLink(null);
        }
      } else {
        resetForm(true);
      }
    }
  }, [open, selectedAccountId, accounts, editingTransaction, resetForm]);

  // Update operation and category when account changes
  useEffect(() => {
    if (selectedAccount && !isEditing) {
      const ops = getOperationsForAccountType(selectedAccount.accountType);
      if (!ops.includes(operationType)) {
        const newOp = ops[0] || 'receita';
        setOperationType(newOp);
        if (newOp === 'rendimento') {
          setCategoryId(rendimentoCategoryId || '');
        } else {
          setCategoryId('');
      }
      } else if (operationType === 'rendimento') {
        setCategoryId(rendimentoCategoryId || '');
      } else if (operationType !== 'transferencia') {
        setCategoryId('');
      }
    }
  }, [selectedAccount, isEditing, operationType, rendimentoCategoryId]);

  // Lógica de preenchimento automático para Seguro
  useEffect(() => {
    const seguroCategory = categories.find(c => c.label.toLowerCase() === 'seguro');

    if (operationType === 'despesa' && categoryId === seguroCategory?.id && !seguroLink) {
      setShowSeguroSelector(true);
    }

    if (seguroLink) {
      // Usa o valor pago e a data de pagamento selecionados no seletor
      setAmount(seguroLink.valorPago.toString());
      setDate(seguroLink.dataPagamento);
      
      const diferenca = seguroLink.valorPago - seguroLink.valorDevido;
      let desc = `Pagamento Parcela ${seguroLink.parcelaNumero} - Seguro Veículo`;
      if (diferenca > 0) {
        desc += ` (+Juros: ${formatCurrency(diferenca)})`;
      } else if (diferenca < 0) {
        desc += ` (-Desconto: ${formatCurrency(Math.abs(diferenca))})`;
      }
      
      setDescription(prev => prev || desc);
    }
  }, [operationType, categoryId, categories, seguroLink]);

  const selectedCategory = categories.find(c => c.id === categoryId);

  // Contas de investimento disponíveis para aplicação/resgate
  const investmentAccounts = useMemo(() => investments, [investments]);
  
  // Empréstimos ativos disponíveis para pagamento
  const simulatedLoans = useMemo(() => loans, [loans]);
  
  const selectedLoan = useMemo(() =>
    simulatedLoans.find(l => l.id === loanId),
    [simulatedLoans, loanId]
  );

  // --- NEW/UPDATED: Auto-fill for Loan Payment ---
  useEffect(() => {
    if (operationType === 'pagamento_emprestimo' && selectedLoan) {
      // 1. Auto-fill amount with expected installment value if not editing and amount is empty
      if (selectedLoan.valorParcela && !isEditing && !amount) {
        setAmount(selectedLoan.valorParcela.toFixed(2));
      }
      
      // 2. Auto-fill description based on selected installment
      if (parcelaId && selectedLoan.parcelas) {
          const parcela = selectedLoan.parcelas.find(p => p.numero.toString() === parcelaId);
          if (parcela) {
              setDescription(`Pagamento Parcela ${parcela.numero}/${selectedLoan.totalParcelas} - ${selectedLoan.institution}`);
              // If amount was not set, set it now based on the specific installment value
              if (!amount || Number(amount) === 0) {
                  setAmount(parcela.valor.toFixed(2));
              }
          }
      } else if (!parcelaId && !isEditing) {
          // If no specific installment is selected yet, use a generic description
          setDescription(`Pagamento Empréstimo ${selectedLoan.institution}`);
      }
      
    } else if (operationType === 'pagamento_emprestimo' && !selectedLoan) {
        // Clear fields if loan is deselected
        setAmount('');
        setDescription('');
        setParcelaId('');
    }
  }, [operationType, selectedLoan, isEditing, parcelaId, amount]);
  // ---------------------------------------------

  // Calculate current balance including all transactions
  const currentBalance = useMemo(() => {
    if (!selectedAccount) return 0;
    // Simplificação: Apenas mostra o initialBalance da conta, pois o cálculo completo é complexo aqui.
    // O cálculo real é feito no ReceitasDespesas.tsx
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

    // Cartão de Crédito inverte a lógica de saldo: despesa (out) aumenta o passivo (torna mais negativo)
    const isCreditCard = selectedAccount?.accountType === 'cartao_credito';

    if (isCreditCard) {
      // Despesa (out) aumenta o saldo negativo (subtrai do saldo)
      // Transferência (in) diminui o saldo negativo (soma ao saldo)
      if (op === 'despesa') {
        return currentBalance - parsedAmount;
      } else if (op === 'transferencia') {
        return currentBalance + parsedAmount;
      }
      return currentBalance;
    } else {
      // Contas normais
      if (isIncoming) {
        return currentBalance + parsedAmount;
      } else {
        return currentBalance - parsedAmount;
      }
    }
  }, [currentBalance, parsedAmount, operationType, vehicleOperation, selectedAccount]);

  const isNegativeBalance = projectedBalance < 0 && selectedAccount?.accountType !== 'cartao_credito';

  const filteredCategories = useMemo(() => {
    let filtered = categories;
    if (operationType === 'receita' || operationType === 'rendimento') {
      filtered = categories.filter(c => c.nature === 'receita' || c.type === 'income' || c.type === 'both');
    } else if (operationType === 'despesa') {
      filtered = categories.filter(c => c.nature === 'despesa_fixa' || c.nature === 'despesa_variavel' || c.type === 'expense' || c.type === 'both');
    }

    if (categorySearchTerm) {
      filtered = filtered.filter(c => c.label.toLowerCase().includes(categorySearchTerm.toLowerCase()));
    }

    return filtered;
  }, [categories, operationType, categorySearchTerm]);

  const canSubmit = useMemo(() => {
    if (!accountId || !date) return false;
    if (parsedAmount <= 0) return false;

    if (operationType === 'transferencia' && !accountDestinoId) return false;
    if (operationType === 'transferencia' && accountId === accountDestinoId) return false;

    // Categoria é obrigatória para Receita, Despesa e Rendimento
    if ((operationType === 'receita' || operationType === 'despesa' || operationType === 'rendimento') && !categoryId) return false;

    if ((operationType === 'aplicacao' || operationType === 'resgate') && !investmentId) return false;
    if (operationType === 'pagamento_emprestimo' && (!loanId || !parcelaId)) return false;
    if (operationType === 'liberacao_emprestimo' && !numeroContrato.trim()) return false;

    const seguroCategory = categories.find(c => c.label.toLowerCase() === 'seguro');
    // Se for despesa de seguro, o link é obrigatório
    if (operationType === 'despesa' && categoryId === seguroCategory?.id && !seguroLink) return false;

    return true;
  }, [accountId, parsedAmount, date, operationType, accountDestinoId, categoryId, investmentId, loanId, parcelaId, numeroContrato, categories, seguroLink]);

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

    const isSelectedAccountCreditCard = selectedAccount?.accountType === 'cartao_credito';

    const isIncoming = operationType === 'receita' || operationType === 'resgate' ||
                       operationType === 'liberacao_emprestimo' || operationType === 'rendimento' ||
                       (operationType === 'veiculo' && vehicleOperation === 'venda');

    let flow: FlowType = isIncoming ? 'in' : 'out';

    if (isSelectedAccountCreditCard) {
      if (operationType === 'despesa') {
        flow = 'out'; 
      } else if (operationType === 'transferencia') {
        flow = 'in'; 
      }
    }

    const transaction: TransacaoCompleta = {
      id: transactionId,
      date,
      accountId,
      flow: flow as FlowType,
      operationType,
      domain: getDomainFromOperation(operationType),
      amount: parsedAmount,
      categoryId: (operationType === 'receita' || operationType === 'despesa' || operationType === 'rendimento') ? categoryId : null,
      description: description || `${OPERATION_CONFIG[operationType]?.label || operationType} - ${formatCurrency(parsedAmount)}`,
      links: {
        // investmentId e loanId agora usam IDs de contas V2 ou IDs simulados
        investmentId: (operationType === 'aplicacao' || operationType === 'resgate') ? investmentId : null,
        loanId: (operationType === 'pagamento_emprestimo' || operationType === 'liberacao_emprestimo') ? loanId || `loan_pending_${transactionId}` : null,
        transferGroupId: null,
        parcelaId: operationType === 'pagamento_emprestimo' ? parcelaId || null : null,
        vehicleTransactionId: seguroLink ? `${seguroLink.seguroId}_${seguroLink.parcelaNumero}` : (operationType === 'veiculo' ? `veh_${transactionId}` : null)
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
        pendingLoanConfig: operationType === 'liberacao_emprestimo' ? true : undefined,
        // CORREÇÃO 2: Adicionar valor devido para cálculo de juros/desconto
        valorDevido: seguroLink?.valorDevido,
      }
    };

    let transferGroup: TransferGroup | undefined;
    if (operationType === 'transferencia') {
      const groupId = generateTransferGroupId();
      transaction.links.transferGroupId = groupId;

      if (isSelectedAccountCreditCard) {
        // FIX: If CC is the selected account, 'transferencia' means payment received.
        // Funds flow FROM accountDestinoId (source of payment) TO accountId (CC).
        transferGroup = {
          id: groupId,
          fromAccountId: accountDestinoId, // Source of payment (e.g., Conta Corrente)
          toAccountId: accountId, // Destination (Credit Card)
          amount: parsedAmount,
          date,
          description: description || `Pagamento de fatura CC ${selectedAccount?.name}`
        };
      } else {
        // Normal transfer: Funds flow FROM accountId TO accountDestinoId.
        transferGroup = {
            id: groupId,
            fromAccountId: accountId, // Source (Conta Corrente)
            toAccountId: accountDestinoId, // Destination (e.g., another Conta Corrente or CC)
            amount: parsedAmount,
            date,
            description
        };
      }
    }

    onSubmit(transaction, transferGroup);

    if (!isEditing) {
      toast.success("Movimentação registrada! Pronto para o próximo lançamento.");
      resetForm(true);
    } else {
      onOpenChange(false);
    }
  };

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

    const isCreditCard = selectedAccount?.accountType === 'cartao_credito';

    return (
      <div className="space-y-2">
        <Label>Tipo de Operação</Label>
        <div className={cn("grid gap-2", isCreditCard ? "grid-cols-2" : "grid-cols-3")}>
          {availableOperations.map((opType) => {
            const config = OPERATION_CONFIG[opType];
            if (!config) return null;
            const Icon = config.icon;

            // Ajustar labels para Cartão de Crédito
            let label = config.label;
            if (isCreditCard) {
              if (opType === 'despesa') label = 'Compra (Despesa)';
              if (opType === 'transferencia') label = 'Pagamento Fatura';
            }

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
                <span className="text-xs">{label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    );
  };

  const handleSelectSeguroParcela = (seguroId: number, parcelaNumero: number, valorDevido: number, dataPagamento: string, valorPago: number) => {
    setSeguroLink({ seguroId, parcelaNumero, valorDevido, dataPagamento, valorPago });
    const seguroCategory = categories.find(c => c.label.toLowerCase() === 'seguro');
    if (seguroCategory) {
      setCategoryId(seguroCategory.id);
    }
  };

  const isCreditCard = selectedAccount?.accountType === 'cartao_credito';
  const isRendimento = operationType === 'rendimento';

  return (
    <>
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
                : isCreditCard
                  ? "Registre compras (despesas) e pagamentos de fatura (transferências)."
                  : "Registre movimentações nesta conta."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Conta */}
            <div className="space-y-2">
              <Label htmlFor="accountId">Conta *</Label>
              <Select value={accountId} onValueChange={setAccountId} disabled={isEditing}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(currentBalance)}
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

            {/* Transferência - conta destino */}
            {operationType === 'transferencia' && (
              <div className="space-y-2">
                <Label htmlFor="accountDestinoId">
                  {isCreditCard ? "Conta de Pagamento (Origem)" : "Conta Destino"} *
                </Label>
                <Select
                  value={accountDestinoId}
                  onValueChange={setAccountDestinoId}
                >
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
                {accountId === accountDestinoId && (
                  <p className="text-xs text-destructive">Conta de origem e destino não podem ser a mesma.</p>
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
                  disabled={!!seguroLink}
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
                  disabled={!!seguroLink}
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

            {/* Categoria (para receita/despesa/rendimento) */}
            {(operationType === 'receita' || operationType === 'despesa' || isRendimento) && (
              <div className="space-y-2">
                <Label htmlFor="categoryId">Categoria *</Label>
                <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !categoryId && "text-muted-foreground"
                      )}
                      disabled={isRendimento}
                    >
                      {selectedCategory ? (
                        <span className="flex items-center gap-2">
                          <span>{selectedCategory.icon}</span>
                          {selectedCategory.label}
                        </span>
                      ) : (
                        "Selecione a categoria..."
                      )}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <div className="relative p-2">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar categoria..."
                        className="pl-10 h-9"
                        value={categorySearchTerm}
                        onChange={(e) => setCategorySearchTerm(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-60">
                      <div className="p-2">
                        {filteredCategories.length === 0 ? (
                          <p className="text-center text-sm text-muted-foreground py-4">
                            Nenhuma categoria encontrada.
                          </p>
                        ) : (
                          filteredCategories.map(cat => (
                            <div
                              key={cat.id}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 text-sm",
                                categoryId === cat.id && "bg-primary/10 text-primary font-medium"
                              )}
                              onClick={() => {
                                setCategoryId(cat.id);
                                setIsCategoryPopoverOpen(false);
                                setCategorySearchTerm('');
                                setSeguroLink(null); // Limpa o link de seguro ao mudar a categoria
                              }}
                            >
                              <span>{cat.icon}</span>
                              {cat.label}
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                {/* Indicador de Parcela de Seguro Selecionada */}
                {seguroLink && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-primary/10 border border-primary/30 text-sm">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>Parcela de Seguro Selecionada: {seguroLink.parcelaNumero} ({formatCurrency(seguroLink.valorPago)})</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => setSeguroLink(null)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                {isRendimento && (
                  <p className="text-xs text-muted-foreground">
                    <Info className="w-3 h-3 inline mr-1" />
                    A categoria de rendimento é preenchida automaticamente para esta operação.
                  </p>
                )}
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
                      {simulatedLoans.map(loan => (
                        <SelectItem key={loan.id} value={loan.id}>
                          {loan.institution} {loan.numeroContrato ? `(${loan.numeroContrato})` : ''}
                        </SelectItem>
                      ))}
                      {simulatedLoans.length === 0 && (
                        <SelectItem value="none" disabled>
                          Nenhum empréstimo ativo
                        </SelectItem>
                      )}
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
                                Parcela {parcela.numero} - Venc: {parseDateLocal(parcela.vencimento).toLocaleDateString('pt-BR')} - {formatCurrency(parcela.valor)}
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

      {/* Modal de Seleção de Parcela de Seguro */}
      <SeguroParcelaSelector
        open={showSeguroSelector}
        onOpenChange={setShowSeguroSelector}
        onSelectParcela={handleSelectSeguroParcela}
      />
    </>
  );
}