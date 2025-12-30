import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Settings, Plus } from "lucide-react";
import { PotentialFixedBill } from "@/types/finance";
import { FixedBillsList } from "./FixedBillsList";
import { cn } from "@/lib/utils";

interface FixedBillSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'current' | 'future';
  currentDate: Date;
  potentialFixedBills: PotentialFixedBill[];
  onToggleFixedBill: (bill: PotentialFixedBill, isChecked: boolean) => void;
}

export function FixedBillSelectorModal({
  open,
  onOpenChange,
  mode,
  currentDate,
  potentialFixedBills,
  onToggleFixedBill,
}: FixedBillSelectorModalProps) {
  const isCurrent = mode === 'current';
  const Icon = isCurrent ? Settings : Plus;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 
        Nota: DialogContent do shadcn/ui por padrão renderiza um botão 'X' (close). 
        Para evitar duplicidade com o botão que colocamos no DialogHeader, 
        garantimos que o botão do cabeçalho seja o único visualmente integrado.
      */}
      <DialogContent className="max-w-4xl p-0 overflow-hidden [&>button]:hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                isCurrent ? "bg-primary/10" : "bg-success/10"
              )}>
                <Icon className={cn("w-5 h-5", isCurrent ? "text-primary" : "text-success")} />
              </div>
              <div>
                <DialogTitle>
                  {isCurrent ? "Gerenciar Contas Fixas" : "Adiantar Parcelas Futuras"}
                </DialogTitle>
                <DialogDescription>
                  {isCurrent 
                    ? "Selecione as parcelas de empréstimos ou seguros para incluir neste mês" 
                    : "Selecione parcelas de meses futuros para pagar antecipadamente hoje"}
                </DialogDescription>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)} 
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <FixedBillsList
            bills={potentialFixedBills}
            onToggle={onToggleFixedBill}
            emptyMessage={isCurrent 
              ? "Nenhuma conta fixa pendente encontrada para este período." 
              : "Não há parcelas futuras disponíveis para adiantamento."}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}