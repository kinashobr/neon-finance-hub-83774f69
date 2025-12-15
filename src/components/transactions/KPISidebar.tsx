import { TrendingUp, TrendingDown, Wallet, PiggyBank, CreditCard, Target, BarChart3, Percent, AlertTriangle, DollarSign, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TransacaoCompleta, Categoria, formatCurrency } from "@/types/finance";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface KPISidebarProps {
  transactions: TransacaoCompleta[];
  categories: Categoria[];
}

export function KPISidebar({ transactions, categories }: KPISidebarProps) {
  const categoriesMap = new Map(categories.map(c => [c.id, c]));

  // Cálculos
  const totalReceitas = transactions
    .filter(t => t.operationType === 'receita' || t.operationType === 'rendimento')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalDespesas = transactions
    .filter(t => t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo')
    .reduce((acc, t) => acc + t.amount, 0);

  const saldoMensal = totalReceitas - totalDespesas;
  const margemPoupanca = totalReceitas > 0 ? (saldoMensal / totalReceitas) * 100 : 0;
  const indiceEndividamento = totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 0;

  // Despesas por categoria (top 3)
  const despesasPorCategoria = categories
    .map(cat => {
      const total = transactions
        .filter(t => t.categoryId === cat.id && (t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo'))
        .reduce((acc, t) => acc + t.amount, 0);
      return { ...cat, total };
    })
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const isPositive = saldoMensal >= 0;
  const isSaudavel = margemPoupanca >= 20;

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toFixed(0);
  };

  const isCritical = indiceEndividamento > 80;

  return (
    <div className="space-y-4">
      {/* KPIs Principais */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Resumo do Fluxo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Saldo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className={cn("w-4 h-4", isPositive ? "text-success" : "text-destructive")} />
              <span className="text-sm font-medium">Saldo Líquido</span>
            </div>
            <span className={cn(
              "font-bold text-lg",
              isPositive ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(saldoMensal)}
            </span>
          </div>
          
          <Separator />

          {/* Receitas */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-success">
              <TrendingUp className="w-4 h-4" />
              <span>Receitas</span>
            </div>
            <span className="font-semibold text-success">{formatCurrency(totalReceitas)}</span>
          </div>

          {/* Despesas */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-destructive">
              <TrendingDown className="w-4 h-4" />
              <span>Despesas</span>
            </div>
            <span className="font-semibold text-destructive">{formatCurrency(totalDespesas)}</span>
          </div>
          
          <Separator />

          {/* Margem de Poupança */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <PiggyBank className="w-3 h-3" />
                Margem Poupança
              </span>
              <Badge variant={isSaudavel ? "default" : "destructive"} className="text-xs">
                {margemPoupanca.toFixed(1)}%
              </Badge>
            </div>
            <Progress 
              value={Math.min(100, Math.max(0, margemPoupanca))} 
              className="h-1.5"
            />
          </div>

          {/* Índice de Endividamento */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Percent className="w-3 h-3" />
                Comprometimento
              </span>
              <Badge variant={indiceEndividamento <= 70 ? "default" : "destructive"} className="text-xs">
                {indiceEndividamento.toFixed(1)}%
              </Badge>
            </div>
            <Progress 
              value={Math.min(100, indiceEndividamento)} 
              className="h-1.5"
            />
          </div>
        </CardContent>
      </Card>

      {/* Top Despesas */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            Top 3 Despesas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {despesasPorCategoria.map((cat, index) => (
            <div key={cat.id} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-4">{index + 1}</span>
                <span className="text-sm truncate max-w-[120px]">{cat.icon} {cat.label}</span>
              </div>
              <span className="text-sm font-medium text-destructive">
                {formatValue(cat.total)}
              </span>
            </div>
          ))}
          {despesasPorCategoria.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Nenhuma despesa registrada
            </p>
          )}
        </CardContent>
      </Card>

      {/* Alerta Crítico */}
      {isCritical && (
        <Card className="glass-card border-destructive">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-destructive">Alerta Crítico</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Seu comprometimento de renda está acima de 80%. Ação urgente necessária.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}