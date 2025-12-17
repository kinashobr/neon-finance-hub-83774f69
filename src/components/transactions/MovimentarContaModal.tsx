import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Wallet, PiggyBank, TrendingUp, Shield, Target, Bitcoin, CreditCard, ArrowLeftRight, Car, DollarSign, Plus, Minus, RefreshCw, Coins, TrendingDown, Tags, Calendar, Search, ChevronDown, Check, LinkIcon, FileText } from "lucide-react";
import { ContaCorrente, Categoria, AccountType, ACCOUNT_TYPE_LABELS, generateTransactionId, formatCurrency, OperationType, TransacaoCompleta, TransactionLinks, generateTransferGroupId, getFlowTypeFromOperation, getDomainFromOperation, InvestmentInfo, SeguroVeiculo, Veiculo, OPERATION_TYPE_LABELS } from "@/types/finance";
import { toast } from "sonner";
import { parseDateLocal, cn } from "@/lib/utils";
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
    paga: boolean;
    transactionId?: string;
  }[];
  valorParcela: number;
  totalParcelas: number;
}

interface MovimentarContaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: ContaCorrente[];
  categories: Categoria[];
  investments: InvestmentInfo[];
  loans: LoanInfo[];
  segurosVeiculo: SeguroVeiculo[];
  veiculos: Veiculo[];
  selectedAccountId?: string;
  onSubmit: (transaction: TransacaoCompleta, transferGroup?: { id: string; fromAccountId: string; toAccountId: string; amount: number; date: string; description?: string }) => void;
  editingTransaction?: TransacaoCompleta;
}

const OPERATION_OPTIONS: { value: OperationType; label: string; icon: React.ElementType; color: string; bgColor: string }[] = [
  { value: 'receita', label: 'Receita', icon: Plus, color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'despesa', label: 'Despesa', icon: Minus, color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'transferencia', label: 'Transferência', icon: ArrowLeftRight, color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'aplicacao', label: 'Aplicação', icon: TrendingUp, color: 'text-accent', bgColor: 'bg-accent/10' },
  { value: 'resgate', label: 'Resgate', icon: TrendingDown, color: 'text-warning', bgColor: 'bg-warning/10' },
  { value: 'pagamento_emprestimo', label: 'Pag. Empréstimo', icon: CreditCard, color: 'text-warning', bgColor: 'bg-warning/10' },
  { value: 'liberacao_emprestimo', label: 'Liberação', icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'veiculo', label: 'Veículo', icon: Car, color: 'text-primary', bgColor: 'bg-primary/10' },
  { value: 'rendimento', label: 'Rendimento', icon: Coins, color: 'text-primary', bgColor: 'bg-primary/10' },
];

const getAvailableOperationTypes = (accountType: AccountType): OperationType[] => {
  switch (accountType) {
    case 'corrente':
      return ['receita', 'despesa', 'transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo', 'liberacao_emprestimo', 'veiculo', 'rendimento'];
    case 'cartao_credito':
      return ['despesa', 'transferencia'];
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
  if (!operationType || operationType === 'transferencia' || operationType === 'initial_balance') return categories;
  
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
  segurosVeiculo,
  veiculos,
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
  
  const [destinationAccountId, setDestinationAccountId] = useState<string | null>(null);
  const [tempInvestmentId, setTempInvestmentId] = useState<string | null>(null);
  const [tempLoanId, setTempLoanId] = useState<string | null>(null);
  const [tempVehicleOperation, setTempVehicleOperation] = useState<'compra' | 'venda' | null>(null);
  const [tempTipoVeiculo, setTempTipoVeiculo] = useState<'carro' | 'moto' | 'caminhao'>('carro');
  const [tempNumeroContrato, setTempNumeroContrato] = useState<string>('');
  const [tempParcelaId, setTempParcelaId] = useState<string | null>(null);
  
  const [tempSeguroId, setTempSeguroId] = useState<string | null>(null);
  const [tempSeguroParcelaId, setTempSeguroParcelaId] = useState<string | null>(null);

  const isEditing = !!editingTransaction;
  const selectedAccount = accounts.find(a => a.id === accountId);
  const availableOperations = selectedAccount ? getAvailableOperationTypes(selectedAccount.accountType) : [];
  
  const isTransfer = operationType === 'transferencia';
  const isInvestmentFlow = operationType === 'aplicacao' || operationType === 'resgate';
  const isLoanPayment = operationType === 'pagamento_emprestimo';
  const isLoanLiberation = operationType === 'liberacao_emprestimo';
  const isVehicle = operationType === 'veiculo';
  const isFinancingFlow = isLoanPayment || isLoanLiberation;
  
  const isCategorizable = operationType === 'receita' || operationType === 'despesa' || operationType === 'rendimento';
  
  const seguroCategory = useMemo(() => categories.find(c => c.label.toLowerCase() === 'seguro'), [categories]);
  const isInsurancePayment = operationType === 'despesa' && categoryId === seguroCategory?.id;
  
  const availableCategories = useMemo(() => getCategoryOptions(operationType, categories), [operationType, categories]);
  
  const isVinculoRequired = isTransfer || isInvestmentFlow || isFinancingFlow || isVehicle || isInsurancePayment;
  
  const activeLoans = useMemo(() => loans.filter(l => l.id.startsWith('loan_')), [loans]);
  
  const availableSeguros = useMemo(() => {
      return segurosVeiculo.filter(s => {
          const vehicle = veiculos.find(v => v.id === s.veiculoId);
          return vehicle && vehicle.status === 'ativo';
      });
  }, [segurosVeiculo, veiculos]);
  
  const availableSeguroParcelas = useMemo(() => {
      if (!tempSeguroId) return [];
      const seguro = segurosVeiculo.find(s => s.id === parseInt(tempSeguroId));
      if (!seguro) return [];
      
      return seguro.parcelas.filter(p => !p.paga);
  }, [tempSeguroId, segurosVeiculo]);
  
  const availableInstallments = useMemo(() => {
    if (!tempLoanId) return [];
    const loan = loans.find(l => l.id === tempLoanId);
    if (!loan) return [];
    
    return loan.parcelas.filter(p => !p.paga);
  }, [tempLoanId, loans]);

  useEffect(() => {
    if (open) {
      if (editingTransaction) {
        setAccountId(editingTransaction.accountId);
        setDate(editingTransaction.date);
        setAmount(editingTransaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setOperationType(editingTransaction.operationType);
        setCategoryId(editingTransaction.categoryId);
        setDescription(editingTransaction.description);
        
        setDestinationAccountId(editingTransaction.links?.transferGroupId ? accounts.find(a => a.id !== editingTransaction.accountId && a.id === editingTransaction.links?.investmentId)?.id || null : null);
        setTempInvestmentId(editingTransaction.links?.investmentId || null);
        setTempLoanId(editingTransaction.links?.loanId || null);
        setTempParcelaId(editingTransaction.links?.parcelaId || null);
        setTempVehicleOperation(editingTransaction.meta?.vehicleOperation || null);
        setTempTipoVeiculo(editingTransaction.meta?.tipoVeiculo || 'carro');
        setTempNumeroContrato(editingTransaction.meta?.numeroContrato || '');
        
        if (editingTransaction.links?.vehicleTransactionId) {
            const [seguroIdStr, parcelaNumStr] = editingTransaction.links.vehicleTransactionId.split('_');
            setTempSeguroId(seguroIdStr || null);
            setTempSeguroParcelaId(parcelaNumStr || null);
        } else {
            setTempSeguroId(null);
            setTempSeguroParcelaId(null);
        }
        
      } else {
        setAccountId(selectedAccountId || accounts[0]?.id || '');
        setDate(new Date().toISOString().split('T')[0]);
        setAmount("");
        const initialAccountOps = getAvailableOperationTypes(accounts.find(a => a.id === (selectedAccountId || accounts[0]?.id))?.accountType || 'corrente');
        setOperationType(initialAccountOps[0] || null);
        setCategoryId(null);
        setDescription("");
        
        setDestinationAccountId(null);
        setTempInvestmentId(null);
        setTempLoanId(null);
        setTempParcelaId(null);
        setTempVehicleOperation(null);
        setTempNumeroContrato('');
        setTempSeguroId(null);
        setTempSeguroParcelaId(null);
      }
    }
  }, [open, editingTransaction, selectedAccountId, accounts]);

  useEffect(() => {
    if (availableCategories.length === 1 && isCategorizable && !isInsurancePayment) {
      setCategoryId(availableCategories[0].id);
    } else if (isCategorizable && !isInsurancePayment) {
      if (!categoryId && availableCategories.length > 0) {
      } else if (!categoryId && availableCategories.length === 0) {
      }
    }
  }, [availableCategories, isCategorizable, isInsurancePayment, categoryId]);

  useEffect(() => {
    if (selectedAccount && !isEditing) {
      if (!operationType || !availableOperations.includes(operationType)) {
        setOperationType(availableOperations[0] || null);
      }
    }
  }, [selectedAccount, availableOperations, isEditing, operationType]);
  
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
  
  useEffect(() => {
    if (isInsurancePayment && tempSeguroId && tempSeguroParcelaId) {
      const seguro = segurosVeiculo.find(s => s.id === parseInt(tempSeguroId));
      const parcela = seguro?.parcelas.find(p => p.numero === parseInt(tempSeguroParcelaId));
      
      if (parcela) {
        setAmount(parcela.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setDescription(`Pagamento Seguro ${seguro?.numeroApolice || 'N/A'} - Parcela ${parcela.numero}/${seguro?.numeroParcelas || 'N/A'}`);
      }
    }
  }, [isInsurancePayment, tempSeguroId, tempSeguroParcelaId, segurosVeiculo]);

  const handleAmountChange = (value: string) => {
    let cleaned = value.replace(/[^\d,.]/g, '');
    
    const parts = cleaned.split(/[,.]/);
    if (parts.length > 2) {
      cleaned = parts.slice(0, -1).join('') + '.' + parts.slice(-1);
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    } else if (cleaned.includes('.')) {
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        const lastPart = parts.pop();
        cleaned = parts.join('') + '.' + lastPart;
      }
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
    
    if (isCategorizable && !isInsurancePayment && !categoryId) {
      toast.error("Selecione uma categoria.");
      return;
    }
    
    if (isInsurancePayment && (!tempSeguroId || !tempSeguroParcelaId)) {
        toast.error("Selecione o seguro e a parcela para o pagamento.");
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
    
    if (isLoanPayment && (!tempLoanId || !tempParcelaId)) {
      toast.error("Selecione o contrato e a parcela de empréstimo.");
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
      categoryId: isCategorizable || isInsurancePayment ? categoryId : null,
      description: description.trim() || OPERATION_TYPE_LABELS[operationType] || 'Movimentação',
      links: {
        investmentId: tempInvestmentId,
        loanId: tempLoanId,
        transferGroupId: editingTransaction?.links?.transferGroupId || null,
        parcelaId: tempParcelaId,
        vehicleTransactionId: isInsurancePayment ? `${tempSeguroId}_${tempSeguroParcelaId}` : null,
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
  
  const showCategorySelector = isCategorizable || isInsurancePayment;
  const isCategoryDisabled = !isCategorizable && !isInsurancePayment;
  const isAmountAutoFilled = (isLoanPayment && tempLoanId && tempParcelaId) || (isInsurancePayment && tempSeguroId && tempSeguroParcelaId);
  
  const selectedOperationConfig = OPERATION_OPTIONS.find(op => op.value === operationType);
  const HeaderIcon = selectedOperationConfig?.icon || DollarSign;
  const headerColor = selectedOperationConfig?.color || 'text-primary';
  const headerBgColor = selectedOperationConfig?.bgColor || 'bg-primary/10';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <DialogHeader className={cn("px-6 pt-6 pb-4", headerBgColor)}>
          <div className="flex items-start gap-3">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", headerBgColor)}>
              <HeaderIcon className={cn("w-6 h-6", headerColor)} />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-foreground">
                {isEditing ? "Editar Transação" : "Nova Movimentação"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {isEditing ? "Atualize os detalhes da transação" : "Registre uma nova transação financeira"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
          
          {/* Seção 1: Dados Principais */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Conta */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5" /> Conta *
                </Label>
                <Select 
                  value={accountId} 
                  onValueChange={(v) => setAccountId(v)}
                  disabled={isEditing}
                >
                  <SelectTrigger className="h-12 bg-background border-2 rounded-xl hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="Selecione a conta">
                      {selectedAccount && (
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center",
                            headerBgColor
                          )}>
                            <Wallet className={cn("w-4.5 h-4.5", headerColor)} />
                          </div>
                          <div className="text-left">
                            <div className="font-medium truncate">{selectedAccount.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {ACCOUNT_TYPE_LABELS[selectedAccount.accountType]}
                            </div>
                          </div>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        <div className="flex items-center gap-3 py-1">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            OPERATION_OPTIONS.find(op => op.value === 'receita')?.bgColor || 'bg-primary/10'
                          )}>
                            <Wallet className={cn(
                              "w-4 h-4",
                              OPERATION_OPTIONS.find(op => op.value === 'receita')?.color || 'text-primary'
                            )} />
                          </div>
                          <div className="text-left">
                            <div className="font-medium">{a.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {ACCOUNT_TYPE_LABELS[a.accountType]}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Data *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-12 pl-10 border-2 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo de Operação */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Tipo de Operação *
                </Label>
                <Select 
                  value={operationType || ''} 
                  onValueChange={(v) => {
                    setOperationType(v as OperationType);
                    setCategoryId(null);
                    setTempInvestmentId(null);
                    setTempLoanId(null);
                    setTempParcelaId(null);
                    setDestinationAccountId(null);
                    setTempVehicleOperation(null);
                    setTempSeguroId(null);
                    setTempSeguroParcelaId(null);
                  }}
                  disabled={isEditing}
                >
                  <SelectTrigger className="h-12 border-2 rounded-xl">
                    <SelectValue placeholder="Selecione a operação">
                      {selectedOperationConfig && (
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center",
                            selectedOperationConfig.bgColor
                          )}>
                            <selectedOperationConfig.icon className={cn("w-4.5 h-4.5", selectedOperationConfig.color)} />
                          </div>
                          <span className={cn("font-medium", selectedOperationConfig.color)}>
                            {selectedOperationConfig.label}
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableOperations.map(op => {
                      const option = OPERATION_OPTIONS.find(o => o.value === op);
                      if (!option) return null;
                      const Icon = option.icon;
                      return (
                        <SelectItem key={op} value={op}>
                          <div className="flex items-center gap-3 py-1">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              option.bgColor
                            )}>
                              <Icon className={cn("w-4 h-4", option.color)} />
                            </div>
                            <span className={cn("font-medium", option.color)}>
                              {option.label}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Valor */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Valor (R$) *
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    disabled={!!isAmountAutoFilled}
                    className="h-12 pl-10 text-lg font-semibold border-2 rounded-xl"
                  />
                  {isAmountAutoFilled && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Categoria e Descrição */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Tags className="w-4 h-4 text-accent" /> Classificação
              </h4>
            </div>

            {/* Categoria */}
            {showCategorySelector && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Categoria {isCategorizable ? '*' : ''}
                </Label>
                <Select 
                  value={categoryId || ''} 
                  onValueChange={(v) => {
                    setCategoryId(v);
                    if (v !== seguroCategory?.id) {
                      setTempSeguroId(null);
                      setTempSeguroParcelaId(null);
                    }
                  }}
                  disabled={isCategoryDisabled}
                >
                  <SelectTrigger className="h-12 border-2 rounded-xl">
                    <SelectValue placeholder="Selecione a categoria">
                      {categoryId ? (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            {availableCategories.find(c => c.id === categoryId)?.icon}
                          </div>
                          <span className="font-medium">
                            {availableCategories.find(c => c.id === categoryId)?.label}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                            <Tags className="w-4.5 h-4.5" />
                          </div>
                          <span>Selecione uma categoria</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {availableCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-3 py-1">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            {c.icon}
                          </div>
                          <div>
                            <div className="font-medium">{c.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {c.nature === 'receita' ? 'Receita' : 'Despesa'}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Descrição */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">Descrição</Label>
                <span className={cn(
                  "text-xs",
                  description.length > 140 ? "text-red-500" : "text-muted-foreground"
                )}>
                  {description.length}/150
                </span>
              </div>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 150))}
                  className="w-full h-24 p-3 pl-10 border-2 border-input rounded-xl resize-none focus:outline-none focus:border-primary"
                  placeholder="Descreva esta transação..."
                  maxLength={150}
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Vínculos */}
          {isVinculoRequired && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-primary flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" /> Vínculo / Contraparte
                </h4>
              </div>

              {/* Transferência */}
              {isTransfer && (
                <div className="p-4 border border-primary/20 rounded-xl bg-primary/5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-primary">Conta Destino *</Label>
                    <Select 
                      value={destinationAccountId || ''} 
                      onValueChange={(v) => setDestinationAccountId(v)}
                    >
                      <SelectTrigger className="h-12 border-2 border-primary/20 rounded-xl">
                        <SelectValue placeholder="Selecione a conta destino">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <ArrowLeftRight className="w-4.5 h-4.5 text-primary" />
                            </div>
                            <span className="text-muted-foreground">Para conta...</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.filter(a => a.id !== accountId).map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            <div className="flex items-center gap-3 py-1">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Wallet className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium">{a.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {ACCOUNT_TYPE_LABELS[a.accountType]}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Pagamento Empréstimo */}
              {isLoanPayment && (
                <div className="p-4 border border-warning/50 rounded-xl bg-warning/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-warning">Contrato *</Label>
                      <Select 
                        value={tempLoanId || ''} 
                        onValueChange={(v) => setTempLoanId(v)}
                      >
                        <SelectTrigger className="h-12 border-2 border-warning/50 rounded-xl">
                          <SelectValue placeholder="Selecione o contrato" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeLoans.map(l => (
                            <SelectItem key={l.id} value={l.id}>
                              <div className="flex items-center gap-3 py-1">
                                <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
                                  <CreditCard className="w-4 h-4 text-warning" />
                                </div>
                                <div>
                                  <div className="font-medium">{l.institution}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {l.numeroContrato}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-warning">Parcela *</Label>
                      <Select 
                        value={tempParcelaId || ''} 
                        onValueChange={(v) => setTempParcelaId(v)}
                        disabled={!tempLoanId}
                      >
                        <SelectTrigger className="h-12 border-2 border-warning/50 rounded-xl">
                          <SelectValue placeholder="Selecione a parcela" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableInstallments.map(p => (
                            <SelectItem key={p.numero} value={String(p.numero)}>
                              <div className="flex items-center justify-between w-full">
                                <span>Parcela {p.numero}</span>
                                <span className="text-warning font-medium">
                                  {formatCurrency(p.valor)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Pagamento Seguro */}
              {isInsurancePayment && (
                <div className="p-4 border border-primary/50 rounded-xl bg-primary/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-primary">Seguro *</Label>
                      <Select 
                        value={tempSeguroId || ''} 
                        onValueChange={(v) => { setTempSeguroId(v); setTempSeguroParcelaId(null); }}
                      >
                        <SelectTrigger className="h-12 border-2 border-primary/50 rounded-xl">
                          <SelectValue placeholder="Selecione o seguro" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSeguros.map(s => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              <div className="flex items-center gap-3 py-1">
                                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                  <Shield className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <div className="font-medium">{s.seguradora}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {s.numeroApolice}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-primary">Parcela *</Label>
                      <Select 
                        value={tempSeguroParcelaId || ''} 
                        onValueChange={(v) => setTempSeguroParcelaId(v)}
                        disabled={!tempSeguroId}
                      >
                        <SelectTrigger className="h-12 border-2 border-primary/50 rounded-xl">
                          <SelectValue placeholder="Selecione a parcela" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSeguroParcelas.map(p => (
                            <SelectItem key={p.numero} value={String(p.numero)}>
                              <div className="flex items-center justify-between w-full">
                                <span>Parcela {p.numero}</span>
                                <span className="text-primary font-medium">
                                  {formatCurrency(p.valor)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Adicione aqui os outros tipos de vínculos seguindo o mesmo padrão */}
            </div>
          )}

          <DialogFooter className="pt-4">
            <div className="flex w-full gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1 h-12 rounded-xl border-2"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className={cn(
                  "flex-1 h-12 rounded-xl font-semibold",
                  "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                )}
              >
                <Check className="w-5 h-5 mr-2" />
                {isEditing ? "Salvar Alterações" : "Registrar"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}