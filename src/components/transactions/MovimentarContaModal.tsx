import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Wallet, PiggyBank, TrendingUp, Shield, Target, Bitcoin, CreditCard, ArrowLeftRight, Car, DollarSign, Plus, Minus, RefreshCw } from "lucide-react";
import { ContaCorrente, Categoria, AccountType, ACCOUNT_TYPE_LABELS, generateTransactionId, formatCurrency, OperationType, TransacaoCompleta, TransactionLinks, generateTransferGroupId, getFlowTypeFromOperation, getDomainFromOperation } from "@/types/finance";
import { toast } from "sonner";
import { parseDateLocal } from "@/lib/utils";
import { EditableCell } from "../EditableCell";

// Interface simplificada para Empréstimo
interface LoanInfo {
  id: string;
  institution: string;
  numeroContrato?: string;
  parcelas: {
    numero: number;
    vencimento: string;
    valor: number;
    pago: boolean;
    transactionId?: string;
  }[];
  valorParcela: number;
  totalParcelas: number;
}

// Interface simplificada para Investimento
interface InvestmentInfo {
  id: string;
  name: string;
}

interface MovimentarContaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: ContaCorrente[];
  categories: Categoria[];
  investments: InvestmentInfo[];
  loans: LoanInfo[];
  selectedAccountId?: string;
  onSubmit: (transaction: TransacaoCompleta, transferGroup?: { id: string; fromAccountId: string; toAccountId: string; amount: number; date: string; description?: string }) => void;
  editingTransaction?: TransacaoCompleta;
}

const OPERATION_OPTIONS: { value: OperationType; label: string; icon: React.ElementType }[] = [
  { value: 'receita', label: 'Receita', icon: Plus },
  { value: 'despesa', label: 'Despesa', icon: Minus },
  { value: 'transferencia', label: 'Transferência', icon: ArrowLeftRight },
  { value: 'aplicacao', label: 'Aplicação', icon: TrendingUp },
  { value: 'resgate', label: 'Resgate', icon: TrendingDown },
  { value: 'pagamento_emprestimo', label: 'Pag. Empréstimo', icon: CreditCard },
  { value: 'liberacao_emprestimo', label: 'Liberação Empréstimo', icon: DollarSign },
  { value: 'veiculo', label: 'Veículo', icon: Car },
  { value: 'rendimento', label: 'Rendimento', icon: Coins },
];

const getAvailableOperationTypes = (accountType: AccountType): OperationType[] => {
  switch (accountType) {
    case 'corrente':
      return ['receita', 'despesa', 'transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo', 'liberacao_emprestimo', 'veiculo', 'rendimento'];
    case 'cartao_credito':
      return ['despesa', 'transferencia']; // Despesa (compra) e Transferência (pagamento de fatura)
    case 'renda_fixa':
    case 'poupanca':
    case 'reserva':
    case 'objetivo':
    case 'cripto':
      return ['aplicacao', 'resgate', 'rendimento'];
    default:
      return ['receita', 'despesa'];
  }
};

const getCategoryOptions = (operationType: OperationType | null, categories: Categoria[]): Categoria[] => {
  if (!operationType || operationType === 'transferencia' || operationType === 'initial_balance') return [];
  
  const isIncome = operationType === 'receita' || operationType === 'rendimento' || operationType === 'liberacao_emprestimo' || (operationType === 'veiculo');
  
  return categories.filter(c => 
    (isIncome && c.nature === 'receita') || 
    (!isIncome && c.nature !== 'receita')
  );
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
  editingTransaction,
}: MovimentarContaModalProps) {
  const [accountId, setAccountId] = useState(selectedAccountId || accounts[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState("");
  const [operationType, setOperationType] = useState<OperationType | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  
  // Transfer/Link specific states
  const [destinationAccountId, setDestinationAccountId] = useState<string | null>(null);
  const [tempInvestmentId, setTempInvestmentId] = useState<string | null>(null);
  const [tempLoanId, setTempLoanId] = useState<string | null>(null);
  const [tempVehicleOperation, setTempVehicleOperation] = useState<'compra' | 'venda' | null>(null);
  const [tempTipoVeiculo, setTempTipoVeiculo] = useState<'carro' | 'moto' | 'caminhao'>('carro');
  const [tempNumeroContrato, setTempNumeroContrato] = useState<string>('');
  const [tempParcelaId, setTempParcelaId] = useState<string | null>(null);

  const isEditing = !!editingTransaction;
  const selectedAccount = accounts.find(a => a.id === accountId);
  const availableOperations = selectedAccount ? getAvailableOperationTypes(selectedAccount.accountType) : [];
  const isTransfer = operationType === 'transferencia';
  const isInvestmentFlow = operationType === 'aplicacao' || operationType === 'resgate';
  const isLoanPayment = operationType === 'pagamento_emprestimo';
  const isLoanLiberation = operationType === 'liberacao_emprestimo';
  const isVehicle = operationType === 'veiculo';
  const isCategorizable = !isTransfer && !isInvestmentFlow && !isLoanPayment && !isLoanLiberation && !isVehicle;
  
  const availableCategories = useMemo(() => getCategoryOptions(operationType, categories), [operationType, categories]);
  
  // Reset state when modal opens/changes
  useEffect(() => {
    if (open) {
      if (editingTransaction) {
        setAccountId(editingTransaction.accountId);
        setDate(editingTransaction.date);
        setAmount(editingTransaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setOperationType(editingTransaction.operationType);
        setCategoryId(editingTransaction.categoryId);
        setDescription(editingTransaction.description);
        
        // Links
        setDestinationAccountId(editingTransaction.links?.transferGroupId ? accounts.find(a => a.id !== editingTransaction.accountId && a.id === editingTransaction.links?.investmentId)?.id || null : null);
        setTempInvestmentId(editingTransaction.links?.investmentId || null);
        setTempLoanId(editingTransaction.links?.loanId || null);
        setTempParcelaId(editingTransaction.links?.parcelaId || null);
        setTempVehicleOperation(editingTransaction.meta?.vehicleOperation || null);
        setTempTipoVeiculo(editingTransaction.meta?.tipoVeiculo || 'carro');
        setTempNumeroContrato(editingTransaction.meta?.numeroContrato || '');
        
      } else {
        setAccountId(selectedAccountId || accounts[0]?.id || '');
        setDate(new Date().toISOString().split('T')[0]);
        setAmount("");
        setOperationType(availableOperations[0] || null);
        setCategoryId(null);
        setDescription("");
        
        setDestinationAccountId(null);
        setTempInvestmentId(null);
        setTempLoanId(null);
        setTempParcelaId(null);
        setTempVehicleOperation(null);
        setTempNumeroContrato('');
      }
    }
  }, [open, editingTransaction, selectedAccountId, accounts, availableOperations]);

  // Auto-select category if only one is available
  useEffect(() => {
    if (availableCategories.length === 1 && isCategorizable) {
      setCategoryId(availableCategories[0].id);
    } else if (isCategorizable) {
      setCategoryId(null);
    }
  }, [availableCategories, isCategorizable]);

  // Auto-select operation type if account changes
  useEffect(() => {
    if (selectedAccount && !isEditing) {
      setOperationType(availableOperations[0] || null);
    }
  }, [selectedAccount, availableOperations, isEditing]);

  const handleAmountChange = (value: string) => {
    // Permite apenas números, vírgula e ponto
    let cleaned = value.replace(/[^\d,.]/g, '');
    
    // Garante que apenas a última vírgula/ponto seja o separador decimal
    const parts = cleaned.split(/[,.]/);
    if (parts.length > 2) {
      cleaned = parts.slice(0, -1).join('') + '.' + parts.slice(-1);
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }
    
    setAmount(cleaned);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(',', '.'));

    if (!accountId || !date || parsedAmount <= 0 || !operationType) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    
    if (isCategorizable && !categoryId) {
      toast.error("Selecione uma categoria.");
      return;
    }
    
    if (isTransfer && !destinationAccountId) {
      toast.error("Selecione a conta destino para a transferência.");
      return;
    }
    
    if (isInvestmentFlow && !tempInvestmentId) {
      toast.error("Selecione a conta de investimento.");
      return;
    }
    
    if (isLoanPayment && !tempLoanId) {
      toast.error("Selecione o contrato de empréstimo.");
      return;
    }
    
    if (isLoanLiberation && !tempNumeroContrato) {
      toast.error("Informe o número do contrato.");
      return;
    }
    
    if (isVehicle && !tempVehicleOperation) {
      toast.error("Selecione a operação de veículo (Compra/Venda).");
      return;
    }
    
    const flow = getFlowTypeFromOperation(operationType, isVehicle ? tempVehicleOperation || undefined : undefined);
    const domain = getDomainFromOperation(operationType);
    
    const baseTx: TransacaoCompleta = {
      id: editingTransaction?.id || generateTransactionId(),
      date,
      accountId,
      flow,
      operationType,
      domain,
      amount: parsedAmount,
      categoryId: isCategorizable ? categoryId : null,
      description: description.trim() || OPERATION_OPTIONS.find(op => op.value === operationType)?.label || 'Movimentação',
      links: {
        investmentId: tempInvestmentId,
        loanId: tempLoanId,
        transferGroupId: editingTransaction?.links?.transferGroupId || null,
        parcelaId: tempParcelaId,
        vehicleTransactionId: null, // Será preenchido no ReceitasDespesas se for seguro
      } as TransactionLinks,
      conciliated: false,
      attachments: [],
      meta: {
        createdBy: 'user',
        source: 'manual',
        createdAt: editingTransaction?.meta.createdAt || new Date().toISOString(),
        updatedAt: isEditing ? new Date().toISOString() : undefined,
        vehicleOperation: isVehicle ? tempVehicleOperation || undefined : undefined,
        tipoVeiculo: isVehicle ? tempTipoVeiculo : undefined,
        numeroContrato: isLoanLiberation ? tempNumeroContrato : undefined,
      }
    };
    
    let transferGroup;
    if (isTransfer && destinationAccountId) {
      transferGroup = {
        id: editingTransaction?.links?.transferGroupId || generateTransferGroupId(),
        fromAccountId: accountId,
        toAccountId: destinationAccountId,
        amount: parsedAmount,
        date,
        description: baseTx.description,
      };
    }
    
    onSubmit(baseTx, transferGroup);
    onOpenChange(false);
    toast.success(isEditing ? "Transação atualizada!" : "Transação registrada!");
  };
  
  // Filter loans to only show active ones for payment
  const activeLoans = useMemo(() => loans.filter(l => l.id.startsWith('loan_')), [loans]);
  
  // Filter available installments for the selected loan
  const availableInstallments = useMemo(() => {
    if (!tempLoanId) return [];
    const loan = loans.find(l => l.id === tempLoanId);
    if (!loan) return [];
    
    return loan.parcelas.filter(p => !p.pago);
  }, [tempLoanId, loans]);
  
  // Auto-fill amount and description for loan payment
  useEffect(() => {
    if (isLoanPayment && tempLoanId && tempParcelaId) {
      const loan = loans.find(l => l.id === tempLoanId);
      const parcela = loan?.parcelas.find(p => p.numero === parseInt(tempParcelaId));
      
      if (parcela) {
        setAmount(parcela.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setDescription(`Pagamento Empréstimo ${loan?.numeroContrato || 'N/A'} - Parcela ${parcela.numero}/${loan?.totalParcelas || 'N/A'}`);
      }
    }
  }, [isLoanPayment, tempLoanId, tempParcelaId, loans]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            {isEditing ? "Editar Transação" : "Nova Movimentação"}
          </DialogTitle>
          <DialogDescription>
              {selectedAccount?.accountType === 'corrente'
                ? "Registre receitas, despesas, aplicações e operações de empréstimo."
                : "Registre aplicações, resgates ou rendimentos."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Conta e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountId">Conta *</Label>
              <Select 
                value={accountId} 
                onValueChange={(v) => setAccountId(v)}
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        {ACCOUNT_TYPE_LABELS[a.accountType]} - {a.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Tipo de Operação */}
          <div className="space-y-2">
            <Label htmlFor="operationType">Tipo de Operação *</Label>
            <Select 
              value={operationType || ''} 
              onValueChange={(v) => {
                setOperationType(v as OperationType);
                setCategoryId(null); // Reset category on operation change
                setTempInvestmentId(null);
                setTempLoanId(null);
                setTempParcelaId(null);
                setDestinationAccountId(null);
                setTempVehicleOperation(null);
              }}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a operação" />
              </SelectTrigger>
              <SelectContent>
                {availableOperations.map(op => {
                  const option = OPERATION_OPTIONS.find(o => o.value === op);
                  if (!option) return null;
                  const Icon = option.icon;
                  return (
                    <SelectItem key={op} value={op}>
                      <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {option.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          {/* Campos Condicionais de Vínculo */}
          
          {/* Transferência */}
          {isTransfer && (
            <div className="space-y-2">
              <Label htmlFor="destinationAccount">Conta Destino *</Label>
              <Select 
                value={destinationAccountId || ''} 
                onValueChange={(v) => setDestinationAccountId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta destino" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.id !== accountId).map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {ACCOUNT_TYPE_LABELS[a.accountType]} - {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Aplicação / Resgate */}
          {isInvestmentFlow && (
            <div className="space-y-2">
              <Label htmlFor="investmentAccount">Conta de Investimento *</Label>
              <Select 
                value={tempInvestmentId || ''} 
                onValueChange={(v) => setTempInvestmentId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o investimento" />
                </SelectTrigger>
                <SelectContent>
                  {investments.map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Pagamento Empréstimo */}
          {isLoanPayment && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loanContract">Contrato de Empréstimo *</Label>
                <Select 
                  value={tempLoanId || ''} 
                  onValueChange={(v) => setTempLoanId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLoans.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.institution}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parcelaId">Parcela *</Label>
                <Select 
                  value={tempParcelaId || ''} 
                  onValueChange={(v) => setTempParcelaId(v)}
                  disabled={!tempLoanId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a parcela" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInstallments.map(p => (
                      <SelectItem key={p.numero} value={String(p.numero)}>
                        P{p.numero} - {formatCurrency(p.valor)} ({parseDateLocal(p.vencimento).toLocaleDateString("pt-BR")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {/* Liberação Empréstimo */}
          {isLoanLiberation && (
            <div className="space-y-2">
              <Label htmlFor="numeroContrato">Número do Contrato *</Label>
              <Input
                id="numeroContrato"
                placeholder="Ex: Contrato 12345"
                value={tempNumeroContrato}
                onChange={(e) => setTempNumeroContrato(e.target.value)}
              />
            </div>
          )}
          
          {/* Veículo */}
          {isVehicle && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleOperation">Operação *</Label>
                <Select 
                  value={tempVehicleOperation || ''} 
                  onValueChange={(v) => setTempVehicleOperation(v as 'compra' | 'venda')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Compra ou Venda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compra">Compra (Saída)</SelectItem>
                    <SelectItem value="venda">Venda (Entrada)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipoVeiculo">Tipo de Veículo</Label>
                <Select 
                  value={tempTipoVeiculo} 
                  onValueChange={(v) => setTempTipoVeiculo(v as 'carro' | 'moto' | 'caminhao')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carro">Carro</SelectItem>
                    <SelectItem value="moto">Moto</SelectItem>
                    <SelectItem value="caminhao">Caminhão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Valor e Categoria */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
              />
            </div>
            
            {isCategorizable && (
              <div className="space-y-2">
                <Label htmlFor="categoryId">Categoria *</Label>
                <Select 
                  value={categoryId || ''} 
                  onValueChange={(v) => setCategoryId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Descrição da transação"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? "Salvar Alterações" : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}