import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Settings, Plus, Calendar } from "lucide-react";
import { PotentialFixedBill } from "@/types/finance";
import { FixedBillsList } from "./FixedBillsList";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
      <DialogContent className="max-w-[70vw] w-full p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
        {/* Header Customizado */}
        <DialogHeader className={cn(
          "px-8 py-6 border-b shrink-0",
          isCurrent ? "bg-primary/5" : "bg-accent/5"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                isCurrent ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
              )}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  {isCurrent ? "Gerenciar Contas Fixas" : "Adiantar Parcelas Futuras"}
                </DialogTitle>
                <DialogDescription className="text-base mt-1">
                  {isCurrent 
                    ? `Parcelas pendentes de empréstimos e seguros para ${format(currentDate, 'MMMM yyyy', { locale: ptBR })}` 
                    : "Selecione parcelas de meses futuros para antecipar o pagamento hoje"}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-background border rounded-xl flex items-center gap-2 text-sm font-medium">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onOpenChange(false)} 
                className="rounded-full hover:bg-background/80"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo com Scroll */}
        <div className="p-8 max-h-[70vh] overflow-y-auto bg-background/50">
          <div className="max-w-4xl mx-auto">
            <FixedBillsList
              bills={potentialFixedBills}
              onToggle={onToggleFixedBill}
              emptyMessage={isCurrent 
                ? "Nenhuma conta fixa pendente encontrada para este período. Verifique se todos os empréstimos e seguros já foram incluídos ou se estão quitados." 
                : "Não há parcelas futuras disponíveis para adiantamento no momento."}
            />
          </div>
        </div>

        {/* Footer Informativo */}
        <div className="px-8 py-4 border-t bg-muted/30 flex justify-between items-center shrink-0">
          <p className="text-xs text-muted-foreground italic">
            * Marque os itens para incluí-los na lista de controle de pagamentos do mês.
          </p>
          <Button onClick={() => onOpenChange(false)} className="rounded-xl px-8 font-semibold">
            Concluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}