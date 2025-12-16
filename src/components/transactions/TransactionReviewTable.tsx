import { useMemo, useState, useCallback, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pin, ArrowLeftRight, TrendingUp, TrendingDown, AlertCircle, Check, PiggyBank, CreditCard, Car, Info } from "lucide-react";
import { ContaCorrente, Categoria, ImportedTransaction, OperationType, CATEGORY_NATURE_LABELS } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { EditableCell } from "../EditableCell";

// Interface simplificada para Empréstimo
interface LoanInfo {
  id: string;
  institution: string;
  numeroContrato?: string;
}

// Interface simplificada para Investimento
interface InvestmentInfo {
  id: string;
  name: string;
}

interface TransactionReviewTableProps {
  transactions: ImportedTransaction[];
  accounts: ContaCorrente[];
  categories: Categoria[];
  investments: InvestmentInfo[]; // NEW PROP
  loans: LoanInfo[]; // NEW PROP
  onUpdateTransaction: (id: string, updates: Partial<ImportedTransaction>) => void;
  onCreateRule: (transaction: ImportedTransaction) => void;
}

const OPERATION_OPTIONS: { value: OperationType; label: string; color: string }[] = [
  { value: 'receita', label: 'Receita', color: 'text-success' },
  { value: 'despesa', label: 'Despesa', color: 'text-destructive' },
  { value: 'transferencia', label: 'Transferência', color: 'text-primary' },
  { value: 'aplicacao', label: 'Aplicação', color: 'text-purple-500' },
  { value: 'resgate', label: 'Resgate', color: 'text-amber-500' },
  { value: 'pagamento_emprestimo', label: 'Pag. Empréstimo', color: 'text-orange-500' },
  { value: 'liberacao_emprestimo', label: 'Liberação Empréstimo', color: 'text-emerald-500' },
  { value: 'veiculo', label: 'Veículo', color: 'text-blue-500' },
  { value: 'rendimento', label: 'Rendimento', color: 'text-teal-500' },
];

const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// Define column keys and initial widths (in pixels)
const COLUMN_KEYS = ['date', 'amount', 'originalDescription', 'operationType', 'vinculo', 'category', 'description', 'rule'] as const;
type ColumnKey = typeof COLUMN_KEYS[number];

const INITIAL_WIDTHS: Record<ColumnKey, number> = {
  date: 80,
  amount: 100,
  originalDescription: 250,
  operationType: 150,
  vinculo: 200,
  category: 200,
  description: 250,
  rule: 80,
};

const columnHeaders: { key: ColumnKey, label: string, align?: 'center' | 'right' }[] = [
  { key: 'date', label: 'Data' },
  { key: 'amount', label: 'Valor', align: 'right' },
  { key: 'originalDescription', label: 'Descrição Original' },
  { key: 'operationType', label: 'Tipo Operação' },
  { key: 'vinculo', label: 'Vínculo / Contraparte' },
  { key: 'category', label: 'Categoria' },
  { key: 'description', label: 'Descrição Final' },
  { key: 'rule', label: 'Regra', align: 'center' },
];

const STORAGE_KEY = 'review_table_column_widths';

export function TransactionReviewTable({
  transactions,
  accounts,
  categories,
  investments, // USED
  loans, // USED
  onUpdateTransaction,
  onCreateRule,
}: TransactionReviewTableProps) {
  
  // --- Column Resizing State and Logic ---
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_WIDTHS;
    } catch {
      return INITIAL_WIDTHS;
    }
  });
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columnWidths));
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
    }

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
  
  const categoriesMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const accountsMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  
  const getCategoryOptions = (operationType: OperationType | null) => {
    if (!operationType || operationType === 'transferencia' || operationType === 'initial_balance') return categories;
    
    const isIncome = operationType === 'receita' || operationType === 'rendimento' || operationType === 'liberacao_emprestimo';
    
    return categories.filter(c => 
      (isIncome && c.nature === 'receita') || 
      (!isIncome && c.nature !== 'receita')
    );
  };
  
  const availableDestinationAccounts = useMemo(() => 
    accounts.filter(a => !a.hidden), 
    [accounts]
  );
  
  const investmentAccounts = useMemo(() => investments, [investments]);
  const activeLoans = useMemo(() => loans.filter(l => !l.id.includes('pending')), [loans]);

  // Função para renderizar o seletor de Vínculo/Contraparte
  const renderVincularSelector = (tx: ImportedTransaction) => {
    const opType = tx.operationType;
    
    // 1. Transferência (Conta Destino)
    if (opType === 'transferencia') {
      const destinationOptions = availableDestinationAccounts.filter(a => a.id !== tx.accountId);
      return (
        <Select
          value={tx.destinationAccountId || ''}
          onValueChange={(v) => onUpdateTransaction(tx.id, { destinationAccountId: v })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Conta Destino..." />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {destinationOptions.map(a => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    // 2. Aplicação / Resgate (Conta de Investimento)
    if (opType === 'aplicacao' || opType === 'resgate') {
      return (
        <Select
          value={tx.tempInvestmentId || ''}
          onValueChange={(v) => onUpdateTransaction(tx.id, { tempInvestmentId: v })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Conta Investimento..." />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {investmentAccounts.map(i => (
              <SelectItem key={i.id} value={i.id}>
                <span className="flex items-center gap-2">
                    <PiggyBank className="w-3 h-3 text-purple-500" />
                    {i.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    // 3. Pagamento Empréstimo (Contrato de Empréstimo)
    if (opType === 'pagamento_emprestimo') {
      return (
        <Select
          value={tx.tempLoanId || ''}
          onValueChange={(v) => onUpdateTransaction(tx.id, { tempLoanId: v })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Contrato..." />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {activeLoans.map(l => (
              <SelectItem key={l.id} value={l.id}>
                <span className="flex items-center gap-2">
                    <CreditCard className="w-3 h-3 text-orange-500" />
                    {l.institution}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    // 4. Veículo (Compra/Venda)
    if (opType === 'veiculo') {
      return (
        <Select
          value={tx.tempVehicleOperation || ''}
          onValueChange={(v) => onUpdateTransaction(tx.id, { tempVehicleOperation: v as 'compra' | 'venda' })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Operação..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="compra">
                <span className="flex items-center gap-2 text-destructive">
                    <Car className="w-3 h-3" /> Compra (Saída)
                </span>
            </SelectItem>
            <SelectItem value="venda">
                <span className="flex items-center gap-2 text-success">
                    <Car className="w-3 h-3" /> Venda (Entrada)
                </span>
            </SelectItem>
          </SelectContent>
        </Select>
      );
    }
    
    // 5. Liberação Empréstimo (Apenas indicador)
    if (opType === 'liberacao_emprestimo') {
        return (
            <Badge variant="outline" className="text-[10px] px-1 py-0 border-emerald-500 text-emerald-500">
                <Info className="w-3 h-3 mr-1" /> Config. Posterior
            </Badge>
        );
    }

    return <span className="text-muted-foreground text-xs">—</span>;
  };
  
  // Função para determinar se a categoria deve ser desabilitada
  const isCategoryDisabled = (tx: ImportedTransaction): boolean => {
    const opType = tx.operationType;
    if (!opType) return true;
    
    // Desabilita se for uma operação de vínculo
    return opType === 'transferencia' || 
           opType === 'aplicacao' || 
           opType === 'resgate' || 
           opType === 'pagamento_emprestimo' ||
           opType === 'liberacao_emprestimo' ||
           opType === 'veiculo';
  };

  return (
    <div className="overflow-x-auto">
      <Table style={{ minWidth: `${totalWidth}px` }}>
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow className="border-border hover:bg-transparent h-9">
            {columnHeaders.map((header) => (
              <TableHead 
                key={header.key} 
                className={cn(
                  "text-muted-foreground text-xs p-2 relative",
                  header.align === 'center' && 'text-center',
                  header.align === 'right' && 'text-right'
                )}
                style={{ width: columnWidths[header.key] }}
              >
                {header.label}
                {/* Resizer Handle */}
                {header.key !== 'rule' && (
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
          {transactions.map((tx) => {
            const isIncome = tx.operationType === 'receita' || tx.operationType === 'rendimento' || tx.operationType === 'liberacao_emprestimo' || (tx.operationType === 'veiculo' && tx.amount > 0);
            const currentCategory = tx.categoryId ? categoriesMap.get(tx.categoryId) : null;
            
            const isVincularComplete = 
                (tx.operationType === 'transferencia' && !!tx.destinationAccountId) ||
                ((tx.operationType === 'aplicacao' || tx.operationType === 'resgate') && !!tx.tempInvestmentId) ||
                (tx.operationType === 'pagamento_emprestimo' && !!tx.tempLoanId) ||
                (tx.operationType === 'veiculo' && !!tx.tempVehicleOperation) ||
                (!isCategoryDisabled(tx) && !!tx.categoryId) ||
                tx.operationType === 'liberacao_emprestimo';
            
            const isCategorized = isVincularComplete;
            
            return (
              <TableRow 
                key={tx.id} 
                className={cn(
                  "border-border hover:bg-muted/30 transition-colors h-10",
                  !isCategorized && "bg-warning/5 hover:bg-warning/10"
                )}
              >
                <TableCell className="text-muted-foreground text-xs whitespace-nowrap p-2" style={{ width: columnWidths.date }}>
                  {parseDateLocal(tx.date).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className={cn(
                  "font-medium whitespace-nowrap text-sm p-2 text-right",
                  isIncome ? "text-success" : "text-destructive"
                )} style={{ width: columnWidths.amount }}>
                  {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                </TableCell>
                <TableCell className="text-xs max-w-[250px] truncate p-2" title={tx.originalDescription} style={{ width: columnWidths.originalDescription }}>
                  {tx.originalDescription}
                </TableCell>
                
                {/* Tipo Operação */}
                <TableCell className="p-2" style={{ width: columnWidths.operationType }}>
                  <Select
                    value={tx.operationType || ''}
                    onValueChange={(v) => onUpdateTransaction(tx.id, { 
                        operationType: v as OperationType, 
                        isTransfer: v === 'transferencia',
                        categoryId: null,
                        destinationAccountId: null,
                        tempInvestmentId: null,
                        tempLoanId: null,
                        tempVehicleOperation: null,
                    })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATION_OPTIONS.map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          <span className={cn("flex items-center gap-2 text-sm", op.color)}>
                            {op.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                
                {/* Vínculo / Contraparte (Dinâmico) */}
                <TableCell className="p-2" style={{ width: columnWidths.vinculo }}>
                  {renderVincularSelector(tx)}
                </TableCell>
                
                {/* Categoria */}
                <TableCell className="p-2" style={{ width: columnWidths.category }}>
                  <Select
                    value={tx.categoryId || ''}
                    onValueChange={(v) => onUpdateTransaction(tx.id, { categoryId: v })}
                    disabled={isCategoryDisabled(tx)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {getCategoryOptions(tx.operationType).map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="text-sm">
                            {cat.icon} {cat.label} ({CATEGORY_NATURE_LABELS[cat.nature]})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                
                {/* Descrição Final */}
                <TableCell className="p-2" style={{ width: columnWidths.description }}>
                  <EditableCell
                    value={tx.description}
                    type="text"
                    onSave={(v) => onUpdateTransaction(tx.id, { description: String(v) })}
                    className="text-xs h-7"
                  />
                </TableCell>
                
                {/* Ações / Regra */}
                <TableCell className="text-center p-2" style={{ width: columnWidths.rule }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={() => onCreateRule(tx)}
                    disabled={!isCategorized}
                    title="Criar regra de padronização"
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                Nenhuma transação para revisar.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}