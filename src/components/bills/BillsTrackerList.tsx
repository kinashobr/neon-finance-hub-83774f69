import { useState, useMemo, useCallback, useEffect } from "react";
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
import { Plus, Trash2, Check, Clock, AlertTriangle, DollarSign, Building2, Shield, Repeat, Info, X, TrendingDown, CheckCircle2, ShoppingCart, Calendar, Wallet, Tags, MoreVertical } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillTracker, BillSourceType, formatCurrency, CATEGORY_NATURE_LABELS, BillDisplayItem, ExternalPaidBill } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { EditableCell } from "../EditableCell";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface BillsTrackerListProps {
  bills: BillDisplayItem[];
  onUpdateBill: (id: string, updates: Partial<BillTracker>) => void;
  onDeleteBill: (id: string) => void;
  onAddBill: (bill: Omit<BillTracker, "id" | "isPaid" | "type">) => void;
  onTogglePaid: (bill: BillTracker, isChecked: boolean) => void;
  currentDate: Date;
}

const SOURCE_CONFIG: Record<BillSourceType | 'external_expense', { icon: React.ElementType; color: string; label: string }> = {
  loan_installment: { icon: Building2, color: 'text-orange-500', label: 'Empréstimo' },
  insurance_installment: { icon: Shield, color: 'text-blue-500', label: 'Seguro' },
  fixed_expense: { icon: Repeat, color: 'text-purple-500', label: 'Fixa' },
  variable_expense: { icon: DollarSign, color: 'text-warning', label: 'Variável' },
  ad_hoc: { icon: Info, color: 'text-primary', label: 'Avulsa' },
  purchase_installment: { icon: ShoppingCart, color: 'text-pink-500', label: 'Parcela' },
  external_expense: { icon: CheckCircle2, color: 'text-success', label: 'Extrato' },
};

const COLUMN_KEYS = ['pay', 'due', 'paymentDate', 'description', 'account', 'type', 'category', 'amount', 'actions'] as const;
type ColumnKey = typeof COLUMN_KEYS[number];

const INITIAL_WIDTHS: Record<ColumnKey, number> = {
  pay: 40,
  due: 80,
  paymentDate: 80,
  description: 180,
  account: 112,
  type: 64,
  category: 150,
  amount: 80,
  actions: 40,
};

const columnHeaders: { key: ColumnKey, label: string, align?: 'center' | 'right' }[] = [
  { key: 'pay', label: 'Pagar', align: 'center' },
  { key: 'due', label: 'Vencimento' },
  { key: 'paymentDate', label: 'Data Pgto' },
  { key: 'description', label: 'Descrição' },
  { key: 'account', label: 'Conta Pgto' },
  { key: 'type', label: 'Tipo' },
  { key: 'category', label: 'Categoria' },
  { key: 'amount', label: 'Valor', align: 'right' },
  { key: 'actions', label: 'Ações', align: 'center' },
];

const isBillTracker = (bill: BillDisplayItem): bill is BillTracker => bill.type === 'tracker';
const isExternalPaidBill = (bill: BillDisplayItem): bill is ExternalPaidBill => bill.type === 'external_paid';

export function BillsTrackerList({
  bills,
  onUpdateBill,
  onDeleteBill,
  onAddBill,
  onTogglePaid,
  currentDate,
}: BillsTrackerListProps) {
  const { categoriasV2, contasMovimento, setBillsTracker } = useFinance();
  
  const [newBillData, setNewBillData] = useState({
    description: '',
    amount: '',
    dueDate: format(currentDate, 'yyyy-MM-dd'),
  });

  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => {
    try {
      const saved = localStorage.getItem('bills_column_widths');
      return saved ? JSON.parse(saved) : INITIAL_WIDTHS;
    } catch {
      return INITIAL_WIDTHS;
    }
  });
  
  useEffect(() => {
    localStorage.setItem('bills_column_widths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  const [resizingColumn, setResizingColumn] = useState<ColumnKey | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const handleMouseDown = (e: React.MouseEvent, key: ColumnKey) => {
    e.preventDefault();
    setResizingColumn(key);
    setStartX(e.clientX);
    setStartWidth(columnWidths[key]);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn) return;
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(30, startWidth + deltaX);
    setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
  }, [resizingColumn, startX, startWidth]);

  const handleMouseUp = useCallback(() => {
    setResizingColumn(null);
  }, []);

  useEffect(() => {
    if (resizingColumn) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [resizingColumn, handleMouseMove, handleMouseUp]);
  
  const totalWidth = useMemo(() => Object.values(columnWidths).reduce((sum, w) => sum + w, 0), [columnWidths]);

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
      suggestedAccountId: contasMovimento.find(c => c.accountType === 'corrente')?.id,
      suggestedCategoryId: null,
    });
    setNewBillData({ description: '', amount: '', dueDate: format(currentDate, 'yyyy-MM-dd') });
    toast.success("Conta avulsa adicionada!");
  };
  
  const handleExcludeBill = (bill: BillTracker) => {
    if (bill.sourceType === 'loan_installment' || bill.sourceType === 'insurance_installment') {
        toast.error("Não é possível excluir parcelas de empréstimo ou seguro.");
        return;
    }
    if (bill.isPaid) {
        toast.error("Desmarque o pagamento antes de excluir.");
        return;
    }
    onUpdateBill(bill.id, { isExcluded: true });
    toast.info(`Conta "${bill.description}" excluída da lista deste mês.`);
  };

  const handleDeletePurchaseGroup = (sourceRef: string) => {
    setBillsTracker(prev => prev.filter(b => b.sourceRef !== sourceRef || b.isPaid));
    toast.success("Parcelas futuras da compra removidas!");
  };
  
  const handleUpdateExpectedAmount = (bill: BillTracker, newAmount: number) => {
    if (bill.sourceType === 'loan_installment' || bill.sourceType === 'insurance_installment') {
        toast.error("Valor de parcelas fixas deve ser alterado no cadastro do Empréstimo/Seguro.");
        return;
    }
    onUpdateBill(bill.id, { expectedAmount: newAmount });
    toast.success("Valor atualizado!");
  };
  
  const handleUpdateSuggestedAccount = (bill: BillTracker, newAccountId: string) => {
    onUpdateBill(bill.id, { suggestedAccountId: newAccountId });
    toast.success("Conta de pagamento sugerida atualizada!");
  };
  
  const handleUpdateSuggestedCategory = (bill: BillTracker, newCategoryId: string) => {
    if (bill.sourceType === 'ad_hoc' || bill.sourceType === 'fixed_expense' || bill.sourceType === 'variable_expense' || bill.sourceType === 'purchase_installment') {
        const selectedCategory = categoriasV2.find(c => c.id === newCategoryId);
        let newSourceType: BillSourceType = bill.sourceType;
        if (selectedCategory && bill.sourceType !== 'purchase_installment') {
            if (selectedCategory.nature === 'despesa_fixa') {
                newSourceType = 'fixed_expense';
            } else if (selectedCategory.nature === 'despesa_variavel') {
                newSourceType = 'variable_expense';
            }
        }
        onUpdateBill(bill.id, { suggestedCategoryId: newCategoryId, sourceType: newSourceType });
        toast.success("Categoria atualizada!");
    } else {
        toast.error("A categoria para parcelas fixas é definida automaticamente.");
    }
  };
  
  const handleUpdateDueDate = (bill: BillTracker, newDateStr: string) => {
    if (bill.isPaid) {
        toast.error("Não é possível alterar a data de vencimento de contas já pagas.");
        return;
    }
    onUpdateBill(bill.id, { dueDate: newDateStr });
    toast.success("Data de vencimento atualizada!");
  };
  
  const handleUpdatePaymentDate = (bill: BillTracker, newDateStr: string) => {
    if (!bill.isPaid) {
        toast.error("A conta deve estar paga para alterar a data de pagamento.");
        return;
    }
    onUpdateBill(bill.id, { paymentDate: newDateStr });
    toast.success("Data de pagamento atualizada!");
  };

  const sortedBills = useMemo(() => {
    const trackerBills = bills.filter(isBillTracker).filter(b => !b.isExcluded);
    const externalBills = bills.filter(isExternalPaidBill);
    const pending = trackerBills.filter(b => !b.isPaid);
    const paidTracker = trackerBills.filter(b => b.isPaid);
    const allPaid: BillDisplayItem[] = [...paidTracker, ...externalBills];
    pending.sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
    allPaid.sort((a, b) => parseDateLocal(b.paymentDate || b.dueDate).getTime() - parseDateLocal(a.paymentDate || a.dueDate).getTime());
    return [...pending, ...allPaid];
  }, [bills]);
  
  const totalPending = useMemo(() => {
    const creditCardAccountIds = new Set(contasMovimento.filter(c => c.accountType === 'cartao_credito').map(c => c.id));
    return sortedBills.reduce((acc, b) => {
        const isCC = b.suggestedAccountId && creditCardAccountIds.has(b.suggestedAccountId);
        if (!b.isPaid || isCC) {
            return acc + b.expectedAmount;
        }
        return acc;
    }, 0);
  }, [sortedBills, contasMovimento]);

  const formatDateLabel = (dateStr: string) => {
    const date = parseDateLocal(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };
  
  const availableAccounts = useMemo(() => 
    contasMovimento.filter(c => c.accountType === 'corrente' || c.accountType === 'cartao_credito'),
    [contasMovimento]
  );
  
  const accountOptions = useMemo(() => 
    availableAccounts.map(a => ({ value: a.id, label: a.name })),
    [availableAccounts]
  );
  
  const expenseCategories = useMemo(() => 
    categoriasV2.filter(c => c.nature === 'despesa_fixa' || c.nature === 'despesa_variavel'),
    [categoriasV2]
  );

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Adição Rápida - Grid Adaptável */}
      <div className="glass-card p-3 shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px_40px] gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-[10px] md:text-xs text-muted-foreground">Descrição</Label>
            <Input
              value={newBillData.description}
              onChange={(e) => setNewBillData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Conta avulsa"
              className="h-8 text-xs md:text-sm rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 sm:contents gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] md:text-xs text-muted-foreground">Valor (R$)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={newBillData.amount}
                onChange={(e) => setNewBillData(prev => ({ ...prev, amount: formatAmount(e.target.value) }))}
                placeholder="0,00"
                className="h-8 text-xs md:text-sm rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] md:text-xs text-muted-foreground">Vencimento</Label>
              <Input
                type="date"
                value={newBillData.dueDate}
                onChange={(e) => setNewBillData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="h-8 text-xs md:text-sm rounded-lg"
              />
            </div>
          </div>
          <Button 
            onClick={handleAddAdHocBill} 
            className="h-8 w-full p-0 rounded-lg sm:w-10"
            disabled={!newBillData.description || parseAmount(newBillData.amount) <= 0 || !newBillData.dueDate}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Container da Lista com Switcher de Visualização */}
      <div className="glass-card p-2 md:p-3 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex items-center justify-between mb-3 shrink-0 px-1">
          <h3 className="text-xs md:text-sm font-semibold text-foreground flex items-center gap-2">
            Contas do Mês
            <Badge variant="outline" className="text-[10px] px-1.5 h-4">
              {sortedBills.length}
            </Badge>
          </h3>
          <Badge variant="destructive" className="text-[10px] md:text-xs px-2 py-0.5 font-bold">
            Total: {formatCurrency(totalPending)}
          </Badge>
        </div>
        
        {/* VISUALIZAÇÃO EM TABELA (Oculta no Mobile) */}
        <div className="hidden lg:block rounded-lg border border-border overflow-y-auto flex-1 min-h-[100px] pb-12 scrollbar-thin">
          <Table style={{ minWidth: `${totalWidth}px` }}>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="border-border hover:bg-transparent h-10">
                {columnHeaders.map((header) => (
                  <TableHead 
                    key={header.key} 
                    className={cn(
                      "text-muted-foreground p-2 text-xs relative",
                      header.align === 'center' && 'text-center',
                      header.align === 'right' && 'text-right'
                    )}
                    style={{ width: columnWidths[header.key] }}
                  >
                    {header.label}
                    {header.key !== 'actions' && (
                      <div
                        className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                        onMouseDown={(e) => handleMouseDown(e, header.key)}
                      />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBills.map((bill) => {
                const isExternalPaid = isExternalPaidBill(bill);
                const config = SOURCE_CONFIG[bill.sourceType] || SOURCE_CONFIG.ad_hoc;
                const Icon = config.icon;
                const dueDate = parseDateLocal(bill.dueDate);
                const isOverdue = dueDate < currentDate && !bill.isPaid;
                const isPaid = bill.isPaid;
                const isAmountEditable = isBillTracker(bill) && bill.sourceType !== 'loan_installment' && bill.sourceType !== 'insurance_installment';
                const isDateEditable = isBillTracker(bill) && !isPaid;
                const isCategoryEditable = isBillTracker(bill) && (bill.sourceType === 'ad_hoc' || bill.sourceType === 'fixed_expense' || bill.sourceType === 'variable_expense' || bill.sourceType === 'purchase_installment') && !isPaid;
                const currentCategory = expenseCategories.find(c => c.id === bill.suggestedCategoryId);
                
                return (
                  <TableRow 
                    key={bill.id} 
                    className={cn(
                      "hover:bg-muted/30 transition-colors h-12",
                      isExternalPaid && "bg-muted/10 text-muted-foreground/80",
                      isOverdue && "bg-destructive/5 hover:bg-destructive/10",
                      isPaid && !isExternalPaid && "bg-success/5 hover:bg-success/10 border-l-4 border-success/50"
                    )}
                  >
                    <TableCell className="text-center p-2" style={{ width: columnWidths.pay }}>
                      {isExternalPaid ? (
                        <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                      ) : (
                        <Checkbox
                          checked={isPaid}
                          onCheckedChange={(checked) => onTogglePaid(bill as BillTracker, checked as boolean)}
                          className={cn("w-4 h-4", isPaid && "border-success data-[state=checked]:bg-success")}
                        />
                      )}
                    </TableCell>
                    
                    <TableCell className={cn("font-medium whitespace-nowrap text-xs p-2", isOverdue && "text-destructive")} style={{ width: columnWidths.due }}>
                      <div className="flex items-center gap-1">
                        {isOverdue && <AlertTriangle className="w-3 h-3 text-destructive" />}
                        {isDateEditable ? (
                            <EditableCell
                                value={bill.dueDate}
                                type="date"
                                onSave={(v) => handleUpdateDueDate(bill as BillTracker, String(v))}
                                className={cn("text-xs", isOverdue && "text-destructive")}
                            />
                        ) : (
                            <span className={cn("text-xs", isExternalPaid && "text-muted-foreground")}>
                                {formatDateLabel(bill.dueDate)}
                            </span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="font-medium whitespace-nowrap text-xs p-2" style={{ width: columnWidths.paymentDate }}>
                        {isPaid && bill.paymentDate ? (
                            isExternalPaid ? (
                                <span className="text-xs text-muted-foreground">{formatDateLabel(bill.paymentDate)}</span>
                            ) : (
                                <EditableCell
                                    value={bill.paymentDate}
                                    type="date"
                                    onSave={(v) => handleUpdatePaymentDate(bill as BillTracker, String(v))}
                                    className="text-xs text-success"
                                />
                            )
                        ) : (
                            <span className="text-muted-foreground">—</span>
                        )}
                    </TableCell>
                    
                    <TableCell className="text-xs max-w-[200px] truncate p-2" style={{ width: columnWidths.description }}>
                      {bill.description}
                    </TableCell>
                    
                    <TableCell className="text-xs p-2" style={{ width: columnWidths.account }}>
                      {isExternalPaid ? (
                        <span className="text-[10px] text-muted-foreground">
                          {contasMovimento.find(a => a.id === bill.suggestedAccountId)?.name || 'N/A'}
                        </span>
                      ) : (
                        <Select 
                          value={bill.suggestedAccountId || ''} 
                          onValueChange={(v) => handleUpdateSuggestedAccount(bill as BillTracker, v)}
                          disabled={isPaid}
                        >
                          <SelectTrigger className="h-7 text-[10px] p-1.5 w-full">
                            <SelectValue placeholder="Conta..." />
                          </SelectTrigger>
                          <SelectContent>
                            {accountOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    
                    <TableCell className="p-2 text-xs" style={{ width: columnWidths.type }}>
                      <Badge variant="outline" className={cn("gap-1 text-[10px] px-1.5 py-0", config.color)}>
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="p-2 text-xs" style={{ width: columnWidths.category }}>
                        {isExternalPaid ? (
                            <span className="text-[10px] text-muted-foreground">
                                {currentCategory?.icon} {currentCategory?.label || 'N/A'}
                            </span>
                        ) : (
                            <Select 
                                value={bill.suggestedCategoryId || ''} 
                                onValueChange={(v) => handleUpdateSuggestedCategory(bill as BillTracker, v)}
                                disabled={!isCategoryEditable}
                            >
                                <SelectTrigger className="h-7 text-[10px] p-1.5 w-full">
                                    <SelectValue placeholder={currentCategory?.label || "Selecione..."} />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {expenseCategories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id} className="text-xs">
                                            {cat.icon} {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </TableCell>
                    
                    <TableCell className={cn("text-right font-semibold whitespace-nowrap p-2", isPaid ? "text-success" : "text-destructive")} style={{ width: columnWidths.amount }}>
                      {isAmountEditable && !isPaid ? (
                        <EditableCell 
                          value={bill.expectedAmount} 
                          type="currency" 
                          onSave={(v) => handleUpdateExpectedAmount(bill as BillTracker, Number(v))}
                          className={cn("text-right text-xs", isPaid ? "text-success" : "text-destructive")}
                        />
                      ) : (
                        <span className={cn("text-xs", isExternalPaid && "text-muted-foreground")}>{formatCurrency(bill.expectedAmount)}</span>
                      )}
                    </TableCell>
                    
                    <TableCell className="text-center p-2" style={{ width: columnWidths.actions }}>
                      <div className="flex items-center justify-center gap-1">
                        {isExternalPaid ? (
                            <Badge variant="outline" className="p-0.5 border-success/30">
                                <CheckCircle2 className="w-3 h-3 text-success" />
                            </Badge>
                        ) : !isPaid && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleExcludeBill(bill as BillTracker)}>
                                <X className="w-3.5 h-3.5" />
                            </Button>
                            {bill.sourceType === 'purchase_installment' && bill.sourceRef && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeletePurchaseGroup(bill.sourceRef!)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            )}
                          </>
                        )}
                        {isPaid && !isExternalPaid && (
                            <Badge variant="outline" className="p-0.5 border-success/30">
                                <CheckCircle2 className="w-3 h-3 text-success" />
                            </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* VISUALIZAÇÃO EM CARDS (MOBILE/TABLET) */}
        <div className="lg:hidden flex-1 overflow-y-auto space-y-3 pb-20 scrollbar-thin">
          {sortedBills.map((bill) => {
            const isExternalPaid = isExternalPaidBill(bill);
            const config = SOURCE_CONFIG[bill.sourceType] || SOURCE_CONFIG.ad_hoc;
            const Icon = config.icon;
            const dueDate = parseDateLocal(bill.dueDate);
            const isOverdue = dueDate < currentDate && !bill.isPaid;
            const isPaid = bill.isPaid;
            const currentCategory = expenseCategories.find(c => c.id === bill.suggestedCategoryId);
            const account = contasMovimento.find(a => a.id === bill.suggestedAccountId);

            return (
              <div 
                key={bill.id}
                className={cn(
                  "p-3 rounded-xl border-2 transition-all relative",
                  isPaid ? "bg-success/5 border-success/20" : isOverdue ? "bg-destructive/5 border-destructive/20" : "bg-card border-border",
                  "flex flex-col gap-3"
                )}
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-2 rounded-lg bg-muted", config.color)}>
                            <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-sm text-foreground truncate">{bill.description}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={cn("text-[10px] font-medium uppercase tracking-tight", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                                    Vence: {formatDateLabel(bill.dueDate)}
                                </span>
                                {isPaid && bill.paymentDate && (
                                    <Badge variant="outline" className="text-[9px] h-4 bg-success/10 text-success border-success/20">
                                        Pago: {formatDateLabel(bill.paymentDate)}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                        <p className={cn("font-bold text-sm", isPaid ? "text-success" : "text-destructive")}>
                            {formatCurrency(bill.expectedAmount)}
                        </p>
                        {isExternalPaid && (
                            <Badge variant="secondary" className="text-[9px] h-4 mt-1">Extrato</Badge>
                        )}
                    </div>
                </div>

                {/* Grid de Informações Secundárias */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground overflow-hidden">
                        <Wallet className="w-3 h-3 shrink-0" />
                        <span className="truncate">{account?.name || 'Não definida'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground overflow-hidden">
                        <Tags className="w-3 h-3 shrink-0" />
                        <span className="truncate">{currentCategory?.icon} {currentCategory?.label || 'Outros'}</span>
                    </div>
                </div>

                {/* Rodapé de Ações - Mobile First */}
                <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="flex items-center gap-2">
                        {!isExternalPaid ? (
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id={`pay-${bill.id}`}
                                    checked={isPaid}
                                    onCheckedChange={(checked) => onTogglePaid(bill as BillTracker, checked as boolean)}
                                    className="w-6 h-6 border-2"
                                />
                                <Label htmlFor={`pay-${bill.id}`} className="text-xs font-semibold cursor-pointer">
                                    {isPaid ? 'PAGO' : 'PAGAR'}
                                </Label>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-success">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase">Confirmado</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        {!isPaid && !isExternalPaid && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground"
                                onClick={() => handleExcludeBill(bill as BillTracker)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-xs" onClick={() => toast.info(`ID: ${bill.id}`)}>
                                    <Info className="w-4 h-4 mr-2" /> Detalhes
                                </DropdownMenuItem>
                                {!isPaid && !isExternalPaid && bill.sourceType === 'purchase_installment' && (
                                    <DropdownMenuItem className="text-xs text-destructive" onClick={() => handleDeletePurchaseGroup(bill.sourceRef!)}>
                                        <Trash2 className="w-4 h-4 mr-2" /> Excluir Grupo
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
              </div>
            );
          })}
        </div>

        {bills.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground opacity-50">
            <Calendar className="w-12 h-12 mb-3 stroke-[1.5]" />
            <p className="text-sm font-medium">Nenhuma conta agendada para este mês.</p>
            <p className="text-xs">Use o formulário acima ou importe contas fixas.</p>
          </div>
        )}
      </div>
    </div>
  );
}