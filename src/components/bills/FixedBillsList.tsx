import { PotentialFixedBill, formatCurrency } from "@/types/finance";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Building2, Shield, Calendar, ArrowUpRight } from "lucide-react";
import { cn, parseDateLocal } from "@/lib/utils";

export interface FixedBillsListProps {
  bills: PotentialFixedBill[];
  onToggle: (bill: PotentialFixedBill, isChecked: boolean) => void;
  emptyMessage?: string;
}

export function FixedBillsList({ bills, onToggle, emptyMessage }: FixedBillsListProps) {
  if (bills.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 bg-muted/20 rounded-2xl border-2 border-dashed">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <Calendar className="w-8 h-8" />
        </div>
        <p className="text-muted-foreground max-w-sm px-6">
          {emptyMessage || "Nenhuma conta encontrada."}
        </p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = parseDateLocal(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      {bills.map((bill) => {
        const isLoan = bill.sourceType === 'loan_installment';
        const Icon = isLoan ? Building2 : Shield;
        
        return (
          <div
            key={bill.key}
            className={cn(
              "group flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200",
              bill.isIncluded 
                ? "bg-primary/5 border-primary ring-1 ring-primary/20" 
                : "bg-card border-border hover:border-muted-foreground/30 hover:shadow-md"
            )}
          >
            <div className="flex items-center gap-5">
              <div className="relative flex items-center justify-center">
                <Checkbox
                  id={bill.key}
                  checked={bill.isIncluded}
                  onCheckedChange={(checked) => onToggle(bill, checked as boolean)}
                  disabled={bill.isPaid}
                  className="w-6 h-6 rounded-lg data-[state=checked]:bg-primary"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                  isLoan ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600",
                  bill.isIncluded && (isLoan ? "bg-orange-600 text-white" : "bg-blue-600 text-white")
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                
                <div>
                  <label htmlFor={bill.key} className="font-bold text-lg cursor-pointer block leading-tight">
                    {bill.description}
                  </label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      Vence em {formatDate(bill.dueDate)}
                    </span>
                    {bill.isPaid && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30 px-2 py-0">
                        Pago no Extrato
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-right flex flex-col items-end gap-1">
              <div className="text-xl font-black tracking-tight text-foreground">
                {formatCurrency(bill.expectedAmount)}
              </div>
              <Badge variant="secondary" className="rounded-md font-medium text-[10px] uppercase tracking-wider px-2 py-0.5">
                {isLoan ? 'Empréstimo' : 'Seguro Veicular'}
              </Badge>
              {bill.isIncluded && !bill.isPaid && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-primary mt-1">
                  <ArrowUpRight className="w-3 h-3" />
                  INCLUÍDO NO CONTROLE
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}