import { useState, useMemo, useCallback, useEffect } from "react";
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
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { DateRange, ComparisonDateRanges } from "@/types/finance";
import { cn, parseDateLocal, getDueDate } from "@/lib/utils";
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
    transacoesV2,
    dateRanges,
    setDateRanges,
    getSaldoDevedor,
    getLoanPrincipalRemaining, // <-- NEW
    getCreditCardDebt, // <-- NEW
    calculatePaidInstallmentsUpToDate, // <-- ADDED
  } = useFinance();
  
  const [selectedLoan, setSelectedLoan] = useState<Emprestimo | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  const handlePeriodChange = useCallback((ranges: ComparisonDateRanges) => {
    setDateRanges(ranges);
  }, [setDateRanges]);

  // Get pending loans list
  const pendingLoans = getPendingLoans(); 

  // Effect to handle auto-opening configuration for pending loans
  useEffect(() => {
    if (pendingLoans.length === 1 && pendingLoans[0].status === 'pendente_config') {
      setSelectedLoan(pendingLoans[0]);
      setDetailDialogOpen(true);
    }
  }, [pendingLoans]);

  // Helper function to calculate the next due date for a loan
  const getNextDueDate = useCallback((loan: Emprestimo): Date | null => {
    if (!loan.dataInicio || loan.meses === 0) return null;
    
    // Use the dynamically calculated paid installments up to the end of the period
    const paidUpToDate = calculatePaidInstallmentsUpToDate(loan.id, dateRanges.range1.to || new Date());
    
    const nextParcela = paidUpToDate + 1;
    if (nextParcela > loan.meses) return null;

    // Usa parseDateLocal para garantir que a data de início seja interpretada localmente
    const startDate = parseDateLocal(loan.dataInicio);
    const dueDate = new Date(startDate);
    
    // Ajuste: Se nextParcela = 1, offset é 0 meses.
    dueDate.setMonth(dueDate.getMonth() + nextParcela - 1);
    
    return dueDate;
  }, [calculatePaidInstallmentsUpToDate, dateRanges.range1.to]);

  // Cálculos principais
  const calculos = useMemo(() => {
    const targetDate = dateRanges.range1.to;
    
    // Saldo Devedor Total (Apenas Empréstimos)
    const principalEmprestimos = getLoanPrincipalRemaining(targetDate);
    
    // Dívida Cartões (Mantida para cálculo interno, mas não exibida no card principal)
    const dividaCartoes = getCreditCardDebt(targetDate);
    
    const totalContratado = emprestimos.reduce((acc, e) => acc + e.valorTotal, 0);
    
    // Calculate total paid based on transactions up to the period end date
    const totalPaid = emprestimos.reduce((acc, e) => {
        if (e.status === 'quitado' || e.status === 'pendente_config') return acc;
        
        const paidCount = calculatePaidInstallmentsUpToDate(e.id, targetDate || new Date());
        // Simplificação: Multiplica o número de parcelas pagas pelo valor da parcela fixa
        return acc + (paidCount * e.parcela);
    }, 0);
    
    const parcelaMensalTotal = emprestimos.reduce((acc, e) => acc + e.parcela, 0);
    const jurosTotais = emprestimos.reduce((acc, e) => acc + (e.parcela * e.meses - e.valorTotal), 0);
    
    return {
      totalContratado,
      totalPago: totalPaid, // Use calculated total paid
      saldoDevedorTotal: principalEmprestimos, // FIXED: Only show loan principal here
      principalEmprestimos, 
      dividaCartoes, 
      parcelaMensalTotal,
      jurosTotais,
    };
  }, [emprestimos, getLoanPrincipalRemaining, getCreditCardDebt, dateRanges.range1.to, calculatePaidInstallmentsUpToDate]);

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
            <h1 className="text-3xl font-bold text-foreground">Empréstimos & Financiamentos</h1>
            <p className="text-muted-foreground mt-1">Gerencie seus passivos de longo prazo e simule cenários de quitação</p>
          </div>
          <div className="flex items-center gap-2">
            <PeriodSelector 
              initialRanges={dateRanges}
              onDateRangeChange={handlePeriodChange} 
            />
            {/* Ocultando o botão Novo Empréstimo, mas mantendo a funcionalidade */}
            <div className="hidden">
              <LoanForm onSubmit={handleAddLoan} contasCorrentes={contasCorrentes} />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <LoanCard
            title="Saldo Devedor Principal"
            value={formatCurrency(calculos.saldoDevedorTotal)}
            icon={<TrendingDown className="w-5 h-5" />}
            status="danger"
            tooltip="Valor total que resta a pagar em todos os empréstimos e financiamentos (apenas principal restante)."
            delay={0}
          />
          
          {/* Dívida Cartões de Crédito (Mantido para referência, mas com título ajustado) */}
          <LoanCard
            title="Dívida Cartões de Crédito"
            value={formatCurrency(calculos.dividaCartoes)}
            icon={<CreditCard className="w-5 h-5" />}
            status={calculos.dividaCartoes > 0 ? "warning" : "success"}
            tooltip="Saldo negativo total das contas de Cartão de Crédito (fatura pendente). Esta é uma dívida operacional."
            delay={50}
          />
          
          <LoanCard
            title="Parcela Mensal Total"
            value={formatCurrency(calculos.parcelaMensalTotal)}
            icon={<Calendar className="w-5 h-5" />}
            status="warning"
            tooltip="Soma de todas as parcelas mensais de empréstimos."
            delay={100}
          />
          
          {/* Juros Totais (Contrato) */}
          <LoanCard
            title="Juros Totais (Contrato)"
            value={formatCurrency(calculos.jurosTotais)}
            icon={<Percent className="w-5 h-5" />}
            status="warning"
            tooltip="Custo total em juros se os empréstimos forem pagos até o final."
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
                // Calculate paid installments dynamically based on transactions
                const paidCount = calculatePaidInstallmentsUpToDate(loan.id, dateRanges.range1.to || new Date());
                const percentual = loan.meses > 0 ? (paidCount / loan.meses) * 100 : 0;
                
                // Use paidCount for next due date calculation
                const nextDueDate = getNextDueDate({ ...loan, parcelasPagas: paidCount });
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
                        {percentual.toFixed(0)}% ({paidCount}/{loan.meses})
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