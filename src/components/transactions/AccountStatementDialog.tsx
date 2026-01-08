import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Building2, Calendar, TrendingUp, TrendingDown, 
  CheckCircle2, AlertTriangle, Download, RefreshCw, X
} from "lucide-react";
import { 
  ContaCorrente, TransacaoCompleta, Categoria, AccountSummary, 
  formatCurrency, ACCOUNT_TYPE_LABELS 
} from "@/types/finance";
import { TransactionTable } from "./TransactionTable";
import { cn, parseDateLocal } from "@/lib/utils";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";

interface AccountStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: ContaCorrente;
  accountSummary: AccountSummary;
  transactions: TransacaoCompleta[];
  categories: Categoria[];
  onEditTransaction: (transaction: TransacaoCompleta) => void;
  onDeleteTransaction: (id: string) => void;
  onToggleConciliated: (id: string, value: boolean) => void;
  onReconcileAll: () => void;
}

export function AccountStatementDialog({
  open,
  onOpenChange,
  account,
  accountSummary,
  transactions,
  categories,
  onEditTransaction,
  onDeleteTransaction,
  onToggleConciliated,
  onReconcileAll
}: AccountStatementDialogProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState(""); 

  // Filtrar transações por período
  const filteredTransactions = useMemo(() => {
    const fromDate = dateFrom ? startOfDay(parseDateLocal(dateFrom)) : undefined;
    const toDate = dateTo ? endOfDay(parseDateLocal(dateTo)) : undefined;

    return transactions
      .filter(t => {
        const transactionDate = parseDateLocal(t.date);
        
        const matchFrom = !fromDate || transactionDate >= fromDate;
        const matchTo = !toDate || transactionDate <= toDate;
        
        return matchFrom && matchTo;
      })
      .sort((a, b) => parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime());
  }, [transactions, dateFrom, dateTo]);

  // O resumo do período é fornecido pelo accountSummary (calculado em ReceitasDespesas.tsx)
  const periodSummary = useMemo(() => {
    const { initialBalance, currentBalance, totalIn, totalOut } = accountSummary;
    
    // Contagem de conciliação baseada nas transações filtradas (não no resumo do período)
    const conciliatedCount = filteredTransactions.filter(t => t.conciliated).length;
    const pendingCount = filteredTransactions.length - conciliatedCount;

    return {
      initialBalance,
      finalBalance: currentBalance,
      totalIn,
      totalOut,
      netChange: totalIn - totalOut,
      conciliatedCount,
      pendingCount,
    };
  }, [accountSummary, filteredTransactions]);

  const statusColor = periodSummary.pendingCount === 0 ? 'text-success' : 'text-warning';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(95vw,80rem)] h-[min(90vh,900px)] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-xl truncate">{account.name}</DialogTitle>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px] sm:text-xs">{ACCOUNT_TYPE_LABELS[account.accountType]}</Badge>
                  {account.institution && <span className="truncate">• {account.institution}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={onReconcileAll} className="h-8 text-xs sm:text-sm">
                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Conciliar Tudo</span>
                <span className="sm:hidden">Conciliar</span>
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm">
                <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Exportar</span>
                <span className="sm:hidden">Exp.</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Conteúdo rolável */}
        <ScrollArea className="flex-1 hide-scrollbar-mobile">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Resumo de Saldos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <Card className="glass-card">
                <CardContent className="p-3 sm:pt-4">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">Saldo Inicial</div>
                  <div className="text-sm sm:text-lg font-bold">{formatCurrency(periodSummary.initialBalance)}</div>
                </CardContent>
              </Card>
              
              <Card className="glass-card">
                <CardContent className="p-3 sm:pt-4">
                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-1">
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-success" />
                    Entradas
                  </div>
                  <div className="text-sm sm:text-lg font-bold text-success">
                    +{formatCurrency(periodSummary.totalIn)}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-3 sm:pt-4">
                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-1">
                    <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
                    Saídas
                  </div>
                  <div className="text-sm sm:text-lg font-bold text-destructive">
                    -{formatCurrency(periodSummary.totalOut)}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-2 border-primary/20">
                <CardContent className="p-3 sm:pt-4">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">Saldo Final</div>
                  <div className={cn(
                    "text-sm sm:text-lg font-bold",
                    periodSummary.finalBalance >= 0 ? "text-foreground" : "text-destructive"
                  )}>
                    {formatCurrency(periodSummary.finalBalance)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status de Conciliação */}
            <Card className="glass-card">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("flex items-center gap-2", statusColor)}>
                      {periodSummary.pendingCount === 0 ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                      <span className="font-medium text-sm">
                        {periodSummary.pendingCount === 0 
                          ? "Todas conciliadas" 
                          : `${periodSummary.pendingCount} pendentes`}
                      </span>
                    </div>
                    <Separator orientation="vertical" className="h-5" />
                    <span className="text-sm text-muted-foreground">
                      {periodSummary.conciliatedCount}/{transactions.length}
                    </span>
                  </div>

                  <Badge variant={periodSummary.netChange >= 0 ? "default" : "destructive"}>
                    {periodSummary.netChange >= 0 ? "+" : ""}{formatCurrency(periodSummary.netChange)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Filtro de Período */}
            <Card className="glass-card">
              <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  Período do Extrato
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">De:</span>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="flex-1 sm:w-[150px] h-8 sm:h-9 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Até:</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="flex-1 sm:w-[150px] h-8 sm:h-9 text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between sm:justify-start gap-2 sm:ml-auto">
                    {(dateFrom || dateTo) && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 text-xs sm:text-sm"
                        onClick={() => { setDateFrom(""); setDateTo(""); }}
                      >
                        Limpar
                      </Button>
                    )}
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {filteredTransactions.length} transações
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Transações */}
            <Card className="glass-card">
              <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
                <CardTitle className="text-xs sm:text-sm">Movimentações</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto px-0 sm:px-6 pb-3 sm:pb-4 -mx-4 sm:mx-0">
                <div className="min-w-[600px] px-4 sm:px-0">
                  <TransactionTable
                    transactions={filteredTransactions}
                    accounts={[account]}
                    categories={categories}
                    onEdit={onEditTransaction}
                    onDelete={onDeleteTransaction}
                    onToggleConciliated={onToggleConciliated}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}