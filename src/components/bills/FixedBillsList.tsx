import React from "react";
import { Building2, Shield, Repeat, DollarSign, Info, ShoppingCart, Plus, Trash2, Calendar, ArrowRight } from "lucide-react";
import { BillSourceType, PotentialFixedBill, formatCurrency } from "@/types/finance";
import { Button } from "@/components/ui/button";
import { cn, parseDateLocal } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FixedBillsListProps {
  bills: PotentialFixedBill[];
  onToggleFixedBill: (bill: PotentialFixedBill, isChecked: boolean) => void;
  mode?: "current" | "future";
}

const SOURCE_CONFIG: Record<BillSourceType, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  loan_installment: { icon: Building2, color: 'text-orange-500', bgColor: 'bg-orange-500/10', label: 'Empréstimo' },
  insurance_installment: { icon: Shield, color: 'text-blue-500', bgColor: 'bg-blue-500/10', label: 'Seguro' },
  fixed_expense: { icon: Repeat, color: 'text-purple-500', bgColor: 'bg-purple-500/10', label: 'Fixa' },
  variable_expense: { icon: DollarSign, color: 'text-warning', bgColor: 'bg-warning/10', label: 'Variável' },
  ad_hoc: { icon: Info, color: 'text-primary', bgColor: 'bg-primary/10', label: 'Avulsa' },
  purchase_installment: { icon: ShoppingCart, color: 'text-pink-500', bgColor: 'bg-pink-500/10', label: 'Parcela' },
};

export function FixedBillsList({ bills, onToggleFixedBill, mode = "current" }: FixedBillsListProps) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {bills.map((bill) => {
        const config = SOURCE_CONFIG[bill.sourceType as BillSourceType];
        const Icon = config.icon;
        const dueDate = parseDateLocal(bill.dueDate);

        return (
          <div 
            key={bill.key}
            className={cn(
              "group flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300",
              bill.isIncluded 
                ? "bg-primary/5 border-primary/30 shadow-sm" 
                : "bg-background border-transparent hover:border-muted/50"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                config.bgColor
              )}>
                <Icon className={cn("w-6 h-6", config.color)} />
              </div>
              
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base">{bill.description}</span>
                  {bill.isPaid && (
                    <span className="text-[10px] bg-success/20 text-success px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Paga</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(dueDate, "dd 'de' MMM", { locale: ptBR })}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <span className="font-semibold text-foreground/80">{formatCurrency(bill.expectedAmount)}</span>
                </div>
              </div>
            </div>
            
            <Button
              variant={bill.isIncluded ? "ghost" : "outline"}
              size="sm"
              onClick={() => onToggleFixedBill(bill, !bill.isIncluded)}
              className={cn(
                "h-10 px-4 rounded-xl gap-2 font-semibold transition-all",
                bill.isIncluded 
                  ? "text-destructive hover:bg-destructive/10" 
                  : "border-primary/50 text-primary hover:bg-primary hover:text-white"
              )}
            >
              {bill.isIncluded ? (
                <>
                  <Trash2 className="w-4 h-4" />
                  Remover
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Incluir
                </>
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}