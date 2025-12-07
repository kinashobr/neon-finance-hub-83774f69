import { useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { Emprestimo } from "@/contexts/FinanceContext";
import { ExpandablePanel } from "@/components/reports/ExpandablePanel";
import { TrendingDown, BarChart3, Calendar, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = {
  success: "hsl(142, 76%, 36%)",
  warning: "hsl(38, 92%, 50%)",
  danger: "hsl(0, 72%, 51%)",
  primary: "hsl(199, 89%, 48%)",
  accent: "hsl(270, 80%, 60%)",
  muted: "hsl(215, 20%, 55%)",
};

interface LoanChartsProps {
  emprestimos: Emprestimo[];
  className?: string;
}

export function LoanCharts({ emprestimos, className }: LoanChartsProps) {
  // Evolução do saldo devedor
  const evolucaoSaldo = useMemo(() => {
    const totalSaldo = emprestimos.reduce((acc, e) => {
      const parcelasPagas = Math.floor(e.meses * 0.3);
      return acc + Math.max(0, e.valorTotal - (parcelasPagas * e.parcela));
    }, 0);

    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return meses.map((mes, i) => ({
      mes,
      saldo: totalSaldo * (1 - (i * 0.05)),
      juros: totalSaldo * 0.02 * (1 - i * 0.03),
      amortizacao: totalSaldo * 0.03 * (1 + i * 0.01),
    }));
  }, [emprestimos]);

  // Juros x Amortização por parcela
  const jurosAmortizacao = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const parcela = i + 1;
      const taxaMedia = emprestimos.reduce((acc, e) => acc + e.taxaMensal, 0) / Math.max(1, emprestimos.length);
      const valorTotal = emprestimos.reduce((acc, e) => acc + e.parcela, 0);
      const juros = valorTotal * (taxaMedia / 100) * (1 - parcela * 0.02);
      const amortizacao = valorTotal - juros;
      return {
        parcela: `${parcela}ª`,
        juros: Math.max(0, juros),
        amortizacao: Math.max(0, amortizacao),
      };
    });
  }, [emprestimos]);

  // Comparativo entre empréstimos
  const comparativo = useMemo(() => {
    return emprestimos.map((e) => {
      const parcelasPagas = Math.floor(e.meses * 0.3);
      const saldoDevedor = Math.max(0, e.valorTotal - (parcelasPagas * e.parcela));
      const custoTotal = e.parcela * e.meses;
      const jurosTotal = custoTotal - e.valorTotal;
      
      return {
        nome: e.contrato.split(" - ")[0].substring(0, 10),
        valorOriginal: e.valorTotal,
        saldoDevedor,
        jurosTotal,
        taxa: e.taxaMensal,
      };
    });
  }, [emprestimos]);

  // Timeline
  const timeline = useMemo(() => {
    const hoje = new Date();
    return emprestimos.map((e) => {
      const parcelasPagas = Math.floor(e.meses * 0.3);
      const parcelasRestantes = e.meses - parcelasPagas;
      const dataFinal = new Date(hoje);
      dataFinal.setMonth(dataFinal.getMonth() + parcelasRestantes);
      
      return {
        nome: e.contrato.split(" - ")[0].substring(0, 12),
        inicio: 0,
        progresso: (parcelasPagas / e.meses) * 100,
        restante: 100 - (parcelasPagas / e.meses) * 100,
      };
    });
  }, [emprestimos]);

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

  if (emprestimos.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Adicione empréstimos para visualizar os gráficos</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Evolução do Saldo Devedor */}
      <ExpandablePanel
        title="Evolução do Saldo Devedor"
        subtitle="Projeção dos próximos 12 meses"
        icon={<TrendingDown className="w-4 h-4" />}
      >
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolucaoSaldo}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" vertical={false} />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 12 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: COLORS.muted, fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 20%, 8%)",
                  border: "1px solid hsl(220, 20%, 18%)",
                  borderRadius: "12px",
                }}
                formatter={(value: number) => [formatCurrency(value), "Saldo"]}
              />
              <Area
                type="monotone"
                dataKey="saldo"
                stroke={COLORS.accent}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSaldo)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ExpandablePanel>

      {/* Juros x Amortização */}
      <ExpandablePanel
        title="Juros x Amortização por Parcela"
        subtitle="Composição do pagamento"
        icon={<BarChart3 className="w-4 h-4" />}
      >
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={jurosAmortizacao}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" vertical={false} />
              <XAxis dataKey="parcela" axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 12 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: COLORS.muted, fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 20%, 8%)",
                  border: "1px solid hsl(220, 20%, 18%)",
                  borderRadius: "12px",
                }}
                formatter={(value: number) => [formatCurrency(value)]}
              />
              <Legend />
              <Bar dataKey="juros" name="Juros" fill={COLORS.danger} radius={[4, 4, 0, 0]} stackId="stack" />
              <Bar dataKey="amortizacao" name="Amortização" fill={COLORS.success} radius={[4, 4, 0, 0]} stackId="stack" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ExpandablePanel>

      {/* Comparativo */}
      <ExpandablePanel
        title="Comparativo entre Empréstimos"
        subtitle="Ranking por custo total"
        icon={<Scale className="w-4 h-4" />}
      >
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparativo} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" horizontal={false} />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: COLORS.muted, fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="nome"
                axisLine={false}
                tickLine={false}
                tick={{ fill: COLORS.muted, fontSize: 11 }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 20%, 8%)",
                  border: "1px solid hsl(220, 20%, 18%)",
                  borderRadius: "12px",
                }}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              <Legend />
              <Bar dataKey="valorOriginal" name="Valor Original" fill={COLORS.muted} radius={[0, 4, 4, 0]} />
              <Bar dataKey="saldoDevedor" name="Saldo Devedor" fill={COLORS.danger} radius={[0, 4, 4, 0]} />
              <Bar dataKey="jurosTotal" name="Juros Total" fill={COLORS.warning} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ExpandablePanel>

      {/* Timeline */}
      <ExpandablePanel
        title="Timeline dos Contratos"
        subtitle="Progresso de quitação"
        icon={<Calendar className="w-4 h-4" />}
      >
        <div className="space-y-4">
          {timeline.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{item.nome}</span>
                <span className="text-muted-foreground">{item.progresso.toFixed(0)}% quitado</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-success to-primary transition-all duration-500"
                  style={{ width: `${item.progresso}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </ExpandablePanel>
    </div>
  );
}
