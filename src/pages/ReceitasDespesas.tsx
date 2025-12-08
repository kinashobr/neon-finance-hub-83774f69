import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Download, Upload, RefreshCw, Settings, Link2 } from "lucide-react";
import { toast } from "sonner";

// Types
import { 
  ContaCorrente, Categoria, TipoContabil, TransacaoCompleta, TransferGroup,
  AccountSummary, OperationType, DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, 
  DEFAULT_ACCOUNTING_TYPES, generateTransactionId, formatCurrency
} from "@/types/finance";

// Components
import { AccountsCarousel } from "@/components/transactions/AccountsCarousel";
import { MovimentarContaModal } from "@/components/transactions/MovimentarContaModal";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { KPISidebar } from "@/components/transactions/KPISidebar";
import { ReconciliationPanel } from "@/components/transactions/ReconciliationPanel";
import { PeriodSelector, PeriodRange, periodToDateRange } from "@/components/dashboard/PeriodSelector";

// Hooks
import { useFinanceEvents } from "@/hooks/useFinanceEvents";

// Storage keys
const STORAGE_KEYS = {
  ACCOUNTS: "fin_accounts_v1",
  TRANSACTIONS: "fin_transactions_v1", 
  CATEGORIES: "fin_categories_v1",
  ACCOUNTING_TYPES: "fin_accounting_types_v1",
  TRANSFER_GROUPS: "fin_transfer_groups_v1",
};

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch { return defaultValue; }
}

function saveToStorage<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

const ReceitasDespesas = () => {
  // Data state
  const [accounts, setAccounts] = useState<ContaCorrente[]>(() => 
    loadFromStorage(STORAGE_KEYS.ACCOUNTS, DEFAULT_ACCOUNTS)
  );
  const [transactions, setTransactions] = useState<TransacaoCompleta[]>(() => 
    loadFromStorage(STORAGE_KEYS.TRANSACTIONS, [])
  );
  const [categories, setCategories] = useState<Categoria[]>(() => 
    loadFromStorage(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES)
  );
  const [accountingTypes, setAccountingTypes] = useState<TipoContabil[]>(() => 
    loadFromStorage(STORAGE_KEYS.ACCOUNTING_TYPES, DEFAULT_ACCOUNTING_TYPES)
  );
  const [transferGroups, setTransferGroups] = useState<TransferGroup[]>(() => 
    loadFromStorage(STORAGE_KEYS.TRANSFER_GROUPS, [])
  );

  // UI state
  const [showMovimentarModal, setShowMovimentarModal] = useState(false);
  const [selectedAccountForModal, setSelectedAccountForModal] = useState<string>();
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [periodRange, setPeriodRange] = useState<PeriodRange>({ startMonth: null, startYear: null, endMonth: null, endYear: null });

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [selectedTypes, setSelectedTypes] = useState<OperationType[]>(['receita', 'despesa', 'transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo']);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { emitEvent } = useFinanceEvents();

  // Persist data
  const saveAll = useCallback(() => {
    saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
    saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
    saveToStorage(STORAGE_KEYS.ACCOUNTING_TYPES, accountingTypes);
    saveToStorage(STORAGE_KEYS.TRANSFER_GROUPS, transferGroups);
  }, [accounts, transactions, categories, accountingTypes, transferGroups]);

  // Filter transactions
  const dateRange = useMemo(() => periodToDateRange(periodRange), [periodRange]);
  
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = !searchTerm || t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchAccount = selectedAccountId === 'all' || t.accountId === selectedAccountId;
      const matchCategory = selectedCategoryId === 'all' || t.categoryId === selectedCategoryId;
      const matchType = selectedTypes.includes(t.operationType);
      const matchDateFrom = !dateFrom || t.date >= dateFrom;
      const matchDateTo = !dateTo || t.date <= dateTo;
      const matchPeriod = !dateRange.from || !dateRange.to || 
        (new Date(t.date) >= dateRange.from && new Date(t.date) <= dateRange.to);
      
      return matchSearch && matchAccount && matchCategory && matchType && matchDateFrom && matchDateTo && matchPeriod;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, selectedAccountId, selectedCategoryId, selectedTypes, dateFrom, dateTo, dateRange]);

  // Calculate account summaries
  const accountSummaries: AccountSummary[] = useMemo(() => {
    return accounts.map(account => {
      const accountTx = transactions.filter(t => t.accountId === account.id);
      const totalIn = accountTx.filter(t => t.flow === 'in' || t.flow === 'transfer_in').reduce((s, t) => s + t.amount, 0);
      const totalOut = accountTx.filter(t => t.flow === 'out' || t.flow === 'transfer_out').reduce((s, t) => s + t.amount, 0);
      const currentBalance = account.initialBalance + totalIn - totalOut;
      
      return {
        accountId: account.id,
        accountName: account.name,
        initialBalance: account.initialBalance,
        currentBalance,
        projectedBalance: currentBalance,
        totalIn,
        totalOut,
        reconciliationStatus: accountTx.every(t => t.conciliated) ? 'ok' : 'warning' as const,
        transactionCount: accountTx.length
      };
    });
  }, [accounts, transactions]);

  // Handlers
  const handleMovimentar = (accountId: string) => {
    setSelectedAccountForModal(accountId);
    setShowMovimentarModal(true);
  };

  const handleViewHistory = (accountId: string) => {
    setSelectedAccountId(accountId);
  };

  const handleTransactionSubmit = (transaction: TransacaoCompleta, transferGroup?: TransferGroup) => {
    const newTransactions = [transaction];
    
    if (transferGroup) {
      setTransferGroups(prev => [...prev, transferGroup]);
      const incomingTx: TransacaoCompleta = {
        ...transaction,
        id: generateTransactionId(),
        accountId: transferGroup.toAccountId,
        flow: 'transfer_in',
        links: { ...transaction.links, transferGroupId: transferGroup.id }
      };
      newTransactions.push(incomingTx);
      emitEvent('transfer.created', { transferGroupId: transferGroup.id });
    }

    setTransactions(prev => [...prev, ...newTransactions]);
    emitEvent('transaction.created', { transactionId: transaction.id, links: transaction.links });
    
    if (transaction.links.investmentId) {
      emitEvent('investment.linked', { transactionId: transaction.id, investmentId: transaction.links.investmentId });
    }
    if (transaction.links.loanId) {
      emitEvent('loan.payment', { transactionId: transaction.id, loanId: transaction.links.loanId, parcelaId: transaction.links.parcelaId || undefined });
    }

    saveAll();
  };

  const handleDeleteTransaction = (id: string) => {
    if (!confirm("Excluir esta transação?")) return;
    setTransactions(prev => prev.filter(t => t.id !== id));
    emitEvent('transaction.deleted', { transactionId: id });
    saveAll();
    toast.success("Transação excluída");
  };

  const handleToggleConciliated = (id: string, value: boolean) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, conciliated: value } : t));
    saveAll();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedAccountId("all");
    setSelectedCategoryId("all");
    setSelectedTypes(['receita', 'despesa', 'transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo']);
    setDateFrom("");
    setDateTo("");
  };

  const handleExport = () => {
    const exportData = {
      schemaVersion: "1.0",
      exportedAt: new Date().toISOString(),
      data: { accounts, accountingTypes, categories, investments: [], loans: [], transferGroups, transactions }
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fin_export_v1_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Dados exportados!");
  };

  const handleReconcile = (accountId: string) => {
    setTransactions(prev => prev.map(t => 
      t.accountId === accountId ? { ...t, conciliated: true } : t
    ));
    saveAll();
    toast.success("Conta conciliada!");
  };

  // Mock data for investments/loans
  const investments = [{ id: 'inv_1', name: 'CDB Banco X' }, { id: 'inv_2', name: 'Tesouro Selic' }];
  const loans = [{ id: 'loan_1', institution: 'Banco Y' }];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Receitas e Despesas</h1>
            <p className="text-muted-foreground mt-1">Movimentação de caixa e conciliação bancária</p>
          </div>
          <div className="flex items-center gap-2">
            <PeriodSelector tabId="receitas-despesas" onPeriodChange={setPeriodRange} />
            <Button variant="outline" size="sm" onClick={() => setShowReconciliation(!showReconciliation)}>
              <RefreshCw className="w-4 h-4 mr-2" />Conciliar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />Exportar
            </Button>
          </div>
        </div>

        {/* Accounts Carousel */}
        <div className="glass-card p-4">
          <AccountsCarousel
            accounts={accountSummaries}
            onMovimentar={handleMovimentar}
            onViewHistory={handleViewHistory}
          />
        </div>

        {/* Reconciliation Panel */}
        {showReconciliation && (
          <ReconciliationPanel
            accounts={accounts}
            transactions={transactions}
            onReconcile={handleReconcile}
          />
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Transactions Area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Filters */}
            <div className="glass-card p-4">
              <TransactionFilters
                accounts={accounts}
                categories={categories}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedAccountId={selectedAccountId}
                onAccountChange={setSelectedAccountId}
                selectedCategoryId={selectedCategoryId}
                onCategoryChange={setSelectedCategoryId}
                selectedTypes={selectedTypes}
                onTypesChange={setSelectedTypes}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                onClearFilters={handleClearFilters}
              />
            </div>

            {/* Table */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Histórico de Transações</h3>
                <span className="text-sm text-muted-foreground">{filteredTransactions.length} transações</span>
              </div>
              <TransactionTable
                transactions={filteredTransactions}
                accounts={accounts}
                categories={categories}
                onEdit={(t) => toast.info("Edição em desenvolvimento")}
                onDelete={handleDeleteTransaction}
                onToggleConciliated={handleToggleConciliated}
              />
            </div>
          </div>

          {/* KPI Sidebar */}
          <div className="lg:col-span-1">
            <KPISidebar transactions={filteredTransactions} categories={categories} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <Link2 className="w-4 h-4" />
            <span>Vincule operações a Investimentos e Empréstimos</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      <MovimentarContaModal
        open={showMovimentarModal}
        onOpenChange={setShowMovimentarModal}
        accounts={accounts}
        categories={categories}
        accountingTypes={accountingTypes}
        investments={investments}
        loans={loans}
        selectedAccountId={selectedAccountForModal}
        onSubmit={handleTransactionSubmit}
      />
    </MainLayout>
  );
};

export default ReceitasDespesas;
