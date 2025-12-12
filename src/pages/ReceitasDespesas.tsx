import { useState, useMemo, useCallback, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { RefreshCw, Tags, Plus } from "lucide-react";
import { toast } from "sonner";
import { isWithinInterval, startOfMonth, endOfMonth, parseISO, subDays } from "date-fns";

// Types
import { 
  ContaCorrente, Categoria, TransacaoCompleta, TransferGroup,
  AccountSummary, OperationType, DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, 
  generateTransactionId, formatCurrency, generateTransferGroupId,
  DateRange, ComparisonDateRanges, TransactionLinks
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
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";

// Context
import { useFinance } from "@/contexts/FinanceContext";

const ReceitasDespesas = () => {
  const { 
    contasMovimento, 
    setContasMovimento,
    categoriasV2: categories, 
    setCategoriasV2,
    transacoesV2, 
    setTransacoesV2,
    addTransacaoV2,
    emprestimos,
    addEmprestimo,
    markLoanParcelPaid,
    unmarkLoanParcelPaid,
    veiculos,
    addVeiculo,
    calculateBalanceUpToDate, // Importado do contexto
    dateRanges, // <-- Use context state
    setDateRanges, // <-- Use context setter
    markSeguroParcelPaid,
    unmarkSeguroParcelPaid, // <-- FIXED: Renamed from unmarkSeguroParcelaid
    getInitialBalanceContraAccount, // NOVO: Obter conta de contrapartida
  } = useFinance();

  // Local state for transfer groups
  const [transferGroups, setTransferGroups] = useState<TransferGroup[]>([]);

  // UI state
  const [showMovimentarModal, setShowMovimentarModal] = useState(false);
  const [selectedAccountForModal, setSelectedAccountForModal] = useState<string>();
  const [showReconciliation, setShowReconciliation] = useState(false);
  
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

  // Filter state (mantido para filtros internos da tabela, mas datas são controladas pelo PeriodSelector)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [selectedTypes, setSelectedTypes] = useState<OperationType[]>(['receita', 'despesa', 'transferencia', 'aplicacao', 'resgate', 'pagamento_emprestimo', 'liberacao_emprestimo', 'veiculo', 'rendimento', 'initial_balance']);
  
  // Removendo dateFrom/dateTo do estado local, pois PeriodSelector controla isso
  const dateFrom = dateRanges.range1.from ? dateRanges.range1.from.toISOString().split('T')[0] : "";
  const dateTo = dateRanges.range1.to ? dateRanges.range1.to.toISOString().split('T')[0] : "";

  // Alias for context data
  const accounts = contasMovimento;
  const transactions = transacoesV2;
  const initialBalanceContraAccount = getInitialBalanceContraAccount();

  const handlePeriodChange = useCallback((ranges: ComparisonDateRanges) => {
    setDateRanges(ranges);
  }, [setDateRanges]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    const range = dateRanges.range1; // Use range1 for filtering transactions in this view
    
    return transactions.filter(t => {
      const matchSearch = !searchTerm || t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchAccount = selectedAccountId === 'all' || t.accountId === selectedAccountId;
      const matchCategory = selectedCategoryId === 'all' || t.categoryId === selectedCategoryId;
      const matchType = selectedTypes.includes(t.operationType);
      
      const transactionDate = parseISO(t.date);
      
      // Filtro de período usando dateRange.range1
      const matchPeriod = (!range.from || isWithinInterval(transactionDate, { start: range.from, end: range.to || new Date() }));
      
      return matchSearch && matchAccount && matchCategory && matchType && matchPeriod;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, selectedAccountId, selectedCategoryId, selectedTypes, dateRanges]);

  // Contas visíveis (exclui a conta de contrapartida)
  const visibleAccounts = useMemo(() => {
    return accounts.filter(a => !a.hidden);
  }, [accounts]);

  // Calculate account summaries
  const accountSummaries: AccountSummary[] = useMemo(() => {
    const periodStart = dateRanges.range1.from;
    const periodEnd = dateRanges.range1.to;
    
    return visibleAccounts.map(account => {
      // 1. Calculate Period Initial Balance (balance accumulated UP TO the day BEFORE periodStart)
      
      let periodInitialBalance = 0;
      
      if (periodStart) {
          // Calculate balance up to the day before periodStart (exclusive of periodStart)
          const dayBeforeStart = subDays(periodStart, 1);
          periodInitialBalance = calculateBalanceUpToDate(account.id, dayBeforeStart, transactions, accounts);
      }
      // If periodStart is undefined (Todo o período), periodInitialBalance remains 0.
      
      // 2. Calculate Period Transactions (transactions strictly ON or AFTER periodStart, up to periodEnd)
      const accountTxInPeriod = transactions.filter(t => {
        if (t.accountId !== account.id) return false;
        
        // Exclude synthetic initial balance transactions from period flow calculation
        // These transactions are already accounted for in periodInitialBalance if they occurred before periodStart.
        if (t.operationType === 'initial_balance' && periodStart) return false;
        
        const transactionDate = parseISO(t.date);
        
        if (!periodStart) return true; // Todo o período: includes all transactions (including initial_balance if it exists)
        
        // Period defined: include transactions ON or AFTER periodStart, up to periodEnd
        return transactionDate >= periodStart && transactionDate <= (periodEnd || new Date());
      });

      // 3. Calculate Period Totals
      let totalIn = 0;
      let totalOut = 0;
      
      accountTxInPeriod.forEach(t => {
        const isCreditCard = account.accountType === 'cartao_credito';
        
        if (isCreditCard) {
          if (t.operationType === 'despesa') {
            totalOut += t.amount;
          } else if (t.operationType === 'transferencia') {
            totalIn += t.amount;
          }
        } else {
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
      const conciliatedCount = accountTxInPeriod.filter(t => t.conciliated).length;
      const reconciliationStatus = accountTxInPeriod.length === 0 || conciliatedCount === accountTxInPeriod.length ? 'ok' : 'warning' as const;

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
  }, [visibleAccounts, transactions, dateRanges, calculateBalanceUpToDate, accounts]);

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
    // Clone para não mutar o objeto recebido e garantir links
    const tx = { ...transaction, links: { ...(transaction.links || {}) } };

    if (editingTransaction) {
      // Quando editar, atualiza transação e possíveis transações vinculadas pelo grupo
      const linkedGroupId = editingTransaction.links?.transferGroupId;
      if (linkedGroupId) {
        setTransacoesV2(prev => prev.map(t => {
          if (t.id === tx.id) {
            const fullTx: TransacaoCompleta = {
              ...tx,
              links: {
                investmentId: tx.links.investmentId || null,
                loanId: tx.links.loanId || null,
                transferGroupId: tx.links.transferGroupId || null,
                parcelaId: tx.links.parcelaId || null,
                vehicleTransactionId: tx.links.vehicleTransactionId || null,
              }
            };
            return fullTx;
          }
          if (t.links?.transferGroupId === linkedGroupId && t.id !== tx.id) {
            const otherAccount = accounts.find(a => a.id === t.accountId);
            const isCreditCard = otherAccount?.accountType === 'cartao_credito';

            let newFlow: 'in' | 'out' | 'transfer_in' | 'transfer_out';

            if (isCreditCard) {
              newFlow = t.accountId === transferGroup?.fromAccountId ? 'transfer_out' : 'transfer_in';
            } else {
              newFlow = t.accountId === transferGroup?.fromAccountId ? 'transfer_out' : 'transfer_in';
            }

            const updatedLinks: TransactionLinks = {
              investmentId: t.links.investmentId || null,
              loanId: t.links.loanId || null,
              transferGroupId: t.links.transferGroupId || null,
              parcelaId: t.links.parcelaId || null,
              vehicleTransactionId: t.links.vehicleTransactionId || null,
            };

            return {
              ...t,
              amount: tx.amount,
              date: tx.date,
              description: tx.description,
              flow: newFlow,
              links: updatedLinks,
            } as TransacaoCompleta;
          }
          return t;
        }));
      }
      return;
    }

    // === Criação de transações (não edição) ===
    const newTransactions: TransacaoCompleta[] = [];
    const baseTx = { ...tx, links: { ...(tx.links || {}) } };

    // 1. Transferência / pagamento CC
    if (transferGroup) {
      const tg = transferGroup;
      const fromAccount = accounts.find(a => a.id === tg.fromAccountId);
      const toAccount = accounts.find(a => a.id === tg.toAccountId);
      const isToCreditCard = toAccount?.accountType === 'cartao_credito';

      // Transação original (clone)
      const originalTx: TransacaoCompleta = {
        ...baseTx,
        id: generateTransactionId(),
        links: {
          investmentId: baseTx.links.investmentId || null,
          loanId: baseTx.links.loanId || null,
          transferGroupId: tg.id,
          parcelaId: baseTx.links.parcelaId || null,
          vehicleTransactionId: baseTx.links.vehicleTransactionId || null,
        },
      };

      if (isToCreditCard) {
        // Transação original (entrada no CC)
        const ccTx: TransacaoCompleta = {
          ...originalTx,
          accountId: tg.toAccountId,
          flow: 'in' as const,
          operationType: 'transferencia' as const,
          description: tg.description || `Pagamento de fatura CC ${toAccount?.name}`,
          links: {
            investmentId: originalTx.links.investmentId || null,
            loanId: originalTx.links.loanId || null,
            transferGroupId: tg.id,
            parcelaId: originalTx.links.parcelaId || null,
            vehicleTransactionId: originalTx.links.vehicleTransactionId || null,
          }
        };

        // Transação de saída da conta corrente
        const fromTx: TransacaoCompleta = {
          ...originalTx,
          id: generateTransactionId(),
          accountId: tg.fromAccountId,
          flow: 'transfer_out' as const,
          operationType: 'transferencia' as const,
          description: tg.description || `Pagamento fatura ${toAccount?.name}`,
          links: {
            investmentId: originalTx.links.investmentId || null,
            loanId: originalTx.links.loanId || null,
            transferGroupId: tg.id,
            parcelaId: originalTx.links.parcelaId || null,
            vehicleTransactionId: originalTx.links.vehicleTransactionId || null,
          }
        };

        newTransactions.push(fromTx, ccTx);
      } else {
        // Transferência normal (origem -> destino)
        const outTx: TransacaoCompleta = {
          ...originalTx,
          id: generateTransactionId(),
          accountId: tg.fromAccountId,
          flow: 'transfer_out' as const,
          operationType: 'transferencia' as const,
          description: tg.description || `Transferência para ${toAccount?.name}`,
          links: {
            investmentId: originalTx.links.investmentId || null,
            loanId: originalTx.links.loanId || null,
            transferGroupId: tg.id,
            parcelaId: originalTx.links.parcelaId || null,
            vehicleTransactionId: originalTx.links.vehicleTransactionId || null,
          }
        };

        const inTx: TransacaoCompleta = {
          ...originalTx,
          id: generateTransactionId(),
          accountId: tg.toAccountId,
          flow: 'transfer_in' as const,
          operationType: 'transferencia' as const,
          description: tg.description || `Transferência recebida de ${fromAccount?.name}`,
          links: {
            investmentId: originalTx.links.investmentId || null,
            loanId: originalTx.links.loanId || null,
            transferGroupId: tg.id,
            parcelaId: originalTx.links.parcelaId || null,
            vehicleTransactionId: originalTx.links.vehicleTransactionId || null,
          }
        };

        newTransactions.push(outTx, inTx);
      }
    } else {
      // Sem transferGroup: adiciona apenas a transação original (garantindo id única)
      const simpleTx: TransacaoCompleta = { 
        ...baseTx, 
        id: tx.id || generateTransactionId(),
        links: {
          investmentId: baseTx.links.investmentId || null,
          loanId: baseTx.links.loanId || null,
          transferGroupId: baseTx.links.transferGroupId || null,
          parcelaId: baseTx.links.parcelaId || null,
          vehicleTransactionId: baseTx.links.vehicleTransactionId || null,
        }
      };
      newTransactions.push(simpleTx);
    }

    // 2. Aplicação / Resgate (Partida dobrada entre contas)
    const isInvestmentFlow = (baseTx.operationType === 'aplicacao' || baseTx.operationType === 'resgate') && baseTx.links?.investmentId;

    if (isInvestmentFlow) {
      const isAplicacao = baseTx.operationType === 'aplicacao';
      const groupId = isAplicacao ? `app_${Date.now()}` : `res_${Date.now()}`;
      
      // Transação 1 (Conta Corrente) - Já está em newTransactions[0] se não for transferência, ou é a baseTx
      const primaryTx = newTransactions.find(t => t.id === baseTx.id) || newTransactions[0];
      
      // Atualiza links e flow da transação primária
      primaryTx.links.transferGroupId = groupId;
      primaryTx.flow = isAplicacao ? 'out' : 'in';
      primaryTx.operationType = isAplicacao ? 'aplicacao' : 'resgate';
      primaryTx.domain = 'investment';

      // Transação 2 (Conta de Investimento)
      const secondaryTx: TransacaoCompleta = {
        ...primaryTx,
        id: generateTransactionId(),
        accountId: baseTx.links.investmentId!,
        flow: isAplicacao ? 'in' : 'out',
        operationType: isAplicacao ? 'aplicacao' : 'resgate',
        domain: 'investment',
        description: isAplicacao ? (baseTx.description || `Aplicação recebida de conta corrente`) : (baseTx.description || `Resgate enviado para conta corrente`),
        links: {
          investmentId: primaryTx.accountId, // Referência à conta oposta
          loanId: primaryTx.links.loanId || null,
          transferGroupId: groupId,
          parcelaId: primaryTx.links.parcelaId || null,
          vehicleTransactionId: primaryTx.links.vehicleTransactionId || null,
        },
        meta: {
          ...primaryTx.meta,
          createdBy: 'system',
        }
      };
      
      // Adiciona a transação secundária se ainda não estiver lá
      if (!newTransactions.some(t => t.id === secondaryTx.id)) {
        newTransactions.push(secondaryTx);
      }
    }

    // 3. Handle special operation types (Loan/Vehicle)
    const finalTx = newTransactions.find(t => t.id === tx.id) || newTransactions[0];

    if (finalTx.operationType === 'liberacao_emprestimo' && finalTx.meta?.numeroContrato) {
      addEmprestimo({
        contrato: finalTx.meta.numeroContrato,
        valorTotal: finalTx.amount,
        parcela: 0,
        meses: 0,
        taxaMensal: 0,
        status: 'pendente_config',
        liberacaoTransactionId: finalTx.id,
        contaCorrenteId: finalTx.accountId,
        dataInicio: finalTx.date,
      });
    }

    if (finalTx.operationType === 'pagamento_emprestimo' && finalTx.links?.loanId) {
      const loanIdNum = parseInt(finalTx.links.loanId.replace('loan_', ''));
      const parcelaNum = finalTx.links.parcelaId ? parseInt(finalTx.links.parcelaId) : undefined;
      if (!isNaN(loanIdNum)) {
        markLoanParcelPaid(loanIdNum, finalTx.amount, finalTx.date, parcelaNum);
      }
    }
    
    // 4. Handle Seguro Payment (NEW LOGIC)
    if (finalTx.links?.vehicleTransactionId && finalTx.flow === 'out') {
        const [seguroIdStr, parcelaNumeroStr] = finalTx.links.vehicleTransactionId.split('_');
        const seguroId = parseInt(seguroIdStr);
        const parcelaNumero = parseInt(parcelaNumeroStr);
        
        if (!isNaN(seguroId) && !isNaN(parcelaNumero)) {
            markSeguroParcelPaid(seguroId, parcelaNumero, finalTx.id);
        }
    }
    
    // Adiciona todas as transações criadas
    newTransactions.forEach(t => addTransacaoV2(t));
  };

  const handleEditTransaction = (transaction: TransacaoCompleta) => {
    setEditingTransaction(transaction);
    setSelectedAccountForModal(transaction.accountId);
    setShowMovimentarModal(true);
  };

  const handleDeleteTransaction = (id: string) => {
    if (!window.confirm("Excluir esta transação?")) return;

    const transactionToDelete = transactions.find(t => t.id === id);

    // Reverter marcação de pagamento empréstimo
    if (transactionToDelete?.operationType === 'pagamento_emprestimo' && transactionToDelete.links?.loanId) {
      const loanIdNum = parseInt(transactionToDelete.links.loanId.replace('loan_', ''));
      if (!isNaN(loanIdNum)) {
        unmarkLoanParcelPaid(loanIdNum);
      }
    }
    
    // Reverter marcação de pagamento seguro (NEW LOGIC)
    if (transactionToDelete?.links?.vehicleTransactionId && transactionToDelete.flow === 'out') {
        const [seguroIdStr, parcelaNumeroStr] = transactionToDelete.links.vehicleTransactionId.split('_');
        const seguroId = parseInt(seguroIdStr);
        const parcelaNumero = parseInt(parcelaNumeroStr);
        
        if (!isNaN(seguroId) && !isNaN(parcelaNumero)) {
            unmarkSeguroParcelPaid(seguroId, parcelaNumero); 
        }
    }

    const linkedGroupId = transactionToDelete?.links?.transferGroupId;

    if (linkedGroupId) {
      setTransacoesV2(prev => prev.filter(t => t.links?.transferGroupId !== linkedGroupId));
      toast.success("Transações vinculadas excluídas");
    } else {
      setTransacoesV2(prev => prev.filter(t => t.id !== id));
      toast.success("Transação excluída");
    }
  };

  const handleToggleConciliated = (id: string, value: boolean) => {
    setTransacoesV2(prev => prev.map(t => t.id === id ? { ...t, conciliated: value } : t));
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
    setTransacoesV2(prev => prev.map(t => 
      t.accountId === accountId ? { ...t, conciliated: true } : t
    ));
    toast.success("Conta conciliada!");
  };

  // Account CRUD
  const handleAccountSubmit = (account: ContaCorrente, initialBalanceValue: number) => {
    const isNewAccount = !editingAccount;
    const initialBalanceAmount = initialBalanceValue ?? 0;
    
    // A conta em si é salva com initialBalance: 0
    const newAccount: ContaCorrente = { ...account, initialBalance: 0 };
    const contraAccountId = initialBalanceContraAccount.id;

    if (isNewAccount) {
      setContasMovimento(prev => [...prev.filter(a => a.id !== contraAccountId), newAccount, initialBalanceContraAccount]);

      if (initialBalanceAmount !== 0) {
        const txId = generateTransactionId();
        
        // Transação 1: Entrada/Saída na conta do usuário
        const userTx: TransacaoCompleta = {
          id: txId,
          date: account.startDate!,
          accountId: account.id,
          flow: initialBalanceAmount >= 0 ? 'in' : 'out',
          operationType: 'initial_balance',
          domain: 'operational',
          amount: Math.abs(initialBalanceAmount),
          categoryId: null,
          description: `Saldo Inicial de Implantação`,
          links: {
            investmentId: null,
            loanId: null,
            transferGroupId: txId, // Usa o ID da transação como grupo de transferência
            parcelaId: null,
            vehicleTransactionId: null,
          },
          conciliated: true,
          attachments: [],
          meta: {
            createdBy: 'system',
            source: 'manual', // FIXED: source must be 'manual'
            createdAt: new Date().toISOString(),
            notes: `Saldo inicial de ${formatCurrency(initialBalanceAmount)} em ${account.startDate}`
          }
        };
        
        // Transação 2: Contrapartida na conta de Saldo de Implantação
        const contraTx: TransacaoCompleta = {
            ...userTx,
            id: generateTransactionId(),
            accountId: contraAccountId,
            flow: initialBalanceAmount >= 0 ? 'out' : 'in', // Fluxo oposto
            description: `Contrapartida Saldo Inicial ${account.name}`,
            links: {
                ...userTx.links,
                transferGroupId: txId,
            },
            meta: {
                ...userTx.meta,
                createdBy: 'system',
                source: 'manual', // FIXED: source must be 'manual'
            }
        };
        
        addTransacaoV2(userTx);
        addTransacaoV2(contraTx);
      }
    } else {
      // Edição
      setContasMovimento(prev => prev.map(a => a.id === newAccount.id ? newAccount : a));

      // Encontra as transações de saldo inicial (userTx e contraTx)
      const existingInitialTx = transactions.find(t => 
          t.accountId === newAccount.id && t.operationType === 'initial_balance'
      );
      const linkedGroupId = existingInitialTx?.links?.transferGroupId;
      const existingContraTx = linkedGroupId ? transactions.find(t => 
          t.accountId === contraAccountId && t.links?.transferGroupId === linkedGroupId
      ) : undefined;

      if (initialBalanceAmount !== 0) {
        const txId = linkedGroupId || generateTransactionId();
        
        const baseTx = {
            id: existingInitialTx?.id || generateTransactionId(),
            accountId: newAccount.id,
            operationType: 'initial_balance' as const,
            domain: 'operational' as const,
            categoryId: null,
            description: `Saldo Inicial de Implantação`,
            links: { investmentId: null, loanId: null, transferGroupId: txId, parcelaId: null, vehicleTransactionId: null },
            conciliated: true,
            attachments: [],
            meta: { createdBy: 'system', source: 'manual' as const, createdAt: new Date().toISOString() } // FIXED: source must be 'manual'
        };
        
        // Transação 1: Atualiza/Cria userTx
        const userTx: TransacaoCompleta = {
          ...baseTx,
          date: newAccount.startDate!,
          amount: Math.abs(initialBalanceAmount),
          flow: initialBalanceAmount >= 0 ? 'in' : 'out',
        };
        
        // Transação 2: Atualiza/Cria contraTx
        const contraTx: TransacaoCompleta = {
            ...userTx,
            id: existingContraTx?.id || generateTransactionId(),
            accountId: contraAccountId,
            flow: initialBalanceAmount >= 0 ? 'out' : 'in', // Fluxo oposto
            description: `Contrapartida Saldo Inicial ${account.name}`,
            links: { ...userTx.links },
            meta: { ...userTx.meta, createdBy: 'system', source: 'manual' as const } // FIXED: source must be 'manual'
        };

        setTransacoesV2(prev => {
            let newTxs = prev.filter(t => t.id !== userTx.id && t.id !== contraTx.id);
            newTxs.push(userTx, contraTx);
            return newTxs;
        });
      } else {
        // Se o saldo inicial for 0, remove as transações existentes
        if (existingInitialTx) {
          setTransacoesV2(prev => prev.filter(t => t.id !== existingInitialTx.id && t.id !== existingContraTx?.id));
        }
      }
    }

    setEditingAccount(undefined);
  };

  const handleAccountDelete = (accountId: string) => {
    const hasTransactions = transactions.some(t => t.accountId === accountId);
    if (hasTransactions) {
      toast.error("Não é possível excluir conta com transações vinculadas");
      return;
    }
    
    // Remove a conta e as transações de saldo inicial (se existirem)
    setContasMovimento(prev => prev.filter(a => a.id !== accountId));
    setTransacoesV2(prev => prev.filter(t => t.accountId !== accountId));
  };

  const handleEditAccount = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      // Encontra a transação de saldo inicial para obter o valor real
      const initialTx = transactions.find(t => 
          t.accountId === accountId && t.operationType === 'initial_balance'
      );
      
      let initialBalanceValue = 0;
      if (initialTx) {
          initialBalanceValue = initialTx.flow === 'in' ? initialTx.amount : -initialTx.amount;
      }
      
      // Cria um objeto temporário para passar o valor real do saldo inicial para o formulário
      const accountForEdit: ContaCorrente & { initialBalanceValue?: number } = {
          ...account,
          initialBalanceValue: initialBalanceValue, 
      };
      
      setEditingAccount(accountForEdit);
      setShowAccountModal(true);
    }
  };

  // Category CRUD
  const handleCategorySubmit = (category: Categoria) => {
    if (editingCategory) {
      setCategoriasV2(prev => prev.map(c => c.id === category.id ? category : c));
    } else {
      setCategoriasV2(prev => [...prev, category]);
    }
    setEditingCategory(undefined);
  };

  const handleCategoryDelete = (categoryId: string) => {
    const hasTransactions = transactions.some(t => t.categoryId === categoryId);
    if (hasTransactions) {
      toast.error("Não é possível excluir categoria em uso");
      return;
    }
    setCategoriasV2(prev => prev.filter(c => c.id !== categoryId));
  };

  // Get investments and loans from context for linking (V2 entities)
  const investments = useMemo(() => {
    return accounts
      .filter(c => 
        c.accountType === 'aplicacao_renda_fixa' || 
        c.accountType === 'poupanca' ||
        c.accountType === 'criptoativos' ||
        c.accountType === 'reserva_emergencia' ||
        c.accountType === 'objetivos_financeiros'
      )
      .map(i => ({ id: i.id, name: i.name }));
  }, [accounts]);

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
            <PeriodSelector 
              initialRanges={dateRanges}
              onDateRangeChange={handlePeriodChange} 
            />
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
            accounts={visibleAccounts}
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