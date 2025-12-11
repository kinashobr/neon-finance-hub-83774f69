import { useState, useMemo, useCallback, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { RefreshCw, Tags, Plus } from "lucide-react";
import { toast } from "sonner";

// Types
import { 
  ContaCorrente, Categoria, TransacaoCompleta, TransferGroup,
  AccountSummary, OperationType, DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, 
  generateTransactionId, formatCurrency, generateTransferGroupId, getDomainFromOperation
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
import { DateRangeSelector } from "@/components/dashboard/DateRangeSelector"; // Importando o novo seletor
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
    addEmprestimo,
    markLoanParcelPaid,
    unmarkLoanParcelPaid, // Importado
    veiculos,
    addVeiculo,
    investimentosRF,
    addMovimentacaoInvestimento,
    markSeguroParcelPaid,
  } = useFinance();

  // Local state for transfer groups
  const [transferGroups, setTransferGroups] = useState<TransferGroup[]>([]);

  // UI state
  const [showMovimentarModal, setShowMovimentarModal] = useState(false);
  const [selectedAccountForModal, setSelectedAccountForModal] = useState<string>();
  const [showReconciliation, setShowReconciliation] = useState(false);
  
  // Usando DateRange para o filtro principal
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  
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

  // Filter state (mantidos para a tabela de transações, mas o filtro principal usa dateRange)
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

  const handleDateRangeChange = useCallback((range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
  }, []);

  // Helper function to calculate balance up to a specific date (exclusive)
  const calculateBalanceUpToDate = useCallback((accountId: string, date: Date | undefined, allTransactions: TransacaoCompleta[], accounts: ContaCorrente[]): number => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;

    let balance = account.initialBalance;
    
    // If no date is provided, calculate global balance (end of all history)
    const targetDate = date || new Date(9999, 11, 31);

    const transactionsBeforeDate = allTransactions
        .filter(t => t.accountId === accountId && new Date(t.date) < targetDate)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    transactionsBeforeDate.forEach(t => {
        const isCreditCard = account.accountType === 'cartao_credito';
        
        if (isCreditCard) {
          // Cartão de Crédito: Despesa (out) subtrai, Transferência (in) soma
          if (t.operationType === 'despesa') {
            balance -= t.amount;
          } else if (t.operationType === 'transferencia') {
            balance += t.amount;
          }
        } else {
          // Contas normais: in soma, out subtrai
          if (t.flow === 'in' || t.flow === 'transfer_in') {
            balance += t.amount;
          } else {
            balance -= t.amount;
          }
        }
    });

    return balance;
  }, []);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = !searchTerm || t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchAccount = selectedAccountId === 'all' || t.accountId === selectedAccountId;
      const matchCategory = selectedCategoryId === 'all' || t.categoryId === selectedCategoryId;
      const matchType = selectedTypes.includes(t.operationType);
      
      const transactionDate = new Date(t.date + "T00:00:00"); // Adiciona T00:00:00 para evitar problemas de timezone
      
      // Aplicar filtro de data do DateRangeSelector
      const matchPeriod = (!dateRange.from || transactionDate >= dateRange.from) && 
                          (!dateRange.to || transactionDate <= dateRange.to);
      
      return matchSearch && matchAccount && matchCategory && matchType && matchPeriod;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, selectedAccountId, selectedCategoryId, selectedTypes, dateRange]);

  // Calculate account summaries
  const accountSummaries: AccountSummary[] = useMemo(() => {
    const periodStart = dateRange.from;
    const periodEnd = dateRange.to;
    
    return accounts.map(account => {
      // 1. Calculate Period Initial Balance (balance right before periodStart)
      const periodInitialBalance = periodStart 
        ? calculateBalanceUpToDate(account.id, periodStart, transactions, accounts)
        : calculateBalanceUpToDate(account.id, undefined, transactions, accounts); // If no period selected, show global current balance as initial balance (end of all history)

      // 2. Calculate Period Transactions (transactions within the selected period)
      const accountTxInPeriod = transactions.filter(t => {
        if (t.accountId !== account.id) return false;
        const transactionDate = new Date(t.date + "T00:00:00");
        return (!periodStart || transactionDate >= periodStart) && 
               (!periodEnd || transactionDate <= periodEnd);
      });

      // 3. Calculate Period Totals
      let totalIn = 0;
      let totalOut = 0;
      
      accountTxInPeriod.forEach(t => {
        const isCreditCard = account.accountType === 'cartao_credito';
        
        if (isCreditCard) {
          // Cartão de Crédito: Despesa (out) é uma saída, Transferência (in) é uma entrada
          if (t.operationType === 'despesa') {
            totalOut += t.amount;
          } else if (t.operationType === 'transferencia') {
            totalIn += t.amount;
          }
        } else {
          // Contas normais
          if (t.flow === 'in' || t.flow === 'transfer_in') {
            totalIn += t.amount;
          } else {
            totalOut += t.amount;
          }
        }
      });
      
      // 4. Calculate Period Final Balance
      const periodFinalBalance = periodInitialBalance + totalIn - totalOut;
      
      // 5. Reconciliation Status (based on transactions in the period)
      const reconciliationStatus = accountTxInPeriod.every(t => t.conciliated) ? 'ok' : 'warning' as const;

      return {
        accountId: account.id,
        accountName: account.name,
        accountType: account.accountType,
        institution: account.institution,
        initialBalance: periodInitialBalance, // Saldo Inicial (período)
        currentBalance: periodFinalBalance, // Saldo Final (período)
        projectedBalance: periodFinalBalance, // Simplified: using final balance as projected for now
        totalIn,
        totalOut,
        reconciliationStatus,
        transactionCount: accountTxInPeriod.length
      };
    });
  }, [accounts, transactions, dateRange, calculateBalanceUpToDate]);

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
            // Determine flow for the other side based on account type
            const otherAccount = accounts.find(a => a.id === t.accountId);
            const isCreditCard = otherAccount?.accountType === 'cartao_credito';
            
            let newFlow: 'in' | 'out' | 'transfer_in' | 'transfer_out';
            
            if (isCreditCard) {
              // Se o outro lado é CC, a transação original era o pagamento (transferencia)
              // O lado oposto é a Conta Corrente (transferencia)
              newFlow = t.accountId === transferGroup?.fromAccountId ? 'transfer_out' : 'transfer_in';
            } else {
              // Lógica normal de transferência
              newFlow = t.accountId === transferGroup?.fromAccountId ? 'transfer_out' : 'transfer_in';
            }
            
            return { 
              ...t, 
              amount: transaction.amount, 
              date: transaction.date, 
              description: transaction.description,
              flow: newFlow,
            };
          }
          return t;
        }));
      } else {
        setTransacoesV2(transacoesV2.map(t => t.id === transaction.id ? transaction : t));
      }
    } else {
      const newTransactions = [transaction];
      
      // PARTIDA DOBRADA: Transferência (inclui pagamento de fatura CC)
      if (transferGroup) {
        setTransferGroups(prev => [...prev, transferGroup]);
        
        const fromAccount = accounts.find(a => a.id === transferGroup.fromAccountId);
        const toAccount = accounts.find(a => a.id === transferGroup.toAccountId);
        
        const isFromCreditCard = fromAccount?.accountType === 'cartao_credito';
        const isToCreditCard = toAccount?.accountType === 'cartao_credito';
        
        let incomingTx: TransacaoCompleta;
        
        if (isToCreditCard) {
          // Pagamento de Fatura: CC (toAccount) recebe (flow: in), CC (fromAccount) sai (flow: out)
          // A transação original (transaction) é a entrada no CC (flow: in)
          
          // Transação de SAÍDA da Conta Corrente (fromAccount)
          incomingTx = {
            ...transaction,
            id: generateTransactionId(),
            accountId: transferGroup.fromAccountId,
            flow: 'transfer_out',
            operationType: 'transferencia',
            domain: 'operational',
            categoryId: null,
            links: { ...transaction.links, transferGroupId: transferGroup.id },
            description: transferGroup.description || `Transferência enviada para ${toAccount?.name}`,
          };
          
          // Atualiza a transação original (entrada no CC)
          transaction.links.transferGroupId = transferGroup.id;
          transaction.flow = 'in';
          
        } else if (isFromCreditCard) {
          // Não deve acontecer, Cartão de Crédito não envia transferência (exceto resgate, que é outra operação)
          // Se acontecer, tratamos como transferência normal (saída do CC, entrada na CC)
          
          // Transação de ENTRADA na Conta Destino (toAccount)
          incomingTx = {
            ...transaction,
            id: generateTransactionId(),
            accountId: transferGroup.toAccountId,
            flow: 'transfer_in',
            operationType: 'transferencia',
            domain: 'operational',
            categoryId: null,
            links: { ...transaction.links, transferGroupId: transferGroup.id },
            description: transferGroup.description || `Transferência recebida de ${fromAccount?.name}`,
          };
          
          // Atualiza a transação original (saída do CC)
          transaction.links.transferGroupId = transferGroup.id;
          transaction.flow = 'transfer_out';
          
        } else {
          // Transferência normal (CC para CC)
          
          // Transação de ENTRADA na Conta Destino (toAccount)
          incomingTx = {
            ...transaction,
            id: generateTransactionId(),
            accountId: transferGroup.toAccountId,
            flow: 'transfer_in',
            operationType: 'transferencia',
            domain: 'operational',
            categoryId: null,
            links: { ...transaction.links, transferGroupId: transferGroup.id },
            description: transferGroup.description || `Transferência recebida de ${fromAccount?.name}`,
          };
          
          // Atualiza a transação original (saída da Conta Origem)
          transaction.links.transferGroupId = transferGroup.id;
          transaction.flow = 'transfer_out';
        }
        
        newTransactions.push(incomingTx);
      }

      // PARTIDA DOBRADA: Aplicação (Conta Corrente → Conta de Investimento)
      if (transaction.operationType === 'aplicacao' && transaction.links?.investmentId) {
        const groupId = `app_${Date.now()}`;
        
        // 1. Transação de SAÍDA (Conta Corrente - já é a transação original)
        transaction.links.transferGroupId = groupId;
        transaction.flow = 'out'; 
        
        // 2. Transação de ENTRADA (Conta de Investimento)
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
            createdBy: 'system',
            source: 'manual',
            createdAt: new Date().toISOString(),
          }
        };
        newTransactions.push(incomingTx);
      }

      // PARTIDA DOBRADA: Resgate (Conta de Investimento → Conta Corrente)
      if (transaction.operationType === 'resgate' && transaction.links?.investmentId) {
        const groupId = `res_${Date.now()}`;
        
        // 1. Transação de ENTRADA (Conta Corrente - já é a transação original)
        transaction.links.transferGroupId = groupId;
        transaction.flow = 'in'; 
        
        // 2. Transação de SAÍDA (Conta de Investimento)
        const outgoingTx: TransacaoCompleta = {
          id: generateTransactionId(),
          date: transaction.date,
          accountId: transaction.links.investmentId, // Conta de investimento
          flow: 'out',
          operationType: 'resgate',
          domain: 'investment',
          amount: transaction.amount,
          categoryId: null,
          description: transaction.description || `Resgate enviado para conta corrente`,
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
              createdBy: 'system',
              source: 'manual',
              createdAt: new Date().toISOString(),
            }
          };
          newTransactions.push(outgoingTx);
        }
        
        // PARTIDA DOBRADA: Rendimento (Conta de Investimento → Conta Corrente)
        if (transaction.operationType === 'rendimento' && transaction.links?.investmentId) {
          const groupId = `rend_${Date.now()}`;
          
          // 1. Transação de ENTRADA (Conta Corrente - já é a transação original)
          transaction.links.transferGroupId = groupId;
          transaction.flow = 'in'; 
          
          // 2. Transação de ENTRADA (Conta de Investimento - aumenta o saldo da conta de investimento)
          const incomingInvTx: TransacaoCompleta = {
            ...transaction,
            id: generateTransactionId(),
            accountId: transaction.links.investmentId, // Conta de investimento
            flow: 'in',
            operationType: 'rendimento',
            domain: 'investment',
            categoryId: transaction.categoryId,
            links: {
              investmentId: transaction.accountId, // Referência à conta origem
              loanId: null,
              transferGroupId: groupId,
              parcelaId: null,
              vehicleTransactionId: null,
            },
            description: transaction.description || `Rendimento creditado no investimento`,
            conciliated: false,
            attachments: [],
            meta: {
              createdBy: 'system',
              source: 'manual',
              createdAt: new Date().toISOString(),
            }
          };
          newTransactions.push(incomingInvTx);
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
          // Add investment movement (legacy system)
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
        
        console.log("New Transactions to add:", newTransactions); // Debug log
        newTransactions.forEach(t => addTransacaoV2(t));
      }
    };

    const handleEditTransaction = (transaction: TransacaoCompleta) => {
      setEditingTransaction(transaction);
      setSelectedAccountForModal(transaction.accountId);
      setShowMovimentarModal(true);
    };

    const handleDeleteTransaction = (id: string) => {
      if (!confirm("Excluir esta transação?")) return;
      
      // 1. Encontrar a transação a ser excluída
      const transactionToDelete = transacoesV2.find(t => t.id === id);
      
      // 2. Reverter status de pagamento de empréstimo, se aplicável
      if (transactionToDelete?.operationType === 'pagamento_emprestimo' && transactionToDelete.links?.loanId) {
        const loanIdNum = parseInt(transactionToDelete.links.loanId.replace('loan_', ''));
        if (!isNaN(loanIdNum)) {
          unmarkLoanParcelPaid(loanIdNum);
        }
      }
      
      // 3. Excluir a transação e seus vínculos (partida dobrada)
      const linkedGroupId = transactionToDelete?.links?.transferGroupId;
      
      if (linkedGroupId) {
        // Delete both sides of the linked transaction (transfer, aplicacao, resgate)
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
      return contasMovimento
        .filter(c => c.accountType === 'aplicacao_renda_fixa' || c.accountType === 'poupanca' || c.accountType === 'criptoativos' || c.accountType === 'reserva_emergencia' || c.accountType === 'objetivos_financeiros')
        .map(c => ({ id: c.id, name: c.name }));
    }, [contasMovimento]);

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
              <DateRangeSelector onDateRangeChange={handleDateRangeChange} />
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