import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Wallet, PiggyBank, TrendingUp, Shield, Target, Bitcoin, CreditCard, ArrowLeftRight, Car, DollarSign, Plus, Minus, RefreshCw, Coins, TrendingDown, Tags, ChevronRight, ChevronLeft, CheckCircle2, Calendar, StickyNote, Info, Check, ArrowRight } from "lucide-react";
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

// --- Componentes Auxiliares para o Novo Design ---

interface FormInputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    Icon: React.ElementType;
    error?: boolean;
    helperText?: string;
}

const FormInputGroup = ({ label, Icon, error, helperText, ...props }: FormInputGroupProps) => (
    <div className="space-y-1">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
            <Icon className="w-3 h-3" /> {label}
        </Label>
        <div className="relative group">
            <Input 
                {...props}
                className={cn(
                    "h-12 pl-10 text-base font-medium border-2 border-border rounded-xl hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
                    props.type === 'text' && "text-base",
                    props.type === 'date' && "text-base",
                    props.type === 'number' && "text-lg font-semibold text-right",
                    props.inputMode === 'decimal' && "text-lg font-semibold text-right",
                    error && "border-destructive focus:border-destructive focus:ring-destructive/20"
                )}
                placeholder={props.placeholder || "Preencha aqui"}
            />
            <DollarSign className={cn(
                "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors",
                error && "group-focus-within:text-destructive"
            )} />
        </div>
        {helperText && <p className="text-xs text-muted-foreground mt-1">{helperText}</p>}
    </div>
);

interface FormSelectGroupProps {
    label: string;
    Icon: React.ElementType;
    value: string;
    onValueChange: (value: string) => void;
    options: { value: string; label: string; icon?: React.ElementType; color?: string; subLabel?: string }[];
    placeholder: string;
    error?: boolean;
    disabled?: boolean;
    renderCustomValue?: (value: string) => React.ReactNode;
}

const FormSelectGroup = ({ label, Icon, value, onValueChange, options, placeholder, error, disabled, renderCustomValue }: FormSelectGroupProps) => (
    <div className="space-y-1">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
            <Icon className="w-3 h-3" /> {label}
        </Label>
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger 
                className={cn(
                    "h-12 border-2 border-border rounded-xl hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
                    error && "border-destructive focus:border-destructive focus:ring-destructive/20"
                )}
            >
                {renderCustomValue && value ? (
                    renderCustomValue(value)
                ) : (
                    <SelectValue placeholder={placeholder} />
                )}
            </SelectTrigger>
            <SelectContent className="max-h-60">
                {options.map(opt => {
                    const OptIcon = opt.icon;
                    return (
                        <SelectItem key={opt.value} value={opt.value}>
                            <span className={cn("flex items-center gap-2 text-sm", opt.color)}>
                                {OptIcon && <OptIcon className="w-4 h-4" />}
                                {opt.label}
                                {opt.subLabel && <span className="text-xs text-muted-foreground ml-2">({opt.subLabel})</span>}
                            </span>
                        </SelectItem>
                    );
                })}
            </SelectContent>
        </Select>
    </div>
);

// --- Componente Principal ---

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
      label: a.name,
      icon: Wallet,
      color: 'text-primary',
      subLabel: ACCOUNT_TYPE_LABELS[a.accountType],
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
      label: a.name,
      icon: Building2,
      color: 'text-primary',
      subLabel: ACCOUNT_TYPE_LABELS[a.accountType],
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
      label: `P${p.numero} - ${formatCurrency(p.valor)}`,
      icon: Calendar,
      color: 'text-orange-500',
      subLabel: parseDateLocal(p.vencimento).toLocaleDateString("pt-BR"),
  }));
  
  const seguroOptions = availableSeguros.map(s => ({
      value: String(s.id),
      label: `${s.numeroApolice} (${s.seguradora})`,
      icon: Shield,
      color: 'text-blue-500',
  }));
  
  const seguroParcelaOptions = availableSeguroParcelas.map(p => ({
      value: String(p.numero),
      label: `P${p.numero} - ${formatCurrency(p.valor)}`,
      icon: Calendar,
      color: 'text-blue-500',
      subLabel: parseDateLocal(p.vencimento).toLocaleDateString("pt-BR"),
  }));
  
  const categoryOptions = availableCategories.map(c => ({
      value: c.id,
      label: `${c.icon} ${c.label}`,
      icon: Tags,
      color: c.nature === 'receita' ? 'text-success' : 'text-destructive',
      subLabel: c.nature === 'receita' ? 'Receita' : c.nature === 'despesa_fixa' ? 'Fixa' : 'Variável',
  }));
  
  // Custom render for Account Select
  const renderAccountValue = useCallback((id: string) => {
    const account = accounts.find(a => a.id === id);
    if (!account) return null;
    const Icon = Wallet;
    return (
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left truncate">
                <div className="font-medium text-sm">{account.name}</div>
                <div className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[account.accountType]}</div>
            </div>
        </div>
    );
  }, [accounts]);
  
  // Custom render for Operation Type Select
  const renderOperationValue = useCallback((op: string) => {
    const config = OPERATION_CONFIG[op as OperationType];
    if (!config) return null;
    const Icon = config.icon;
    return (
        <div className="flex items-center gap-3">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", config.colorClass.replace('text-', 'bg-') + '/10')}>
                <Icon className={cn("w-4 h-4", config.colorClass)} />
            </div>
            <div className="text-left">
                <div className="font-medium text-sm">{config.label}</div>
            </div>
        </div>
    );
  }, []);
  
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
        {/* SEÇÃO 1: CABEÇALHO COM IDENTIDADE VISUAL */}
        <DialogHeader className="p-6 pb-4 shrink-0 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-semibold">
                {isEditing ? "Editar Transação" : "Nova Movimentação"}
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground ml-11">
            {isEditing ? "Atualize os detalhes da transação." : "Registre uma nova transação financeira."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
          
          {/* SEÇÃO 2: DETALHES ESSENCIAIS (GRID 2x2) */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Conta */}
                <FormSelectGroup
                    label="Conta"
                    Icon={Wallet}
                    value={accountId}
                    onValueChange={(v) => {
                        setAccountId(v);
                        setErrors(p => ({ ...p, accountId: false }));
                    }}
                    options={accountOptions}
                    placeholder="Selecione a conta"
                    disabled={isEditing}
                    error={errors.accountId}
                    renderCustomValue={renderAccountValue}
                />
                
                {/* 2. Data */}
                <FormInputGroup
                    id="date"
                    label="Data"
                    Icon={Calendar}
                    type="date"
                    value={date}
                    onChange={(e) => {
                        setDate(e.target.value);
                        setErrors(p => ({ ...p, date: false }));
                    }}
                    error={errors.date}
                />
                
                {/* 3. Tipo Operação */}
                <FormSelectGroup
                    label="Tipo Operação"
                    Icon={HeaderIcon}
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
                    renderCustomValue={renderOperationValue}
                />
                
                {/* 4. Valor */}
                <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                        <DollarSign className="w-3 h-3" /> Valor (R$)
                    </Label>
                    <div className="relative group">
                        <DollarSign className={cn(
                            "absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors",
                            errors.amount && "group-focus-within:text-destructive"
                        )} />
                        <Input
                            id="amount"
                            type="text"
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => {
                                handleAmountChange(e.target.value);
                                setErrors(p => ({ ...p, amount: false }));
                            }}
                            disabled={!!isAmountAutoFilled}
                            placeholder="0,00"
                            className={cn(
                                "h-14 pl-10 pr-4 text-2xl font-bold text-right border-2 border-border rounded-xl hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
                                errors.amount && "border-destructive focus:border-destructive focus:ring-destructive/20"
                            )}
                        />
                        {/* Botões de atalho (Exemplo) */}
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setAmount('100')}
                            >
                                +100
                            </Button>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setAmount('1000')}
                            >
                                +1k
                            </Button>
                        </div>
                    </div>
                    {errors.amount && <p className="text-xs text-destructive mt-1">Valor é obrigatório e deve ser maior que zero.</p>}
                </div>
            </div>
          </div>
          
          {/* SEÇÃO 3: SISTEMA DE ABAS MODERNO */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="p-1 bg-muted/50 rounded-xl flex gap-1 shrink-0">
                <TabsTrigger value="simples" className="flex-1 py-2 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground font-medium shadow-sm hover:bg-card/80 transition-all">
                    <Tags className="w-4 h-4 mr-2" /> Classificação Simples
                </TabsTrigger>
                <TabsTrigger 
                    value="vinculado" 
                    className={cn(
                        "flex-1 py-2 px-4 rounded-lg font-medium shadow-sm transition-all",
                        !isVinculoRequired ? "opacity-50 cursor-not-allowed text-muted-foreground" : "data-[state=active]:bg-card data-[state=active]:text-foreground hover:bg-card/80",
                    )}
                    disabled={!isVinculoRequired}
                >
                    <ArrowLeftRight className="w-4 h-4 mr-2" /> Vínculo / Contraparte
                </TabsTrigger>
            </div>

            {/* CONTEÚDO ABA "SIMPLES" */}
            <TabsContent value="simples" className="mt-4 flex-1 overflow-y-auto pr-1 space-y-6 animate-slide-in-left">
                {/* Categoria Selector */}
                <div className="space-y-2">
                    <Label htmlFor="categoryId" className="text-xs font-medium text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                        <Tags className="w-3 h-3" /> Categoria {isCategorizable || isInsurancePayment ? '*' : ''}
                    </Label>
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
                        <SelectTrigger className={cn("h-12 text-base border-2 rounded-xl", errors.categoryId && "border-destructive")}>
                            <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                            {categoryOptions.map(c => (
                                <SelectItem key={c.value} value={c.value}>
                                    {c.label} <span className="text-xs text-muted-foreground ml-2">({c.subLabel})</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.categoryId && <p className="text-xs text-destructive mt-1">Categoria é obrigatória.</p>}
                </div>
                
                {/* Descrição */}
                <div className="space-y-2">
                    <Label htmlFor="description" className="text-xs font-medium text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                        <StickyNote className="w-3 h-3" /> Descrição
                    </Label>
                    <Input
                        id="description"
                        placeholder="Ex: Supermercado mensal"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="h-12 text-base border-2 rounded-xl"
                        maxLength={150}
                    />
                    <p className="text-xs text-muted-foreground text-right">{description.length}/150</p>
                </div>
            </TabsContent>

            {/* CONTEÚDO ABA "VINCULADO" */}
            <TabsContent value="vinculado" className="mt-4 flex-1 overflow-y-auto pr-1 space-y-6 animate-slide-in-right">
                
                {/* Transferência */}
                {isTransfer && (
                    <div className={cn("glass-card p-4 space-y-3 border-l-4 shadow-md hover-lift", `border-${OPERATION_CONFIG.transferencia.tailwindColor}`)}>
                        <h5 className={cn("font-semibold text-base flex items-center gap-2", OPERATION_CONFIG.transferencia.colorClass)}><ArrowLeftRight className="w-4 h-4" /> Transferência entre contas</h5>
                        <FormSelectGroup
                            label="Conta Destino"
                            Icon={Building2}
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
                    <div className={cn("glass-card p-4 space-y-3 border-l-4 shadow-md hover-lift", `border-${OPERATION_CONFIG.aplicacao.tailwindColor}`)}>
                        <h5 className={cn("font-semibold text-base flex items-center gap-2", OPERATION_CONFIG.aplicacao.colorClass)}><TrendingUp className="w-4 h-4" /> {operationType === 'aplicacao' ? 'Aplicação' : 'Resgate'}</h5>
                        <FormSelectGroup
                            label="Conta de Investimento"
                            Icon={PiggyBank}
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
                    <div className={cn("glass-card p-4 space-y-3 border-l-4 shadow-md hover-lift", `border-${OPERATION_CONFIG.pagamento_emprestimo.tailwindColor}`)}>
                        <h5 className={cn("font-semibold text-base flex items-center gap-2", OPERATION_CONFIG.pagamento_emprestimo.colorClass)}><CreditCard className="w-4 h-4" /> Pagamento de Empréstimo</h5>
                        <div className="grid grid-cols-2 gap-4">
                            <FormSelectGroup
                                label="Contrato"
                                Icon={Building2}
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
                            <FormSelectGroup
                                label="Parcela"
                                Icon={Calendar}
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
                    <div className="glass-card p-4 space-y-3 border-l-4 border-blue-500 shadow-md hover-lift">
                        <h5 className="font-semibold text-base text-blue-500 flex items-center gap-2"><Shield className="w-4 h-4" /> Pagamento de Seguro</h5>
                        <div className="grid grid-cols-2 gap-4">
                            <FormSelectGroup
                                label="Seguro"
                                Icon={Shield}
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
                            <FormSelectGroup
                                label="Parcela"
                                Icon={Calendar}
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
                    <div className={cn("glass-card p-4 space-y-3 border-l-4 shadow-md hover-lift", `border-${OPERATION_CONFIG.liberacao_emprestimo.tailwindColor}`)}>
                        <h5 className={cn("font-semibold text-base flex items-center gap-2", OPERATION_CONFIG.liberacao_emprestimo.colorClass)}><DollarSign className="w-4 h-4" /> Liberação de Empréstimo</h5>
                        <FormInputGroup
                            id="numeroContrato"
                            label="Número do Contrato"
                            Icon={StickyNote}
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
                    <div className={cn("glass-card p-4 space-y-3 border-l-4 shadow-md hover-lift", `border-${OPERATION_CONFIG.veiculo.tailwindColor}`)}>
                        <h5 className={cn("font-semibold text-base flex items-center gap-2", OPERATION_CONFIG.veiculo.colorClass)}><Car className="w-4 h-4" /> Operação de Veículo</h5>
                        <div className="grid grid-cols-2 gap-4">
                            <FormSelectGroup
                                label="Operação"
                                Icon={RefreshCw}
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
                            <FormSelectGroup
                                label="Tipo de Veículo"
                                Icon={Car}
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
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-12 px-6 text-base">
            Cancelar
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            style={{ backgroundColor: headerBaseColor }}
            className="h-12 px-8 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all"
          >
            <Check className="w-5 h-5 mr-2" />
            {isEditing ? "Salvar Alterações" : "Registrar"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </DialogFooter>
      </ResizableDialogContent>
    </Dialog>
  );
}