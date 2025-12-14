import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  BarChart3, 
  Calendar,
  Percent,
  DollarSign,
  Clock,
  TrendingDown,
  Calculator,
  StickyNote,
  Settings,
  Edit,
} from "lucide-react";
import { Emprestimo } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { LoanCard } from "./LoanCard";
import { LoanConfigForm } from "./LoanConfigForm";
import { InstallmentsTable } from "./InstallmentsTable";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { useChartColors } from "@/hooks/useChartColors";

interface LoanDetailDialogProps {
  emprestimo: Emprestimo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoanDetailDialog({ emprestimo, open, onOpenChange }: LoanDetailDialogProps) {
  const { updateEmprestimo, getContasCorrentesTipo, calculateLoanAmortizationAndInterest } = useFinance();
  const [isEditing, setIsEditing] = useState(false);
  const contasCorrentes = getContasCorrentesTipo();
  const colors = useChartColors(); // Use o hook para cores dinâmicas
  
  // Hooks must be called unconditionally before any conditional return
  
  const calculos = useMemo(() => {
    if (!emprestimo) return null;

    const parcelasPagas = emprestimo.parcelasPagas || 0;
    const parcelasRestantes = emprestimo.meses - parcelasPagas;
    
    // --- CORREÇÃO: Calcular Saldo Devedor usando a amortização correta ---
    let saldoDevedor = emprestimo.valorTotal;
    if (parcelasPagas > 0) {
        // O saldo devedor após a última parcela paga é o saldoDevedor daquela parcela
        // Para obter o saldo após a parcela N, precisamos calcular a parcela N+1 e pegar o saldoDevedor dela.
        // No entanto, a função calculateLoanAmortizationAndInterest retorna o saldo DEPOIS da parcela 'parcelaNumber'.
        const calc = calculateLoanAmortizationAndInterest(emprestimo.id, parcelasPagas);
        
        if (calc) {
            saldoDevedor = calc.saldoDevedor;
        } else {
            // Fallback (embora o cálculo deva funcionar se o empréstimo estiver configurado)
            saldoDevedor = Math.max(0, emprestimo.valorTotal - (parcelasPagas * emprestimo.parcela));
        }
    }
    // ---------------------------------------------------------------------
    
    const custoTotal = emprestimo.parcela * emprestimo.meses;
    const jurosTotal = custoTotal - emprestimo.valorTotal;
    const jurosPagos = emprestimo.meses > 0 ? jurosTotal * (parcelasPagas / emprestimo.meses) : 0;
    const jurosRestantes = jurosTotal - jurosPagos;
    const percentualQuitado = emprestimo.meses > 0 ? (parcelasPagas / emprestimo.meses) * 100 : 0;
    const cetEfetivo = emprestimo.meses > 0 ? ((custoTotal / emprestimo.valorTotal - 1) / emprestimo.meses) * 12 * 100 : 0;
    
    const dataFinal = new Date();
    dataFinal.setMonth(dataFinal.getMonth() + parcelasRestantes);

    const proximaParcela = new Date();
    proximaParcela.setDate(10);
    if (proximaParcela <= new Date()) {
      proximaParcela.setMonth(proximaParcela.getMonth() + 1);
    }

    const economiaQuitacao = jurosRestantes * 0.3;

    return {
      parcelasPagas,
      parcelasRestantes,
      saldoDevedor,
      custoTotal,
      jurosTotal,
      jurosPagos,
      jurosRestantes,
      percentualQuitado,
      cetEfetivo,
      dataFinal,
      proximaParcela,
      economiaQuitacao,
    };
  }, [emprestimo, calculateLoanAmortizationAndInterest]);

  const evolucaoData = useMemo(() => {
    if (!emprestimo || emprestimo.meses === 0) return [];
    
    let saldo = emprestimo.valorTotal;
    const taxa = emprestimo.taxaMensal / 100;
    
    return Array.from({ length: emprestimo.meses }, (_, i) => {
      const juros = saldo * taxa;
      const amortizacao = emprestimo.parcela - juros;
      saldo = Math.max(0, saldo - amortizacao);
      
      return {
        parcela: i + 1,
        saldo,
        juros: Math.max(0, juros),
        amortizacao: Math.max(0, amortizacao),
      };
    });
  }, [emprestimo]);
  
  // Conditional return must be after all hooks
  if (!emprestimo || !calculos) return null;

  const isPending = emprestimo.status === 'pendente_config';

  // Auto-open edit mode for pending loans
  const showConfigForm = isPending || isEditing;

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const handleSaveConfig = (data: Partial<Emprestimo>) => {
    updateEmprestimo(emprestimo.id, data);
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] bg-card border-border max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <span className="text-xl">{emprestimo.contrato}</span>
              {!isPending && (
                <Badge variant="outline" className="ml-3 bg-primary/10 text-primary border-primary/30">
                  {calculos.percentualQuitado.toFixed(0)}% quitado
                </Badge>
              )}
              {isPending && (
                <Badge variant="outline" className="ml-3 border-warning text-warning">
                  Pendente de Configuração
                </Badge>
              )}
            </div>
            {!isPending && !isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Show Config Form for pending loans or when editing */}
        {showConfigForm ? (
          <div className="flex-1 overflow-y-auto pr-1">
            <LoanConfigForm
              emprestimo={emprestimo}
              contasCorrentes={contasCorrentes}
              onSave={handleSaveConfig}
              onCancel={() => {
                if (isPending) {
                  onOpenChange(false);
                } else {
                  setIsEditing(false);
                }
              }}
            />
          </div>
        ) : (
          /* Show normal details for configured loans */
          <Tabs defaultValue="geral" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="bg-muted/50 w-full grid grid-cols-4 shrink-0">
              <TabsTrigger value="geral" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Geral
              </TabsTrigger>
              <TabsTrigger value="parcelas" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Parcelas
              </TabsTrigger>
              <TabsTrigger value="graficos" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Gráficos
              </TabsTrigger>
              <TabsTrigger value="observacoes" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Observações
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 pr-1 scrollbar-thin">
              {/* Aba Geral */}
              <TabsContent value="geral" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <LoanCard
                    title="Valor Contratado"
                    value={formatCurrency(emprestimo.valorTotal)}
                    icon={<DollarSign className="w-4 h-4" />}
                    status="neutral"
                    size="sm"
                  />
                  <LoanCard
                    title="Saldo Devedor"
                    value={formatCurrency(calculos.saldoDevedor)}
                    icon={<TrendingDown className="w-4 h-4" />}
                    status="danger"
                    size="sm"
                  />
                  <LoanCard
                    title="Parcela Mensal"
                    value={formatCurrency(emprestimo.parcela)}
                    icon={<Calendar className="w-4 h-4" />}
                    status="warning"
                    size="sm"
                  />
                  <LoanCard
                    title="Taxa Mensal"
                    value={`${emprestimo.taxaMensal.toFixed(2)}%`}
                    icon={<Percent className="w-4 h-4" />}
                    status="info"
                    size="sm"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <LoanCard
                    title="Parcelas Pagas"
                    value={`${calculos.parcelasPagas}/${emprestimo.meses}`}
                    icon={<Clock className="w-4 h-4" />}
                    status="success"
                    size="sm"
                  />
                  <LoanCard
                    title="Juros Pagos"
                    value={formatCurrency(calculos.jurosPagos)}
                    icon={<Calculator className="w-4 h-4" />}
                    status="warning"
                    size="sm"
                  />
                  <LoanCard
                    title="Juros Restantes"
                    value={formatCurrency(calculos.jurosRestantes)}
                    icon={<Calculator className="w-4 h-4" />}
                    status="danger"
                    size="sm"
                  />
                  <LoanCard
                    title="CET Efetivo"
                    value={`${calculos.cetEfetivo.toFixed(1)}% a.a.`}
                    icon={<Percent className="w-4 h-4" />}
                    status="neutral"
                    size="sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-card p-4 space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Datas Importantes
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Próxima parcela:</span>
                        <span className="font-medium">{calculos.proximaParcela.toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Data final:</span>
                        <span className="font-medium">{calculos.dataFinal.toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Meses restantes:</span>
                        <span className="font-medium">{calculos.parcelasRestantes}</span>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-4 space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-success" />
                      Economia Potencial
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Custo total:</span>
                        <span className="font-medium">{formatCurrency(calculos.custoTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Juros total:</span>
                        <span className="font-medium text-warning">{formatCurrency(calculos.jurosTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Economia quitação:</span>
                        <span className="font-bold text-success">{formatCurrency(calculos.economiaQuitacao)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="glass-card p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progresso do pagamento</span>
                    <span className="font-medium">{calculos.percentualQuitado.toFixed(1)}%</span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-success to-primary transition-all duration-500"
                      style={{ width: `${calculos.percentualQuitado}%` }}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba Parcelas */}
              <TabsContent value="parcelas" className="mt-0">
                <InstallmentsTable emprestimo={emprestimo} />
              </TabsContent>

              {/* Aba Gráficos */}
              <TabsContent value="graficos" className="mt-0 space-y-4">
                <div className="glass-card p-4">
                  <h4 className="font-medium text-sm mb-4">Evolução do Saldo Devedor</h4>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={evolucaoData}>
                        <defs>
                          <linearGradient id="colorSaldoDetail" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.primary} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                        <XAxis dataKey="parcela" axisLine={false} tickLine={false} tick={{ fill: colors.mutedForeground, fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: colors.mutedForeground, fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: "8px" }}
                          formatter={(value: number) => [formatCurrency(value)]}
                        />
                        <Area type="monotone" dataKey="saldo" stroke={colors.primary} strokeWidth={2} fillOpacity={1} fill="url(#colorSaldoDetail)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-card p-4">
                  <h4 className="font-medium text-sm mb-4">Composição da Parcela</h4>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={evolucaoData.slice(0, 24)}>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                        <XAxis dataKey="parcela" axisLine={false} tickLine={false} tick={{ fill: colors.mutedForeground, fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: colors.mutedForeground, fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(1)}k`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: "8px" }}
                          formatter={(value: number) => [formatCurrency(value)]}
                        />
                        <Bar dataKey="juros" name="Juros" fill={colors.destructive} stackId="stack" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="amortizacao" name="Amortização" fill={colors.success} stackId="stack" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>

              {/* Aba Observações */}
              <TabsContent value="observacoes" className="mt-0">
                <div className="glass-card p-8 text-center">
                  <StickyNote className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {emprestimo.observacoes || "Nenhuma observação registrada"}
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}