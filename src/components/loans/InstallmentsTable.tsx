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
import { Check, Clock, AlertTriangle, Upload, FileText } from "lucide-react";
import { Emprestimo } from "@/contexts/FinanceContext";
import { cn } from "@/lib/utils";

interface Parcela {
  numero: number;
  data: Date;
  valorTotal: number;
  juros: number;
  amortizacao: number;
  saldoDevedor: number;
  status: "pago" | "pendente" | "atrasado";
}

interface InstallmentsTableProps {
  emprestimo: Emprestimo;
  className?: string;
}

export function InstallmentsTable({ emprestimo, className }: InstallmentsTableProps) {
  const [parcelasPagas, setParcelasPagas] = useState<number[]>(() => {
    // Simula parcelas pagas (30% do total)
    const qtdPagas = Math.floor(emprestimo.meses * 0.3);
    return Array.from({ length: qtdPagas }, (_, i) => i + 1);
  });

  const parcelas = useMemo<Parcela[]>(() => {
    const taxa = emprestimo.taxaMensal / 100;
    const hoje = new Date();
    const dataInicio = new Date(hoje);
    dataInicio.setMonth(dataInicio.getMonth() - Math.floor(emprestimo.meses * 0.3));

    let saldoDevedor = emprestimo.valorTotal;
    const result: Parcela[] = [];

    for (let i = 1; i <= emprestimo.meses; i++) {
      const dataParcela = new Date(dataInicio);
      dataParcela.setMonth(dataParcela.getMonth() + i);

      const juros = saldoDevedor * taxa;
      const amortizacao = emprestimo.parcela - juros;
      saldoDevedor = Math.max(0, saldoDevedor - amortizacao);

      let status: Parcela["status"] = "pendente";
      if (parcelasPagas.includes(i)) {
        status = "pago";
      } else if (dataParcela < hoje) {
        status = "atrasado";
      }

      result.push({
        numero: i,
        data: dataParcela,
        valorTotal: emprestimo.parcela,
        juros: Math.max(0, juros),
        amortizacao: Math.max(0, amortizacao),
        saldoDevedor,
        status,
      });
    }

    return result;
  }, [emprestimo, parcelasPagas]);

  const marcarComoPago = (numero: number) => {
    if (parcelasPagas.includes(numero)) {
      setParcelasPagas(prev => prev.filter(p => p !== numero));
    } else {
      setParcelasPagas(prev => [...prev, numero].sort((a, b) => a - b));
    }
  };

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const statusConfig = {
    pago: { icon: Check, color: "bg-success/10 text-success border-success/30", label: "Pago" },
    pendente: { icon: Clock, color: "bg-primary/10 text-primary border-primary/30", label: "Pendente" },
    atrasado: { icon: AlertTriangle, color: "bg-destructive/10 text-destructive border-destructive/30", label: "Atrasado" },
  };

  return (
    <div className={cn("glass-card p-5 overflow-hidden", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Controle de Parcelas</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Check className="w-4 h-4 text-success" />
            {parcelasPagas.length} pagas
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-primary" />
            {emprestimo.meses - parcelasPagas.length} restantes
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground w-16">Nº</TableHead>
                <TableHead className="text-muted-foreground">Data</TableHead>
                <TableHead className="text-muted-foreground text-right">Valor</TableHead>
                <TableHead className="text-muted-foreground text-right">Juros</TableHead>
                <TableHead className="text-muted-foreground text-right">Amortização</TableHead>
                <TableHead className="text-muted-foreground text-right">Saldo</TableHead>
                <TableHead className="text-muted-foreground text-center">Status</TableHead>
                <TableHead className="text-muted-foreground w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((parcela) => {
                const config = statusConfig[parcela.status];
                const StatusIcon = config.icon;

                return (
                  <TableRow
                    key={parcela.numero}
                    className={cn(
                      "border-border hover:bg-muted/30 transition-colors",
                      parcela.status === "pago" && "opacity-60"
                    )}
                  >
                    <TableCell className="font-medium">{parcela.numero}</TableCell>
                    <TableCell>{parcela.data.toLocaleDateString("pt-BR")}</TableCell>
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
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => marcarComoPago(parcela.numero)}
                          className={cn(
                            "h-8 w-8",
                            parcela.status === "pago"
                              ? "text-success hover:text-success/80"
                              : "text-muted-foreground hover:text-success"
                          )}
                          title={parcela.status === "pago" ? "Desmarcar" : "Marcar como pago"}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="Upload comprovante"
                        >
                          <Upload className="w-4 h-4" />
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

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total Pago</p>
          <p className="text-lg font-bold text-success">
            {formatCurrency(parcelasPagas.length * emprestimo.parcela)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total Restante</p>
          <p className="text-lg font-bold text-destructive">
            {formatCurrency((emprestimo.meses - parcelasPagas.length) * emprestimo.parcela)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Progresso</p>
          <p className="text-lg font-bold text-primary">
            {((parcelasPagas.length / emprestimo.meses) * 100).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
