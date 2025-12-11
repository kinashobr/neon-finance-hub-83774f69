import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, AlertTriangle, Upload, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { Emprestimo, useFinance } from "@/contexts/FinanceContext";
import { TransacaoCompleta } from "@/types/finance";
import { cn } from "@/lib/utils";

interface Parcela {
  numero: number;
  dataVencimento: Date;
  valorTotal: number;
  juros: number;
  amortizacao: number;
  saldoDevedor: number;
  status: "pago" | "pendente" | "atrasado";
  dataPagamento?: string;
  valorPago?: number;
  diferencaJuros?: number; // Positivo se juros por atraso, negativo se desconto por adiantamento
  diasDiferenca?: number; // Dias de diferença entre pagamento e vencimento
}

interface InstallmentsTableProps {
  emprestimo: Emprestimo;
  className?: string;
}

// Função auxiliar para calcular a data de vencimento
const getDueDate = (startDateStr: string, installmentNumber: number): Date => {
  const startDate = new Date(startDateStr + "T00:00:00");
  const dueDate = new Date(startDate);
  dueDate.setMonth(dueDate.getMonth() + installmentNumber);
  return dueDate;
};

export function InstallmentsTable({ emprestimo, className }: InstallmentsTableProps) {
  const { transacoesV2 } = useFinance();
  
  // Buscar transações de pagamento vinculadas a este empréstimo
  const payments = useMemo(() => {
    return transacoesV2.filter(t => 
      t.operationType === 'pagamento_emprestimo' && 
      t.links?.loanId === `loan_${emprestimo.id}`
    );
  }, [transacoesV2, emprestimo.id]);

  const parcelas = useMemo<Parcela[]>(() => {
    if (!emprestimo.dataInicio || emprestimo.meses === 0) return [];

    const taxa = emprestimo.taxaMensal / 100;
    const hoje = new Date();
    
    let saldoDevedor = emprestimo.valorTotal;
    const result: Parcela[] = [];

    // Mapear pagamentos por número de parcela (se disponível) ou por data
    const paymentsMap = new Map<number, TransacaoCompleta>();
    payments.forEach(p => {
      if (p.links?.parcelaId) {
        paymentsMap.set(parseInt(p.links.parcelaId), p);
      } else {
        // Fallback: tentar mapear pelo índice de parcela paga no empréstimo legado
        // Isso é complexo e impreciso, mas necessário para dados legados sem parcelaId
        // Para simplificar, vamos confiar no `parcelasPagas` do objeto emprestimo para dados legados
      }
    });

    for (let i = 1; i <= emprestimo.meses; i++) {
      const dataVencimento = getDueDate(emprestimo.dataInicio, i);
      
      // Simulação de amortização (Método Price simplificado)
      const juros = saldoDevedor * taxa;
      const amortizacao = emprestimo.parcela - juros;
      
      // Encontrar pagamento real
      const payment = paymentsMap.get(i);
      
      // Se não encontrou pelo ID, e se for uma parcela paga no sistema legado
      const isLegadoPaid = !payment && i <= (emprestimo.parcelasPagas || 0);

      let status: Parcela["status"] = "pendente";
      let dataPagamento: string | undefined;
      let valorPago: number | undefined;
      let diferencaJuros: number | undefined;
      let diasDiferenca: number | undefined;
      let amortizacaoEfetiva = amortizacao;

      if (payment || isLegadoPaid) {
        status = "pago";
        
        if (payment) {
          dataPagamento = payment.date;
          valorPago = payment.amount;
          
          const paymentDate = new Date(dataPagamento + "T00:00:00");
          const diffTime = paymentDate.getTime() - dataVencimento.getTime();
          diasDiferenca = Math.round(diffTime / (1000 * 60 * 60 * 24));
          
          diferencaJuros = valorPago - emprestimo.parcela;
          amortizacaoEfetiva = emprestimo.parcela - juros; // Mantemos a amortização esperada
        } else if (isLegadoPaid) {
          // Dados legados
          dataPagamento = 'N/A';
          valorPago = emprestimo.parcela;
          diferencaJuros = 0;
        }
        
        // Atualiza saldo devedor com base na amortização esperada
        saldoDevedor = Math.max(0, saldoDevedor - amortizacaoEfetiva);
      } else {
        // Se não foi pago e a data de vencimento já passou
        if (dataVencimento < hoje) {
          status = "atrasado";
        }
        // O saldo devedor não é atualizado se a parcela não foi paga
      }
      
      result.push({
        numero: i,
        dataVencimento,
        valorTotal: emprestimo.parcela,
        juros: Math.max(0, juros),
        amortizacao: Math.max(0, amortizacao),
        saldoDevedor: status === 'pago' ? saldoDevedor : saldoDevedor + amortizacao, // Se não pago, o saldo devedor é o anterior
        status,
        dataPagamento,
        valorPago,
        diferencaJuros,
        diasDiferenca,
      });
    }

    // Recalcular o saldo devedor para as parcelas não pagas
    let saldoAtual = emprestimo.valorTotal;
    for (let i = 0; i < result.length; i++) {
      const parcela = result[i];
      const juros = saldoAtual * taxa;
      const amortizacao = emprestimo.parcela - juros;

      if (parcela.status === 'pago') {
        saldoAtual = Math.max(0, saldoAtual - amortizacao);
      }
      
      parcela.saldoDevedor = saldoAtual;
      if (parcela.status !== 'pago') {
        parcela.saldoDevedor = saldoAtual - amortizacao; // Saldo devedor antes do pagamento
      }
    }
    
    // Correção final do saldo devedor
    let saldoCorrigido = emprestimo.valorTotal;
    for (let i = 0; i < result.length; i++) {
      const parcela = result[i];
      const juros = saldoCorrigido * taxa;
      const amortizacao = emprestimo.parcela - juros;
      
      parcela.juros = Math.max(0, juros);
      parcela.amortizacao = Math.max(0, amortizacao);
      
      if (parcela.status === 'pago') {
        saldoCorrigido = Math.max(0, saldoCorrigido - amortizacao);
      }
      parcela.saldoDevedor = saldoCorrigido;
    }
    
    // Ajustar o saldo devedor para mostrar o saldo ANTES do pagamento da parcela
    for (let i = 0; i < result.length; i++) {
      const parcela = result[i];
      if (parcela.status === 'pago') {
        parcela.saldoDevedor = parcela.saldoDevedor + parcela.amortizacao;
      }
    }
    
    // A última parcela paga deve ter saldo devedor 0
    if (result.length > 0 && result[result.length - 1].status === 'pago') {
      result[result.length - 1].saldoDevedor = 0;
    }


    return result;
  }, [emprestimo, payments]);

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const statusConfig = {
    pago: { icon: Check, color: "bg-success/10 text-success border-success/30", label: "Pago" },
    pendente: { icon: Clock, color: "bg-primary/10 text-primary border-primary/30", label: "Pendente" },
    atrasado: { icon: AlertTriangle, color: "bg-destructive/10 text-destructive border-destructive/30", label: "Atrasado" },
  };

  const totalPago = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalRestante = parcelas.filter(p => p.status !== 'pago').reduce((acc, p) => acc + p.valorTotal, 0);
  const totalParcelasPagas = parcelas.filter(p => p.status === 'pago').length;

  return (
    <div className={cn("glass-card p-5 overflow-hidden", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Controle de Parcelas</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Check className="w-4 h-4 text-success" />
            {totalParcelasPagas} pagas
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-primary" />
            {emprestimo.meses - totalParcelasPagas} restantes
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="max-h-[50vh] overflow-y-auto scrollbar-thin">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground w-16">Nº</TableHead>
                <TableHead className="text-muted-foreground">Vencimento</TableHead>
                <TableHead className="text-muted-foreground">Pagamento</TableHead>
                <TableHead className="text-muted-foreground text-right">Valor Parcela</TableHead>
                <TableHead className="text-muted-foreground text-right">Juros</TableHead>
                <TableHead className="text-muted-foreground text-right">Amortização</TableHead>
                <TableHead className="text-muted-foreground text-right">Saldo Devedor</TableHead>
                <TableHead className="text-muted-foreground text-center">Status</TableHead>
                <TableHead className="text-muted-foreground text-center">Valor Pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((parcela) => {
                const config = statusConfig[parcela.status];
                const StatusIcon = config.icon;
                const isPaid = parcela.status === 'pago';

                return (
                  <TableRow
                    key={parcela.numero}
                    className={cn(
                      "border-border transition-colors",
                      isPaid ? "bg-success/5 hover:bg-success/10" : "hover:bg-muted/30",
                      parcela.status === 'atrasado' && "bg-destructive/5 hover:bg-destructive/10"
                    )}
                  >
                    <TableCell className="font-medium">{parcela.numero}</TableCell>
                    <TableCell>{parcela.dataVencimento.toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className={cn(isPaid ? "text-success" : "text-muted-foreground")}>
                      {parcela.dataPagamento ? new Date(parcela.dataPagamento + "T00:00:00").toLocaleDateString("pt-BR") : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(emprestimo.parcela)}
                    </TableCell>
                    <TableCell className="text-right text-warning">
                      {formatCurrency(parcela.juros)}
                    </TableCell>
                    <TableCell className="text-right text-success">
                      {formatCurrency(parcela.amortizacao)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(parcela.saldoDevedor)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("gap-1", config.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {isPaid ? formatCurrency(parcela.valorPago || emprestimo.parcela) : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total Pago</p>
          <p className="text-lg font-bold text-success">
            {formatCurrency(totalPago)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total Restante</p>
          <p className="text-lg font-bold text-destructive">
            {formatCurrency(emprestimo.valorTotal - totalPago)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Progresso</p>
          <p className="text-lg font-bold text-primary">
            {((totalParcelasPagas / emprestimo.meses) * 100).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}