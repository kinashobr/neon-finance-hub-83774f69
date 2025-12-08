import { TrendingUp, TrendingDown, Wallet, PiggyBank, CreditCard, Target, BarChart3, Percent, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TransacaoCompleta, Categoria, formatCurrency } from "@/types/finance";
import { cn } from "@/lib/utils";

interface KPISidebarProps {
  transactions: TransacaoCompleta[];
  categories: Categoria[];
}

export function KPISidebar({ transactions, categories }: KPISidebarProps) {
  // Cálculos
  const totalReceitas = transactions
    .filter(t => t.operationType === 'receita')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalDespesas = transactions
    .filter(t => t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo')
    .reduce((acc, t) => acc + t.amount, 0);

  const saldoMensal = totalReceitas - totalDespesas;
  const margemPoupanca = totalReceitas > 0 ? (saldoMensal / totalReceitas) * 100 : 0;
  const indiceEndividamento = totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 0;

  // Despesas por categoria (top 5)
  const despesasPorCategoria = categories
    .map(cat => {
      const total = transactions
        .filter(t => t.categoryId === cat.id && (t.operationType === 'despesa'))
        .reduce((acc, t) => acc + t.amount, 0);
      return { ...cat, total };
    })
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Receitas por categoria (top 3)
  const receitasPorCategoria = categories
    .map(cat => {
      const total = transactions
        .filter(t => t.categoryId === cat.id && t.operationType === 'receita')
        .reduce((acc, t) => acc + t.amount, 0);
      return { ...cat, total };
    })
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  // Projeção de caixa (próximos 30 dias - simplificado)
  const projecao = saldoMensal * 1.1; // Estimativa simples

  const isPositive = saldoMensal >= 0;
  const isSaudavel = margemPoupanca >= 20;

  return (
    <div className="space-y-4">
      {/* KPIs Principais */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Indicadores do Período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Receitas */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <span className="text-sm text-muted-foreground">Receitas</span>
            </div>
            <span className="font-semibold text-success">{formatCurrency(totalReceitas)}</span>
          </div>

          {/* Despesas */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-destructive" />
              </div>
              <span className="text-sm text-muted-foreground">Despesas</span>
            </div>
            <span className="font-semibold text-destructive">{formatCurrency(totalDespesas)}</span>
          </div>

          <Separator />

          {/* Saldo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                isPositive ? "bg-success/10" : "bg-destructive/10"
              )}>
                <Wallet className={cn("w-4 h-4", isPositive ? "text-success" : "text-destructive")} />
              </div>
              <span className="text-sm font-medium">Saldo Mensal</span>
            </div>
            <span className={cn(
              "font-bold text-lg",
              isPositive ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(saldoMensal)}
            </span>
          </div>

          <Separator />

          {/* Margem de Poupança */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <PiggyBank className="w-3 h-3" />
                Margem Poupança
              </span>
              <Badge variant={isSaudavel ? "default" : "destructive"} className="text-xs">
                {margemPoupanca.toFixed(1)}%
              </Badge>
            </div>
            <Progress 
              value={Math.min(100, Math.max(0, margemPoupanca))} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              {isSaudavel ? 'Saudável (≥20%)' : 'Abaixo do ideal (<20%)'}
            </p>
          </div>

          {/* Índice de Endividamento */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Percent className="w-3 h-3" />
                Comprometimento
              </span>
              <Badge variant={indiceEndividamento <= 70 ? "default" : "destructive"} className="text-xs">
                {indiceEndividamento.toFixed(1)}%
              </Badge>
            </div>
            <Progress 
              value={Math.min(100, indiceEndividamento)} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Previsão de Caixa */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Previsão de Caixa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <span className="text-xs text-muted-foreground block mb-1">Próximos 30 dias</span>
            <span className={cn(
              "font-bold text-xl",
              projecao >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(projecao)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Top Despesas */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            Top Despesas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {despesasPorCategoria.map((cat, index) => (
            <div key={cat.id} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-4">{index + 1}</span>
                <span className="text-sm">{cat.icon} {cat.label}</span>
              </div>
              <span className="text-sm font-medium text-destructive">
                {formatCurrency(cat.total)}
              </span>
            </div>
          ))}
          {despesasPorCategoria.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhuma despesa registrada
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top Receitas */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-success" />
            Fontes de Receita
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {receitasPorCategoria.map((cat, index) => (
            <div key={cat.id} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-4">{index + 1}</span>
                <span className="text-sm">{cat.icon} {cat.label}</span>
              </div>
              <span className="text-sm font-medium text-success">
                {formatCurrency(cat.total)}
              </span>
            </div>
          ))}
          {receitasPorCategoria.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhuma receita registrada
            </p>
          )}
        </CardContent>
      </Card>

      {/* Alertas */}
      {indiceEndividamento > 80 && (
        <Card className="glass-card border-warning">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-warning">Atenção</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Seu comprometimento de renda está alto. Considere revisar suas despesas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
