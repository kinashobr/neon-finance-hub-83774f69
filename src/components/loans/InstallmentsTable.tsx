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
  const { transacoesV2, updateEmprestimo } = useFinance();
  
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

    for (let i = 1; i <= emprestimo.meses; i++) {
      const dataVencimento = getDueDate(emprestimo.dataInicio, i);
      
      // Simulação de amortização (Método Price simplificado)
      const juros = saldoDevedor * taxa;
      const amortizacao = emprestimo.parcela - juros;
      
      // Encontrar pagamento real
      const payment = payments.find(p => {
        // Tentativa de encontrar pelo número da parcela (se registrado)
        if (p.links?.parcelaId) {
          return parseInt(p.links.parcelaId) === i;
        }
        // Fallback: se a transação ocorreu no mês de vencimento
        const paymentDate = new Date(p.date + "T00:00:00");
        return paymentDate.getMonth() === dataVencimento.getMonth() && 
               paymentDate.getFullYear() === dataVencimento.getFullYear();
      });

      let status: Parcela["status"] = "pendente";
      let dataPagamento: string | undefined;
      let valorPago: number | undefined;
      let diferencaJuros: number | undefined;
      let diasDiferenca: number | undefined;

      if (payment) {
        status = "pago";
        dataPagamento = payment.date;
        valorPago = payment.amount;
        
        const paymentDate = new Date(dataPagamento + "T00:00:00");
        const diffTime = paymentDate.getTime() - dataVencimento.getTime();
        diasDiferenca = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        // Diferença de juros: valor pago - valor esperado da parcela
        // Se positivo: juros por atraso. Se negativo: desconto por adiantamento.
        diferencaJuros = valorPago - emprestimo.parcela;

        // Atualiza saldo devedor com base na amortização esperada
        saldoDevedor = Math.max(0, saldoDevedor - amortizacao);
      } else {
        // Se não foi pago e a data de vencimento já passou
        if (dataVencimento < hoje) {
          status = "atrasado";
        }
        // Atualiza saldo devedor com base na amortização esperada
        saldoDevedor = Math.max(0, saldoDevedor - amortizacao);
      }
      
      result.push({
        numero: i,
        dataVencimento,
        valorTotal: emprestimo.parcela,
        juros: Math.max(0, juros),
        amortizacao: Math.max(0, amortizacao),
        saldoDevedor,
        status,
        dataPagamento,
        valorPago,
        diferencaJuros,
        diasDiferenca,
      });
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
        {/* Aumentando a altura máxima para melhor visualização */}
        <div className="max-h-[50vh] overflow-y-auto scrollbar-thin">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground w-16">Nº</TableHead>
                <TableHead className="text-muted-foreground">Vencimento</TableHead>
                <TableHead className="text-muted-foreground">Pagamento</TableHead>
                <TableHead className="text-muted-foreground text-right">Valor Devido</TableHead>
                <TableHead className="text-muted-foreground text-right">Juros</TableHead>
                <TableHead className="text-muted-foreground text-right">Amortização</TableHead>
                <TableHead className="text-muted-foreground text-right">Saldo</TableHead>
                <TableHead className="text-muted-foreground text-center">Status</TableHead>
                <TableHead className="text-muted-foreground text-center">Ajuste</TableHead>
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
                      "border-border hover:bg-muted/30 transition-colors",
                      isPaid && "opacity-80 bg-success/5"
                    )}
                  >
                    <TableCell className="font-medium">{parcela.numero}</TableCell>
                    <TableCell>{parcela.dataVencimento.toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className={cn(isPaid ? "text-success" : "text-muted-foreground")}>
                      {parcela.dataPagamento ? new Date(parcela.dataPagamento + "T00:00:00").toLocaleDateString("pt-BR") : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(parcela.valorTotal)}
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
                    <TableCell className="text-center">
                      {parcela.diferencaJuros !== undefined && parcela.diferencaJuros !== 0 ? (
                        <div className={cn(
                          "flex items-center justify-end gap-1 text-xs font-medium",
                          parcela.diferencaJuros > 0 ? "text-destructive" : "text-success"
                        )}>
                          {parcela.diferencaJuros > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {formatCurrency(Math.abs(parcela.diferencaJuros))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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
            {formatCurrency(totalRestante)}
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