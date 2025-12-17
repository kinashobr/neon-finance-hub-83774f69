import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Repeat } from "lucide-react";
import { FixedBillsList } from "./FixedBillsList";
import { PotentialFixedBill } from "@/types/finance";

interface FixedBillSelectorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'current' | 'future';
    currentDate: Date;
    potentialFixedBills: PotentialFixedBill[];
    onToggleFixedBill: (potentialBill: PotentialFixedBill, isChecked: boolean) => void;
}

export function FixedBillSelectorModal({ open, onOpenChange, mode, currentDate, potentialFixedBills, onToggleFixedBill }: FixedBillSelectorModalProps) {
    const title = mode === 'current' ? "Gerenciar Parcelas Fixas do Mês" : "Próximos Vencimentos Fixos";
    const description = mode === 'current' 
        ? "Selecione as parcelas de empréstimos e seguros que devem ser incluídas na lista de contas a pagar deste mês."
        : "Visualize e gerencie parcelas futuras de empréstimos e seguros.";
        
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-0 shrink-0">
                    <DialogTitle className="flex items-center gap-3">
                        <Repeat className="w-5 h-5 text-primary" />
                        {title}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6 pt-4">
                    <FixedBillsList
                        potentialBills={potentialFixedBills}
                        onToggleFixedBill={onToggleFixedBill}
                        currentDate={currentDate}
                        title={title}
                        description={description}
                    />
                </div>
                <div className="p-4 border-t border-border flex justify-end shrink-0">
                    <Button onClick={() => onOpenChange(false)}>Fechar</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}