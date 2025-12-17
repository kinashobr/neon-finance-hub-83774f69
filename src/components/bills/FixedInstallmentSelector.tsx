import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { AlertTriangle, Building2, Shield, Repeat } from "lucide-react";
import { PotentialFixedBill, formatCurrency } from "@/types/finance";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface FixedInstallmentSelectorProps {
  potentialBills: PotentialFixedBill[];
  onToggleInstallment: (bill: PotentialFixedBill, isChecked: boolean) => void;
}

const SOURCE_ICONS: Record<PotentialFixedBill['sourceType'], React.ElementType> = {
  loan_installment: Building2,
  insurance_installment: Shield,
};

const SOURCE_LABELS: Record<PotentialFixedBill['sourceType'], string> = {
  loan_installment: 'Empréstimo',
  insurance_installment: 'Seguro',
};

export function FixedInstallmentSelector({
  potentialBills,
  onToggleInstallment,
}: FixedInstallmentSelectorProps) {
  const pendingBills = useMemo(() => 
    potentialBills.filter(b => !b.isPaid),
    [potentialBills]
  );

  if (pendingBills.length === 0) {
    return (
      <Card className="p-3 text-center text-sm text-muted-foreground">
        <Repeat className="w-4 h-4 mx-auto mb-1" />
        Nenhuma parcela fixa pendente neste mês.
      </Card>
    );
  }

  return (
    <Card className="glass-card p-3 space-y-2 shrink-0">
      <Label className="text-sm font-semibold text-foreground flex items-center gap-1">
        <Repeat className="w-4 h-4 text-purple-500" />
        Parcelas Fixas Pendentes ({pendingBills.length})
      </Label>
      
      <ScrollArea className="h-[150px] border rounded-md">
        <Table>
          <TableBody>
            {pendingBills.map((bill) => {
              const Icon = SOURCE_ICONS[bill.sourceType];
              const isOverdue = new Date(bill.dueDate) < new Date();
              
              return (
                <TableRow 
                  key={bill.key} 
                  className={cn(
                    "h-10 hover:bg-muted/30 transition-colors",
                    isOverdue && "bg-destructive/5 hover:bg-destructive/10"
                  )}
                >
                  <TableCell className="w-10 text-center p-2">
                    <Checkbox
                      checked={bill.isIncluded}
                      onCheckedChange={(checked) => onToggleInstallment(bill, checked as boolean)}
                      className="w-4 h-4"
                    />
                  </TableCell>
                  <TableCell className="p-2 text-xs font-medium max-w-[150px] truncate">
                    <div className="flex items-center gap-1">
                      <Icon className={cn("w-3 h-3", bill.sourceType === 'loan_installment' ? 'text-orange-500' : 'text-blue-500')} />
                      {bill.description}
                    </div>
                  </TableCell>
                  <TableCell className="p-2 text-xs text-right w-20">
                    {formatCurrency(bill.expectedAmount)}
                  </TableCell>
                  <TableCell className={cn("p-2 text-xs text-right w-20", isOverdue && "text-destructive")}>
                    <div className="flex items-center justify-end gap-1">
                        {isOverdue && <AlertTriangle className="w-3 h-3" />}
                        {format(new Date(bill.dueDate), 'dd/MM')}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
      <p className="text-[10px] text-muted-foreground">
        Marque as parcelas que você planeja pagar neste mês para incluí-las na lista.
      </p>
    </Card>
  );
}