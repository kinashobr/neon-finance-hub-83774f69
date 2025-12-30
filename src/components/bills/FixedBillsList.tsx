import { PotentialFixedBill, formatCurrency } from "@/types/finance";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn, parseDateLocal } from "@/lib/utils";

export interface FixedBillsListProps {
  bills: PotentialFixedBill[];
  onToggle: (bill: PotentialFixedBill, isChecked: boolean) => void;
  emptyMessage?: string;
}

export function FixedBillsList({ bills, onToggle, emptyMessage }: FixedBillsListProps) {
  if (bills.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {emptyMessage || "Nenhuma conta encontrada."}
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = parseDateLocal(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  return (
    <div className="space-y-2">
      {bills.map((bill) => (
        <div
          key={bill.key}
          className={cn(
            "flex items-center justify-between p-3 rounded-lg border transition-colors",
            bill.isIncluded ? "bg-primary/5 border-primary/20" : "bg-card border-border hover:bg-muted/50"
          )}
        >
          <div className="flex items-center gap-3">
            <Checkbox
              checked={bill.isIncluded}
              onCheckedChange={(checked) => onToggle(bill, checked as boolean)}
              disabled={bill.isPaid}
            />
            <div>
              <div className="font-medium text-sm">{bill.description}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">Vencimento: {formatDate(bill.dueDate)}</span>
                {bill.isPaid && (
                  <Badge variant="outline" className="text-[10px] h-4 bg-success/10 text-success border-success/20">
                    Pago
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-sm">{formatCurrency(bill.expectedAmount)}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {bill.sourceType === 'loan_installment' ? 'Empréstimo' : 'Seguro'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}