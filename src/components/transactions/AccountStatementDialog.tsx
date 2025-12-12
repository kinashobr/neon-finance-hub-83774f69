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
import { cn } from "@/lib/utils";

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
    // Log de depuração para ver as transações recebidas
    console.log(`[Statement] Transações recebidas para ${account.name}:`, transactions.length);
    
    return transactions
      .filter(t => {
        const matchFrom = !dateFrom || t.date >= dateFrom;
        const matchTo = !dateTo || t.date <= dateTo;
        return matchFrom && matchTo;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, dateFrom, dateTo, account.name]);

  // Calcular saldos do período
  const periodSummary = useMemo(() => {
    // Usamos o saldo inicial e final calculados no AccountSummary (ReceitasDespesas.tsx)
    // para garantir consistência com o card.
    const initialBalance = accountSummary.initialBalance;
    const finalBalance = accountSummary.currentBalance;
    
    const totalIn = accountSummary.totalIn;
    const totalOut = accountSummary.totalOut;

    const conciliatedCount = transactions.filter(t => t.conciliated).length;
    const pendingCount = transactions.length - conciliatedCount;

    return {
      initialBalance,
      finalBalance,
      totalIn,
      totalOut,
      netChange: totalIn - totalOut,
      conciliatedCount,
      pendingCount,
      isBalanced: Math.abs(finalBalance - accountSummary.currentBalance) < 0.01
    };
  }, [accountSummary, transactions]);

  const statusColor = periodSummary.pendingCount === 0 ? 'text-success' : 'text-warning';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">{account.name}</DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Badge variant="outline">{ACCOUNT_TYPE_LABELS[account.accountType]}</Badge>
                  {account.institution && <span>• {account.institution}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={onReconcileAll}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Conciliar Tudo
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Conteúdo rolável */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Resumo de Saldos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glass-card">
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground mb-1">Saldo Inicial</div>
                  {/* Exibe o saldo inicial do período, formatado */}
                  <div className="text-lg font-bold">{formatCurrency(periodSummary.initialBalance)}</div>
                </CardContent>
              </Card>
              
              <Card className="glass-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <TrendingUp className="w-4 h-4 text-success" />
                    Entradas
                  </div>
                  <div className="text-lg font-bold text-success">
                    +{formatCurrency(periodSummary.totalIn)}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <TrendingDown className="w-4 h-4 text-destructive" />
                    Saídas
                  </div>
                  <div className="text-lg font-bold text-destructive">
                    -{formatCurrency(periodSummary.totalOut)}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-2 border-primary/20">
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground mb-1">Saldo Final</div>
                  <div className={cn(
                    "text-lg font-bold",
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
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Período do Extrato
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">De:</span>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-[150px] h-9"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Até:</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-[150px] h-9"
                    />
                  </div>
                  {(dateFrom || dateTo) && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => { setDateFrom(""); setDateTo(""); }}
                    >
                      Limpar
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground ml-auto">
                    {filteredTransactions.length} transações
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Transações */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Movimentações</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <TransactionTable
                  transactions={filteredTransactions}
                  accounts={[account]}
                  categories={categories}
                  onEdit={onEditTransaction}
                  onDelete={onDeleteTransaction}
                  onToggleConciliated={onToggleConciliated}
                />
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}