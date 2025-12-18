// ... (código existente)

// ============================================
// NOVO: FUNÇÃO PARA OBTER DESPESAS EXTERNAS PAGAS
// ============================================

const getOtherPaidExpensesForMonth = useCallback((date: Date): TransacaoCompleta[] => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);

  // Filtra transações de despesa no mês
  const expensesInMonth = transacoesV2.filter(t => {
    const txDate = parseDateLocal(t.date);
    const isExpense = t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo';
    const isOutFlow = t.flow === 'out' || t.flow === 'transfer_out';
    const isWithinMonth = isWithinInterval(txDate, { start: monthStart, end: monthEnd });

    return isExpense && isOutFlow && isWithinMonth;
  });

  // Identifica transações que foram criadas pelo BillsTracker
  const trackerTransactionIds = new Set<string>();
  billsTracker.forEach(bill => {
    if (bill.transactionId) {
      trackerTransactionIds.add(bill.transactionId);
    }
  });

  // Retorna apenas as transações que NÃO foram criadas pelo BillsTracker
  return expensesInMonth.filter(t => !trackerTransactionIds.has(t.id));
}, [transacoesV2, billsTracker]);

// ... (restante do código existente)

// Adicione a nova função ao valor do contexto
const value: FinanceContextType = {
  // ... (código existente)
  getOtherPaidExpensesForMonth, // <-- ADICIONE ESTA LINHA
};