import { useState, useMemo, useCallback } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { FixedBillSelectorModal } from "@/components/bills/FixedBillSelectorModal";
import { BillsTrackerList } from "@/components/bills/BillsTrackerList";
import { BillsSidebarKPIs } from "@/components/bills/BillsSidebarKPIs";
import { Button } from "@/components/ui/button";
import { Settings, Plus, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { format, startOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PotentialFixedBill, BillTracker, generateBillId } from "@/types/finance";
import { toast } from "sonner";
import { AddPurchaseInstallmentDialog } from "@/components/bills/AddPurchaseInstallmentDialog";

export default function BillsTracker() {
  const { 
    getBillsForMonth, 
    getPotentialFixedBillsForMonth, 
    getFutureFixedBills,
    updateBill,
    deleteBill,
    setBillsTracker,
    billsTracker,
    contasMovimento,
    categoriasV2,
    getOtherPaidExpensesForMonth
  } = useFinance();

  const [currentDate, setCurrentDate] = useState(startOfMonth(new Date()));
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

  const trackerManagedBills = useMemo(() => getBillsForMonth(currentDate), [getBillsForMonth, currentDate]);
  const externalPaidBills = useMemo(() => getOtherPaidExpensesForMonth(currentDate), [getOtherPaidExpensesForMonth, currentDate]);
  
  const combinedBills = useMemo(() => [...trackerManagedBills, ...externalPaidBills], [trackerManagedBills, externalPaidBills]);
  
  const potentialFixedBills = useMemo(() => 
    getPotentialFixedBillsForMonth(currentDate, trackerManagedBills)
  , [getPotentialFixedBillsForMonth, currentDate, trackerManagedBills]);

  const futureFixedBills = useMemo(() => 
    getFutureFixedBills(currentDate, trackerManagedBills)
  , [getFutureFixedBills, currentDate, trackerManagedBills]);

  const handleToggleFixedBill = useCallback((potentialBill: PotentialFixedBill, isChecked: boolean) => {
    if (isChecked) {
      const newBill: BillTracker = {
        id: generateBillId(),
        type: 'tracker',
        description: potentialBill.description,
        dueDate: potentialBill.dueDate,
        expectedAmount: potentialBill.expectedAmount,
        sourceType: potentialBill.sourceType,
        sourceRef: potentialBill.sourceRef,
        parcelaNumber: potentialBill.parcelaNumber,
        isPaid: false,
        isExcluded: false,
        suggestedAccountId: contasMovimento.find(c => c.accountType === 'corrente')?.id,
        suggestedCategoryId: categoriasV2.find(c => c.label.toLowerCase().includes(potentialBill.sourceType === 'loan_installment' ? 'emprestimo' : 'seguro'))?.id || null,
      };
      setBillsTracker(prev => [...prev, newBill]);
      toast.success("Conta adicionada ao mês.");
    } else {
      setBillsTracker(prev => prev.filter(b => 
        !(b.sourceType === potentialBill.sourceType && b.sourceRef === potentialBill.sourceRef && b.parcelaNumber === potentialBill.parcelaNumber)
      ));
      toast.info("Conta removida.");
    }
  }, [setBillsTracker, contasMovimento, categoriasV2]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contas a Pagar</h1>
          <p className="text-muted-foreground">Gerenciamento de despesas e parcelas</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowPurchaseDialog(true)} className="gap-2">
            <ShoppingCart className="w-4 h-4" /> Compra Parcelada
          </Button>
          <Button variant="outline" onClick={() => setIsManageModalOpen(true)} className="gap-2">
            <Settings className="w-4 h-4" /> Gerenciar Fixas
          </Button>
          <Button onClick={() => setIsAdvanceModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Adiantar Parcelas
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <BillsSidebarKPIs 
            currentDate={currentDate}
            totalPendingBills={combinedBills.filter(b => !b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0)}
            totalPaidBills={combinedBills.filter(b => b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0)}
          />
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-center gap-4 bg-card p-4 rounded-xl border">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(prev => subMonths(prev, 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-semibold min-w-[200px] text-center capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(prev => addMonths(prev, 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <BillsTrackerList 
            bills={combinedBills}
            onUpdateBill={updateBill}
            onDeleteBill={deleteBill}
            onAddBill={(b) => setBillsTracker(prev => [...prev, { ...b, id: generateBillId(), type: 'tracker', isPaid: false }])}
            onTogglePaid={() => {}} // Lógica simplificada para a página
            currentDate={currentDate}
          />
        </div>
      </div>

      <FixedBillSelectorModal
        open={isManageModalOpen}
        onOpenChange={setIsManageModalOpen}
        mode="current"
        currentDate={currentDate}
        potentialFixedBills={potentialFixedBills}
        onToggleFixedBill={handleToggleFixedBill}
      />

      <FixedBillSelectorModal
        open={isAdvanceModalOpen}
        onOpenChange={setIsAdvanceModalOpen}
        mode="future"
        currentDate={currentDate}
        potentialFixedBills={futureFixedBills}
        onToggleFixedBill={handleToggleFixedBill}
      />

      <AddPurchaseInstallmentDialog 
        open={showPurchaseDialog}
        onOpenChange={setShowPurchaseDialog}
        currentDate={currentDate}
      />
    </div>
  );
}