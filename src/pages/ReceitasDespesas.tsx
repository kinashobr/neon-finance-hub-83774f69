import { useState, useMemo, useCallback, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { RefreshCw, Tags, Plus } from "lucide-react";
import { toast } from "sonner";
import { isWithinInterval, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay, addMonths } from "date-fns";

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
import { parseDateLocal } from "@/lib/utils";

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
    addVeiculo, // <-- ADDED
    deleteVeiculo, // <-- ADDED
    calculateBalanceUpToDate, // Importado do contexto
    dateRanges, // <-- Use context state
    setDateRanges, // <-- Use context setter
    markSeguroParcelPaid,
    unmarkSeguroParcelPaid, // <-- Use correct name // <-- FIXED
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

  const handlePeriodChange = useCallback((ranges: ComparisonDateRanges) => {
    setDateRanges(ranges);
  }, [setDateRanges]);

  // Helper para filtrar transações por um range específico
  const filterTransactionsByRange = useCallback((range: DateRange) => {
    if (!range.from || !range.to) return transacoesV2;
    
    // Normaliza os limites do período para garantir que o dia inteiro seja incluído
    const rangeFrom = startOfDay(range.from);
    const rangeTo = endOfDay(range.to);
    
    return transacoesV2.filter(t => {
      const transactionDate = parseDateLocal(t.date);
      return isWithinInterval(transactionDate, { start: rangeFrom, end: rangeTo });
    });
  }, [transacoesV2]);

  // Transações do Período 1 (Principal)
  const transacoesPeriodo1 = useMemo(() => filterTransactionsByRange(dateRanges.range1), [filterTransactionsByRange, dateRanges.range1]);

  // Transações do Período 2 (Comparação)
  const transacoesPeriodo2 = useMemo(() => filterTransactionsByRange(dateRanges.range2), [filterTransactionsByRange, dateRanges.range2]);

  // Contas visíveis (agora todas são visíveis, pois a contrapartida foi removida)
  const visibleAccounts = useMemo(() => {
    return accounts.filter(a => !a.hidden);
  }, [accounts]);

  // Calculate account summaries
  const accountSummaries: AccountSummary[] = useMemo(() => {
    const periodStart = dateRanges.range1.from;
    const periodEnd = dateRanges.range1.to;
    
    return visibleAccounts.map(account => {
      
      let periodInitialBalance = 0;
      
      if (periodStart) {
          // 1. Calculate Period Initial Balance (balance accumulated UP TO the day BEFORE periodStart)
          const dayBeforeStart = subDays(periodStart, 1);
          periodInitialBalance = calculateBalanceUpToDate(account.id, dayBeforeStart, transactions, accounts);
      }
      // Se periodStart é undefined (Todo o período), periodInitialBalance é 0.
      
      // 2. Calculate Period Transactions (transactions strictly ON or AFTER periodStart, up to periodEnd)
      const accountTxInPeriod = transactions.filter(t => {
        if (t.accountId !== account.id) return false;
        
        const transactionDate = parseDateLocal(t.date);
        
        // Normaliza os limites do período para garantir que o dia inteiro seja incluído
        const rangeFrom = periodStart ? startOfDay(periodStart) : undefined;
        const rangeTo = periodEnd ? endOfDay(periodEnd) : undefined;
        
        // Se o período NÃO está definido (Todo o período), incluímos todas as transações.
        if (!rangeFrom) return true; 
        
        // Se o período está definido:
        // Incluímos transações ON or AFTER periodStart, up to periodEnd.
        return transactionDate >= rangeFrom && transactionDate <= (rangeTo || new Date());
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
    
    // NEW LOGIC: Handle Vehicle Purchase (triggers pending vehicle registration)
    if (finalTx.operationType === 'veiculo' && finalTx.meta?.vehicleOperation === 'compra') {
        addVeiculo({
            modelo: finalTx.description, // Use description as temporary model name
            marca: '',
            tipo: finalTx.meta.tipoVeiculo || 'carro', // Default to 'carro' if not specified
            ano: 0,
            dataCompra: finalTx.date,
            valorVeiculo: finalTx.amount,
            valorSeguro: 0,
            vencimentoSeguro: "",
            parcelaSeguro: 0,
            valorFipe: 0,
            compraTransactionId: finalTx.id,
            status: 'pendente_cadastro',
        });
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
            unmarkSeguroParcelPaid(seguroId, parcelaNumero); // <-- FIXED
        }
    }
    
    // Reverter criação de veículo pendente (NEW LOGIC)
    if (transactionToDelete?.operationType === 'veiculo' && transactionToDelete.meta?.vehicleOperation === 'compra') {
        const vehicleId = veiculos.find(v => v.compraTransactionId === id)?.id;
        if (vehicleId) {
            // Assuming we only delete the vehicle if it's still pending registration
            const vehicle = veiculos.find(v => v.id === vehicleId);
            if (vehicle?.status === 'pendente_cadastro') {
                // Only delete if it hasn't been fully configured yet
                deleteVeiculo(vehicleId);
            }
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

    if (isNewAccount) {
      setContasMovimento(prev => [...prev, newAccount]);

      if (initialBalanceAmount !== 0) {
        const txId = generateTransactionId();
        
        // Transação única: Entrada/Saída na conta do usuário
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
            transferGroupId: null,
            parcelaId: null,
            vehicleTransactionId: null,
          },
          conciliated: true,
          attachments: [],
          meta: {
            createdBy: 'user',
            source: 'manual',
            createdAt: new Date().toISOString(),
            notes: `Saldo inicial de ${formatCurrency(initialBalanceAmount)} em ${account.startDate}`
          }
        };
        
        addTransacaoV2(userTx);
      }
    } else {
      // Edição
      setContasMovimento(prev => prev.map(a => a.id === newAccount.id ? newAccount : a));

      // Encontra a transação de saldo inicial existente
      const existingInitialTx = transactions.find(t => 
          t.accountId === newAccount.id && t.operationType === 'initial_balance'
      );

      if (initialBalanceAmount !== 0) {
        const txId = existingInitialTx?.id || generateTransactionId();
        
        // Transação 1: Atualiza/Cria userTx
        const userTx: TransacaoCompleta = {
          id: txId,
          date: newAccount.startDate!,
          accountId: newAccount.id,
          flow: initialBalanceAmount >= 0 ? 'in' : 'out',
          operationType: 'initial_balance',
          domain: 'operational',
          amount: Math.abs(initialBalanceAmount),
          categoryId: null,
          description: `Saldo Inicial de Implantação`,
          links: {
            investmentId: null,
            loanId: null,
            transferGroupId: null,
            parcelaId: null,
            vehicleTransactionId: null,
          },
          conciliated: true,
          attachments: [],
          meta: {
            createdBy: 'user',
            source: 'manual',
            createdAt: existingInitialTx?.meta.createdAt || new Date().toISOString(),
            notes: `Saldo inicial de ${formatCurrency(initialBalanceAmount)} em ${account.startDate}`
          }
        };

        setTransacoesV2(prev => {
            let newTxs = prev.filter(t => t.id !== txId);
            newTxs.push(userTx);
            return newTxs;
        });
      } else {
        // Se o saldo inicial for 0, remove a transação existente
        if (existingInitialTx) {
          setTransacoesV2(prev => prev.filter(t => t.id !== existingInitialTx.id));
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

  // --- CORREÇÃO: Gerar lista de empréstimos com parcelas simuladas aqui ---
  const loans = useMemo(() => {
    return emprestimos
      .filter(e => e.status !== 'pendente_config')
      .map(e => {
        // Usa parseDateLocal para garantir que a data de início seja interpretada localmente
        const startDate = parseDateLocal(e.dataInicio || new Date().toISOString().split('T')[0]);
        
        // Simulação de parcelas (Método Price simplificado)
        const parcelas = e.meses > 0 ? Array.from({ length: e.meses }, (_, i) => {
          // A parcela N (índice i) vence i + 1 meses após a data de início.
          const vencimento = addMonths(startDate, i + 1);
          
          // Tenta encontrar a transação de pagamento real
          const paymentTx = transactions.find(t => 
            t.operationType === 'pagamento_emprestimo' && 
            t.links?.loanId === `loan_${e.id}` &&
            t.links?.parcelaId === (i + 1).toString()
          );

          return {
            numero: i + 1,
            vencimento: vencimento.toISOString().split('T')[0],
            valor: e.parcela,
            pago: !!paymentTx, // Considera pago se houver transação
            transactionId: paymentTx?.id,
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
  }, [emprestimos, transactions]);
  // -----------------------------------------------------------------------

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
          <KPISidebar transactions={transacoesPeriodo1} categories={categories} /> {/* <-- FIXED: Using transacoesPeriodo1 */}
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