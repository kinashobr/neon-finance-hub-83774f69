import { useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Building2, Shield, Repeat, Clock, CalendarCheck, Info } from "lucide-react";
import { PotentialFixedBill, BillSourceType, formatCurrency } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { useFinance } from "@/contexts/FinanceContext"; // Import useFinance

interface FixedBillsListProps {
  bills: PotentialFixedBill[];
  onToggleFixedBill: (bill: PotentialFixedBill, isChecked: boolean) => void;
  mode: 'current' | 'future';
}

const SOURCE_CONFIG: Record<BillSourceType, { icon: React.ElementType; color: string; label: string }> = {
  loan_installment: { icon: Building2, color: 'text-orange-500', label: 'Empréstimo' },
  insurance_installment: { icon: Shield, color: 'text-blue-500', label: 'Seguro' },
  fixed_expense: { icon: Repeat, color: 'text-purple-500', label: 'Fixa' },
  variable_expense: { icon: Clock, color: 'text-warning', label: 'Variável' },
  ad_hoc: { icon: Info, color: 'text-primary', label: 'Avulsa' },
};

export function FixedBillsList({ bills, onToggleFixedBill, mode }: FixedBillsListProps) {
  const { transacoesV2 } = useFinance(); // Get transacoesV2 from context
  
  const sortedBills = useMemo(() => {
    return [...bills].sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
  }, [bills]);

  const handleToggle = useCallback((bill: PotentialFixedBill, isChecked: boolean) => {
    // Se estiver no modo 'future' e o usuário estiver incluindo (marcando),
    // precisamos garantir que a lógica de adiantamento seja tratada no BillsTrackerModal.
    onToggleFixedBill(bill, isChecked);
  }, [onToggleFixedBill]);

  return (
    <div className="rounded-lg border border-border overflow-y-auto flex-1 min-h-[100px]">
      <Table>
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow className="border-border hover:bg-transparent h-10">
            <TableHead className="w-12 text-center">
              <CalendarCheck className="w-4 h-4 mx-auto" />
            </TableHead>
            <TableHead className="w-24">Vencimento</TableHead>
            <TableHead className="w-24 text-right">Valor</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="w-24">Tipo</TableHead>
            <TableHead className="w-24 text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedBills.map((bill) => {
            const config = SOURCE_CONFIG[bill.sourceType] || SOURCE_CONFIG.ad_hoc;
            const Icon = config.icon;
            
            // Check if the bill is already paid via a transaction outside the tracker
            const isAlreadyPaidViaTransaction = transacoesV2.some(t =>
                (bill.sourceType === 'loan_installment' && t.links?.loanId === `loan_${bill.sourceRef}` && t.links?.parcelaId === String(bill.parcelaNumber)) ||
                (bill.sourceType === 'insurance_installment' && t.links?.vehicleTransactionId === `${bill.sourceRef}_${bill.parcelaNumber}`)
            );

            // Disable if already paid via transaction or if it's a paid bill in future mode
            const isDisabled = isAlreadyPaidViaTransaction || (mode === 'future' && bill.isPaid);
            
            return (
              <TableRow 
                key={bill.key} 
                className={cn(
                  "hover:bg-muted/30 transition-colors h-12",
                  bill.isPaid && "bg-success/5 hover:bg-success/10 border-l-4 border-success/50",
                  isDisabled && "opacity-60 cursor-not-allowed"
                )}
              >
                <TableCell className="text-center p-2 text-base">
                  <Checkbox
                    checked={bill.isIncluded || isAlreadyPaidViaTransaction} // If already paid, show as checked
                    onCheckedChange={(checked) => handleToggle(bill, checked as boolean)}
                    disabled={isDisabled}
                    className={cn("w-5 h-5", (bill.isIncluded || isAlreadyPaidViaTransaction) && "border-primary data-[state=checked]:bg-primary")}
                  />
                </TableCell>
                
                <TableCell className="font-medium whitespace-nowrap text-sm">
                  {parseDateLocal(bill.dueDate).toLocaleDateString("pt-BR")}
                </TableCell>
                
                <TableCell className="text-right font-semibold whitespace-nowrap text-sm">
                  {formatCurrency(bill.expectedAmount)}
                </TableCell>
                
                <TableCell className="text-sm max-w-[300px] truncate">
                  {bill.description}
                </TableCell>
                
                <TableCell className="text-sm">
                  <Badge variant="outline" className={cn("gap-1 text-xs px-2 py-0.5", config.color)}>
                    <Icon className="w-3 h-3" />
                    {config.label}
                  </Badge>
                </TableCell>
                
                <TableCell className="text-center text-sm">
                  {isAlreadyPaidViaTransaction ? (
                    <Badge variant="default" className="text-xs bg-success hover:bg-success/90">Pago (Ext.)</Badge>
                  ) : bill.isPaid ? (
                    <Badge variant="default" className="text-xs bg-success hover:bg-success/90">Pago</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Pendente</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {sortedBills.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Nenhuma conta fixa encontrada para este período.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}