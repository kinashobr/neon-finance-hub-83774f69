import { useState, useMemo, useCallback, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { RefreshCw, Tags, Plus } from "lucide-react";
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
import { KPISidebar } from "@/components/transactions/KPISidebar";
import { ReconciliationPanel } from "@/components/transactions/ReconciliationPanel";
import { AccountFormModal } from "@/components/transactions/AccountFormModal";
import { CategoryFormModal } from "@/components/transactions/CategoryFormModal";
import { CategoryListModal } from "@/components/transactions/CategoryListModal";
import { AccountStatementDialog } from "@/components/transactions/AccountStatementDialog";
import { PeriodSelector, PeriodRange, periodToDateRange } from "@/components/dashboard/PeriodSelector";

// Context
import { useFinance } from "@/contexts/FinanceContext";

const ReceitasDespesas = () => {
  const { 
    contasMovimento, 
    setContasMovimento,
    categoriasV2, 
    setCategoriasV2,
    transacoesV2, 
    setTransacoesV2,
    addTransacaoV2,
    emprestimos,
    markLoanParcelPaid,
    veiculos,
    addVeiculo,
    investimentosRF,
    addMovimentacaoInvestimento,
    markSeguroParcelPaid, // <-- Nova função
  } = useFinance();

  // Local state for transfer groups
  const [transferGroups, setTransferGroups] = useState<TransferGroup[]>([]);

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

  // Alias for context data
  const accounts = contasMovimento;
  const transactions = transacoesV2;
  const categories = categoriasV2;

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
      // When editing, also update linked transactions
      const linkedGroupId = editingTransaction.links?.transferGroupId;
      if (linkedGroupId) {
        // Update both sides of the transfer
        setTransacoesV2(transacoesV2.map(t => {
          if (t.id === transaction.id) return transaction;
          if (t.links?.transferGroupId === linkedGroupId && t.id !== transaction.id) {
            return { ...t, amount: transaction.amount, date: transaction.date, description: transaction.description };
          }
          return t;
        }));
      } else {
        setTransacoesV2(transacoesV2.map(t => t.id === transaction.id ? transaction : t));
      }
    } else {
      const newTransactions = [transaction];
      
      // PARTIDA DOBRADA: Transferência entre contas
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
      }

      // PARTIDA DOBRADA: Aplicação (Conta Corrente → Conta de Investimento)
      // Cria DUAS transações: saída na conta corrente, entrada na conta destino
      if (transaction.operationType === 'aplicacao' && transaction.links?.investmentId) {
        const groupId = `app_${Date.now()}`;
        transaction.links.transferGroupId = groupId;
        transaction.flow = 'out'; // Saída da conta corrente
        
        // Transação de entrada na conta de investimento
        const investmentAccount = accounts.find(a => a.id === transaction.links.investmentId);
        if (investmentAccount) {
          const incomingTx: TransacaoCompleta = {
            id: generateTransactionId(),
            date: transaction.date,
            accountId: transaction.links.investmentId, // Conta de investimento
            flow: 'in',
            operationType: 'aplicacao',
            domain: 'investment',
            amount: transaction.amount,
            categoryId: null,
            description: transaction.description || `Aplicação recebida de conta corrente`,
            links: {
              investmentId: transaction.accountId, // Referência à conta origem
              loanId: null,
              transferGroupId: groupId,
              parcelaId: null,
              vehicleTransactionId: null,
            },
            conciliated: false,
            attachments: [],
            meta: {
              createdBy: 'user',
              source: 'manual',
              createdAt: new Date().toISOString(),
            }
          };
          newTransactions.push(incomingTx);
        }
      }

      // PARTIDA DOBRADA: Resgate (Conta de Investimento → Conta Corrente)
      // Cria DUAS transações: saída na conta de investimento, entrada na conta corrente
      if (transaction.operationType === 'resgate' && transaction.links?.investmentId) {
        const groupId = `res_${Date.now()}`;
        transaction.links.transferGroupId = groupId;
        transaction.flow = 'in'; // Entrada na conta corrente
        
        // Transação de saída na conta de investimento
        const outgoingTx: TransacaoCompleta = {
          id: generateTransactionId(),
          date: transaction.date,
          accountId: transaction.links.investmentId, // Conta de investimento
          flow: 'out',
          operationType: 'resgate',
          domain: 'investment',
          amount: transaction.amount,
          categoryId: null,
          description: transaction.description || `Resgate para conta corrente`,
          links: {
            investmentId: transaction.accountId, // Referência à conta destino
            loanId: null,
            transferGroupId: groupId,
            parcelaId: null,
            vehicleTransactionId: null,
          },
          conciliated: false,
          attachments: [],
            meta: {
              createdBy: 'user',
              source: 'manual',
              createdAt: new Date().toISOString(),
            }
          };
          newTransactions.push(outgoingTx);
        }

        // Handle special operation types
        if (transaction.operationType === 'liberacao_emprestimo' && transaction.meta?.numeroContrato) {
          // Create pending loan
          addEmprestimo({
            contrato: transaction.meta.numeroContrato,
            valorTotal: transaction.amount,
            parcela: 0,
            meses: 0,
            taxaMensal: 0,
            status: 'pendente_config',
            liberacaoTransactionId: transaction.id,
            contaCorrenteId: transaction.accountId,
            dataInicio: transaction.date,
          });
        }

        // Handle loan payment - mark parcel as paid
        if (transaction.operationType === 'pagamento_emprestimo' && transaction.links?.loanId) {
          const loanIdNum = parseInt(transaction.links.loanId.replace('loan_', ''));
          const parcelaNum = transaction.links.parcelaId ? parseInt(transaction.links.parcelaId) : undefined;
          if (!isNaN(loanIdNum)) {
            markLoanParcelPaid(loanIdNum, transaction.amount, transaction.date, parcelaNum);
          }
        }

        // Handle vehicle insurance payment - mark parcel as paid
        if (transaction.operationType === 'despesa' && transaction.links?.vehicleTransactionId) {
          const [seguroIdStr, parcelaNumeroStr] = transaction.links.vehicleTransactionId.split('_');
          const seguroId = parseInt(seguroIdStr);
          const parcelaNumero = parseInt(parcelaNumeroStr);
          
          if (!isNaN(seguroId) && !isNaN(parcelaNumero)) {
            markSeguroParcelPaid(seguroId, parcelaNumero, transaction.id);
          }
        }

        if (transaction.operationType === 'veiculo' && transaction.meta?.vehicleOperation === 'compra') {
          // Create pending vehicle
          addVeiculo({
            modelo: '',
            ano: new Date().getFullYear(),
            dataCompra: transaction.date,
            valorVeiculo: transaction.amount,
            valorSeguro: 0,
            vencimentoSeguro: "",
            parcelaSeguro: 0,
            valorFipe: transaction.amount,
            status: 'pendente_cadastro',
            compraTransactionId: transaction.id,
          });
        }

        if (transaction.operationType === 'rendimento' && transaction.links?.investmentId) {
          // Add investment movement
          addMovimentacaoInvestimento({
            data: transaction.date,
            tipo: 'Rendimento',
            categoria: 'Renda Fixa',
            ativo: transaction.links.investmentId,
            descricao: transaction.description,
            valor: transaction.amount,
            transactionId: transaction.id,
          });
        }

        newTransactions.forEach(t => addTransacaoV2(t));
      }
    };
  };

  const handleEditTransaction = (transaction: TransacaoCompleta) => {
    setEditingTransaction(transaction);
    setSelectedAccountForModal(transaction.accountId);
    setShowMovimentarModal(true);
  };

  const handleDeleteTransaction = (id: string) => {
    if (!confirm("Excluir esta transação?")) return;
    
    // Find if this transaction is part of a linked group (transfer, aplicacao, resgate)
    const transactionToDelete = transacoesV2.find(t => t.id === id);
    const linkedGroupId = transactionToDelete?.links?.transferGroupId;
    
    if (linkedGroupId) {
      // Delete both sides of the linked transaction (partida dobrada)
      setTransacoesV2(transacoesV2.filter(t => t.links?.transferGroupId !== linkedGroupId));
      toast.success("Transações vinculadas excluídas");
    } else {
      setTransacoesV2(transacoesV2.filter(t => t.id !== id));
      toast.success("Transação excluída");
    }
  };

  const handleToggleConciliated = (id: string, value: boolean) => {
    setTransacoesV2(transacoesV2.map(t => t.id === id ? { ...t, conciliated: value } : t));
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


  const handleReconcile = (accountId: string) => {
    setTransacoesV2(transacoesV2.map(t => 
      t.accountId === accountId ? { ...t, conciliated: true } : t
    ));
    toast.success("Conta conciliada!");
  };

  // Account CRUD
  const handleAccountSubmit = (account: ContaCorrente) => {
    if (editingAccount) {
      setContasMovimento(accounts.map(a => a.id === account.id ? account : a));
    } else {
      setContasMovimento([...accounts, account]);
    }
    setEditingAccount(undefined);
  };

  const handleAccountDelete = (accountId: string) => {
    const hasTransactions = transactions.some(t => t.accountId === accountId);
    if (hasTransactions) {
      toast.error("Não é possível excluir conta com transações");
      return;
    }
    setContasMovimento(accounts.filter(a => a.id !== accountId));
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
      setCategoriasV2(categories.map(c => c.id === category.id ? category : c));
    } else {
      setCategoriasV2([...categories, category]);
    }
    setEditingCategory(undefined);
  };

  const handleCategoryDelete = (categoryId: string) => {
    const hasTransactions = transactions.some(t => t.categoryId === categoryId);
    if (hasTransactions) {
      toast.error("Não é possível excluir categoria em uso");
      return;
    }
    setCategoriasV2(categories.filter(c => c.id !== categoryId));
  };

  // Get investments and loans from context for linking
  const investments = useMemo(() => {
    return investimentosRF.map(i => ({ id: `inv_${i.id}`, name: i.aplicacao }));
  }, [investimentosRF]);

  const loans = useMemo(() => {
    return emprestimos
      .filter(e => e.status !== 'pendente_config')
      .map(e => {
        // Generate parcelas array if loan has meses configured
        const parcelas = e.meses > 0 ? Array.from({ length: e.meses }, (_, i) => {
          const vencimento = new Date(e.dataInicio || new Date());
          vencimento.setMonth(vencimento.getMonth() + i + 1);
          return {
            numero: i + 1,
            vencimento: vencimento.toISOString().split('T')[0],
            valor: e.parcela,
            pago: i < (e.parcelasPagas || 0),
          };
        }) : [];

        return {
          id: `loan_${e.id}`,
          institution: e.contrato,
          numeroContrato: e.contrato,
          parcelas,
          valorParcela: e.parcela,
          totalParcelas: e.meses,
        };
      });
  }, [emprestimos]);

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