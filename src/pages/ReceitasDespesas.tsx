import { useState, useMemo, useCallback, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { RefreshCw, Tags, Plus, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { isWithinInterval, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay, addMonths, format } from "date-fns";

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
import { BillsTrackerModal } from "@/components/bills/BillsTrackerModal";
import { StatementManagerDialog } from "@/components/transactions/StatementManagerDialog"; 
import { ConsolidatedReviewDialog } from "@/components/transactions/ConsolidatedReviewDialog"; 
import { StandardizationRuleManagerModal } from "@/components/transactions/StandardizationRuleManagerModal";

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
    addVeiculo, 
    deleteVeiculo, 
    calculateBalanceUpToDate, 
    dateRanges, 
    setDateRanges, 
    markSeguroParcelPaid,
    unmarkSeguroParcelPaid, 
    standardizationRules, 
    deleteStandardizationRule, 
    uncontabilizeImportedTransaction, 
    segurosVeiculo, // <-- ADDED
  } = useFinance();

  // Local state for transfer groups
  const [transferGroups, setTransferGroups] = useState<TransferGroup[]>([]);

  // UI state
  const [showMovimentarModal, setShowMovimentarModal] = useState(false);
  const [selectedAccountForModal, setSelectedAccountForModal] = useState<string>();
  // Removed: const [showReconciliation, setShowReconciliation] = useState(false);
  
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
  
  // Bills Tracker Modal (NEW STATE)
  const [showBillsTrackerModal, setShowBillsTrackerModal] = useState(false);
  
  // Import Modal State (UPDATED)
  const [showStatementManagerModal, setShowStatementManagerModal] = useState(false);
  const [accountToManage, setAccountToManage] = useState<ContaCorrente | null>(null);
  
  // NEW STATE: Consolidated Review (Fase 2)
  const [showConsolidatedReview, setShowConsolidatedReview] = useState(false);
  const [accountForConsolidatedReview, setAccountForConsolidatedReview] = useState<string | null>(null);
  
  // NEW STATE: Standardization Rule Manager
  const [showRuleManagerModal, setShowRuleManagerModal] = useState(false);

  // Filter state (REMOVIDOS: searchTerm, selectedAccountId, selectedCategoryId, selectedTypes)
  
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

  // Contas visíveis
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
          const dayBeforeStart = subDays(periodStart, 1);
          periodInitialBalance = calculateBalanceUpToDate(account.id, dayBeforeStart, transactions, accounts);
      }
      
      const accountTxInPeriod = transactions.filter(t => {
        if (t.accountId !== account.id) return false;
        
        const transactionDate = parseDateLocal(t.date);
        
        const rangeFrom = periodStart ? startOfDay(periodStart) : undefined;
        const rangeTo = periodEnd ? endOfDay(periodEnd) : undefined;
        
        if (!rangeFrom) return true; 
        
        return transactionDate >= rangeFrom && transactionDate <= (rangeTo || new Date());
      });

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
      
      const periodFinalBalance = periodInitialBalance + totalIn - totalOut;
      
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
  
  // UPDATED HANDLER: Import Extrato
  const handleImportExtrato = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account && account.accountType === 'corrente') {
      setAccountToManage(account);
      setShowStatementManagerModal(true);
    } else {
        toast.error("A importação de extrato é permitida apenas para Contas Correntes.");
    }
  };
  
  // NEW HANDLER: Start Consolidated Review (Fase 2)
  const handleStartConsolidatedReview = (accountId: string) => {
    setAccountForConsolidatedReview(accountId);
    setShowConsolidatedReview(true);
  };
  
  // NEW HANDLER: Manage Rules
  const handleManageRules = () => {
    setShowStatementManagerModal(false); // Close statement manager if open
    setShowRuleManagerModal(true);
  };

  const handleTransactionSubmit = (transaction: TransacaoCompleta, transferGroup?: TransferGroup) => {
    // Ensure tx has complete links structure
    const tx: TransacaoCompleta = { 
        ...transaction, 
        links: { 
            investmentId: transaction.links.investmentId || null,
            loanId: transaction.links.loanId || null,
            transferGroupId: transaction.links.transferGroupId || null,
            parcelaId: transaction.links.parcelaId || null,
            vehicleTransactionId: transaction.links.vehicleTransactionId || null,
        }
    };

    if (editingTransaction) {
      const linkedGroupId = editingTransaction.links?.transferGroupId;
      
      // --- Lógica de Reversão de Vínculos Antigos (Edição) ---
      
      // 1. Reversão de Seguro Antigo
      if (editingTransaction.links?.vehicleTransactionId && editingTransaction.links.vehicleTransactionId !== tx.links.vehicleTransactionId) {
          const [oldSeguroIdStr, oldParcelaNumStr] = editingTransaction.links.vehicleTransactionId.split('_');
          const oldSeguroId = parseInt(oldSeguroIdStr);
          const oldParcelaNumero = parseInt(oldParcelaNumStr);
          if (!isNaN(oldSeguroId) && !isNaN(oldParcelaNumero)) {
              unmarkSeguroParcelPaid(oldSeguroId, oldParcelaNumero);
          }
      }
      
      // 2. Reversão de Empréstimo Antigo
      if (editingTransaction.links?.loanId && editingTransaction.links.loanId !== tx.links.loanId) {
          const oldLoanIdNum = parseInt(editingTransaction.links.loanId.replace('loan_', ''));
          if (!isNaN(oldLoanIdNum)) {
              unmarkLoanParcelPaid(oldLoanIdNum);
          }
      }
      
      // --- Fim da Reversão ---
      
      // --- Aplicação de Novos Vínculos (Edição) ---
      
      // 3. Marcação de Seguro Novo
      if (tx.links?.vehicleTransactionId && tx.flow === 'out') {
          const [seguroIdStr, parcelaNumeroStr] = tx.links.vehicleTransactionId.split('_');
          const seguroId = parseInt(seguroIdStr);
          const parcelaNumero = parseInt(parcelaNumeroStr);
          
          if (!isNaN(seguroId) && !isNaN(parcelaNumero)) {
              markSeguroParcelPaid(seguroId, parcelaNumero, tx.id);
          }
      }
      
      // 4. Marcação de Empréstimo Novo
      if (tx.operationType === 'pagamento_emprestimo' && tx.links?.loanId) {
          const loanIdNum = parseInt(tx.links.loanId.replace('loan_', ''));
          const parcelaNum = tx.links.parcelaId ? parseInt(tx.links.parcelaId) : undefined;
          if (!isNaN(loanIdNum)) {
              markLoanParcelPaid(loanIdNum, tx.amount, tx.date, parcelaNum);
          }
      }
      
      // --- Fim da Aplicação ---
      
      if (linkedGroupId) {
        setTransacoesV2(prev => prev.map(t => {
          if (t.id === tx.id) {
            // Use the complete tx object directly
            return tx;
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
      } else {
        // Update single transaction
        setTransacoesV2(prev => prev.map(t => t.id === tx.id ? tx : t));
      }
      return;
    }

    const newTransactions: TransacaoCompleta[] = [];
    const baseTx = { ...tx, links: { ...(tx.links || {}) } };

    if (transferGroup) {
      const tg = transferGroup;
      const fromAccount = accounts.find(a => a.id === tg.fromAccountId);
      const toAccount = accounts.find(a => a.id === tg.toAccountId);
      const isCreditCard = toAccount?.accountType === 'cartao_credito';

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

      if (isCreditCard) { // Corrected from isToCreditCard
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

    const isInvestmentFlow = (baseTx.operationType === 'aplicacao' || baseTx.operationType === 'resgate') && baseTx.links?.investmentId;

    if (isInvestmentFlow) {
      const isAplicacao = baseTx.operationType === 'aplicacao';
      const groupId = isAplicacao ? `app_${Date.now()}` : `res_${Date.now()}`;
      
      const primaryTx = newTransactions.find(t => t.id === baseTx.id) || newTransactions[0];
      
      primaryTx.links.transferGroupId = groupId;
      primaryTx.flow = isAplicacao ? 'out' : 'in';
      primaryTx.operationType = isAplicacao ? 'aplicacao' : 'resgate';
      primaryTx.domain = 'investment';

      const secondaryTx: TransacaoCompleta = {
        ...primaryTx,
        id: generateTransactionId(),
        accountId: baseTx.links.investmentId!,
        flow: isAplicacao ? 'in' : 'out',
        operationType: isAplicacao ? 'aplicacao' : 'resgate',
        domain: 'investment',
        description: isAplicacao ? (baseTx.description || `Aplicação recebida de conta corrente`) : (baseTx.description || `Resgate enviado para conta corrente`),
        links: {
          investmentId: primaryTx.accountId,
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
      
      if (!newTransactions.some(t => t.id === secondaryTx.id)) {
        newTransactions.push(secondaryTx);
      }
    }

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
    
    // --- NEW: Handle Insurance Payment Submission ---
    if (finalTx.links?.vehicleTransactionId && finalTx.flow === 'out') {
        const [seguroIdStr, parcelaNumeroStr] = finalTx.links.vehicleTransactionId.split('_');
        const seguroId = parseInt(seguroIdStr);
        const parcelaNumero = parseInt(parcelaNumeroStr);
        
        if (!isNaN(seguroId) && !isNaN(parcelaNumero)) {
            markSeguroParcelPaid(seguroId, parcelaNumero, finalTx.id);
        }
    }
    
    if (finalTx.operationType === 'veiculo' && finalTx.meta?.vehicleOperation === 'compra') {
        addVeiculo({
            modelo: finalTx.description,
            marca: '',
            tipo: finalTx.meta.tipoVeiculo || 'carro',
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
    
    newTransactions.forEach(t => addTransacaoV2(t));
  };

  const handleEditTransaction = (transaction: TransacaoCompleta) => {
    setEditingTransaction(transaction);
    setSelectedAccountForModal(transaction.accountId);
    setShowMovimentarModal(true);
  };

  const handleDeleteTransaction = (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta transação?")) return;

    const transactionToDelete = transactions.find(t => t.id === id);

    if (transactionToDelete?.operationType === 'pagamento_emprestimo' && transactionToDelete.links?.loanId) {
      const loanIdNum = parseInt(transactionToDelete.links.loanId.replace('loan_', ''));
      if (!isNaN(loanIdNum)) {
        unmarkLoanParcelPaid(loanIdNum);
      }
    }
    
    // --- NEW: Handle Insurance Payment Unmark on Delete ---
    if (transactionToDelete?.links?.vehicleTransactionId && transactionToDelete.flow === 'out') {
        const [seguroIdStr, parcelaNumeroStr] = transactionToDelete.links.vehicleTransactionId.split('_');
        const seguroId = parseInt(seguroIdStr);
        const parcelaNumero = parseInt(parcelaNumeroStr);
        
        if (!isNaN(seguroId) && !isNaN(parcelaNumero)) {
            unmarkSeguroParcelPaid(seguroId, parcelaNumero);
        }
    }
    
    if (transactionToDelete?.operationType === 'veiculo' && transactionToDelete.meta?.vehicleOperation === 'compra') {
        const vehicleId = veiculos.find(v => v.compraTransactionId === id)?.id;
        if (vehicleId) {
            const vehicle = veiculos.find(v => v.id === vehicleId);
            if (vehicle?.status === 'pendente_cadastro') {
                deleteVeiculo(vehicleId);
            }
        }
    }
    
    // NOVO: Reverter status de contabilização se a transação veio de importação
    if (transactionToDelete?.meta.source === 'import') {
        uncontabilizeImportedTransaction(id);
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
    
    const newAccount: ContaCorrente = { ...account, initialBalance: 0 };

    if (isNewAccount) {
      setContasMovimento(prev => [...prev, newAccount]);

      if (initialBalanceAmount !== 0) {
        const txId = generateTransactionId();
        
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
      setContasMovimento(prev => prev.map(a => a.id === newAccount.id ? newAccount : a));

      const existingInitialTx = transactions.find(t => 
          t.accountId === newAccount.id && t.operationType === 'initial_balance'
      );

      if (initialBalanceAmount !== 0) {
        const txId = existingInitialTx?.id || generateTransactionId();
        
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
    
    setContasMovimento(prev => prev.filter(a => a.id !== accountId));
    setTransacoesV2(prev => prev.filter(t => t.accountId !== accountId));
  };

  const handleEditAccount = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      const initialTx = transactions.find(t => 
          t.accountId === accountId && t.operationType === 'initial_balance'
      );
      
      let initialBalanceValue = 0;
      if (initialTx) {
          initialBalanceValue = initialTx.flow === 'in' ? initialTx.amount : -initialTx.amount;
      }
      
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
        c.accountType === 'renda_fixa' || 
        c.accountType === 'poupanca' ||
        c.accountType === 'cripto' ||
        c.accountType === 'reserva' ||
        c.accountType === 'objetivo'
      )
      .map(i => ({ id: i.id, name: i.name }));
  }, [accounts]);

  const loans = useMemo(() => {
    return emprestimos
      .filter(e => e.status !== 'pendente_config')
      .map(e => {
        const startDate = parseDateLocal(e.dataInicio || new Date().toISOString().split('T')[0]);
        
        const parcelas = e.meses > 0 ? Array.from({ length: e.meses }, (_, i) => {
          const vencimento = addMonths(startDate, i);
          
          const paymentTx = transactions.find(t => 
            t.operationType === 'pagamento_emprestimo' && 
            t.links?.loanId === `loan_${e.id}` &&
            t.links?.parcelaId === (i + 1).toString()
          );

          return {
            numero: i + 1,
            vencimento: format(vencimento, 'yyyy-MM-dd'),
            valor: e.parcela,
            paga: !!paymentTx, // Alterado de 'pago' para 'paga'
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

  // Get viewing account data
  const viewingAccount = viewingAccountId ? accounts.find(a => a.id === viewingAccountId) : null;
  const viewingSummary = viewingAccountId ? accountSummaries.find(s => s.accountId === viewingAccountId) : null;
  const viewingTransactions = viewingAccountId ? transactions.filter(t => t.accountId === viewingAccountId) : [];
  
  // Calculate transaction count by category for CategoryListModal
  const transactionCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.categoryId) {
        counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
      }
    });
    return counts;
  }, [transactions]);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <header className="glass-card md-elevated p-4 md:p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between animate-fade-in">
          <div>
            <h1 className="text-fluid-2xl font-bold text-foreground">Receitas e Despesas</h1>
            <p className="text-fluid-sm text-muted-foreground mt-1">
              Contas movimento, fluxo de caixa e conciliação bancária
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <PeriodSelector
              initialRanges={dateRanges}
              onDateRangeChange={handlePeriodChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBillsTrackerModal(true)}
              className="gap-2 text-xs md:text-sm h-8 md:h-9 px-2 md:px-3"
            >
              <CalendarCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Contas a Pagar</span>
              <span className="sm:hidden">Contas</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCategoryListModal(true)}
              className="text-xs md:text-sm h-8 md:h-9 px-2 md:px-3"
            >
              <Tags className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Categorias</span>
              <span className="sm:hidden">Cat.</span>
            </Button>
          </div>
        </header>

        {/* Accounts Carousel */}
        <section className="glass-card md-elevated p-4 md:p-6">
          <AccountsCarousel
            accounts={accountSummaries}
            onMovimentar={handleMovimentar}
            onViewHistory={handleViewStatement}
            onAddAccount={() => {
              setEditingAccount(undefined);
              setShowAccountModal(true);
            }}
            onEditAccount={handleEditAccount}
            onImportAccount={handleImportExtrato}
          />
        </section>

        {/* KPI Sidebar - full width */}
        <section className="glass-card md-elevated p-4 md:p-6">
          <KPISidebar transactions={transacoesPeriodo1} categories={categories} />
        </section>
      </div>

      {/* Modals */}
      <MovimentarContaModal
        open={showMovimentarModal}
        onOpenChange={setShowMovimentarModal}
        accounts={accounts}
        categories={categories}
        investments={investments}
        loans={loans}
        segurosVeiculo={segurosVeiculo} // <-- NEW PROP
        veiculos={veiculos} // <-- NEW PROP
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
      
      {/* Bills Tracker Modal */}
      <BillsTrackerModal
        open={showBillsTrackerModal}
        onOpenChange={setShowBillsTrackerModal}
      />
      
      {/* Statement Manager Dialog (Fase 1) */}
      {accountToManage && (
        <StatementManagerDialog
          open={showStatementManagerModal}
          onOpenChange={setShowStatementManagerModal}
          account={accountToManage}
          investments={investments}
          loans={loans}
          onStartConsolidatedReview={handleStartConsolidatedReview}
          onManageRules={handleManageRules}
        />
      )}
      
      {/* Consolidated Review Dialog (Fase 2) */}
      {accountForConsolidatedReview && (
        <ConsolidatedReviewDialog
          open={showConsolidatedReview}
          onOpenChange={setShowConsolidatedReview}
          accountId={accountForConsolidatedReview}
          accounts={accounts}
          categories={categories}
          investments={investments}
          loans={loans}
        />
      )}
      
      {/* Standardization Rule Manager Modal (NEW) */}
      <StandardizationRuleManagerModal
        open={showRuleManagerModal}
        onOpenChange={setShowRuleManagerModal}
        rules={standardizationRules}
        onDeleteRule={deleteStandardizationRule}
        categories={categories}
      />
    </MainLayout>
  );
};

export default ReceitasDespesas;