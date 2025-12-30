import { useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillsTrackerList } from "@/components/bills/BillsTrackerList";
import { FixedBillSelectorModal } from "@/components/bills/FixedBillSelectorModal";
import { AddPurchaseInstallmentDialog } from "@/components/bills/AddPurchaseInstallmentDialog";
import { Button } from "@/components/ui/button";
import { Settings2, FastForward, ShoppingCart, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function BillsTracker() {
  const { 
    getBillsForMonth, 
    getOtherPaidExpensesForMonth,
    updateBill, 
    deleteBill, 
    setBillsTracker,
    billsTracker,
    transacoesV2 
  } = useFinance();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);

  const trackerBills = getBillsForMonth(currentDate);
  const externalPaidBills = getOtherPaidExpensesForMonth(currentDate);
  const allDisplayBills = [...trackerBills, ...externalPaidBills];

  const handleTogglePaid = (bill: any, isChecked: boolean) => {
    updateBill(bill.id, { isPaid: isChecked, paymentDate: isChecked ? format(new Date(), 'yyyy-MM-dd') : undefined });
  };

  return (
    <div className="container mx-auto p-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rastreador de Contas</h1>
            <p className="text-muted-foreground capitalize">
              {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <Button
            variant="outline"
            onClick={() => setIsPurchaseDialogOpen(true)}
            className="rounded-xl border-pink-500/50 text-pink-500 hover:bg-pink-500/10 gap-2 shrink-0 h-10"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Parcelado</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsManageModalOpen(true)}
            className="rounded-xl gap-2 shrink-0 h-10"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Gerenciar Fixas</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsAdvanceModalOpen(true)}
            className="rounded-xl gap-2 shrink-0 h-10"
          >
            <FastForward className="w-4 h-4" />
            <span className="hidden sm:inline">Adiantar Parcelas</span>
          </Button>
        </div>
      </div>

      <BillsTrackerList
        bills={allDisplayBills}
        onUpdateBill={updateBill}
        onDeleteBill={deleteBill}
        onTogglePaid={handleTogglePaid}
        onAddBill={(bill) => {
            const newId = `bill_${Date.now()}`;
            setBillsTracker(prev => [...prev, { ...bill, id: newId, isPaid: false, type: 'tracker' }]);
        }}
        currentDate={currentDate}
      />

      <FixedBillSelectorModal
        open={isManageModalOpen}
        onOpenChange={setIsManageModalOpen}
        mode="current"
        currentDate={currentDate}
      />

      <FixedBillSelectorModal
        open={isAdvanceModalOpen}
        onOpenChange={setIsAdvanceModalOpen}
        mode="future"
        currentDate={currentDate}
      />

      <AddPurchaseInstallmentDialog 
        open={isPurchaseDialogOpen}
        onOpenChange={setIsPurchaseDialogOpen}
        currentDate={currentDate}
      />
    </div>
  );
}