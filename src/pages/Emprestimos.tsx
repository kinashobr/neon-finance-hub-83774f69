import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trash2, CreditCard, Calculator, TrendingDown, Percent, Calendar, DollarSign, Eye, Clock, Award, PiggyBank, Target, ChevronRight, AlertTriangle, Building2 } from "lucide-react";
import { useFinance, Emprestimo } from "@/contexts/FinanceContext";
import { EditableCell } from "@/components/EditableCell";
import { LoanCard } from "@/components/loans/LoanCard";
import { LoanForm } from "@/components/loans/LoanForm";
import { LoanAlerts } from "@/components/loans/LoanAlerts";
import { LoanSimulator } from "@/components/loans/LoanSimulator";
import { LoanCharts } from "@/components/loans/LoanCharts";
import { LoanDetailDialog } from "@/components/loans/LoanDetailDialog";
import { PeriodSelector, PeriodRange, periodToDateRange } from "@/components/dashboard/PeriodSelector";
import { cn } from "@/lib/utils";

const Emprestimos = () => {
  const { 
    emprestimos, 
    addEmprestimo, 
    updateEmprestimo, 
    deleteEmprestimo, 
    getTotalDividas,
    getPendingLoans,
    getContasCorrentesTipo,
    transacoesV2
  } = useFinance();
  
  const [selectedLoan, setSelectedLoan] = useState<Emprestimo | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [periodRange, setPeriodRange] = useState<PeriodRange>({
    startMonth: null,
    startYear: null,
    endMonth: null,
    endYear: null,
  });

  const handlePeriodChange = useCallback((period: PeriodRange) => {
    setPeriodRange(period);
  }, []);

  const dateRange = useMemo(() => periodToDateRange(periodRange), [periodRange]);

  // Get pending loans from liberações
  const pendingLoans = getPendingLoans();
  const contasCorrentes = getContasCorrentesTipo();

  // Filter emprestimos by date range
  const filteredEmprestimos = useMemo(() => {
    return emprestimos.filter(e => e.status !== 'pendente_config');
  }, [emprestimos]);

  // Get payment transactions for each loan
  const loanPayments = useMemo(() => {
    const payments: Record<number, { count: number; total: number }> = {};
    
    transacoesV2.forEach(t => {
      if (t.operationType === 'pagamento_emprestimo' && t.links?.loanId) {
        const loanId = parseInt(t.links.loanId);
        if (!payments[loanId]) {
          payments[loanId] = { count: 0, total: 0 };
        }
        payments[loanId].count++;
        payments[loanId].total += t.amount;
      }
    });
    
    return payments;
  }, [transacoesV2]);

  // Cálculos avançados
  const calculos = useMemo(() => {
    const totalContratado = getTotalDividas();
    
    let totalParcelasPagas = 0;
    let totalParcelasRestantes = 0;
    let saldoDevedorTotal = 0;
    let custoTotalEmprestimos = 0;
    let jurosTotal = 0;
    let jurosPagos = 0;
    let economiaQuitacao = 0;
    
    filteredEmprestimos.forEach(e => {
      const payment = loanPayments[e.id];
      const parcelasPagas = payment?.count || e.parcelasPagas || 0;
      const parcelasRestantes = e.meses - parcelasPagas;
      const saldoDevedor = Math.max(0, e.valorTotal - (parcelasPagas * e.parcela));
      const custoTotal = e.parcela * e.meses;
      const juros = custoTotal - e.valorTotal;
      const jurosJaPagos = juros * (parcelasPagas / e.meses);
      const jurosRestantes = juros - jurosJaPagos;
      
      totalParcelasPagas += parcelasPagas;
      totalParcelasRestantes += parcelasRestantes;
      saldoDevedorTotal += saldoDevedor;
      custoTotalEmprestimos += custoTotal;
      jurosTotal += juros;
      jurosPagos += jurosJaPagos;
      economiaQuitacao += jurosRestantes * 0.3;
    });
    
    const totalParcelas = filteredEmprestimos.reduce((acc, e) => acc + e.meses, 0);
    const percentualQuitado = totalParcelas > 0 ? (totalParcelasPagas / totalParcelas) * 100 : 0;
    
    const parcelaMes = filteredEmprestimos.reduce((acc, e) => acc + e.parcela, 0);
    
    const taxaMediaPonderada = totalContratado > 0 ? 
      filteredEmprestimos.reduce((acc, e) => acc + (e.taxaMensal * e.valorTotal), 0) / totalContratado : 0;
    
    const cetMedio = totalContratado > 0 ? 
      ((custoTotalEmprestimos / totalContratado - 1) / (totalParcelas / filteredEmprestimos.length || 1)) * 12 * 100 : 0;
    
    const hoje = new Date();
    const proximaParcela = new Date(hoje.getFullYear(), hoje.getMonth(), 10);
    if (proximaParcela <= hoje) {
      proximaParcela.setMonth(proximaParcela.getMonth() + 1);
    }
    
    const ranking = [...filteredEmprestimos]
      .map(e => ({
        ...e,
        custoTotal: e.parcela * e.meses,
        jurosTotal: (e.parcela * e.meses) - e.valorTotal,
      }))
      .sort((a, b) => b.taxaMensal - a.taxaMensal);
    
    return {
      totalContratado,
      saldoDevedorTotal,
      parcelaMes,
      totalParcelasPagas,
      totalParcelasRestantes,
      percentualQuitado,
      custoTotalEmprestimos,
      economiaQuitacao,
      proximaParcela,
      taxaMediaPonderada,
      cetMedio,
      jurosTotal,
      jurosPagos,
      ranking,
    };
  }, [filteredEmprestimos, getTotalDividas, loanPayments]);

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const handleViewLoan = (loan: Emprestimo) => {
    setSelectedLoan(loan);
    setDetailDialogOpen(true);
  };

  const handleConfigurePendingLoan = (loan: Emprestimo) => {
    setSelectedLoan(loan);
    setDetailDialogOpen(true);
  };

  const handleAddLoan = (data: {
    contrato: string;
    parcela: number;
    meses: number;
    taxaMensal: number;
    valorTotal: number;
    contaCorrenteId?: string;
  }) => {
    addEmprestimo({
      ...data,
      status: 'ativo',
      parcelasPagas: 0,
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Empréstimos</h1>
            <p className="text-muted-foreground mt-1">
              Controle completo e inteligente das suas dívidas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PeriodSelector 
              tabId="emprestimos" 
              onPeriodChange={handlePeriodChange} 
            />
            <LoanForm 
              onSubmit={handleAddLoan} 
              contasCorrentes={contasCorrentes}
            />
          </div>
        </div>

        {/* Pending Loans Alert */}
        {pendingLoans.length > 0 && (
          <Alert className="border-warning bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertTitle className="text-warning">Empréstimos Pendentes de Configuração</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Existem {pendingLoans.length} empréstimo(s) liberado(s) aguardando configuração completa.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {pendingLoans.map(loan => (
                  <Button
                    key={loan.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleConfigurePendingLoan(loan)}
                    className="gap-2 border-warning/50 hover:bg-warning/20"
                  >
                    <Building2 className="w-4 h-4" />
                    {loan.contrato} - {formatCurrency(loan.valorTotal)}
                  </Button>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Cards de Visão Geral - Linha 1 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <LoanCard
            title="Total Contratado"
            value={formatCurrency(calculos.totalContratado)}
            icon={<CreditCard className="w-5 h-5" />}
            status="danger"
            tooltip="Valor total de todos os empréstimos contratados"
            delay={0}
          />
          <LoanCard
            title="Saldo Devedor"
            value={formatCurrency(calculos.saldoDevedorTotal)}
            icon={<TrendingDown className="w-5 h-5" />}
            status="danger"
            tooltip="Valor total que ainda falta pagar"
            delay={50}
          />
          <LoanCard
            title="Parcela do Mês"
            value={formatCurrency(calculos.parcelaMes)}
            icon={<Calendar className="w-5 h-5" />}
            status="warning"
            tooltip="Soma de todas as parcelas mensais"
            delay={100}
          />
          <LoanCard
            title="Parcelas Pagas"
            value={`${calculos.totalParcelasPagas}`}
            subtitle={`de ${calculos.totalParcelasPagas + calculos.totalParcelasRestantes} total`}
            icon={<Clock className="w-5 h-5" />}
            status="success"
            tooltip="Número de parcelas já pagas"
            delay={150}
          />
          <LoanCard
            title="% Quitado"
            value={`${calculos.percentualQuitado.toFixed(1)}%`}
            icon={<Target className="w-5 h-5" />}
            status={calculos.percentualQuitado >= 50 ? "success" : "warning"}
            tooltip="Percentual do total já pago"
            delay={200}
          />
        </div>

        {/* Cards de Visão Geral - Linha 2 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <LoanCard
            title="Custo Total"
            value={formatCurrency(calculos.custoTotalEmprestimos)}
            icon={<Calculator className="w-5 h-5" />}
            status="neutral"
            tooltip="Soma de todas as parcelas (principal + juros)"
            delay={250}
          />
          <LoanCard
            title="Economia Quitação"
            value={formatCurrency(calculos.economiaQuitacao)}
            icon={<PiggyBank className="w-5 h-5" />}
            status="success"
            tooltip="Economia estimada com quitação antecipada"
            delay={300}
          />
          <LoanCard
            title="Próxima Parcela"
            value={calculos.proximaParcela.toLocaleDateString("pt-BR")}
            icon={<Calendar className="w-5 h-5" />}
            status="info"
            tooltip="Data de vencimento da próxima parcela"
            delay={350}
          />
          <LoanCard
            title="CET Médio"
            value={`${calculos.cetMedio.toFixed(1)}% a.a.`}
            icon={<Percent className="w-5 h-5" />}
            status={calculos.cetMedio <= 30 ? "success" : calculos.cetMedio <= 50 ? "warning" : "danger"}
            tooltip="Custo Efetivo Total médio anualizado"
            delay={400}
          />
          <LoanCard
            title="Taxa Média"
            value={`${calculos.taxaMediaPonderada.toFixed(2)}% a.m.`}
            icon={<Award className="w-5 h-5" />}
            status={calculos.taxaMediaPonderada <= 1.5 ? "success" : calculos.taxaMediaPonderada <= 2.5 ? "warning" : "danger"}
            tooltip="Média ponderada das taxas mensais"
            delay={450}
          />
        </div>

        {/* Layout Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda - Alertas e Simulador */}
          <div className="space-y-6">
            <LoanAlerts emprestimos={filteredEmprestimos} className="animate-fade-in-up" />
            <LoanSimulator emprestimos={filteredEmprestimos} className="animate-fade-in-up" />
            
            {/* Ranking dos mais caros */}
            <div className="glass-card p-5 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-warning" />
                <h3 className="text-lg font-semibold text-foreground">Ranking por Taxa</h3>
              </div>
              <div className="space-y-3">
                {calculos.ranking.slice(0, 3).map((emp, index) => (
                  <div
                    key={emp.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-[1.01] cursor-pointer",
                      index === 0 && "bg-destructive/10 border border-destructive/30",
                      index === 1 && "bg-warning/10 border border-warning/30",
                      index === 2 && "bg-muted/50 border border-border"
                    )}
                    onClick={() => handleViewLoan(emp)}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                      index === 0 && "bg-destructive text-destructive-foreground",
                      index === 1 && "bg-warning text-warning-foreground",
                      index === 2 && "bg-muted-foreground text-background"
                    )}>
                      {index + 1}º
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{emp.contrato.split(" - ")[0]}</p>
                      <p className="text-xs text-muted-foreground">
                        {emp.taxaMensal.toFixed(2)}% a.m.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm text-destructive">
                        {formatCurrency(emp.jurosTotal)}
                      </p>
                      <p className="text-xs text-muted-foreground">juros total</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna Direita - Gráficos */}
          <div className="lg:col-span-2">
            <LoanCharts emprestimos={filteredEmprestimos} />
          </div>
        </div>

        {/* Tabela de Empréstimos */}
        <div className="glass-card p-5 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Seus Empréstimos</h3>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              {filteredEmprestimos.length} contratos
            </Badge>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-muted/30">
                  <TableHead className="text-muted-foreground">Contrato</TableHead>
                  <TableHead className="text-muted-foreground text-right">Parcela</TableHead>
                  <TableHead className="text-muted-foreground text-right">Meses</TableHead>
                  <TableHead className="text-muted-foreground text-right">Taxa</TableHead>
                  <TableHead className="text-muted-foreground text-right">Valor Total</TableHead>
                  <TableHead className="text-muted-foreground text-right">Saldo Devedor</TableHead>
                  <TableHead className="text-muted-foreground text-center">Progresso</TableHead>
                  <TableHead className="text-muted-foreground w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmprestimos.map((item) => {
                  const payment = loanPayments[item.id];
                  const parcelasPagas = payment?.count || item.parcelasPagas || 0;
                  const saldoDevedor = Math.max(0, item.valorTotal - (parcelasPagas * item.parcela));
                  const progresso = (parcelasPagas / item.meses) * 100;
                  
                  return (
                    <TableRow 
                      key={item.id} 
                      className="border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => handleViewLoan(item)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-primary/10">
                            <CreditCard className="w-4 h-4 text-primary" />
                          </div>
                          <EditableCell
                            value={item.contrato}
                            onSave={(v) => updateEmprestimo(item.id, { contrato: String(v) })}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell
                          value={item.parcela}
                          type="currency"
                          onSave={(v) => updateEmprestimo(item.id, { parcela: Number(v) })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell
                          value={item.meses}
                          type="number"
                          onSave={(v) => updateEmprestimo(item.id, { meses: Number(v) })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "font-medium",
                          item.taxaMensal <= 1.5 ? "text-success" : 
                          item.taxaMensal <= 2.5 ? "text-warning" : "text-destructive"
                        )}>
                          {item.taxaMensal.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell
                          value={item.valorTotal}
                          type="currency"
                          onSave={(v) => updateEmprestimo(item.id, { valorTotal: Number(v) })}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        {formatCurrency(saldoDevedor)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-success to-primary transition-all"
                              style={{ width: `${progresso}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10">
                            {progresso.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewLoan(item)}
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteEmprestimo(item.id)}
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Detail Dialog */}
        <LoanDetailDialog
          emprestimo={selectedLoan}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
        />
      </div>
    </MainLayout>
  );
};

export default Emprestimos;
