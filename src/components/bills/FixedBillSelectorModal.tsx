import { useFinance } from "@/contexts/FinanceContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FixedBillsList } from "./FixedBillsList";
import { Settings2, FastForward, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PotentialFixedBill, generateBillId } from "@/types/finance";

interface FixedBillSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "current" | "future";
  currentDate: Date;
}

export function FixedBillSelectorModal({ open, onOpenChange, mode, currentDate }: FixedBillSelectorModalProps) {
  const { 
    getPotentialFixedBillsForMonth, 
    getFutureFixedBills, 
    getBillsForMonth, 
    setBillsTracker 
  } = useFinance();

  const localBills = getBillsForMonth(currentDate);
  const potentialFixedBills = mode === "current" 
    ? getPotentialFixedBillsForMonth(currentDate, localBills)
    : getFutureFixedBills(currentDate, localBills);

  const onToggleFixedBill = (potential: PotentialFixedBill, isChecked: boolean) => {
    if (isChecked) {
      setBillsTracker(prev => [
        ...prev,
        {
          id: generateBillId(),
          type: 'tracker',
          description: potential.description,
          dueDate: potential.dueDate,
          expectedAmount: potential.expectedAmount,
          isPaid: potential.isPaid,
          sourceType: potential.sourceType,
          sourceRef: potential.sourceRef,
          parcelaNumber: potential.parcelaNumber,
          isExcluded: false,
        }
      ]);
    } else {
      setBillsTracker(prev => prev.filter(b => 
        !(b.sourceType === potential.sourceType && 
          b.sourceRef === potential.sourceRef && 
          b.parcelaNumber === potential.parcelaNumber)
      ));
    }
  };

  const isAdvance = mode === "future";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className={cn(
            "p-6 text-white",
            isAdvance ? "bg-gradient-to-br from-primary to-primary/80" : "bg-gradient-to-br from-accent to-accent/80"
        )}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              {isAdvance ? <FastForward className="w-6 h-6" /> : <Settings2 className="w-6 h-6" />}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                {isAdvance ? "Adiantar Parcelas" : "Gerenciar Contas Fixas"}
              </DialogTitle>
              <DialogDescription className="text-white/80 font-medium">
                {isAdvance 
                  ? "Selecione parcelas de meses futuros para pagar agora" 
                  : `Selecione quais parcelas automáticas devem aparecer em ${format(currentDate, 'MMMM', { locale: ptBR })}`
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 max-h-[60vh] overflow-y-auto bg-background/50 backdrop-blur-sm">
          {potentialFixedBills.length > 0 ? (
            <div className="space-y-4">
               <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-xl border">
                 <AlertCircle className="w-4 h-4 text-primary" />
                 <span>As parcelas selecionadas serão adicionadas à sua lista de controle mensal.</span>
               </div>
               <FixedBillsList 
                  bills={potentialFixedBills} 
                  onToggleFixedBill={onToggleFixedBill}
                  mode={mode}
               />
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto opacity-50">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <p className="text-muted-foreground">Tudo certo! Nenhuma parcela pendente encontrada.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}