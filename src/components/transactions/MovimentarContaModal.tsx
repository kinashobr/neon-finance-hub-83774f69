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
  CreditCard, AlertTriangle, Check, Plus, Info
} from "lucide-react";
import { 
  OperationType, ContaCorrente, Categoria, TipoContabil, 
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
  accountingTypes: TipoContabil[];
  investments: Array<{ id: string; name: string }>;
  loans: Array<{ id: string; institution: string; parcelas?: Array<{ id: string; numero: number; pago: boolean }> }>;
  selectedAccountId?: string;
  onSubmit: (transaction: TransacaoCompleta, transferGroup?: TransferGroup) => void;
  onCreateAccountingType?: (type: Omit<TipoContabil, 'id'>) => TipoContabil;
}

const OPERATION_TYPES: { value: OperationType; label: string; icon: typeof TrendingUp; color: string }[] = [
  { value: 'receita', label: 'Receita', icon: TrendingUp, color: 'text-success' },
  { value: 'despesa', label: 'Despesa', icon: TrendingDown, color: 'text-destructive' },
  { value: 'transferencia', label: 'Transferência', icon: ArrowLeftRight, color: 'text-primary' },
  { value: 'aplicacao', label: 'Aplicação', icon: PiggyBank, color: 'text-purple-500' },
  { value: 'resgate', label: 'Resgate', icon: Wallet, color: 'text-amber-500' },
  { value: 'pagamento_emprestimo', label: 'Pagar Empréstimo', icon: CreditCard, color: 'text-orange-500' },
];

export function MovimentarContaModal({
  open,
  onOpenChange,
  accounts,
  categories,
  accountingTypes,
  investments,
  loans,
  selectedAccountId,
  onSubmit,
  onCreateAccountingType
}: MovimentarContaModalProps) {
  const [operationType, setOperationType] = useState<OperationType>('receita');
  const [accountId, setAccountId] = useState(selectedAccountId || '');
  const [accountDestinoId, setAccountDestinoId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountingTypeId, setAccountingTypeId] = useState('');
  const [investmentId, setInvestmentId] = useState('');
  const [loanId, setLoanId] = useState('');
  const [parcelaId, setParcelaId] = useState('');
  const [showNewAccountingType, setShowNewAccountingType] = useState(false);
  const [newAccountingTypeLabel, setNewAccountingTypeLabel] = useState('');

  // Reset quando modal abre
  useEffect(() => {
    if (open) {
      setAccountId(selectedAccountId || accounts[0]?.id || '');
      setAmount('');
      setDescription('');
      setCategoryId('');
      setAccountDestinoId('');
      setInvestmentId('');
      setLoanId('');
      setParcelaId('');
    }
  }, [open, selectedAccountId, accounts]);

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
    return selectedAccount.initialBalance; // Em produção: calcular saldo real
  }, [selectedAccount]);

  const parsedAmount = useMemo(() => {
    const parsed = parseFloat(amount.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  }, [amount]);

  const projectedBalance = useMemo(() => {
    const op = operationType;
    if (op === 'receita' || op === 'resgate') {
      return currentBalance + parsedAmount;
    } else if (op === 'despesa' || op === 'aplicacao' || op === 'pagamento_emprestimo' || op === 'transferencia') {
      return currentBalance - parsedAmount;
    }
    return currentBalance;
  }, [currentBalance, parsedAmount, operationType]);

  const isNegativeBalance = projectedBalance < 0;

  const filteredCategories = useMemo(() => {
    if (operationType === 'receita') {
      return categories.filter(c => c.type === 'income' || c.type === 'both');
    } else if (operationType === 'despesa') {
      return categories.filter(c => c.type === 'expense' || c.type === 'both');
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

    if (isNegativeBalance) {
      const confirmed = window.confirm(
        `Atenção: Esta operação deixará a conta com saldo negativo (${formatCurrency(projectedBalance)}). Deseja continuar?`
      );
      if (!confirmed) return;
    }

    const transactionId = generateTransactionId();
    const now = new Date().toISOString();

    // Criar transação principal
    const transaction: TransacaoCompleta = {
      id: transactionId,
      date,
      accountId,
      flow: getFlowTypeFromOperation(operationType),
      operationType,
      domain: getDomainFromOperation(operationType),
      amount: parsedAmount,
      accountingTypeId: accountingTypeId || null,
      categoryId: (operationType === 'receita' || operationType === 'despesa') ? categoryId : null,
      description: description || `${operationType} - ${formatCurrency(parsedAmount)}`,
      links: {
        investmentId: (operationType === 'aplicacao' || operationType === 'resgate') ? investmentId : null,
        loanId: operationType === 'pagamento_emprestimo' ? loanId : null,
        transferGroupId: null,
        parcelaId: operationType === 'pagamento_emprestimo' ? parcelaId || null : null
      },
      conciliated: false,
      attachments: [],
      meta: {
        createdBy: 'user',
        source: 'manual',
        createdAt: now
      }
    };

    // Se for transferência, criar grupo de transferência
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
    toast.success("Movimentação registrada com sucesso!");
  };

  const handleCreateAccountingType = () => {
    if (!newAccountingTypeLabel.trim() || !onCreateAccountingType) return;
    
    const newType = onCreateAccountingType({
      label: newAccountingTypeLabel,
      nature: operationType === 'receita' ? 'credit' : 'debit',
      dreGroup: 'OUTROS'
    });
    
    setAccountingTypeId(newType.id);
    setShowNewAccountingType(false);
    setNewAccountingTypeLabel('');
    toast.success("Tipo contábil criado!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Movimentar Conta
          </DialogTitle>
          <DialogDescription>
            Registre receitas, despesas, transferências e operações vinculadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Tipo de Operação */}
          <div className="space-y-2">
            <Label>Tipo de Operação</Label>
            <div className="grid grid-cols-3 gap-2">
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

          {/* Tipo Contábil */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="accountingTypeId">Tipo Contábil</Label>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs"
                onClick={() => setShowNewAccountingType(!showNewAccountingType)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Novo
              </Button>
            </div>
            {showNewAccountingType ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do novo tipo..."
                  value={newAccountingTypeLabel}
                  onChange={e => setNewAccountingTypeLabel(e.target.value)}
                />
                <Button type="button" size="sm" onClick={handleCreateAccountingType}>
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Select value={accountingTypeId} onValueChange={setAccountingTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional..." />
                </SelectTrigger>
                <SelectContent>
                  {accountingTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {type.nature === 'credit' ? 'C' : 'D'}
                        </Badge>
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

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

          {/* Preview do impacto */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="w-4 h-4 text-muted-foreground" />
              Impacto na Conta
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Saldo Atual</span>
                <p className="font-semibold">{formatCurrency(currentBalance)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Saldo Após</span>
                <p className={cn(
                  "font-semibold",
                  isNegativeBalance ? "text-destructive" : "text-success"
                )}>
                  {formatCurrency(projectedBalance)}
                </p>
              </div>
            </div>
          </div>

          {isNegativeBalance && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Esta operação deixará a conta com saldo negativo.
              </AlertDescription>
            </Alert>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-primary"
            >
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
