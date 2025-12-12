import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trash2, CreditCard, Calculator, TrendingDown, Percent, Calendar, DollarSign, Eye, Clock, Award, PiggyBank, Target, ChevronRight, AlertTriangle, Building2 } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { Emprestimo } from "@/types/finance";
import { EditableCell } from "@/components/EditableCell";
import { LoanCard } from "@/components/loans/LoanCard";
import { LoanForm } from "@/components/loans/LoanForm";
import { LoanAlerts } from "@/components/loans/LoanAlerts";
import { LoanCharts } from "@/components/loans/LoanCharts";
import { LoanDetailDialog } from "@/components/loans/LoanDetailDialog";
import { LoanSimulator } from "@/components/loans/LoanSimulator";
import { PeriodSelector, DateRange, ComparisonDateRanges } from "@/components/dashboard/PeriodSelector";
import { cn } from "@/lib/utils";
import { startOfMonth, endOfMonth, isWithinInterval, format, subDays } from "date-fns";

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
  
  // Inicializa o range para o mês atual
  const now = new Date();
  const initialRange1: DateRange = { from: startOfMonth(now), to: endOfMonth(now) };
  
  // O range2 será calculado automaticamente pelo PeriodSelector
  const initialRanges: ComparisonDateRanges = { 
    range1: initialRange1, 
    range2: { from: undefined, to: undefined } 
  };
  
  const [dateRanges, setDateRanges] = useState<ComparisonDateRanges>(initialRanges);

  const handlePeriodChange = useCallback((ranges: ComparisonDateRanges) => {
    setDateRanges(ranges);
  }, []);

  // Helper function to calculate the next due date for a loan
  const getNextDueDate = (loan: Emprestimo): Date | null => {
    if (!loan.dataInicio || loan.meses === 0) return null;
    
    const nextParcela = (loan.parcelasPagas || 0) + 1;
    if (nextParcela > loan.meses) return null;

    const startDate = new Date(loan.dataInicio + "T00:00:00");
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + nextParcela);
    
    return dueDate;
  };

  // Cálculos principais
  const calculos = useMemo(() => {
    const totalContratado = emprestimos.reduce((acc, e) => acc + e.valorTotal, 0);
    const totalPago = emprestimos.reduce((acc, e) => acc + (e.parcelasPagas || 0) * e.parcela, 0);
    const saldoDevedor = emprestimos.reduce((acc, e) => {
      const parcelasPagas = e.parcelasPagas || 0;
      return acc + Math.max(0, e.valorTotal - (parcelasPagas * e.parcela));
    }, 0);
    const parcelaMensalTotal = emprestimos.reduce((acc, e) => acc + e.parcela, 0);
    const jurosTotais = emprestimos.reduce((acc, e) => acc + (e.parcela * e.meses - e.valorTotal), 0);
    
    return {
      totalContratado,
      totalPago,
      saldoDevedor,
      parcelaMensalTotal,
      jurosTotais,
    };
  }, [emprestimos]);

  // Filtra empréstimos ativos
  const emprestimosAtivos = useMemo(() => {
    return emprestimos.filter(e => e.status === 'ativo' || e.status === 'pendente_config');
  }, [emprestimos]);

  const contasCorrentes = getContasCorrentesTipo();

  const handleAddLoan = (data: Parameters<typeof addEmprestimo>[0]) => {
    addEmprestimo(data);
  };

  const handleEditLoan = (loan: Emprestimo) => {
    setSelectedLoan(loan);
    setDetailDialogOpen(true);
  };

  const handleDeleteLoan = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este empréstimo?")) {
      deleteEmprestimo(id);
    }
  };

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Empréstimos & Dívidas</h1>
            <p className="text-muted-foreground mt-1">Gerencie seus passivos e simule cenários de quitação</p>
          </div>
          <div className="flex items-center gap-2">
            <PeriodSelector 
              initialRanges={dateRanges}
              onDateRangeChange={handlePeriodChange} 
            />
            <LoanForm onSubmit={handleAddLoan} contasCorrentes={contasCorrentes} />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <LoanCard
            title="Saldo Devedor Total"
            value={formatCurrency(calculos.saldoDevedor)}
            icon={<TrendingDown className="w-5 h-5" />}
            status="danger"
            tooltip="Valor total que resta a pagar em todos os empréstimos ativos."
            delay={0}
          />
          <LoanCard
            title="Parcela Mensal Total"
            value={formatCurrency(calculos.parcelaMensalTotal)}
            icon={<Calendar className="w-5 h-5" />}
            status="warning"
            tooltip="Soma de todas as parcelas mensais de empréstimos."
            delay={50}
          />
          <LoanCard
            title="Juros Totais (Contrato)"
            value={formatCurrency(calculos.jurosTotais)}
            icon={<Percent className="w-5 h-5" />}
            status="warning"
            tooltip="Custo total em juros se os empréstimos forem pagos até o final."
            delay={100}
          />
          <LoanCard
            title="Empréstimos Ativos"
            value={emprestimosAtivos.length.toString()}
            icon={<CreditCard className="w-5 h-5" />}
            status="neutral"
            tooltip="Número de contratos de empréstimo ativos."
            delay={150}
          />
        </div>

        {/* Alerts and Simulator */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <LoanAlerts emprestimos={emprestimosAtivos} />
            <LoanCharts emprestimos={emprestimosAtivos} />
          </div>
          <div className="space-y-6">
            <LoanSimulator emprestimos={emprestimosAtivos} />
          </div>
        </div>

        {/* Loans Table */}
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Contratos Detalhados</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Taxa Mensal</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Próx. Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emprestimos.map((loan) => {
                const percentual = loan.meses > 0 ? ((loan.parcelasPagas || 0) / loan.meses) * 100 : 0;
                const nextDueDate = getNextDueDate(loan);
                const isPending = loan.status === 'pendente_config';
                
                return (
                  <TableRow key={loan.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        {loan.contrato}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(loan.valorTotal)}</TableCell>
                    <TableCell>{formatCurrency(loan.parcela)}</TableCell>
                    <TableCell>{loan.taxaMensal.toFixed(2)}%</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(percentual >= 100 && "border-success text-success")}>
                        {percentual.toFixed(0)}% ({loan.parcelasPagas || 0}/{loan.meses})
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isPending ? (
                        <Badge variant="outline" className="border-warning text-warning">Configurar</Badge>
                      ) : nextDueDate ? (
                        nextDueDate.toLocaleDateString("pt-BR")
                      ) : (
                        <Badge variant="outline" className="border-success text-success">Quitado</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          loan.status === 'ativo' && "border-primary text-primary",
                          loan.status === 'quitado' && "border-success text-success",
                          loan.status === 'pendente_config' && "border-warning text-warning"
                        )}
                      >
                        {loan.status === 'ativo' ? 'Ativo' : loan.status === 'quitado' ? 'Quitado' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditLoan(loan)} className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteLoan(loan.id)} className="h-8 w-8 text-destructive hover:text-destructive">
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

      <LoanDetailDialog
        emprestimo={selectedLoan}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </MainLayout>
  );
};

export default Emprestimos;