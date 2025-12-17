import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Building2, Wallet, PiggyBank, TrendingUp, Shield, Target, Bitcoin, CreditCard, ArrowLeftRight, Car, DollarSign, Plus, Minus, RefreshCw, Coins, TrendingDown, Tags, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
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
  segurosVeiculo: SeguroVeiculo[]; // ADDED
  veiculos: Veiculo[]; // ADDED
  selectedAccountId?: string;
  onSubmit: (transaction: TransacaoCompleta, transferGroup?: { id: string; fromAccountId: string; toAccountId: string; amount: number; date: string; description?: string }) => void;
  editingTransaction?: TransacaoCompleta;
}

const OPERATION_OPTIONS: { value: OperationType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'receita', label: 'Receita', icon: Plus, color: 'text-success' },
  { value: 'despesa', label: 'Despesa', icon: Minus, color: 'text-destructive' },
  { value: 'transferencia', label: 'Transferência', icon: ArrowLeftRight, color: 'text-primary' },
  { value: 'aplicacao', label: 'Aplicação', icon: TrendingUp, color: 'text-purple-500' },
  { value: 'resgate', label: 'Resgate', icon: TrendingDown, color: 'text-amber-500' },
  { value: 'pagamento_emprestimo', label: 'Pag. Empréstimo', icon: CreditCard, color: 'text-orange-500' },
  { value: 'liberacao_emprestimo', label: 'Liberação Empréstimo', icon: DollarSign, color: 'text-emerald-500' },
  { value: 'veiculo', label: 'Veículo', icon: Car, color: 'text-blue-500' },
  { value: 'rendimento', label: 'Rendimento', icon: Coins, color: 'text-teal-500' },
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
  segurosVeiculo, // ADDED
  veiculos, // ADDED
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
  
  // NEW STATES for Insurance Linking
  const [tempSeguroId, setTempSeguroId] = useState<string | null>(null);
  const [tempSeguroParcelaId, setTempSeguroParcelaId] = useState<string | null>(null);

  // UI State for Tabs
  const [activeTab, setActiveTab] = useState("passo1");

  const isEditing = !!editingTransaction;
  const selectedAccount = accounts.find(a => a.id === accountId);
  const availableOperations = selectedAccount ? getAvailableOperationTypes(selectedAccount.accountType) : [];
  
  const isTransfer = operationType === 'transferencia';
  const isInvestmentFlow = operationType === 'aplicacao' || operationType === 'resgate';
  const isLoanPayment = operationType === 'pagamento_emprestimo';
  const isLoanLiberation = operationType === 'liberacao_emprestimo';
  const isVehicle = operationType === 'veiculo';
  const isFinancingFlow = isLoanPayment || isLoanLiberation;
  
  // Categorizable if it's a basic flow (receita, despesa, rendimento)
  const isCategorizable = operationType === 'receita' || operationType === 'despesa' || operationType === 'rendimento';
  
  const seguroCategory = useMemo(() => categories.find(c => c.label.toLowerCase() === 'seguro'), [categories]);
  const isInsurancePayment = operationType === 'despesa' && categoryId === seguroCategory?.id;
  
  const availableCategories = useMemo(() => getCategoryOptions(operationType, categories), [operationType, categories]);
  
  // Determine if Vínculo tab is required
  const isVinculoRequired = isTransfer || isInvestmentFlow || isFinancingFlow || isVehicle || isInsurancePayment;
  
  // Filter loans to only show active ones for payment
  const activeLoans = useMemo(() => loans.filter(l => l.id.startsWith('loan_')), [loans]);
  
  // Available Seguros (Active vehicles only)
  const availableSeguros = useMemo(() => {
      return segurosVeiculo.filter(s => {
          const vehicle = veiculos.find(v => v.id === s.veiculoId);
          return vehicle && vehicle.status === 'ativo';
      });
  }, [segurosVeiculo, veiculos]);
  
  // Available Parcels for selected Seguro
  const availableSeguroParcelas = useMemo(() => {
      if (!tempSeguroId) return [];
      const seguro = segurosVeiculo.find(s => s.id === parseInt(tempSeguroId));
      if (!seguro) return [];
      
      return seguro.parcelas.filter(p => !p.paga);
  }, [tempSeguroId, segurosVeiculo]);
  
  // Filter available installments for the selected loan
  const availableInstallments = useMemo(() => {
    if (!tempLoanId) return [];
    const loan = loans.find(l => l.id === tempLoanId);
    if (!loan) return [];
    
    return loan.parcelas.filter(p => !p.paga);
  }, [tempLoanId, loans]);

  // Reset state when modal opens/changes
  useEffect(() => {
    if (open) {
      setActiveTab("passo1"); // Always start at step 1
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
        
        // NEW: Insurance links
        if (editingTransaction.links?.vehicleTransactionId) {
            const [seguroIdStr, parcelaNumStr] = editingTransaction.links.vehicleTransactionId.split('_');
            setTempSeguroId(seguroIdStr || null);
            setTempSeguroParcelaId(parcelaNumStr || null);
        } else {
            setTempSeguroId(null);
            setTempSeguroParcelaId(null);
        }
        
      } else {
        // NEW TRANSACTION INITIALIZATION
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

  // Auto-select category if only one is available AND it's categorizable
  useEffect(() => {
    if (availableCategories.length === 1 && isCategorizable && !isInsurancePayment) {
      setCategoryId(availableCategories[0].id);
    } else if (isCategorizable && !isInsurancePayment) {
      if (!categoryId && availableCategories.length > 0) {
          // Do nothing, let user select
      } else if (!categoryId && availableCategories.length === 0) {
          // If no categories, keep null
      }
    }
  }, [availableCategories, isCategorizable, isInsurancePayment, categoryId]);

  // Auto-select operation type if account changes (only for new transactions)
  useEffect(() => {
    if (selectedAccount && !isEditing) {
      if (!operationType || !availableOperations.includes(operationType)) {
        setOperationType(availableOperations[0] || null);
      }
    }
  }, [selectedAccount, availableOperations, isEditing, operationType]);
  
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
  
  // Auto-fill amount and description for insurance payment
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
    
    // Final Validation for Categorizable flows
    if (isCategorizable && !isInsurancePayment && !categoryId) {
      toast.error("Selecione uma categoria.");
      return;
    }
    
    // Final Validation for Insurance Payment
    if (isInsurancePayment && (!tempSeguroId || !tempSeguroParcelaId)) {
        toast.error("Selecione o seguro e a parcela para o pagamento.");
        return;
    }
    
    // Final Validation for Vínculo flows
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
  
  // Determine if Category Selector should be rendered
  const showCategorySelector = isCategorizable || isInsurancePayment; 
  
  // Determine if Category should be disabled
  const isCategoryDisabled = !isCategorizable && !isInsurancePayment;
  
  // Determine if Amount should be auto-filled
  const isAmountAutoFilled = (isLoanPayment && tempLoanId && tempParcelaId) || (isInsurancePayment && tempSeguroId && tempSeguroParcelaId);
  
  const selectedOperationConfig = OPERATION_OPTIONS.find(op => op.value === operationType);
  const HeaderIcon = selectedOperationConfig?.icon || DollarSign;
  const headerColor = selectedOperationConfig?.color || 'text-primary';

  // --- Navigation Logic ---
  const handleNext = () => {
    if (activeTab === 'passo1') {
      const parsedAmount = parseFloat(amount.replace(',', '.'));
      if (!accountId || !date || parsedAmount <= 0 || !operationType) {
        toast.error("Preencha Conta, Data, Valor e Tipo de Operação.");
        return;
      }
      
      if (isVinculoRequired) {
        setActiveTab('passo3'); // Skip passo 2 if Vínculo is required
      } else {
        setActiveTab('passo2');
      }
    } else if (activeTab === 'passo2') {
      // Validation for Passo 2 (Category)
      if (showCategorySelector && !isInsurancePayment && !categoryId) {
        toast.error("Selecione uma categoria.");
        return;
      }
      // If Vínculo is required, we should have skipped Passo 2. If we are here, we submit.
      handleSubmit({} as any); // Submit placeholder, actual submit logic handles validation
    } else if (activeTab === 'passo3') {
      // Validation for Passo 3 (Vínculos) is handled in handleSubmit
      handleSubmit({} as any);
    }
  };

  const handleBack = () => {
    if (activeTab === 'passo2') {
      setActiveTab('passo1');
    } else if (activeTab === 'passo3') {
      if (isCategorizable || isInsurancePayment) {
        setActiveTab('passo2');
      } else {
        setActiveTab('passo1');
      }
    }
  };
  
  const currentStepIndex = activeTab === 'passo1' ? 1 : activeTab === 'passo2' ? 2 : 3;
  const totalSteps = isVinculoRequired ? 3 : 2;
  const isLastStep = (activeTab === 'passo2' && !isVinculoRequired) || activeTab === 'passo3';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeaderIcon className={cn("w-5 h-5", headerColor)} />
            {isEditing ? "Editar Transação" : "Nova Movimentação"}
          </DialogTitle>
          <DialogDescription>
              {isEditing ? "Atualize os detalhes da transação." : `Passo ${currentStepIndex} de ${totalSteps}: ${activeTab === 'passo1' ? 'Detalhes Essenciais' : activeTab === 'passo2' ? 'Classificação' : 'Vínculos'}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 flex flex-col h-full">
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            
            {/* Tab List (Visual Indicator) */}
            <TabsList className="grid w-full grid-cols-3 h-10 mb-4 bg-muted/50">
              <TabsTrigger value="passo1" className="text-xs" disabled={activeTab !== 'passo1'}>
                1. Essenciais
              </TabsTrigger>
              <TabsTrigger value="passo2" className="text-xs" disabled={activeTab !== 'passo2'}>
                2. Classificação
              </TabsTrigger>
              <TabsTrigger value="passo3" className="text-xs" disabled={activeTab !== 'passo3'}>
                3. Vínculos
              </TabsTrigger>
            </TabsList>

            {/* Passo 1: Detalhes Essenciais */}
            <TabsContent value="passo1" className="mt-0 space-y-4 p-4 rounded-lg border border-border/50 bg-muted/10">
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <Wallet className="w-4 h-4" /> Detalhes da Movimentação
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="accountId">Conta *</Label>
                        <Select 
                        value={accountId} 
                        onValueChange={(v) => setAccountId(v)}
                        disabled={isEditing}
                        >
                        <SelectTrigger className="h-10">
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
                        className="h-10"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="operationType">Tipo de Operação *</Label>
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
                        <SelectTrigger className={cn("h-10", selectedOperationConfig?.color)}>
                            <SelectValue placeholder="Selecione a operação">
                                {selectedOperationConfig && (
                                    <span className="flex items-center gap-2">
                                        <selectedOperationConfig.icon className="w-4 h-4" />
                                        {selectedOperationConfig.label}
                                    </span>
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
                                <span className={cn("flex items-center gap-2", option.color)}>
                                    <Icon className="w-4 h-4" />
                                    {option.label}
                                </span>
                                </SelectItem>
                            );
                            })}
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount">Valor (R$) *</Label>
                        <Input
                        id="amount"
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        disabled={!!isAmountAutoFilled}
                        className="h-10"
                        />
                    </div>
                </div>
            </TabsContent>
            
            {/* Passo 2: Classificação e Descrição */}
            <TabsContent value="passo2" className="mt-0 space-y-4 p-4 rounded-lg border border-border/50 bg-muted/10">
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <Tags className="w-4 h-4" /> Classificação
                </h4>
                <div className="grid grid-cols-1 gap-4">
                    {/* Categoria Selector */}
                    {showCategorySelector && (
                    <div className="space-y-2">
                        <Label htmlFor="categoryId">Categoria {isCategorizable ? '*' : ''}</Label>
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
                        <SelectTrigger className="h-10">
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
                    
                    {/* Descrição (Full Width) */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Input
                        id="description"
                        placeholder="Descrição da transação"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="h-10"
                        />
                    </div>
                </div>
            </TabsContent>

            {/* Passo 3: Vínculos (Condicionais) */}
            <TabsContent value="passo3" className="mt-0 space-y-4 p-4 rounded-lg border border-border/50 bg-primary/10">
                <h4 className="font-semibold text-sm text-primary flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4" /> Vínculo / Contraparte
                </h4>
                
                {/* Transferência */}
                {isTransfer && (
                    <div className="space-y-2">
                        <Label htmlFor="destinationAccount">Conta Destino *</Label>
                        <Select 
                        value={destinationAccountId || ''} 
                        onValueChange={(v) => setDestinationAccountId(v)}
                        >
                        <SelectTrigger className="h-10">
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
                
                {/* Fluxo de Investimento */}
                {isInvestmentFlow && (
                    <div className="space-y-2">
                        <Label htmlFor="investmentAccount">Conta de Investimento *</Label>
                        <Select 
                        value={tempInvestmentId || ''} 
                        onValueChange={(v) => setTempInvestmentId(v)}
                        >
                        <SelectTrigger className="h-10">
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
                
                {/* Liberação Empréstimo */}
                {isLoanLiberation && (
                    <div className="space-y-2">
                        <Label htmlFor="numeroContrato">Número do Contrato *</Label>
                        <Input
                        id="numeroContrato"
                        placeholder="Ex: Contrato 12345"
                        value={tempNumeroContrato}
                        onChange={(e) => setTempNumeroContrato(e.target.value)}
                        className="h-10"
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
                            <SelectTrigger className="h-10">
                            <SelectValue placeholder="Compra/Venda" />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="compra">Compra (Saída)</SelectItem>
                            <SelectItem value="venda">Venda (Entrada)</SelectItem>
                            </SelectContent>
                        </Select>
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="tipoVeiculo">Tipo</Label>
                        <Select 
                            value={tempTipoVeiculo} 
                            onValueChange={(v) => setTempTipoVeiculo(v as 'carro' | 'moto' | 'caminhao')}
                        >
                            <SelectTrigger className="h-10">
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
                
                {/* Pagamento Empréstimo */}
                {isLoanPayment && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                        <Label htmlFor="loanContract">Contrato de Empréstimo *</Label>
                        <Select 
                            value={tempLoanId || ''} 
                            onValueChange={(v) => setTempLoanId(v)}
                        >
                            <SelectTrigger className="h-10">
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
                            <SelectTrigger className="h-10">
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
                
                {/* Pagamento Seguro */}
                {isInsurancePayment && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="seguroId">Seguro *</Label>
                            <Select 
                                value={tempSeguroId || ''} 
                                onValueChange={(v) => { setTempSeguroId(v); setTempSeguroParcelaId(null); }}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Selecione o seguro" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableSeguros.map(s => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.numeroApolice} ({s.seguradora})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="seguroParcelaId">Parcela *</Label>
                            <Select 
                                value={tempSeguroParcelaId || ''} 
                                onValueChange={(v) => setTempSeguroParcelaId(v)}
                                disabled={!tempSeguroId}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Selecione a parcela" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableSeguroParcelas.map(p => (
                                        <SelectItem key={p.numero} value={String(p.numero)}>
                                            P{p.numero} - {formatCurrency(p.valor)} ({parseDateLocal(p.vencimento).toLocaleDateString("pt-BR")})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-4 flex justify-between items-center">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            
            <div className="flex gap-2">
                {activeTab !== 'passo1' && (
                    <Button type="button" variant="secondary" onClick={handleBack}>
                        <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
                    </Button>
                )}
                
                {isLastStep ? (
                    <Button type="submit" onClick={handleSubmit}>
                        <CheckCircle2 className="w-4 h-4 mr-2" /> {isEditing ? "Salvar Alterações" : "Registrar"}
                    </Button>
                ) : (
                    <Button type="button" onClick={handleNext}>
                        Próximo <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}