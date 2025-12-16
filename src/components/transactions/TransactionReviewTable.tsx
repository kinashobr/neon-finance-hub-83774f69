import { useMemo } from "react";
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
import { Pin, ArrowLeftRight, TrendingUp, TrendingDown, AlertCircle, Check } from "lucide-react";
import { ContaCorrente, Categoria, ImportedTransaction, OperationType, CATEGORY_NATURE_LABELS } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { EditableCell } from "../EditableCell";

interface TransactionReviewTableProps {
  transactions: ImportedTransaction[];
  accounts: ContaCorrente[];
  categories: Categoria[];
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

export function TransactionReviewTable({
  transactions,
  accounts,
  categories,
  onUpdateTransaction,
  onCreateRule,
}: TransactionReviewTableProps) {
  
  const categoriesMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const accountsMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  
  const getCategoryOptions = (operationType: OperationType | null) => {
    if (!operationType || operationType === 'transferencia' || operationType === 'initial_balance') return categories;
    
    const isIncome = operationType === 'receita' || operationType === 'rendimento' || operationType === 'liberacao_emprestimo' || (operationType === 'veiculo' && operationType === 'venda');
    
    return categories.filter(c => 
      (isIncome && c.nature === 'receita') || 
      (!isIncome && c.nature !== 'receita')
    );
  };
  
  const availableDestinationAccounts = useMemo(() => 
    accounts.filter(a => !a.hidden), 
    [accounts]
  );

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1200px]">
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground w-[80px]">Data</TableHead>
            <TableHead className="text-muted-foreground w-[100px]">Valor</TableHead>
            <TableHead className="text-muted-foreground w-[250px]">Descrição Original</TableHead>
            <TableHead className="text-muted-foreground w-[180px]">Tipo Operação</TableHead>
            <TableHead className="text-muted-foreground w-[200px]">Categoria</TableHead>
            <TableHead className="text-muted-foreground w-[200px]">Conta Destino</TableHead>
            <TableHead className="text-muted-foreground w-[150px]">Descrição Final</TableHead>
            <TableHead className="text-muted-foreground w-[80px] text-center">Regra</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const isTransfer = tx.operationType === 'transferencia';
            const isIncome = tx.operationType === 'receita' || tx.operationType === 'rendimento' || tx.operationType === 'liberacao_emprestimo';
            const currentCategory = tx.categoryId ? categoriesMap.get(tx.categoryId) : null;
            const isCategorized = !!tx.categoryId && tx.operationType !== null;
            
            return (
              <TableRow 
                key={tx.id} 
                className={cn(
                  "border-border hover:bg-muted/30 transition-colors",
                  !isCategorized && "bg-warning/5 hover:bg-warning/10"
                )}
              >
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {parseDateLocal(tx.date).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className={cn(
                  "font-medium whitespace-nowrap text-sm",
                  isIncome ? "text-success" : "text-destructive"
                )}>
                  {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                </TableCell>
                <TableCell className="text-sm max-w-[250px] truncate" title={tx.originalDescription}>
                  {tx.originalDescription}
                </TableCell>
                
                {/* Tipo Operação */}
                <TableCell>
                  <Select
                    value={tx.operationType || ''}
                    onValueChange={(v) => onUpdateTransaction(tx.id, { operationType: v as OperationType, isTransfer: v === 'transferencia' })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATION_OPTIONS.map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          <span className={cn("flex items-center gap-2", op.color)}>
                            {op.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                
                {/* Categoria */}
                <TableCell>
                  <Select
                    value={tx.categoryId || ''}
                    onValueChange={(v) => onUpdateTransaction(tx.id, { categoryId: v })}
                    disabled={isTransfer}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {getCategoryOptions(tx.operationType).map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.label} ({CATEGORY_NATURE_LABELS[cat.nature]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                
                {/* Conta Destino (Apenas para Transferência) */}
                <TableCell>
                  {isTransfer ? (
                    <Select
                      value={tx.destinationAccountId || ''}
                      onValueChange={(v) => onUpdateTransaction(tx.id, { destinationAccountId: v })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Conta Destino..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {availableDestinationAccounts
                          .filter(a => a.id !== tx.accountId)
                          .map(a => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                
                {/* Descrição Final */}
                <TableCell>
                  <EditableCell
                    value={tx.description}
                    type="text"
                    onSave={(v) => onUpdateTransaction(tx.id, { description: String(v) })}
                    className="text-sm"
                  />
                </TableCell>
                
                {/* Ações / Regra */}
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => onCreateRule(tx)}
                    disabled={!isCategorized}
                    title="Criar regra de padronização"
                  >
                    <Pin className="w-4 h-4" />
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