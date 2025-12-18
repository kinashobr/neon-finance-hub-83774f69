// ... (imports existentes)

// Tipo para representar despesas externas pagas
interface ExternalPaidBill {
  id: string;
  description: string;
  dueDate: string;
  expectedAmount: number;
  source: 'external';
  transactionId: string;
}

export function BillsTrackerModal({ open, onOpenChange }: BillsTrackerModalProps) {
  // ... (código existente)

  const { 
    // ... (código existente)
    getOtherPaidExpensesForMonth, // <-- ADICIONE ESTE IMPORT
  } = useFinance();

  // ... (código existente)

  // Combina as listas: billsTracker + despesas externas pagas
  const combinedBills = useMemo(() => {
    const externalExpenses = getOtherPaidExpensesForMonth(currentDate);
    
    const externalBills: ExternalPaidBill[] = externalExpenses.map(tx => ({
      id: `external_${tx.id}`,
      description: tx.description,
      dueDate: tx.date,
      expectedAmount: tx.amount,
      source: 'external',
      transactionId: tx.id,
    }));

    return [...currentMonthBills, ...externalBills];
  }, [currentMonthBills, getOtherPaidExpensesForMonth, currentDate]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <ResizableDialogContent 
          storageKey="bills_tracker_modal"
          initialWidth={1200}
          initialHeight={800}
          minWidth={800}
          minHeight={600}
          hideCloseButton={true}
          className="bg-card border-border overflow-hidden flex flex-col p-0"
        >
          <DialogHeader className="p-6 pb-0 shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarCheck className="w-6 h-6 text-primary" />
                Contas a Pagar
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleMonthChange('prev')}>
                  Anterior
                </Button>
                <h4 className="font-semibold text-lg w-40 text-center">
                  {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </h4>
                <Button variant="outline" size="sm" onClick={() => handleMonthChange('next')}>
                  Próximo
                </Button>
              </div>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                <X className="w-5 h-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {/* NOVO LAYOUT: Sidebar KPIs + Main Content */}
          <div className="flex flex-1 overflow-hidden p-6 pt-4 gap-6">
            
            {/* Sidebar KPIs (25% width) */}
            <div className="w-1/4 shrink-0 overflow-y-auto">
                <BillsSidebarKPIs 
                    currentDate={currentDate}
                    totalPendingBills={totalPendingBills}
                />
            </div>
            
            {/* Main Content (75% width) */}
            <div className="flex-1 flex flex-col min-w-0 space-y-4">
                
                {/* Botões de Gerenciamento Fixo */}
                <div className="flex gap-3 shrink-0">
                    <Button 
                        variant="outline" 
                        onClick={() => { setFixedBillSelectorMode('current'); setShowFixedBillSelector(true); }}
                        className="gap-2"
                    >
                        <Repeat className="w-4 h-4" /> Gerenciar Parcelas do Mês
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => { setFixedBillSelectorMode('future'); setShowFixedBillSelector(true); }}
                        className="gap-2"
                    >
                        <Settings className="w-4 h-4" /> Próximos Vencimentos
                    </Button>
                </div>
                
                {/* Lista de Contas */}
                <div className="flex-1 min-h-0">
                    <BillsTrackerList
                        bills={combinedBills} // <-- USE A LISTA COMBINADA
                        onUpdateBill={handleUpdateBill}
                        onDeleteBill={handleDeleteBill}
                        onAddBill={handleAddBill}
                        onTogglePaid={handleTogglePaid}
                        currentDate={currentDate}
                    />
                </div>
            </div>
          </div>
        </ResizableDialogContent>
      </Dialog>
      
      {/* ... (restante do código existente) */}
    </>
  );
}