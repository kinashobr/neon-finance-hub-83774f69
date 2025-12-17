import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Wallet, PiggyBank, TrendingUp, Shield, Target, Bitcoin, CreditCard, ArrowLeftRight, Car, DollarSign, Plus, Minus, RefreshCw, Coins, TrendingDown, Tags, ChevronRight, ChevronLeft, CheckCircle2, Calendar, StickyNote, Info } from "lucide-react";
import { ContaCorrente, Categoria, AccountType, ACCOUNT_TYPE_LABELS, generateTransactionId, formatCurrency, OperationType, TransacaoCompleta, TransactionLinks, generateTransferGroupId, getFlowTypeFromOperation, getDomainFromOperation, InvestmentInfo, SeguroVeiculo, Veiculo, OPERATION_TYPE_LABELS } from "@/types/finance";
import { toast } from "sonner";
import { parseDateLocal, cn } from "@/lib/utils";
import { ResizableDialogContent } from "../ui/ResizableDialogContent";

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

// Define a configuração de cores e ícones para cada operação
const OPERATION_CONFIG: Record<OperationType, { label: string; icon: React.ElementType; colorClass: string; baseColor: string; tailwindColor: string }> = {
  receita: { label: 'Receita', icon: Plus, colorClass: 'text-success', baseColor: 'hsl(142, 76%, 36%)', tailwindColor: 'green-500' },
  despesa: { label: 'Despesa', icon: Minus, colorClass: 'text-destructive', baseColor: 'hsl(0, 72%, 51%)', tailwindColor: 'red-500' },
  transferencia: { label: 'Transferência', icon: ArrowLeftRight, colorClass: 'text-primary', baseColor: 'hsl(199, 89%, 48%)', tailwindColor: 'blue-500' },
  aplicacao: { label: 'Aplicação', icon: TrendingUp, colorClass: 'text-purple-500', baseColor: 'hsl(270, 100%, 65%)', tailwindColor: 'purple-500' },
  resgate: { label: 'Resgate', icon: TrendingDown, colorClass: 'text-warning', baseColor: 'hsl(38, 92%, 50%)', tailwindColor: 'amber-500' },
  pagamento_emprestimo: { label: 'Pag. Empréstimo', icon: CreditCard, colorClass: 'text-orange-500', baseColor: 'hsl(25, 95%, 53%)', tailwindColor: 'orange-500' },
  liberacao_emprestimo: { label: 'Liberação Empréstimo', icon: DollarSign, colorClass: 'text-emerald-500', baseColor: 'hsl(142, 76%, 36%)', tailwindColor: 'emerald-500' },
  veiculo: { label: 'Veículo', icon: Car, colorClass: 'text-indigo-500', baseColor: 'hsl(240, 70%, 50%)', tailwindColor: 'indigo-500' },
  rendimento: { label: 'Rendimento', icon: Coins, colorClass: 'text-teal-500', baseColor: 'hsl(170, 70%, 50%)', tailwindColor: 'teal-500' },
  initial_balance: { label: 'Saldo Inicial', icon: CheckCircle2, colorClass: 'text-muted-foreground', baseColor: 'hsl(215, 20%, 55%)', tailwindColor: 'gray-500' },
};

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

// Local component for Floating Input with Icon
interface FloatingInputWithIconProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    Icon: React.ElementType;
    colorClass: string;
    error?: boolean;
}

const FloatingInputWithIcon = ({ label, Icon, colorClass, error, ...props }: FloatingInputWithIconProps) => (
    <div className="relative pt-5">
        <Icon className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors z-10", colorClass)} />
        <Input
            {...props}
            placeholder=" "
            className={cn(
                "h-12 pl-10 pt-4 pb-2 bg-muted/50 border-border focus-visible:ring-offset-0 transition-all duration-200 peer text-base",
                error && "border-destructive focus-visible:ring-destructive/50",
                props.disabled && "opacity-70 cursor-not-allowed"
            )}
        />
        <Label
            htmlFor={props.id}
            className={cn(
                "absolute left-10 top-1/2 -translate-y-1/2 text-sm text-muted-foreground transition-all duration-200 pointer-events-none",
                "peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base",
                "peer-focus:top-2 peer-focus:text-xs peer-focus:left-3 peer-focus:text-primary",
                (props.value || props.type === 'date') && props.value !== "" && "top-2 text-xs left-3 text-primary",
                error && "peer-focus:text-destructive"
            )}
        >
            {label}
        </Label>
    </div>
);

// Local component for Floating Select with Icon
interface FloatingSelectWithIconProps {
    label: string;
    Icon: React.ElementType;
    colorClass: string;
    value: string;
    onValueChange: (value: string) => void;
    options: { value: string; label: string; icon?: React.ElementType; color?: string }[];
    placeholder: string;
    disabled?: boolean;
    error?: boolean;
}

const FloatingSelectWithIcon = ({ label, Icon, colorClass, value, onValueChange, options, placeholder, disabled, error }: FloatingSelectWithIconProps) => (
    <div className="relative pt-5">
        <Icon className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors z-10", colorClass)} />
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger 
                className={cn(
                    "h-12 pl-10 pt-4 pb-2 bg-muted/50 border-border focus-visible:ring-offset-0 transition-all duration-200 peer text-base",
                    error && "border-destructive focus-visible:ring-destructive/50",
                    disabled && "opacity-70 cursor-not-allowed"
                )}
            >
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map(opt => {
                    const OptIcon = opt.icon;
                    return (
                        <SelectItem key={opt.value} value={opt.value}>
                            <span className={cn("flex items-center gap-2 text-sm", opt.color)}>
                                {OptIcon && <OptIcon className="w-4 h-4" />}
                                {opt.label}
                            </span>
                        </SelectItem>
                    );
                })}
            </SelectContent>
        </Select>
        <Label
            className={cn(
                "absolute left-10 top-1/2 -translate-y-1/2 text-sm text-muted-foreground transition-all duration-200 pointer-events-none",
                "peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base",
                "peer-focus:top-2 peer-focus:text-xs peer-focus:left-3 peer-focus:text-primary",
                value && value !== "" && "top-2 text-xs left-3 text-primary",
                error && "peer-focus:text-destructive"
            )}
        >
            label
        </Label>
    </div>
);


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
  
  // Transfer/Link specific states
  const [destinationAccountId, setDestinationAccountId] = useState<string | null>(null);
  const [tempInvestmentId, setTempInvestmentId] = useState<string | null>(null);
  const [tempLoanId, setTempLoanId] = useState<string | null>(null);
  const [tempVehicleOperation, setTempVehicleOperation] = useState<'compra' | 'venda' | null>(null);
  const [tempTipoVeiculo, setTempTipoVeiculo] = useState<'carro' | 'moto' | 'caminhao'>('carro');
  const [tempNumeroContrato, setTempNumeroContrato] = useState<string>('');
  const [tempParcelaId, setTempParcelaId] = useState<string | null>(null);
  
  // Insurance Linking
  const [tempSeguroId, setTempSeguroId] = useState<string | null>(null);
  const [tempSeguroParcelaId, setTempSeguroParcelaId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState("simples");
  
  // --- Dynamic Calculations ---
  const isEditing = !!editingTransaction;
  const selectedAccount = accounts.find(a => a.id === accountId);
  const availableOperations = selectedAccount ? getAvailableOperationTypes(selectedAccount.accountType) : [];
  
  const isTransfer = operationType === 'transferencia';
  const isInvestmentFlow = operationType === 'aplicacao' || operationType === 'resgate';
  const isLoanPayment = operationType === 'pagamento_emprestimo';
  const isLoanLiberation = operationType === 'liberacao_emprestimo';
  const isVehicle = operationType === 'veiculo';
  const isFinancingFlow = isLoanPayment || isLoanLiberation;
  
  const seguroCategory = useMemo(() => categories.find(c => c.label.toLowerCase() === 'seguro'), [categories]);
  const isInsurancePayment = operationType === 'despesa' && categoryId === seguroCategory?.id;
  
  const isCategorizable = operationType === 'receita' || operationType === 'despesa' || operationType === 'rendimento';
  const isCategoryDisabled = !isCategorizable && !isInsurancePayment;
  
  const isVinculoRequired = isTransfer || isInvestmentFlow || isFinancingFlow || isVehicle || isInsurancePayment;
  
  const availableCategories = useMemo(() => getCategoryOptions(operationType, categories), [operationType, categories]);
  
  const selectedOperationConfig = OPERATION_CONFIG[operationType || 'despesa'];
  const HeaderIcon = selectedOperationConfig?.icon || DollarSign;
  const headerColorClass = selectedOperationConfig?.colorClass || 'text-primary';
  const headerBaseColor = selectedOperationConfig?.baseColor || 'hsl(var(--primary))';
  const headerTailwindColor = selectedOperationConfig?.tailwindColor || 'blue-500';
  
  const isAmountAutoFilled = (isLoanPayment && tempLoanId && tempParcelaId) || (isInsurancePayment && tempSeguroId && tempSeguroParcelaId);
  
  // --- Validation State ---
  const [errors, setErrors] = useState({
      accountId: false, date: false, amount: false, operationType: false, categoryId: false,
      destinationAccountId: false, tempInvestmentId: false, tempLoanId: false, tempParcelaId: false,
      tempVehicleOperation: false, tempNumeroContrato: false, tempSeguroId: false, tempSeguroParcelaId: false,
  });
  
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
        setErrors({
            accountId: false, date: false, amount: false, operationType: false, categoryId: false,
            destinationAccountId: false, tempInvestmentId: false, tempLoanId: false, tempParcelaId: false,
            tempVehicleOperation: false, tempNumeroContrato: false, tempSeguroId: false, tempSeguroParcelaId: false,
        });
      }
    }
  }, [open, editingTransaction, selectedAccountId, accounts]);

  // Auto-select category if only one is available AND it's categorizable
  useEffect(() => {
    if (availableCategories.length === 1 && isCategorizable && !isInsurancePayment) {
      setCategoryId(availableCategories[0].id);
    }
  }, [availableCategories, isCategorizable, isInsurancePayment]);

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
    
    // Reset errors
    setErrors({
        accountId: false, date: false, amount: false, operationType: false, categoryId: false,
        destinationAccountId: false, tempInvestmentId: false, tempLoanId: false, tempParcelaId: false,
        tempVehicleOperation: false, tempNumeroContrato: false, tempSeguroId: false, tempSeguroParcelaId: false,
    });

    let hasError = false;
    
    if (!accountId) { setErrors(p => ({ ...p, accountId: true })); hasError = true; }
    if (!date) { setErrors(p => ({ ...p, date: true })); hasError = true; }
    if (parsedAmount <= 0 || isNaN(parsedAmount)) { setErrors(p => ({ ...p, amount: true })); hasError = true; }
    if (!operationType) { setErrors(p => ({ ...p, operationType: true })); hasError = true; }
    
    // Validation for Categorizable flows
    if (isCategorizable && !isInsurancePayment && !categoryId) { 
        setErrors(p => ({ ...p, categoryId: true })); hasError = true; 
    }
    
    // Validation for Insurance Payment
    if (isInsurancePayment && (!tempSeguroId || !tempSeguroParcelaId)) {
        if (!tempSeguroId) setErrors(p => ({ ...p, tempSeguroId: true }));
        if (!tempSeguroParcelaId) setErrors(p => ({ ...p, tempSeguroParcelaId: true }));
        hasError = true;
    }
    
    // Validation for Vínculo flows
    if (isTransfer && !destinationAccountId) { setErrors(p => ({ ...p, destinationAccountId: true })); hasError = true; }
    if (isInvestmentFlow && !tempInvestmentId) { setErrors(p => ({ ...p, tempInvestmentId: true })); hasError = true; }
    if (isLoanPayment && (!tempLoanId || !tempParcelaId)) { 
        if (!tempLoanId) setErrors(p => ({ ...p, tempLoanId: true }));
        if (!tempParcelaId) setErrors(p => ({ ...p, tempParcelaId: true }));
        hasError = true;
    }
    if (isLoanLiberation && !tempNumeroContrato) { setErrors(p => ({ ...p, tempNumeroContrato: true })); hasError = true; }
    if (isVehicle && !tempVehicleOperation) { setErrors(p => ({ ...p, tempVehicleOperation: true })); hasError = true; }
    
    if (hasError) {
        toast.error("Preencha todos os campos obrigatórios ou revise os vínculos.");
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
  
  // --- Component Rendering Data ---
  
  const accountOptions = accounts.map(a => ({
      value: a.id,
      label: `${ACCOUNT_TYPE_LABELS[a.accountType]} - ${a.name}`,
      icon: Wallet,
      color: headerColorClass,
  }));
  
  const operationOptions = availableOperations.map(op => {
      const config = OPERATION_CONFIG[op];
      return {
          value: op,
          label: config.label,
          icon: config.icon,
          color: config.colorClass,
      };
  });
  
  const destinationAccountOptions = accounts.filter(a => a.id !== accountId).map(a => ({
      value: a.id,
      label: `${ACCOUNT_TYPE_LABELS[a.accountType]} - ${a.name}`,
      icon: Building2,
      color: 'text-primary',
  }));
  
  const investmentOptions = investments.map(i => ({
      value: i.id,
      label: i.name,
      icon: PiggyBank,
      color: 'text-purple-500',
  }));
  
  const loanOptions = activeLoans.map(l => ({
      value: l.id,
      label: l.institution,
      icon: Building2,
      color: 'text-orange-500',
  }));
  
  const installmentOptions = availableInstallments.map(p => ({
      value: String(p.numero),
      label: `P${p.numero} - ${formatCurrency(p.valor)} (${parseDateLocal(p.vencimento).toLocaleDateString("pt-BR")})`,
      icon: Calendar,
      color: 'text-orange-500',
  }));
  
  const seguroOptions = availableSeguros.map(s => ({
      value: String(s.id),
      label: `${s.numeroApolice} (${s.seguradora})`,
      icon: Shield,
      color: 'text-blue-500',
  }));
  
  const seguroParcelaOptions = availableSeguroParcelas.map(p => ({
      value: String(p.numero),
      label: `P${p.numero} - ${formatCurrency(p.valor)} (${parseDateLocal(p.vencimento).toLocaleDateString("pt-BR")})`,
      icon: Calendar,
      color: 'text-blue-500',
  }));
  
  const categoryOptions = availableCategories.map(c => ({
      value: c.id,
      label: `${c.icon} ${c.label}`,
      icon: Tags,
      color: c.nature === 'receita' ? 'text-success' : 'text-destructive',
  }));
  
  // Set default tab based on requirement
  useEffect(() => {
      if (open) {
          setActiveTab(isVinculoRequired ? "vinculado" : "simples");
      }
  }, [open, isVinculoRequired]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ResizableDialogContent 
        storageKey="movimentar_conta_modal"
        initialWidth={500}
        initialHeight={isVinculoRequired ? 750 : 600}
        minWidth={400}
        minHeight={500}
        className="max-w-lg bg-card border-border overflow-hidden flex flex-col p-0 shadow-lg animate-fade-in"
      >
        {/* SEÇÃO 1: HEADER DINÂMICO */}
        <DialogHeader className="p-6 pb-0 shrink-0 border-b border-border/50">
          <DialogTitle className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", headerColorClass.replace('text-', 'bg-') + '/10')}>
              <HeaderIcon className={cn("w-6 h-6", headerColorClass)} />
            </div>
            <span className="text-2xl font-bold">{isEditing ? "Editar Transação" : "Nova Movimentação"}</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isEditing ? "Atualize os detalhes da transação." : "Registre uma nova entrada, saída ou transferência."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
          
          {/* SEÇÃO 2: DETALHES ESSENCIAIS (GRID 2x2) */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Conta */}
                <FloatingSelectWithIcon
                    label="Conta"
                    Icon={Wallet}
                    colorClass={errors.accountId ? 'text-destructive' : 'text-primary'}
                    value={accountId}
                    onValueChange={(v) => {
                        setAccountId(v);
                        setErrors(p => ({ ...p, accountId: false }));
                    }}
                    options={accountOptions}
                    placeholder="Selecione a conta"
                    disabled={isEditing}
                    error={errors.accountId}
                />
                
                {/* 2. Data */}
                <FloatingInputWithIcon
                    id="date"
                    label="Data"
                    Icon={Calendar}
                    colorClass={errors.date ? 'text-destructive' : 'text-primary'}
                    type="date"
                    value={date}
                    onChange={(e) => {
                        setDate(e.target.value);
                        setErrors(p => ({ ...p, date: false }));
                    }}
                    error={errors.date}
                />
                
                {/* 3. Tipo Operação */}
                <FloatingSelectWithIcon
                    label="Tipo de Operação"
                    Icon={HeaderIcon}
                    colorClass={errors.operationType ? 'text-destructive' : headerColorClass}
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
                        setErrors(p => ({ ...p, operationType: false }));
                    }}
                    options={operationOptions}
                    placeholder="Selecione a operação"
                    disabled={isEditing}
                    error={errors.operationType}
                />
                
                {/* 4. Valor */}
                <FloatingInputWithIcon
                    id="amount"
                    label="Valor (R$)"
                    Icon={DollarSign}
                    colorClass={errors.amount ? 'text-destructive' : headerColorClass}
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => {
                        handleAmountChange(e.target.value);
                        setErrors(p => ({ ...p, amount: false }));
                    }}
                    disabled={!!isAmountAutoFilled}
                    error={errors.amount}
                />
            </div>
          </div>
          
          {/* SEÇÃO 3: SISTEMA DE ABAS */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="bg-muted/50 w-full grid grid-cols-2 shrink-0">
              <TabsTrigger value="simples" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors duration-300">
                <Tags className="w-4 h-4 mr-2" /> Classificação Simples
              </TabsTrigger>
              <TabsTrigger 
                value="vinculado" 
                className={cn(
                    "text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-colors duration-300",
                    !isVinculoRequired && "opacity-50 cursor-not-allowed"
                )}
                disabled={!isVinculoRequired}
              >
                <ArrowLeftRight className="w-4 h-4 mr-2" /> Vínculo / Contraparte
              </TabsTrigger>
            </TabsList>

            {/* CONTEÚDO ABA "SIMPLES" */}
            <TabsContent value="simples" className="mt-4 flex-1 overflow-y-auto pr-1 space-y-4 animate-slide-in-left">
                {/* Categoria Selector */}
                <div className="space-y-2">
                    <Label htmlFor="categoryId" className="text-sm">Categoria {isCategorizable || isInsurancePayment ? '*' : ''}</Label>
                    <Select 
                        value={categoryId || ''} 
                        onValueChange={(v) => {
                            setCategoryId(v);
                            if (v !== seguroCategory?.id) {
                                setTempSeguroId(null);
                                setTempSeguroParcelaId(null);
                            }
                            setErrors(p => ({ ...p, categoryId: false }));
                        }}
                        disabled={isCategoryDisabled}
                    >
                        <SelectTrigger className={cn("h-10 text-base", errors.categoryId && "border-destructive")}>
                            <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                            {categoryOptions.map(c => (
                                <SelectItem key={c.value} value={c.value}>
                                    {c.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.categoryId && <p className="text-xs text-destructive">Categoria é obrigatória.</p>}
                </div>
                
                {/* Descrição */}
                <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm">Descrição</Label>
                    <Input
                        id="description"
                        placeholder="Descrição da transação"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="h-10 text-base"
                        maxLength={150}
                    />
                    <p className="text-xs text-muted-foreground text-right">{description.length}/150</p>
                </div>
            </TabsContent>

            {/* CONTEÚDO ABA "VINCULADO" */}
            <TabsContent value="vinculado" className="mt-4 flex-1 overflow-y-auto pr-1 space-y-4 animate-slide-in-right">
                
                {/* Transferência */}
                {isTransfer && (
                    <div className={cn("glass-card p-4 space-y-3 border-l-4 shadow-md", `border-${OPERATION_CONFIG.transferencia.tailwindColor}`)}>
                        <h5 className={cn("font-semibold text-base flex items-center gap-2", OPERATION_CONFIG.transferencia.colorClass)}><ArrowLeftRight className="w-4 h-4" /> Transferência</h5>
                        <FloatingSelectWithIcon
                            label="Conta Destino"
                            Icon={Building2}
                            colorClass={errors.destinationAccountId ? 'text-destructive' : OPERATION_CONFIG.transferencia.colorClass}
                            value={destinationAccountId || ''}
                            onValueChange={(v) => {
                                setDestinationAccountId(v);
                                setErrors(p => ({ ...p, destinationAccountId: false }));
                            }}
                            options={destinationAccountOptions}
                            placeholder="Selecione a conta destino"
                            error={errors.destinationAccountId}
                        />
                    </div>
                )}
                
                {/* Fluxo de Investimento */}
                {isInvestmentFlow && (
                    <div className={cn("glass-card p-4 space-y-3 border-l-4 shadow-md", `border-${OPERATION_CONFIG.aplicacao.tailwindColor}`)}>
                        <h5 className={cn("font-semibold text-base flex items-center gap-2", OPERATION_CONFIG.aplicacao.colorClass)}><TrendingUp className="w-4 h-4" /> {operationType === 'aplicacao' ? 'Aplicação' : 'Resgate'}</h5>
                        <FloatingSelectWithIcon
                            label="Conta de Investimento"
                            Icon={PiggyBank}
                            colorClass={errors.tempInvestmentId ? 'text-destructive' : OPERATION_CONFIG.aplicacao.colorClass}
                            value={tempInvestmentId || ''}
                            onValueChange={(v) => {
                                setTempInvestmentId(v);
                                setErrors(p => ({ ...p, tempInvestmentId: false }));
                            }}
                            options={investmentOptions}
                            placeholder="Selecione o investimento"
                            error={errors.tempInvestmentId}
                        />
                    </div>
                )}
                
                {/* Pagamento Empréstimo */}
                {isLoanPayment && (
                    <div className={cn("glass-card p-4 space-y-3 border-l-4 shadow-md", `border-${OPERATION_CONFIG.pagamento_emprestimo.tailwindColor}`)}>
                        <h5 className={cn("font-semibold text-base flex items-center gap-2", OPERATION_CONFIG.pagamento_emprestimo.colorClass)}><CreditCard className="w-4 h-4" /> Pagamento de Empréstimo</h5>
                        <div className="grid grid-cols-2 gap-4">
                            <FloatingSelectWithIcon
                                label="Contrato de Empréstimo"
                                Icon={Building2}
                                colorClass={errors.tempLoanId ? 'text-destructive' : OPERATION_CONFIG.pagamento_emprestimo.colorClass}
                                value={tempLoanId || ''}
                                onValueChange={(v) => {
                                    setTempLoanId(v);
                                    setTempParcelaId(null);
                                    setErrors(p => ({ ...p, tempLoanId: false, tempParcelaId: false }));
                                }}
                                options={loanOptions}
                                placeholder="Selecione o contrato"
                                error={errors.tempLoanId}
                            />
                            <FloatingSelectWithIcon
                                label="Parcela"
                                Icon={Calendar}
                                colorClass={errors.tempParcelaId ? 'text-destructive' : OPERATION_CONFIG.pagamento_emprestimo.colorClass}
                                value={tempParcelaId || ''}
                                onValueChange={(v) => {
                                    setTempParcelaId(v);
                                    setErrors(p => ({ ...p, tempParcelaId: false }));
                                }}
                                options={installmentOptions}
                                placeholder="Selecione a parcela"
                                disabled={!tempLoanId}
                                error={errors.tempParcelaId}
                            />
                        </div>
                    </div>
                )}
                
                {/* Pagamento Seguro */}
                {isInsurancePayment && (
                    <div className="glass-card p-4 space-y-3 border-l-4 border-blue-500 shadow-md">
                        <h5 className="font-semibold text-base text-blue-500 flex items-center gap-2"><Shield className="w-4 h-4" /> Pagamento de Seguro</h5>
                        <div className="grid grid-cols-2 gap-4">
                            <FloatingSelectWithIcon
                                label="Seguro"
                                Icon={Shield}
                                colorClass={errors.tempSeguroId ? 'text-destructive' : 'text-blue-500'}
                                value={tempSeguroId || ''}
                                onValueChange={(v) => {
                                    setTempSeguroId(v);
                                    setTempSeguroParcelaId(null);
                                    setErrors(p => ({ ...p, tempSeguroId: false, tempSeguroParcelaId: false }));
                                }}
                                options={seguroOptions}
                                placeholder="Selecione o seguro"
                                error={errors.tempSeguroId}
                            />
                            <FloatingSelectWithIcon
                                label="Parcela"
                                Icon={Calendar}
                                colorClass={errors.tempSeguroParcelaId ? 'text-destructive' : 'text-blue-500'}
                                value={tempSeguroParcelaId || ''}
                                onValueChange={(v) => {
                                    setTempSeguroParcelaId(v);
                                    setErrors(p => ({ ...p, tempSeguroParcelaId: false }));
                                }}
                                options={seguroParcelaOptions}
                                placeholder="Selecione a parcela"
                                disabled={!tempSeguroId}
                                error={errors.tempSeguroParcelaId}
                            />
                        </div>
                    </div>
                )}
                
                {/* Liberação Empréstimo */}
                {isLoanLiberation && (
                    <div className={cn("glass-card p-4 space-y-3 border-l-4 shadow-md", `border-${OPERATION_CONFIG.liberacao_emprestimo.tailwindColor}`)}>
                        <h5 className={cn("font-semibold text-base flex items-center gap-2", OPERATION_CONFIG.liberacao_emprestimo.colorClass)}><DollarSign className="w-4 h-4" /> Liberação de Empréstimo</h5>
                        <FloatingInputWithIcon
                            id="numeroContrato"
                            label="Número do Contrato"
                            Icon={StickyNote}
                            colorClass={errors.tempNumeroContrato ? 'text-destructive' : OPERATION_CONFIG.liberacao_emprestimo.colorClass}
                            placeholder="Ex: Contrato 12345"
                            value={tempNumeroContrato}
                            onChange={(e) => {
                                setTempNumeroContrato(e.target.value);
                                setErrors(p => ({ ...p, tempNumeroContrato: false }));
                            }}
                            error={errors.tempNumeroContrato}
                        />
                    </div>
                )}
                
                {/* Veículo */}
                {isVehicle && (
                    <div className={cn("glass-card p-4 space-y-3 border-l-4 shadow-md", `border-${OPERATION_CONFIG.veiculo.tailwindColor}`)}>
                        <h5 className={cn("font-semibold text-base flex items-center gap-2", OPERATION_CONFIG.veiculo.colorClass)}><Car className="w-4 h-4" /> Operação de Veículo</h5>
                        <div className="grid grid-cols-2 gap-4">
                            <FloatingSelectWithIcon
                                label="Operação"
                                Icon={RefreshCw}
                                colorClass={errors.tempVehicleOperation ? 'text-destructive' : OPERATION_CONFIG.veiculo.colorClass}
                                value={tempVehicleOperation || ''}
                                onValueChange={(v) => {
                                    setTempVehicleOperation(v as 'compra' | 'venda');
                                    setErrors(p => ({ ...p, tempVehicleOperation: false }));
                                }}
                                options={[
                                    { value: 'compra', label: 'Compra (Saída)', icon: ChevronLeft, color: 'text-destructive' },
                                    { value: 'venda', label: 'Venda (Entrada)', icon: ChevronRight, color: 'text-success' },
                                ]}
                                placeholder="Compra/Venda"
                                error={errors.tempVehicleOperation}
                            />
                            <FloatingSelectWithIcon
                                label="Tipo de Veículo"
                                Icon={Car}
                                colorClass={OPERATION_CONFIG.veiculo.colorClass}
                                value={tempTipoVeiculo}
                                onValueChange={(v) => setTempTipoVeiculo(v as 'carro' | 'moto' | 'caminhao')}
                                options={[
                                    { value: 'carro', label: 'Carro' },
                                    { value: 'moto', label: 'Moto' },
                                    { value: 'caminhao', label: 'Caminhão' },
                                ]}
                                placeholder="Tipo"
                            />
                        </div>
                    </div>
                )}
                
                {/* Mensagem se não houver vínculo selecionado */}
                {!isTransfer && !isInvestmentFlow && !isFinancingFlow && !isVehicle && !isInsurancePayment && (
                    <div className="text-center p-8 text-muted-foreground">
                        <Info className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-sm">Selecione um tipo de operação que requer vínculo (Transferência, Investimento, Empréstimo, Veículo ou Pagamento de Seguro) para preencher esta seção.</p>
                    </div>
                )}
            </TabsContent>
          </Tabs>
        </form>

        {/* SEÇÃO 4: FOOTER COM AÇÕES */}
        <DialogFooter className="p-6 pt-0 flex justify-end gap-2 shrink-0 border-t border-border/50">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            style={{ backgroundColor: headerBaseColor }}
            className="hover:opacity-90 transition-all duration-300"
          >
            {isEditing ? "Salvar Alterações" : "Registrar"}
          </Button>
        </DialogFooter>
      </ResizableDialogContent>
    </Dialog>
  );
}