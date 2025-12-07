import { TrendingUp, Calendar, Wallet, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { Transacao } from "@/contexts/FinanceContext";

interface CashFlowProjectionProps {
  transacoes: Transacao[];
}

export const CashFlowProjection = ({ transacoes }: CashFlowProjectionProps) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Calcular médias dos últimos 3 meses
  const ultimos3Meses: { receitas: number; despesas: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const month = (currentMonth - i - 1 + 12) % 12;
    const year = currentMonth - i - 1 < 0 ? currentYear - 1 : currentYear;
    const transacoesMes = transacoes.filter(t => {
      const date = new Date(t.data);
      return date.getMonth() === month && date.getFullYear() === year;
    });
    ultimos3Meses.push({
      receitas: transacoesMes.filter(t => t.tipo === "receita").reduce((acc, t) => acc + t.valor, 0),
      despesas: transacoesMes.filter(t => t.tipo === "despesa").reduce((acc, t) => acc + t.valor, 0),
    });
  }

  const mediaReceitas = ultimos3Meses.reduce((acc, m) => acc + m.receitas, 0) / 3;
  const mediaDespesas = ultimos3Meses.reduce((acc, m) => acc + m.despesas, 0) / 3;
  const mediaSaldo = mediaReceitas - mediaDespesas;

  // Transações do mês atual até agora
  const diaAtual = currentDate.getDate();
  const diasNoMes = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const transacoesMesAtual = transacoes.filter(t => {
    const date = new Date(t.data);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const receitasAteAgora = transacoesMesAtual.filter(t => t.tipo === "receita").reduce((acc, t) => acc + t.valor, 0);
  const despesasAteAgora = transacoesMesAtual.filter(t => t.tipo === "despesa").reduce((acc, t) => acc + t.valor, 0);
  const saldoAtual = receitasAteAgora - despesasAteAgora;

  // Projeção para fim do mês (regra de 3 simples + média histórica)
  const fatorDias = diasNoMes / Math.max(diaAtual, 1);
  const projecaoReceitas = (receitasAteAgora * fatorDias * 0.6) + (mediaReceitas * 0.4);
  const projecaoDespesas = (despesasAteAgora * fatorDias * 0.6) + (mediaDespesas * 0.4);
  const projecaoSaldoFimMes = projecaoReceitas - projecaoDespesas;

  // Projeções futuras
  const saldo30dias = saldoAtual + mediaSaldo;
  const saldo60dias = saldoAtual + (mediaSaldo * 2);
  const saldo90dias = saldoAtual + (mediaSaldo * 3);

  // Dados para sparkline
  const sparklineData = [
    { value: saldoAtual },
    { value: saldo30dias },
    { value: saldo60dias },
    { value: saldo90dias },
  ];

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const projections = [
    {
      label: "Fim do Mês",
      value: projecaoSaldoFimMes,
      days: diasNoMes - diaAtual,
      color: projecaoSaldoFimMes >= 0 ? "text-success" : "text-destructive",
    },
    {
      label: "30 dias",
      value: saldo30dias,
      days: 30,
      color: saldo30dias >= 0 ? "text-success" : "text-destructive",
    },
    {
      label: "60 dias",
      value: saldo60dias,
      days: 60,
      color: saldo60dias >= 0 ? "text-success" : "text-destructive",
    },
    {
      label: "90 dias",
      value: saldo90dias,
      days: 90,
      color: saldo90dias >= 0 ? "text-success" : "text-destructive",
    },
  ];

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Previsão de Caixa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {projections.map((proj, index) => (
            <div key={proj.label} className="relative">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{proj.label}</span>
                </div>
                <p className={cn("text-lg font-bold", proj.color)}>
                  {formatCurrency(proj.value)}
                </p>
                <p className="text-xs text-muted-foreground">
                  em {proj.days} dias
                </p>
              </div>
              {index < projections.length - 1 && (
                <ArrowRight className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground hidden lg:block" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Evolução Projetada</span>
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                Média mensal: {formatCurrency(mediaSaldo)}
              </span>
            </div>
          </div>
          <div className="h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: "hsl(220, 20%, 8%)", 
                    border: "1px solid hsl(220, 20%, 18%)", 
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                  formatter={(value: number) => [formatCurrency(value), "Saldo"]}
                  labelFormatter={() => ""}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};