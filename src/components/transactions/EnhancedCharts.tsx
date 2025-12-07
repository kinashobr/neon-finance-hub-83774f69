import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Transacao } from "@/contexts/FinanceContext";
import { CategoryDetailModal } from "./CategoryDetailModal";

interface EnhancedChartsProps {
  transacoes: Transacao[];
  categorias: string[];
}

const pieColors = [
  "hsl(199, 89%, 48%)", 
  "hsl(270, 100%, 65%)", 
  "hsl(160, 100%, 45%)", 
  "hsl(330, 100%, 65%)", 
  "hsl(38, 92%, 50%)", 
  "hsl(0, 72%, 51%)",
  "hsl(180, 70%, 50%)",
  "hsl(300, 70%, 50%)",
];

export const EnhancedCharts = ({ transacoes, categorias }: EnhancedChartsProps) => {
  const [chartPeriod, setChartPeriod] = useState<3 | 6 | 12>(6);
  const [metaGasto, setMetaGasto] = useState(8000); // Meta configurável

  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Dados de tendência com saldo e meta
  const tendenciaData = [];
  for (let i = chartPeriod - 1; i >= -1; i--) {
    const month = (currentMonth - i + 12) % 12;
    const year = currentMonth - i < 0 ? currentYear - 1 : currentYear;
    const mesNum = String(month + 1).padStart(2, "0");
    
    const transacoesMes = transacoes.filter(t => {
      const date = new Date(t.data);
      return date.getMonth() === month && date.getFullYear() === year;
    });
    
    const receitas = transacoesMes.filter(t => t.tipo === "receita").reduce((acc, t) => acc + t.valor, 0);
    const despesas = transacoesMes.filter(t => t.tipo === "despesa").reduce((acc, t) => acc + t.valor, 0);
    const saldo = receitas - despesas;
    
    const isProjection = i === -1;
    
    // Projeção do próximo mês (média dos últimos 3)
    if (isProjection && tendenciaData.length >= 3) {
      const ultimos3 = tendenciaData.slice(-3);
      const mediaReceitas = ultimos3.reduce((a, m) => a + m.receitas, 0) / 3;
      const mediaDespesas = ultimos3.reduce((a, m) => a + m.despesas, 0) / 3;
      tendenciaData.push({
        mes: meses[(month + 1) % 12],
        receitas: mediaReceitas,
        despesas: mediaDespesas,
        saldo: mediaReceitas - mediaDespesas,
        meta: metaGasto,
        isProjection: true,
      });
    } else if (!isProjection) {
      tendenciaData.push({
        mes: meses[month],
        receitas,
        despesas,
        saldo,
        meta: metaGasto,
        isProjection: false,
      });
    }
  }

  // Despesas por categoria com destaque
  const despesasPorCategoria = categorias.map(cat => {
    const valor = transacoes
      .filter(t => t.tipo === "despesa" && t.categoria === cat)
      .reduce((acc, t) => acc + t.valor, 0);
    return { categoria: cat, valor };
  }).filter(d => d.valor > 0).sort((a, b) => b.valor - a.valor);

  const totalDespesas = despesasPorCategoria.reduce((acc, d) => acc + d.valor, 0);
  const categoriaMaisCara = despesasPorCategoria[0];

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Receitas vs Despesas com Saldo e Meta */}
      <Card className="glass-card animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Receitas vs Despesas por Mês</CardTitle>
            <div className="flex gap-1">
              {([3, 6, 12] as const).map((period) => (
                <Button
                  key={period}
                  variant={chartPeriod === period ? "default" : "outline"}
                  size="sm"
                  onClick={() => setChartPeriod(period)}
                  className={cn(
                    "h-7 text-xs",
                    chartPeriod === period ? "bg-primary" : "border-border"
                  )}
                >
                  {period}M
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tendenciaData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" vertical={false} />
                <XAxis 
                  dataKey="mes" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} 
                  tickFormatter={(v) => `${v/1000}k`} 
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: "hsl(220, 20%, 8%)", 
                    border: "1px solid hsl(220, 20%, 18%)", 
                    borderRadius: "12px" 
                  }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      receitas: "Receitas",
                      despesas: "Despesas",
                      saldo: "Saldo",
                    };
                    return [formatCurrency(value), labels[name] || name];
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: "10px" }}
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      receitas: "Receitas",
                      despesas: "Despesas",
                      saldo: "Saldo",
                    };
                    return labels[value] || value;
                  }}
                />
                <ReferenceLine 
                  y={metaGasto} 
                  stroke="hsl(38, 92%, 50%)" 
                  strokeDasharray="5 5" 
                  label={{ value: "Meta", fill: "hsl(38, 92%, 50%)", fontSize: 10 }}
                />
                <Bar 
                  dataKey="receitas" 
                  fill="hsl(142, 76%, 36%)" 
                  radius={[4, 4, 0, 0]} 
                  opacity={0.9}
                />
                <Bar 
                  dataKey="despesas" 
                  fill="hsl(0, 72%, 51%)" 
                  radius={[4, 4, 0, 0]}
                  opacity={0.9}
                />
                <Line 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke="hsl(199, 89%, 48%)" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(199, 89%, 48%)", r: 3 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Despesas por Categoria */}
      <Card className="glass-card animate-fade-in-up" style={{ animationDelay: "250ms" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={despesasPorCategoria}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="valor"
                    nameKey="categoria"
                    label={({ categoria, percent }) => 
                      `${categoria} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {despesasPorCategoria.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={pieColors[index % pieColors.length]}
                        stroke={entry.categoria === categoriaMaisCara?.categoria ? "hsl(38, 92%, 50%)" : "none"}
                        strokeWidth={entry.categoria === categoriaMaisCara?.categoria ? 3 : 0}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: "hsl(220, 20%, 8%)", 
                      border: "1px solid hsl(220, 20%, 18%)", 
                      borderRadius: "12px" 
                    }}
                    formatter={(value: number, name: string, props: any) => {
                      const percent = ((value / totalDespesas) * 100).toFixed(1);
                      return [`${formatCurrency(value)} (${percent}%)`, "Valor"];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">Detalhamento por categoria</p>
              {despesasPorCategoria.slice(0, 6).map((cat, index) => {
                const percent = (cat.valor / totalDespesas) * 100;
                const isMaisCara = cat.categoria === categoriaMaisCara?.categoria;
                
                return (
                  <CategoryDetailModal
                    key={cat.categoria}
                    categoria={cat.categoria}
                    transacoes={transacoes}
                    totalCategoria={cat.valor}
                    percentual={percent}
                  >
                    <div 
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
                        "hover:bg-muted/50 border border-transparent",
                        isMaisCara && "border-warning/50 bg-warning/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: pieColors[index % pieColors.length] }}
                        />
                        <span className="text-sm">{cat.categoria}</span>
                        {isMaisCara && (
                          <span className="text-xs text-warning">Maior gasto</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatCurrency(cat.valor)}</span>
                        <span className="text-xs text-muted-foreground">({percent.toFixed(1)}%)</span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </div>
                  </CategoryDetailModal>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
