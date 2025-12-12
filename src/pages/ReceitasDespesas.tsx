import { useState, useMemo, useCallback, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { RefreshCw, Tags, Plus } from "lucide-react";
import { toast } from "sonner";
import { isWithinInterval, startOfMonth, endOfMonth, parseISO, subDays, endOfDay, startOfDay } from "date-fns";

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
    unmarkSeguroParcelPaid, // <-- Corrigido
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
      // range.from is startOfDay(D_start), range.to is endOfDay(D_end)
      const matchPeriod = (!range.from || !range.to || isWithinInterval(transactionDate, { start: range.from, end: range.to }));
      
      return matchSearch && matchAccount && matchCategory && matchType && matchPeriod;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, selectedAccountId, selectedCategoryId, selectedTypes, dateRanges]);

  // Calculate account summaries
  const accountSummaries: AccountSummary[] = useMemo(() => {
    const periodStart = dateRanges.range1.from; // D_start (startOfDay)
    const periodEnd = dateRanges.range1.to;     // D_end (endOfDay)
    
    return accounts.map(account => {
      // 1. Calculate Period Initial Balance (balance accumulated up to the day BEFORE the period starts)
      const initialBalanceTargetDate = periodStart 
        ? endOfDay(subDays(periodStart, 1)) // Balance up to 23:59:59 of the day before D_start
        : undefined; // If no period start, calculate from the beginning of time
        
      const periodInitialBalance = calculateBalanceUpToDate(account.id, initialBalanceTargetDate, transactions, accounts); 

      // 2. Calculate Period Transactions (transactions from D_start up to D_end)
      const accountTxInPeriod = transactions.filter(t => {
        if (t.accountId !== account.id) return false;
        
        // Exclude synthetic initial balance transactions from period flow calculation
        if (t.operationType === 'initial_balance') return false; 
        
        const transactionDate = parseISO(t.date);
        
        // If no period is defined, include all transactions (excluding initial_balance)
        if (!periodStart || !periodEnd) return true;
        
        // We include transactions from periodStart (startOfDay) up to periodEnd (endOfDay)
        return isWithinInterval(transactionDate, { start: periodStart, end: periodEnd });
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
  }, [accounts, transactions, dateRanges, calculateBalanceUpToDate]);

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
    // Ensure links are properly initialized for safety
    const baseTx: TransacaoCompleta = {
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
      // === Edição de transações ===
      const linkedGroupId = editingTransaction.links?.transferGroupId;
      
      if (linkedGroupId) {
        // Edição de transação vinculada (transferência ou investimento de partida dobrada)
        setTransacoesV2(prev => prev.map(t => {
          if (t.id === baseTx.id) {
            return baseTx; // Atualiza a transação principal
          }
          
          if (t.links?.transferGroupId === linkedGroupId && t.id !== baseTx.id) {
            // Atualiza a transação secundária (oposta)
            const otherAccount = accounts.find(a => a.id === t.accountId);
            const isCreditCard = otherAccount?.accountType === 'cartao_credito';

            let newFlow: 'in' | 'out' | 'transfer_in' | 'transfer_out';
            
            // Determine flow based on the transfer group (if provided) or original flow logic
            if (transferGroup) {
               // If transfer group changed, recalculate flow based on new group
               newFlow = t.accountId === transferGroup.fromAccountId ? 'transfer_out' : 'transfer_in';
            } else {
               // If no new group, maintain original flow logic (e.g., for investment flows)
               newFlow = t.flow;
            }

            // Ensure all links properties are explicitly set to string | null
            const updatedLinks: TransactionLinks = {
              investmentId: t.links.investmentId || null,
              loanId: t.links.loanId || null,
              transferGroupId: t.links.transferGroupId || null,
              parcelaId: t.links.parcelaId || null,
              vehicleTransactionId: t.links.vehicleTransactionId || null,
            };

            return {
              ...t,
              amount: baseTx.amount,
              date: baseTx.date,
              description: baseTx.description,
              flow: newFlow,
              links: updatedLinks,
            } as TransacaoCompleta;
          }
          return t;
        }));
      } else {
        // Edição de transação simples
        setTransacoesV2(transacoesV2.map(t => t.id === baseTx.id ? baseTx : t));
      }
      
      setEditingTransaction(undefined);
      setShowMovimentarModal(false);
      return;
    }

    // === Criação de transações (não edição) ===
    const newTransactions: TransacaoCompleta[] = [];
    
    // Transação base para clonagem
    const initialTx: TransacaoCompleta = { 
      ...baseTx, 
      id: baseTx.id || generateTransactionId(),
    };
    newTransactions.push(initialTx);

    // 1. Transferência / pagamento CC
    if (transferGroup) {
      const tg = transferGroup;
      const fromAccount = accounts.find(a => a.id === tg.fromAccountId);
      const toAccount = accounts.find(a => a.id === tg.toAccountId);
      const isToCreditCard = toAccount?.accountType === 'cartao_credito';

      // Remove a transação inicial simples, pois será substituída por duas transações de transferência
      newTransactions.pop(); 

      if (isToCreditCard) {
        // Transação de entrada no CC (destino)
        const ccTx: TransacaoCompleta = {
          ...initialTx,
          id: generateTransactionId(),
          accountId: tg.toAccountId,
          flow: 'in' as const,
          operationType: 'transferencia' as const,
          description: tg.description || `Pagamento de fatura CC ${toAccount?.name}`,
          links: { ...initialTx.links, transferGroupId: tg.id },
        };

        // Transação de saída da conta corrente (origem)
        const fromTx: TransacaoCompleta = {
          ...initialTx,
          id: generateTransactionId(),
          accountId: tg.fromAccountId,
          flow: 'transfer_out' as const,
          operationType: 'transferencia' as const,
          description: tg.description || `Pagamento fatura ${toAccount?.name}`,
          links: { ...initialTx.links, transferGroupId: tg.id },
        };

        newTransactions.push(fromTx, ccTx);
      } else {
        // Transferência normal (origem -> destino)
        const outTx: TransacaoCompleta = {
          ...initialTx,
          id: generateTransactionId(),
          accountId: tg.fromAccountId,
          flow: 'transfer_out' as const,
          operationType: 'transferencia' as const,
          description: tg.description || `Transferência para ${toAccount?.name}`,
          links: { ...initialTx.links, transferGroupId: tg.id },
        };

        const inTx: TransacaoCompleta = {
          ...initialTx,
          id: generateTransactionId(),
          accountId: tg.toAccountId,
          flow: 'transfer_in' as const,
          operationType: 'transferencia' as const,
          description: tg.description || `Transferência recebida de ${fromAccount?.name}`,
          links: { ...initialTx.links, transferGroupId: tg.id },
        };

        newTransactions.push(outTx, inTx);
      }
    }

    // 2. Aplicação / Resgate (Partida dobrada entre contas)
    const isInvestmentFlow = (initialTx.operationType === 'aplicacao' || initialTx.operationType === 'resgate') && initialTx.links?.investmentId;

    if (isInvestmentFlow) {
      const isAplicacao = initialTx.operationType === 'aplicacao';
      const groupId = isAplicacao ? `app_${Date.now()}` : `res_${Date.now()}`;
      
      // Transação 1 (Conta Corrente) - Já está em newTransactions[0] se não for transferência, ou é a baseTx
      const primaryTx = newTransactions.find(t => t.id === initialTx.id) || initialTx;
      
      // Atualiza links e flow da transação primária
      primaryTx.links.transferGroupId = groupId;
      primaryTx.flow = isAplicacao ? 'out' : 'in';
      primaryTx.operationType = isAplicacao ? 'aplicacao' : 'resgate';
      primaryTx.domain = 'investment';

      // Transação 2 (Conta de Investimento)
      const secondaryTx: TransacaoCompleta = {
        ...primaryTx,
        id: generateTransactionId(),
        accountId: initialTx.links.investmentId!,
        flow: isAplicacao ? 'in' : 'out',
        operationType: isAplicacao ? 'aplicacao' : 'resgate',
        domain: 'investment',
        description: isAplicacao ? (initialTx.description || `Aplicação recebida de conta corrente`) : (initialTx.description || `Resgate enviado para conta corrente`),
        links: {
          ...primaryTx.links,
          investmentId: primaryTx.accountId, // Referência à conta oposta
          transferGroupId: groupId,
        },
        meta: {
          ...primaryTx.meta,
          createdBy: 'system',
        }
      };
      
      // Adiciona a transação secundária
      newTransactions.push(secondaryTx);
    }

    // 3. Handle special operation types (Loan/Vehicle)
    const finalTx = newTransactions.find(t => t.id === initialTx.id) || initialTx;

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
    
    toast.success("Movimentação registrada! Pronto para o próximo lançamento.");
    // Reset form state after successful creation
    setSelectedAccountForModal(finalTx.accountId);
    setEditingTransaction(undefined);
    setShowMovimentarModal(false); // Close modal after creation
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
  const handleAccountSubmit = (account: ContaCorrente) => {
    const isNewAccount = !editingAccount;
    const initialBalanceAmount = account.initialBalance ?? 0;
    const newAccount: ContaCorrente = { ...account, initialBalance: 0 };

    if (isNewAccount) {
      setContasMovimento(prev => [...prev, newAccount]);

      if (initialBalanceAmount !== 0) {
        const initialTx: TransacaoCompleta = {
          id: generateTransactionId(),
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
            createdBy: 'system',
            source: 'manual',
            createdAt: new Date().toISOString(),
            notes: `Saldo inicial de ${formatCurrency(initialBalanceAmount)} em ${account.startDate}`
          }
        };
        addTransacaoV2(initialTx);
      }
    } else {
      // edição
      setContasMovimento(prev => prev.map(a => a.id === newAccount.id ? newAccount : a));

      const existingInitialTx = transactions.find(t => t.accountId === newAccount.id && t.operationType === 'initial_balance');

      if (initialBalanceAmount !== 0) {
        const newInitialTx: TransacaoCompleta = {
          ...(existingInitialTx || {
            id: generateTransactionId(),
            accountId: newAccount.id,
            operationType: 'initial_balance',
            domain: 'operational',
            categoryId: null,
            description: `Saldo Inicial de Implantação`,
            links: { investmentId: null, loanId: null, transferGroupId: null, parcelaId: null, vehicleTransactionId: null },
            conciliated: true,
            attachments: [],
            meta: { createdBy: 'system', source: 'manual', createdAt: new Date().toISOString() }
          }),
          date: newAccount.startDate!,
          amount: Math.abs(initialBalanceAmount),
          flow: initialBalanceAmount >= 0 ? 'in' : 'out',
        };

        if (existingInitialTx) {
          setTransacoesV2(prev => prev.map(t => t.id === existingInitialTx.id ? newInitialTx : t));
        } else {
          addTransacaoV2(newInitialTx);
        }
      } else if (existingInitialTx) {
        setTransacoesV2(prev => prev.filter(t => t.id !== existingInitialTx.id));
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
  };

  const handleEditAccount = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      // Find the synthetic initial balance transaction
      const initialTx = transactions.find(t => 
          t.accountId === accountId && t.operationType === 'initial_balance'
      );
      
      let initialBalanceValue = 0;
      if (initialTx) {
          initialBalanceValue = initialTx.flow === 'in' ? initialTx.amount : -initialTx.amount;
      }
      
      // Create a temporary account object to pass the correct initial balance value to the form
      const accountForEdit: ContaCorrente = {
          ...account,
          // CORREÇÃO AQUI: Passar o valor real do saldo inicial para o formulário
          initialBalance: initialBalanceValue, 
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