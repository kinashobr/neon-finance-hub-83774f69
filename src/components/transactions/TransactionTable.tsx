import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  TrendingUp, TrendingDown, ArrowLeftRight, PiggyBank, Wallet, CreditCard,
  MoreVertical, Pencil, Trash2, Link2, CheckCircle2, XCircle, Paperclip, Eye
} from "lucide-react";
import { TransacaoCompleta, OperationType, formatCurrency, ContaCorrente, Categoria } from "@/types/finance";
import { cn } from "@/lib/utils";

interface TransactionTableProps {
  transactions: TransacaoCompleta[];
  accounts: ContaCorrente[];
  categories: Categoria[];
  onEdit: (transaction: TransacaoCompleta) => void;
  onDelete: (id: string) => void;
  onToggleConciliated: (id: string, value: boolean) => void;
  onViewAttachments?: (transaction: TransacaoCompleta) => void;
  selectedIds?: string[];
  onSelectChange?: (ids: string[]) => void;
}

const OPERATION_ICONS: Record<OperationType, typeof TrendingUp> = {
  receita: TrendingUp,
  despesa: TrendingDown,
  transferencia: ArrowLeftRight,
  aplicacao: PiggyBank,
  resgate: Wallet,
  pagamento_emprestimo: CreditCard,
};

const OPERATION_COLORS: Record<OperationType, string> = {
  receita: 'bg-success/20 text-success',
  despesa: 'bg-destructive/20 text-destructive',
  transferencia: 'bg-primary/20 text-primary',
  aplicacao: 'bg-purple-500/20 text-purple-500',
  resgate: 'bg-amber-500/20 text-amber-500',
  pagamento_emprestimo: 'bg-orange-500/20 text-orange-500',
};

const OPERATION_LABELS: Record<OperationType, string> = {
  receita: 'Receita',
  despesa: 'Despesa',
  transferencia: 'Transferência',
  aplicacao: 'Aplicação',
  resgate: 'Resgate',
  pagamento_emprestimo: 'Pag. Empréstimo',
};

export function TransactionTable({
  transactions,
  accounts,
  categories,
  onEdit,
  onDelete,
  onToggleConciliated,
  onViewAttachments,
  selectedIds = [],
  onSelectChange
}: TransactionTableProps) {
  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || id;
  const getCategoryLabel = (id: string | null) => {
    if (!id) return '-';
    const cat = categories.find(c => c.id === id);
    return cat ? `${cat.icon || ''} ${cat.label}` : id;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const hasLinks = (t: TransacaoCompleta) => 
    t.links.investmentId || t.links.loanId || t.links.transferGroupId;

  const handleSelectAll = (checked: boolean) => {
    if (onSelectChange) {
      onSelectChange(checked ? transactions.map(t => t.id) : []);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (onSelectChange) {
      if (checked) {
        onSelectChange([...selectedIds, id]);
      } else {
        onSelectChange(selectedIds.filter(i => i !== id));
      }
    }
  };

  const allSelected = transactions.length > 0 && selectedIds.length === transactions.length;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            {onSelectChange && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            <TableHead className="text-muted-foreground">Data</TableHead>
            <TableHead className="text-muted-foreground">Descrição</TableHead>
            <TableHead className="text-muted-foreground">Conta</TableHead>
            <TableHead className="text-muted-foreground">Categoria</TableHead>
            <TableHead className="text-muted-foreground">Valor</TableHead>
            <TableHead className="text-muted-foreground">Tipo</TableHead>
            <TableHead className="text-muted-foreground">Vínculos</TableHead>
            <TableHead className="text-muted-foreground text-center">Conciliado</TableHead>
            <TableHead className="text-muted-foreground w-16">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            const Icon = OPERATION_ICONS[transaction.operationType];
            const isSelected = selectedIds.includes(transaction.id);

            return (
              <TableRow 
                key={transaction.id} 
                className={cn(
                  "border-border hover:bg-muted/30 transition-colors",
                  isSelected && "bg-primary/5"
                )}
              >
                {onSelectChange && (
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectOne(transaction.id, !!checked)}
                    />
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatDate(transaction.date)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {transaction.description}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {getAccountName(transaction.accountId)}
                </TableCell>
                <TableCell>
                  {getCategoryLabel(transaction.categoryId)}
                </TableCell>
                <TableCell className={cn(
                  "font-medium whitespace-nowrap",
                  transaction.flow === 'in' || transaction.flow === 'transfer_in' 
                    ? "text-success" 
                    : "text-destructive"
                )}>
                  {transaction.flow === 'in' || transaction.flow === 'transfer_in' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </TableCell>
                <TableCell>
                  <Badge className={cn("gap-1 text-xs", OPERATION_COLORS[transaction.operationType])}>
                    <Icon className="w-3 h-3" />
                    {OPERATION_LABELS[transaction.operationType]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <div className="flex items-center gap-1">
                      {transaction.links.investmentId && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs px-1">
                              <PiggyBank className="w-3 h-3" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Vinculado a Investimento</TooltipContent>
                        </Tooltip>
                      )}
                      {transaction.links.loanId && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs px-1">
                              <CreditCard className="w-3 h-3" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Vinculado a Empréstimo</TooltipContent>
                        </Tooltip>
                      )}
                      {transaction.links.transferGroupId && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs px-1">
                              <ArrowLeftRight className="w-3 h-3" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Transferência</TooltipContent>
                        </Tooltip>
                      )}
                      {transaction.attachments.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => onViewAttachments?.(transaction)}
                            >
                              <Paperclip className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver anexos ({transaction.attachments.length})</TooltipContent>
                        </Tooltip>
                      )}
                      {!hasLinks(transaction) && transaction.attachments.length === 0 && (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onToggleConciliated(transaction.id, !transaction.conciliated)}
                  >
                    {transaction.conciliated ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(transaction)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {transaction.attachments.length > 0 && onViewAttachments && (
                        <DropdownMenuItem onClick={() => onViewAttachments(transaction)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Comprovante
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => onDelete(transaction.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
          {transactions.length === 0 && (
            <TableRow>
              <TableCell 
                colSpan={onSelectChange ? 10 : 9} 
                className="text-center py-10 text-muted-foreground"
              >
                Nenhuma transação encontrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
