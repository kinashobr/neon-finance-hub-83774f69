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
import { Emprestimo } from "@/types/finance";
import { ExpandablePanel } from "@/components/reports/ExpandablePanel";
import { TrendingDown, BarChart3, Calendar, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChartColors } from "@/hooks/useChartColors";
import { useFinance } from "@/contexts/FinanceContext"; // Import useFinance

interface LoanChartsProps {
  emprestimos: Emprestimo[];
  className?: string;
}

export function LoanCharts({ emprestimos, className }: LoanChartsProps) {
  const colors = useChartColors(); // Use o hook para cores dinâmicas
  const { calculateLoanSchedule, calculateLoanAmortizationAndInterest } = useFinance(); // Destructure the necessary function
  
  // Evolução do saldo devedor (Projeção dos próximos 12 meses)
  const evolucaoSaldo = useMemo(() => {
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const now = new Date();
    
    // 1. Calcular o saldo devedor inicial consolidado (após a última parcela paga)
    let totalSaldoInicial = 0;
    let totalParcelaFixa = 0;
    
    const schedules = emprestimos.map(e => {
        if (e.status === 'quitado' || e.status === 'pendente_config') return null;
        
        const schedule = calculateLoanSchedule(e.id);
        const parcelasPagas = e.parcelasPagas || 0;
        
        const ultimaParcelaPaga = schedule.find(item => item.parcela === parcelasPagas);
        const saldoAtual = ultimaParcelaPaga ? ultimaParcelaPaga.saldoDevedor : e.valorTotal;
        
        totalSaldoInicial += saldoAtual;
        totalParcelaFixa += e.parcela;
        
        // Retorna o cronograma a partir da próxima parcela
        return schedule.filter(item => item.parcela > parcelasPagas);
    }).filter((s): s is any[] => !!s);

    // 2. Simular a evolução consolidada
    let currentSaldo = totalSaldoInicial;
    const result = [];
    
    // Projeta os próximos 12 meses
    for (let k = 0; k < 12; k++) {
        const mesLabel = meses[(now.getMonth() + k) % 12];
        
        if (currentSaldo <= 0) {
            result.push({ mes: mesLabel, saldo: 0, juros: 0, amortizacao: 0 });
            continue;
        }
        
        // Simplificação: Usar a taxa média para a projeção consolidada
        const taxaMedia = emprestimos.reduce((acc, e) => acc + e.taxaMensal, 0) / Math.max(1, emprestimos.length);
        const i = taxaMedia / 100;
        
        // Cálculo PRICE consolidado (aproximado para projeção)
        const juros = currentSaldo * i;
        const amortizacao = totalParcelaFixa - juros;
        
        currentSaldo = Math.max(0, currentSaldo - amortizacao);
        
        result.push({
            mes: mesLabel,
            saldo: currentSaldo,
            juros: Math.max(0, juros),
            amortizacao: Math.max(0, amortizacao),
        });
    }
    
    return result;
  }, [emprestimos, calculateLoanSchedule]);

  // Juros x Amortização por parcela (Composição da Parcela Média)
  const jurosAmortizacao = useMemo(() => {
    // Usamos o primeiro empréstimo ativo como base para a composição da parcela
    const baseLoan = emprestimos.find(e => e.status === 'ativo');
    if (!baseLoan) return [];
    
    const schedule = calculateLoanSchedule(baseLoan.id);
    
    // Retorna as primeiras 12 parcelas (ou menos, se o empréstimo for curto)
    return schedule.slice(0, 12).map(item => ({
        parcela: `${item.parcela}ª`,
        juros: item.juros,
        amortizacao: item.amortizacao,
    }));
  }, [emprestimos, calculateLoanSchedule]);

  // Comparativo entre empréstimos (ajustado para usar a amortização correta)
  const comparativo = useMemo(() => {
    return emprestimos.map((e) => {
      const schedule = calculateLoanSchedule(e.id);
      const parcelasPagas = e.parcelasPagas || 0;
      
      const ultimaParcelaPaga = schedule.find(item => item.parcela === parcelasPagas);
      const saldoDevedor = ultimaParcelaPaga ? ultimaParcelaPaga.saldoDevedor : e.valorTotal;
      
      const custoTotal = e.parcela * e.meses;
      const jurosTotal = custoTotal - e.valorTotal;
      
      return {
        nome: e.contrato.split(" - ")[0].substring(0, 10),
        valorOriginal: e.valorTotal,
        saldoDevedor: Math.max(0, saldoDevedor),
        jurosTotal,
        taxa: e.taxaMensal,
      };
    });
  }, [emprestimos, calculateLoanSchedule]);

  // Timeline (mantido o cálculo de progresso por parcelas)
  const timeline = useMemo(() => {
    const hoje = new Date();
    return emprestimos.map((e) => {
      const parcelasPagas = e.parcelasPagas || 0;
      const parcelasRestantes = e.meses - parcelasPagas;
      const dataFinal = new Date(hoje);
      dataFinal.setMonth(dataFinal.getMonth() + parcelasRestantes);
      
      // Progresso por parcelas
      const progressoParcelas = (parcelasPagas / e.meses) * 100;
      
      // Progresso Financeiro (Amortização Acumulada / Valor Total)
      const schedule = calculateLoanSchedule(e.id);
      const amortizacaoAcumulada = schedule
        .filter(item => item.parcela <= parcelasPagas)
        .reduce((acc, item) => acc + item.amortizacao, 0);
        
      const progressoFinanceiro = e.valorTotal > 0 ? (amortizacaoAcumulada / e.valorTotal) * 100 : 0;
      
      return {
        nome: e.contrato.split(" - ")[0].substring(0, 12),
        inicio: 0,
        progresso: progressoFinanceiro, // Usando progresso financeiro
        restante: 100 - progressoFinanceiro,
      };
    });
  }, [emprestimos, calculateLoanSchedule]);

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
        <div className="h-[min(280px,40vh)]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolucaoSaldo}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.accent} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={colors.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: colors.mutedForeground, fontSize: 12 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: colors.mutedForeground, fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "12px",
                }}
                formatter={(value: number) => [formatCurrency(value), "Saldo"]}
              />
              <Area
                type="monotone"
                dataKey="saldo"
                stroke={colors.accent}
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
        title="Juros x Amortização por Parcela (Média)"
        subtitle="Composição do pagamento"
        icon={<BarChart3 className="w-4 h-4" />}
      >
        <div className="h-[min(280px,40vh)]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={jurosAmortizacao}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
              <XAxis dataKey="parcela" axisLine={false} tickLine={false} tick={{ fill: colors.mutedForeground, fontSize: 12 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: colors.mutedForeground, fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "12px",
                }}
                formatter={(value: number) => [formatCurrency(value)]}
              />
              <Legend />
              <Bar dataKey="juros" name="Juros" fill={colors.destructive} radius={[4, 4, 0, 0]} stackId="stack" />
              <Bar dataKey="amortizacao" name="Amortização" fill={colors.success} radius={[4, 4, 0, 0]} stackId="stack" />
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
        <div className="h-[min(280px,40vh)]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparativo} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} horizontal={false} />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: colors.mutedForeground, fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="nome"
                axisLine={false}
                tickLine={false}
                tick={{ fill: colors.mutedForeground, fontSize: 11 }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "12px",
                }}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              <Legend />
              <Bar dataKey="valorOriginal" name="Valor Original" fill={colors.mutedForeground} radius={[0, 4, 4, 0]} />
              <Bar dataKey="saldoDevedor" name="Saldo Devedor" fill={colors.destructive} radius={[0, 4, 4, 0]} />
              <Bar dataKey="jurosTotal" name="Juros Total" fill={colors.warning} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ExpandablePanel>

      {/* Timeline */}
      <ExpandablePanel
        title="Timeline dos Contratos"
        subtitle="Progresso de quitação (Amortização)"
        icon={<Calendar className="w-4 h-4" />}
      >
        <div className="space-y-4">
          {timeline.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{item.nome}</span>
                <span className="text-muted-foreground">{item.progresso.toFixed(0)}% amortizado</span>
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