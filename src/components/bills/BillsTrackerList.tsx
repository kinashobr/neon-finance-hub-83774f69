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
import { Plus, Trash2, Check, Clock, AlertTriangle, DollarSign, Building2, Shield, Repeat, Info, X, TrendingDown } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillTracker, BillSourceType, formatCurrency, CATEGORY_NATURE_LABELS } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { EditableCell } from "../EditableCell";

interface BillsTrackerListProps {
  bills: BillTracker[];
  onUpdateBill: (id: string, updates: Partial<BillTracker>) => void;
  onDeleteBill: (id: string) => void;
  onAddBill: (bill: Omit<BillTracker, "id" | "isPaid">) => void;
  onTogglePaid: (bill: BillTracker, isChecked: boolean) => void;
  currentDate: Date;
}

const SOURCE_CONFIG: Record<BillSourceType, { icon: React.ElementType; color: string; label: string }> = {
  loan_installment: { icon: Building2, color: 'text-orange-500', label: 'Empréstimo' },
  insurance_installment: { icon: Shield, color: 'text-blue-500', label: 'Seguro' },
  fixed_expense: { icon: Repeat, color: 'text-purple-500', label: 'Fixa' },
  variable_expense: { icon: DollarSign, color: 'text-warning', label: 'Variável' },
  ad_hoc: { icon: Info, color: 'text-primary', label: 'Avulsa' },
};

// Define column keys and initial widths (in pixels)
// ADICIONANDO 'category'
const COLUMN_KEYS = ['pay', 'due', 'paymentDate', 'description', 'account', 'type', 'category', 'amount', 'actions'] as const;
type ColumnKey = typeof COLUMN_KEYS[number];

const INITIAL_WIDTHS: Record<ColumnKey, number> = {
  pay: 40,
  due: 80,
  paymentDate: 80,
  description: 180, // Reduzido para dar espaço à categoria
  account: 112,
  type: 64,
  category: 150, // NOVO
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
  { key: 'category', label: 'Categoria' }, // NOVO
  { key: 'amount', label: 'Valor', align: 'right' },
  { key: 'actions', label: 'Ações', align: 'center' },
];

export function BillsTrackerList({
  bills,
  onUpdateBill,
  onDeleteBill,
  onAddBill,
  onTogglePaid,
  currentDate,
}: BillsTrackerListProps) {
  const { categoriasV2, contasMovimento } = useFinance();
  
  const [newBillData, setNewBillData] = useState({
    description: '',
    amount: '',
    dueDate: format(currentDate, 'yyyy-MM-dd'),
  });
  
  const [adHocType, setAdHocType] = useState<'fixed_expense' | 'variable_expense'>('variable_expense');

  // --- Column Resizing State and Logic ---
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
    const newWidth = Math.max(30, startWidth + deltaX); // Minimum width of 30px

    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: newWidth,
    }));
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
    };

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [resizingColumn, handleMouseMove, handleMouseUp]);
  
  const totalWidth = useMemo(() => {
    return Object.values(columnWidths).reduce((sum, w) => sum + w, 0);
  }, [columnWidths]);
  // ---------------------------------------------

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
    
    const suggestedCategoryId = categoriasV2.find(c => 
        (adHocType === 'fixed_expense' && c.nature === 'despesa_fixa') ||
        (adHocType === 'variable_expense' && c.nature === 'despesa_variavel')
    )?.id;

    onAddBill({
      description: newBillData.description,
      dueDate: newBillData.dueDate,
      expectedAmount: amount,
      sourceType: adHocType,
      suggestedAccountId: contasMovimento.find(c => c.accountType === 'corrente')?.id,
      suggestedCategoryId: suggestedCategoryId,
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
    // Apenas permite alteração se for uma conta avulsa ou fixa genérica
    if (bill.sourceType === 'ad_hoc' || bill.sourceType === 'fixed_expense' || bill.sourceType === 'variable_expense') {
        onUpdateBill(bill.id, { suggestedCategoryId: newCategoryId });
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
    const filtered = bills.filter(b => !b.isExcluded);
    
    const pending = filtered.filter(b => !b.isPaid);
    const paid = filtered.filter(b => b.isPaid);
    
    pending.sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
    paid.sort((a, b) => parseDateLocal(b.paymentDate || b.dueDate).getTime() - parseDateLocal(a.paymentDate || a.dueDate).getTime());
    
    return [...pending, ...paid];
  }, [bills]);
  
  const totalPending = sortedBills.filter(b => !b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0);

  const formatDate = (dateStr: string) => {
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
      {/* Adição Rápida (Ad-Hoc) - SEMPRE VISÍVEL E MINIMALISTA */}
      <div className="glass-card p-3 shrink-0">
        <div className="grid grid-cols-[1fr_100px_100px_40px] gap-2 items-end mb-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Descrição</Label>
            <Input
              value={newBillData.description}
              onChange={(e) => setNewBillData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Conta avulsa"
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={newBillData.amount}
              onChange={(e) => setNewBillData(prev => ({ ...prev, amount: formatAmount(e.target.value) }))}
              placeholder="0,00"
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vencimento</Label>
            <Input
              type="date"
              value={newBillData.dueDate}
              onChange={(e) => setNewBillData(prev => ({ ...prev, dueDate: e.target.value }))}
              className="h-7 text-xs"
            />
          </div>
          <Button 
            onClick={handleAddAdHocBill} 
            className="h-7 w-full text-xs p-0"
            disabled={!newBillData.description || parseAmount(newBillData.amount) <= 0 || !newBillData.dueDate}
            title="Adicionar conta avulsa"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Seleção de Tipo para Ad-Hoc */}
        <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Tipo de Despesa:</Label>
            <Button
                variant={adHocType === 'fixed_expense' ? "default" : "outline"}
                size="sm"
                className="h-6 text-xs px-2 gap-1"
                onClick={() => setAdHocType('fixed_expense')}
            >
                <Repeat className="w-3 h-3" /> Fixa
            </Button>
            <Button
                variant={adHocType === 'variable_expense' ? "default" : "outline"}
                size="sm"
                className="h-6 text-xs px-2 gap-1"
                onClick={() => setAdHocType('variable_expense')}
            >
                <TrendingDown className="w-3 h-3" /> Variável
            </Button>
        </div>
      </div>

      {/* Tabela de Contas (Consolidada) */}
      <div className="glass-card p-3 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <h3 className="text-sm font-semibold text-foreground">Contas do Mês ({sortedBills.length})</h3>
          <Badge variant="destructive" className="text-xs">
            Pendentes: {formatCurrency(totalPending)}
          </Badge>
        </div>
        
        <div className="rounded-lg border border-border overflow-y-auto flex-1 min-h-[100px]">
          <Table style={{ minWidth: `${totalWidth}px` }}>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="border-border hover:bg-transparent h-10">
                {columnHeaders.map((header) => (
                  <TableHead 
                    key={header.key} 
                    className={cn(
                      "text-muted-foreground p-2 text-sm relative",
                      header.align === 'center' && 'text-center',
                      header.align === 'right' && 'text-right'
                    )}
                    style={{ width: columnWidths[header.key] }}
                  >
                    {header.label}
                    {/* Resizer Handle - Ocupa toda a altura do cabeçalho */}
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
                const config = SOURCE_CONFIG[bill.sourceType] || SOURCE_CONFIG.ad_hoc;
                const Icon = config.icon;
                const dueDate = parseDateLocal(bill.dueDate);
                const isOverdue = dueDate < currentDate && !bill.isPaid;
                const isPaid = bill.isPaid;
                
                // Apenas contas ad-hoc, fixed_expense ou variable_expense podem ter valor alterado
                const isAmountEditable = bill.sourceType !== 'loan_installment' && bill.sourceType !== 'insurance_installment';
                
                // A data de vencimento pode ser alterada se não estiver paga (para qualquer tipo de conta)
                const isDateEditable = !isPaid;
                
                // A categoria é editável apenas para contas avulsas/fixas genéricas e se não estiver paga
                const isCategoryEditable = isAmountEditable && !isPaid;
                
                const currentCategory = expenseCategories.find(c => c.id === bill.suggestedCategoryId);
                
                return (
                  <TableRow 
                    key={bill.id} 
                    className={cn(
                      "hover:bg-muted/30 transition-colors h-12",
                      isOverdue && "bg-destructive/5 hover:bg-destructive/10",
                      isPaid && "bg-success/5 hover:bg-success/10 border-l-4 border-success/50"
                    )}
                  >
                    <TableCell className="text-center p-2 text-base" style={{ width: columnWidths.pay }}>
                      <Checkbox
                        checked={isPaid}
                        onCheckedChange={(checked) => onTogglePaid(bill, checked as boolean)}
                        className={cn("w-5 h-5", isPaid && "border-success data-[state=checked]:bg-success")}
                      />
                    </TableCell>
                    
                    <TableCell className={cn("font-medium whitespace-nowrap text-base p-2", isOverdue && "text-destructive")} style={{ width: columnWidths.due }}>
                      <div className="flex items-center gap-1">
                        {isOverdue && <AlertTriangle className="w-4 h-4 text-destructive" />}
                        
                        {isDateEditable ? (
                            <EditableCell
                                value={bill.dueDate}
                                type="date"
                                onSave={(v) => handleUpdateDueDate(bill, String(v))}
                                className={cn("text-base", isOverdue && "text-destructive")}
                            />
                        ) : (
                            <span className="text-base">
                                {formatDate(bill.dueDate)}
                            </span>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Payment Date Cell */}
                    <TableCell className="font-medium whitespace-nowrap text-base p-2" style={{ width: columnWidths.paymentDate }}>
                        {isPaid && bill.paymentDate ? (
                            <EditableCell
                                value={bill.paymentDate}
                                type="date"
                                onSave={(v) => handleUpdatePaymentDate(bill, String(v))}
                                className="text-base text-success"
                            />
                        ) : (
                            <span className="text-muted-foreground">—</span>
                        )}
                    </TableCell>
                    
                    <TableCell className="text-base max-w-[200px] truncate p-2" style={{ width: columnWidths.description }}>
                      {bill.description}
                    </TableCell>
                    
                    <TableCell className="text-base p-2" style={{ width: columnWidths.account }}>
                      <Select 
                        value={bill.suggestedAccountId || ''} 
                        onValueChange={(v) => handleUpdateSuggestedAccount(bill, v)}
                        disabled={isPaid}
                      >
                        <SelectTrigger className="h-9 text-base p-2 w-full">
                          <SelectValue placeholder="Conta..." />
                        </SelectTrigger>
                        <SelectContent>
                          {accountOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-base">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    
                    <TableCell className="p-2 text-base" style={{ width: columnWidths.type }}>
                      <Badge variant="outline" className={cn("gap-1 text-sm px-2 py-0.5", config.color)}>
                        <Icon className="w-4 h-4" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    
                    {/* NOVO: Categoria Cell */}
                    <TableCell className="p-2 text-base" style={{ width: columnWidths.category }}>
                        <Select 
                            value={bill.suggestedCategoryId || ''} 
                            onValueChange={(v) => handleUpdateSuggestedCategory(bill, v)}
                            disabled={!isCategoryEditable}
                        >
                            <SelectTrigger className="h-9 text-base p-2 w-full">
                                <SelectValue placeholder={currentCategory?.label || "Selecione..."} />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                                {expenseCategories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id} className="text-base">
                                        {cat.icon} {cat.label} ({CATEGORY_NATURE_LABELS[cat.nature]})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </TableCell>
                    
                    <TableCell className={cn("text-right font-semibold whitespace-nowrap p-2", isPaid ? "text-success" : "text-destructive")} style={{ width: columnWidths.amount }}>
                      {isAmountEditable && !isPaid ? (
                        <EditableCell 
                          value={bill.expectedAmount} 
                          type="currency" 
                          onSave={(v) => handleUpdateExpectedAmount(bill, Number(v))}
                          className={cn("text-right text-base", isPaid ? "text-success" : "text-destructive")}
                        />
                      ) : (
                        <span className="text-base">{formatCurrency(bill.expectedAmount)}</span>
                      )}
                    </TableCell>
                    
                    <TableCell className="text-center p-2 text-base" style={{ width: columnWidths.actions }}>
                      {isAmountEditable && !isPaid && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleExcludeBill(bill)}
                          title="Excluir da lista deste mês"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      {isPaid && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => toast.info(`Transação ID: ${bill.transactionId}`)}
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {sortedBills.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    <Check className="w-6 h-6 mx-auto mb-2 text-success" />
                    Nenhuma conta pendente ou paga neste mês.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}