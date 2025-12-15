import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, Clock, TrendingUp, TrendingDown, DollarSign, Calculator, Menu, LogOut, X } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { BillsTrackerList } from "./BillsTrackerList";
import { BillsContextSidebar } from "./BillsContextSidebar"; // NEW IMPORT
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BillTracker, formatCurrency } from "@/types/finance";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditableCell } from "../EditableCell";
import { Separator } from "@/components/ui/separator";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"; // NEW IMPORT

interface BillsTrackerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillsTrackerModal({ open, onOpenChange }: BillsTrackerModalProps) {
  const { 
    billsTracker, 
    addBill, 
    updateBill, 
    deleteBill, 
    getBillsForPeriod, 
    dateRanges,
    monthlyRevenueForecast,
    setMonthlyRevenueForecast,
    getRevenueForPreviousMonth,
  } = useFinance();
  
  // Usamos a data final do período 1 como referência para o mês atual
  const referenceDate = dateRanges.range1.to || new Date();
  
  // Geração da lista de contas a pagar para o mês de referência
  const billsForPeriod = useMemo(() => {
    return getBillsForPeriod(referenceDate);
  }, [getBillsForPeriod, referenceDate]);
  
  // Receita do mês anterior (para sugestão)
  const previousMonthRevenue = useMemo(() => {
    return getRevenueForPreviousMonth(referenceDate);
  }, [getRevenueForPreviousMonth, referenceDate]);
  
  // Estado local para a previsão de receita (inicializa com o valor do contexto ou do mês anterior)
  const [localRevenueForecast, setLocalRevenueForecast] = useState(monthlyRevenueForecast || previousMonthRevenue);
  
  // Atualiza o estado local quando o modal abre ou o contexto muda
  useEffect(() => {
    if (open) {
        setLocalRevenueForecast(monthlyRevenueForecast || previousMonthRevenue);
    }
  }, [open, monthlyRevenueForecast, previousMonthRevenue]);

  // Total de despesas PENDENTES
  const totalExpectedExpense = useMemo(() => 
    billsForPeriod.filter(b => !b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0),
    [billsForPeriod]
  );
  
  // Total de despesas PAGAS
  const totalPaid = useMemo(() => 
    billsForPeriod.filter(b => b.isPaid).reduce((acc, b) => acc + b.expectedAmount, 0),
    [billsForPeriod]
  );
  
  const totalBills = billsForPeriod.length;
  const paidCount = billsForPeriod.filter(b => b.isPaid).length;
  const pendingCount = totalBills - paidCount;
  
  // Saldo Previsto = Receita Prevista - Total PENDENTE
  const netForecast = localRevenueForecast - totalExpectedExpense;

  const handleUpdateBill = (id: string, updates: Partial<BillTracker>) => {
    updateBill(id, updates);
  };

  const handleDeleteBill = (id: string) => {
    deleteBill(id);
  };

  const handleAddBill = (bill: Omit<BillTracker, "id" | "isPaid">) => {
    addBill(bill);
  };
  
  const handleSaveAndClose = () => {
    // Persiste o valor editado da previsão de receita no contexto
    setMonthlyRevenueForecast(localRevenueForecast);
    onOpenChange(false);
  };
  
  // Componente Sidebar para reutilização
  const SidebarContent = (
    <BillsContextSidebar
      localRevenueForecast={localRevenueForecast}
      setLocalRevenueForecast={setLocalRevenueForecast}
      previousMonthRevenue={previousMonthRevenue}
      totalExpectedExpense={totalExpectedExpense}
      totalPaid={totalPaid}
      pendingCount={pendingCount}
      netForecast={netForecast}
      onSaveAndClose={handleSaveAndClose} // Passando o handler de fechar
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[90vw] max-h-[95vh] overflow-hidden flex flex-col p-0" // Aumentado para max-w-[90vw]
        hideCloseButton 
      >
        
        {/* Header Principal - Ultra Compacto */}
        <DialogHeader className="border-b pb-2 pt-3 px-4 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              Contas a Pagar - {format(referenceDate, 'MMMM/yyyy')}
            </DialogTitle>
            
            <div className="flex items-center gap-3 text-sm">
              {/* Botão de Menu (Apenas em telas pequenas) */}
              <Drawer>
                <DrawerTrigger asChild className="lg:hidden">
                  <Button variant="outline" size="sm" className="gap-1 h-8 text-xs">
                    <Menu className="w-4 h-4" />
                    Contexto
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <div className="mx-auto w-full max-w-md">
                    <BillsContextSidebar
                      localRevenueForecast={localRevenueForecast}
                      setLocalRevenueForecast={setLocalRevenueForecast}
                      previousMonthRevenue={previousMonthRevenue}
                      totalExpectedExpense={totalExpectedExpense}
                      totalPaid={totalPaid}
                      pendingCount={pendingCount}
                      netForecast={netForecast}
                      isMobile={true}
                      onSaveAndClose={handleSaveAndClose}
                    />
                  </div>
                </DrawerContent>
              </Drawer>
              
              {/* Contagem de Status (Visível em todas as telas) */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-1 text-destructive">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">{pendingCount} Pendentes</span>
                </div>
                <div className="flex items-center gap-1 text-success">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="text-xs">{paidCount} Pagas</span>
                </div>
              </div>
              
              {/* Botão de fechar (Visível em todas as telas) */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleSaveAndClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Conteúdo Principal (2 Colunas) */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Coluna 1: Sidebar de Contexto (Fixo em telas grandes) */}
          <div className="hidden lg:block w-[240px] shrink-0 overflow-y-auto scrollbar-thin"> {/* Increased width from 200px to 240px */}
            {SidebarContent}
          </div>

          {/* Coluna 2: Lista de Transações (Ocupa o espaço restante) */}
          <div className="flex-1 overflow-y-auto px-4 pt-2 pb-2">
            <BillsTrackerList
              bills={billsForPeriod}
              onUpdateBill={handleUpdateBill}
              onDeleteBill={handleDeleteBill}
              onAddBill={handleAddBill}
              currentDate={referenceDate}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}