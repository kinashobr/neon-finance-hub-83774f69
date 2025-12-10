import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Tags, Plus } from "lucide-react";
import { toast } from "sonner";

// Types
import { 
  ContaCorrente, Categoria, TransacaoCompleta, TransferGroup,
  AccountSummary, OperationType, DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, 
  generateTransactionId, formatCurrency
} from "@/types/finance";

// Components
import { AccountsCarousel } from "@/components/transactions/AccountsCarousel";
import { MovimentarContaModal } from "@/components/transactions/MovimentarContaModal";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { KPISidebar } from "@/components/transactions/KPISidebar";
import { ReconciliationPanel } from "@/components/transactions/ReconciliationPanel";
import { AccountFormModal } from "@/components/transactions/AccountFormModal";
import { CategoryFormModal } from "@/components/transactions/CategoryFormModal";
import { CategoryListModal } from "@/components/transactions/CategoryListModal";
import { AccountStatementDialog } from "@/components/transactions/AccountStatementDialog";
import { PeriodSelector, PeriodRange, periodToDateRange } from "@/components/dashboard/PeriodSelector";

// Hooks
import { useFinanceEvents } from "@/hooks/useFinanceEvents";

// Storage keys
const STORAGE_KEYS = {
  ACCOUNTS: "fin_accounts_v1",
  TRANSACTIONS: "fin_transactions_v1", 
  CATEGORIES: "fin_categories_v1",
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
  const [transferGroups, setTransferGroups] = useState<TransferGroup[]>(() => 
    loadFromStorage(STORAGE_KEYS.TRANSFER_GROUPS, [])
  );

  // UI state
  const [showMovimentarModal, setShowMovimentarModal] = useState(false);
  const [selectedAccountForModal, setSelectedAccountForModal] = useState<string>();
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [periodRange, setPeriodRange] = useState<PeriodRange>({ startMonth: null, startYear: null, endMonth: null, endYear: null });
  
  // New modals
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ContaCorrente>();
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCategoryListModal, setShowCategoryListModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Categoria>();
  const [editingTransaction, setEditingTransaction] = useState<TransacaoCompleta>();
  
  // Statement dialog
  const [viewingAccountId, setViewingAccountId] = useState<string | null>(null);
  const [showStatementDialog, setShowStatementDialog] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [selectedTypes, setSelectedTypes] = useState<OperationType[]>(['receita', 'despesa', 'transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo', 'liberacao_emprestimo', 'veiculo', 'rendimento']);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { emitEvent } = useFinanceEvents();

  // Persist data
  const saveAll = useCallback(() => {
    saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts);
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
    saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
    saveToStorage(STORAGE_KEYS.TRANSFER_GROUPS, transferGroups);
  }, [accounts, transactions, categories, transferGroups]);

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
        accountType: account.accountType,
        institution: account.institution,
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
    setEditingTransaction(undefined);
    setShowMovimentarModal(true);
  };

  const handleViewStatement = (accountId: string) => {
    setViewingAccountId(accountId);
    setShowStatementDialog(true);
  };

  const handleTransactionSubmit = (transaction: TransacaoCompleta, transferGroup?: TransferGroup) => {
    if (editingTransaction) {
      setTransactions(prev => prev.map(t => t.id === transaction.id ? transaction : t));
      emitEvent('transaction.updated', { transactionId: transaction.id });
    } else {
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
      if (transaction.links.vehicleTransactionId) {
        emitEvent('vehicle.transaction', { transactionId: transaction.id, vehicleTransactionId: transaction.links.vehicleTransactionId });
      }
    }

    saveAll();
  };

  const handleEditTransaction = (transaction: TransacaoCompleta) => {
    setEditingTransaction(transaction);
    setSelectedAccountForModal(transaction.accountId);
    setShowMovimentarModal(true);
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
    setSelectedTypes(['receita', 'despesa', 'transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo', 'liberacao_emprestimo', 'veiculo', 'rendimento']);
    setDateFrom("");
    setDateTo("");
  };

  // Transaction count by category
  const transactionCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.categoryId) {
        counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
      }
    });
    return counts;
  }, [transactions]);

  const handleExport = () => {
    const exportData = {
      schemaVersion: "1.1",
      exportedAt: new Date().toISOString(),
      data: { accounts, categories, investments: [], loans: [], transferGroups, transactions }
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

  // Account CRUD
  const handleAccountSubmit = (account: ContaCorrente) => {
    if (editingAccount) {
      setAccounts(prev => prev.map(a => a.id === account.id ? account : a));
    } else {
      setAccounts(prev => [...prev, account]);
    }
    setEditingAccount(undefined);
    saveAll();
  };

  const handleAccountDelete = (accountId: string) => {
    const hasTransactions = transactions.some(t => t.accountId === accountId);
    if (hasTransactions) {
      toast.error("Não é possível excluir conta com transações");
      return;
    }
    setAccounts(prev => prev.filter(a => a.id !== accountId));
    saveAll();
  };

  const handleEditAccount = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      setEditingAccount(account);
      setShowAccountModal(true);
    }
  };

  // Category CRUD
  const handleCategorySubmit = (category: Categoria) => {
    if (editingCategory) {
      setCategories(prev => prev.map(c => c.id === category.id ? category : c));
    } else {
      setCategories(prev => [...prev, category]);
    }
    setEditingCategory(undefined);
    saveAll();
  };

  const handleCategoryDelete = (categoryId: string) => {
    const hasTransactions = transactions.some(t => t.categoryId === categoryId);
    if (hasTransactions) {
      toast.error("Não é possível excluir categoria em uso");
      return;
    }
    setCategories(prev => prev.filter(c => c.id !== categoryId));
    saveAll();
  };

  // Mock data for investments/loans
  const investments = [{ id: 'inv_1', name: 'CDB Banco X' }, { id: 'inv_2', name: 'Tesouro Selic' }];
  const loans = [{ id: 'loan_1', institution: 'Banco Y' }];

  // Get viewing account data
  const viewingAccount = viewingAccountId ? accounts.find(a => a.id === viewingAccountId) : null;
  const viewingSummary = viewingAccountId ? accountSummaries.find(s => s.accountId === viewingAccountId) : null;
  const viewingTransactions = viewingAccountId ? transactions.filter(t => t.accountId === viewingAccountId) : [];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Receitas e Despesas</h1>
            <p className="text-muted-foreground mt-1">Contas Movimento e conciliação bancária</p>
          </div>
          <div className="flex items-center gap-2">
            <PeriodSelector tabId="receitas-despesas" onPeriodChange={setPeriodRange} />
            <Button variant="outline" size="sm" onClick={() => setShowCategoryListModal(true)}>
              <Tags className="w-4 h-4 mr-2" />Categorias
            </Button>
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
            onViewHistory={handleViewStatement}
            onAddAccount={() => { setEditingAccount(undefined); setShowAccountModal(true); }}
            onEditAccount={handleEditAccount}
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

        {/* KPI Sidebar - full width */}
        <div className="glass-card p-4">
          <KPISidebar transactions={filteredTransactions} categories={categories} />
        </div>
      </div>

      {/* Modals */}
      <MovimentarContaModal
        open={showMovimentarModal}
        onOpenChange={setShowMovimentarModal}
        accounts={accounts}
        categories={categories}
        investments={investments}
        loans={loans}
        selectedAccountId={selectedAccountForModal}
        onSubmit={handleTransactionSubmit}
        editingTransaction={editingTransaction}
      />

      <AccountFormModal
        open={showAccountModal}
        onOpenChange={setShowAccountModal}
        account={editingAccount}
        onSubmit={handleAccountSubmit}
        onDelete={handleAccountDelete}
        hasTransactions={editingAccount ? transactions.some(t => t.accountId === editingAccount.id) : false}
      />

      <CategoryFormModal
        open={showCategoryModal}
        onOpenChange={setShowCategoryModal}
        category={editingCategory}
        onSubmit={handleCategorySubmit}
        onDelete={handleCategoryDelete}
        hasTransactions={editingCategory ? transactions.some(t => t.categoryId === editingCategory.id) : false}
      />

      <CategoryListModal
        open={showCategoryListModal}
        onOpenChange={setShowCategoryListModal}
        categories={categories}
        onAddCategory={() => { setEditingCategory(undefined); setShowCategoryModal(true); }}
        onEditCategory={(cat) => { setEditingCategory(cat); setShowCategoryModal(true); }}
        onDeleteCategory={handleCategoryDelete}
        transactionCountByCategory={transactionCountByCategory}
      />

      {viewingAccount && viewingSummary && (
        <AccountStatementDialog
          open={showStatementDialog}
          onOpenChange={setShowStatementDialog}
          account={viewingAccount}
          accountSummary={viewingSummary}
          transactions={viewingTransactions}
          categories={categories}
          allAccounts={accounts}
          onEditTransaction={handleEditTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onToggleConciliated={handleToggleConciliated}
          onReconcileAll={() => handleReconcile(viewingAccountId!)}
        />
      )}
    </MainLayout>
  );
};

export default ReceitasDespesas;
