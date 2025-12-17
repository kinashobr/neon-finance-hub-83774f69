import { useMemo } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Repeat, Shield, Building2, CheckCircle2, Clock, Info, AlertTriangle } from "lucide-react";
import { PotentialFixedBill, BillSourceType, formatCurrency } from "@/types/finance";
import { cn, parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";

interface FixedBillsListProps {
  potentialBills: PotentialFixedBill[];
  onToggleFixedBill: (bill: PotentialFixedBill, isChecked: boolean) => void;
  currentDate: Date;
  title: string;
  description: string;
}

const SOURCE_CONFIG: Record<BillSourceType, { icon: React.ElementType; color: string; label: string }> = {
  loan_installment: { icon: Building2, color: 'text-orange-500', label: 'Empréstimo' },
  insurance_installment: { icon: Shield, color: 'text-blue-500', label: 'Seguro' },
  fixed_expense: { icon: Repeat, color: 'text-purple-500', label: 'Fixa' },
  variable_expense: { icon: AlertTriangle, color: 'text-warning', label: 'Variável' },
  ad_hoc: { icon: Info, color: 'text-primary', label: 'Avulsa' },
};

export function FixedBillsList({
  potentialBills,
  onToggleFixedBill,
  currentDate,
  title,
  description,
}: FixedBillsListProps) {
  
  const sortedBills = useMemo(() => {
    return [...potentialBills].sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
  }, [potentialBills]);

  return (
    <div className="space-y-4 h-full flex flex-col">
      <Alert className="border-primary bg-primary/10">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          {description}
        </AlertDescription>
      </Alert>

      <div className="rounded-lg border border-border overflow-y-auto flex-1 min-h-[100px]">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow className="border-border hover:bg-transparent h-10">
              <TableHead className="w-16 text-center">Incluir</TableHead>
              <TableHead className="w-24">Vencimento</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-24 text-right">Valor</TableHead>
              <TableHead className="w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedBills.map((bill) => {
              const config = SOURCE_CONFIG[bill.sourceType] || SOURCE_CONFIG.ad_hoc;
              const Icon = config.icon;
              const dueDate = parseDateLocal(bill.dueDate);
              const isOverdue = dueDate < currentDate && !bill.isPaid;
              
              // Apenas parcelas não pagas podem ser incluídas/excluídas
              const isToggleable = !bill.isPaid;

              return (
                <TableRow 
                  key={bill.key} 
                  className={cn(
                    "hover:bg-muted/30 transition-colors h-12",
                    bill.isPaid && "bg-success/5 hover:bg-success/10 border-l-4 border-success/50"
                  )}
                >
                  <TableCell className="text-center p-2">
                    <Checkbox
                      checked={bill.isIncluded}
                      onCheckedChange={(checked) => onToggleFixedBill(bill, checked as boolean)}
                      disabled={!isToggleable}
                      className={cn("w-5 h-5", bill.isIncluded && "border-primary data-[state=checked]:bg-primary")}
                    />
                  </TableCell>
                  
                  <TableCell className={cn("font-medium whitespace-nowrap text-sm", isOverdue && "text-destructive")}>
                    {format(dueDate, 'dd/MM/yyyy')}
                  </TableCell>
                  
                  <TableCell className="text-sm max-w-[300px] truncate">
                    <Badge variant="outline" className={cn("gap-1 text-xs px-2 py-0.5 mr-2", config.color)}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </Badge>
                    {bill.description}
                  </TableCell>
                  
                  <TableCell className="text-right font-semibold whitespace-nowrap text-sm">
                    {formatCurrency(bill.expectedAmount)}
                  </TableCell>
                  
                  <TableCell className="text-sm">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        bill.isPaid ? "border-success text-success" : isOverdue ? "border-destructive text-destructive" : "border-warning text-warning"
                      )}
                    >
                      {bill.isPaid ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                      {bill.isPaid ? 'Paga' : isOverdue ? 'Vencida' : 'Pendente'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {sortedBills.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  <Info className="w-6 h-6 mx-auto mb-2" />
                  Nenhuma parcela fixa encontrada para este período.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}