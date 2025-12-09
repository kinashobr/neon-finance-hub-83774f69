import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, Building2, Calendar, TrendingUp, TrendingDown, 
  CheckCircle2, AlertTriangle, Download, RefreshCw
} from "lucide-react";
import { 
  ContaCorrente, TransacaoCompleta, Categoria, AccountSummary, 
  formatCurrency, ACCOUNT_TYPE_LABELS 
} from "@/types/finance";
import { TransactionTable } from "./TransactionTable";
import { cn } from "@/lib/utils";

interface AccountStatementPageProps {
  account: ContaCorrente;
  accountSummary: AccountSummary;
  transactions: TransacaoCompleta[];
  categories: Categoria[];
  onBack: () => void;
  onEditTransaction: (transaction: TransacaoCompleta) => void;
  onDeleteTransaction: (id: string) => void;
  onToggleConciliated: (id: string, value: boolean) => void;
  onReconcileAll: () => void;
}

export function AccountStatementPage({
  account,
  accountSummary,
  transactions,
  categories,
  onBack,
  onEditTransaction,
  onDeleteTransaction,
  onToggleConciliated,
  onReconcileAll
}: AccountStatementPageProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Filtrar transações por período
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const matchFrom = !dateFrom || t.date >= dateFrom;
        const matchTo = !dateTo || t.date <= dateTo;
        return matchFrom && matchTo;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, dateFrom, dateTo]);

  // Calcular saldos do período
  const periodSummary = useMemo(() => {
    let runningBalance = account.initialBalance;
    const balanceHistory: { date: string; balance: number; transaction: TransacaoCompleta }[] = [];
    
    // Ordenar transações por data crescente para cálculo
    const sortedTx = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    sortedTx.forEach(tx => {
      if (tx.flow === 'in' || tx.flow === 'transfer_in') {
        runningBalance += tx.amount;
      } else {
        runningBalance -= tx.amount;
      }
      balanceHistory.push({ date: tx.date, balance: runningBalance, transaction: tx });
    });

    const totalIn = transactions
      .filter(t => t.flow === 'in' || t.flow === 'transfer_in')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalOut = transactions
      .filter(t => t.flow === 'out' || t.flow === 'transfer_out')
      .reduce((acc, t) => acc + t.amount, 0);

    const conciliatedCount = transactions.filter(t => t.conciliated).length;
    const pendingCount = transactions.length - conciliatedCount;

    return {
      initialBalance: account.initialBalance,
      finalBalance: runningBalance,
      totalIn,
      totalOut,
      netChange: totalIn - totalOut,
      balanceHistory,
      conciliatedCount,
      pendingCount,
      isBalanced: Math.abs(runningBalance - accountSummary.currentBalance) < 0.01
    };
  }, [account, transactions, accountSummary]);

  const statusColor = periodSummary.pendingCount === 0 ? 'text-success' : 'text-warning';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{account.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{ACCOUNT_TYPE_LABELS[account.accountType]}</Badge>
                {account.institution && <span>• {account.institution}</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Resumo de Saldos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground mb-1">Saldo Inicial</div>
            <div className="text-xl font-bold">{formatCurrency(periodSummary.initialBalance)}</div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4 text-success" />
              Total Entradas
            </div>
            <div className="text-xl font-bold text-success">
              +{formatCurrency(periodSummary.totalIn)}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingDown className="w-4 h-4 text-destructive" />
              Total Saídas
            </div>
            <div className="text-xl font-bold text-destructive">
              -{formatCurrency(periodSummary.totalOut)}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-2 border-primary/20">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground mb-1">Saldo Final</div>
            <div className={cn(
              "text-xl font-bold",
              periodSummary.finalBalance >= 0 ? "text-foreground" : "text-destructive"
            )}>
              {formatCurrency(periodSummary.finalBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status de Conciliação */}
      <Card className="glass-card">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn("flex items-center gap-2", statusColor)}>
                {periodSummary.pendingCount === 0 ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
                <span className="font-medium">
                  {periodSummary.pendingCount === 0 
                    ? "Todas as transações conciliadas" 
                    : `${periodSummary.pendingCount} transações pendentes de conciliação`}
                </span>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <span className="text-sm text-muted-foreground">
                {periodSummary.conciliatedCount} de {transactions.length} conciliadas
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Variação do período:</span>
              <Badge variant={periodSummary.netChange >= 0 ? "default" : "destructive"}>
                {periodSummary.netChange >= 0 ? "+" : ""}{formatCurrency(periodSummary.netChange)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtro de Período */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Período do Extrato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">De:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Até:</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[160px]"
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Movimentações da Conta</CardTitle>
        </CardHeader>
        <CardContent>
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
  );
}
