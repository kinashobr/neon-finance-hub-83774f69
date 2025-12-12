import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import {
  Categoria, TransacaoCompleta,
  DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES,
  ContaCorrente,
  FinanceExportV2,
  Emprestimo, // V2 Entity
  Veiculo, // V2 Entity
  SeguroVeiculo, // V2 Entity
  ObjetivoFinanceiro, // V2 Entity
  AccountType,
  DateRange, // Import new types
  ComparisonDateRanges, // Import new types
} from "@/types/finance";
import { parseISO, startOfMonth, endOfMonth, subDays, differenceInDays } from "date-fns"; // Import date-fns helpers

// ============================================
// FUNÇÕES AUXILIARES PARA DATAS
// ============================================

const calculateDefaultRange = (): DateRange => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
};

const calculateComparisonRange = (range1: DateRange): DateRange => {
    if (!range1.from || !range1.to) {
        return { from: undefined, to: undefined };
    }
    const diffInDays = differenceInDays(range1.to, range1.from) + 1;
    const prevTo = subDays(range1.from, 1);
    const prevFrom = subDays(prevTo, diffInDays - 1);
    return { from: prevFrom, to: prevTo };
};

const DEFAULT_RANGES: ComparisonDateRanges = {
    range1: calculateDefaultRange(),
    range2: calculateComparisonRange(calculateDefaultRange()),
};

function parseDateRanges(storedRanges: any): ComparisonDateRanges {
    const parseDate = (dateStr: string | undefined): Date | undefined => {
        if (!dateStr) return undefined;
        try {
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? undefined : date;
        } catch {
            return undefined;
        }
    };

    return {
        range1: {
            from: parseDate(storedRanges.range1?.from),
            to: parseDate(storedRanges.range1?.to),
        },
        range2: {
            from: parseDate(storedRanges.range2?.from),
            to: parseDate(storedRanges.range2?.to),
        },
    };
}

// ============================================
// INTERFACE DO CONTEXTO (Atualizada)
// ============================================

interface FinanceContextType {
  // Empréstimos
  emprestimos: Emprestimo[];
  addEmprestimo: (emprestimo: Omit<Emprestimo, "id">) => void;
  updateEmprestimo: (id: number, emprestimo: Partial<Emprestimo>) => void;
  deleteEmprestimo: (id: number) => void;
  getPendingLoans: () => Emprestimo[];
  markLoanParcelPaid: (loanId: number, valorPago: number, dataPagamento: string, parcelaNumero?: number) => void;
  unmarkLoanParcelPaid: (loanId: number) => void;
  
  // Veículos
  veiculos: Veiculo[];
  addVeiculo: (veiculo: Omit<Veiculo, "id">) => void;
  updateVeiculo: (id: number, veiculo: Partial<Veiculo>) => void;
  deleteVeiculo: (id: number) => void;
  getPendingVehicles: () => Veiculo[];
  
  // Seguros de Veículo
  segurosVeiculo: SeguroVeiculo[];
  addSeguroVeiculo: (seguro: Omit<SeguroVeiculo, "id">) => void;
  updateSeguroVeiculo: (id: number, seguro: Partial<SeguroVeiculo>) => void;
  deleteSeguroVeiculo: (id: number) => void;
  markSeguroParcelPaid: (seguroId: number, parcelaNumero: number, transactionId: string) => void;

  // Objetivos Financeiros
  objetivos: ObjetivoFinanceiro[];
  addObjetivo: (obj: Omit<ObjetivoFinanceiro, "id">) => void;
  updateObjetivo: (id: number, obj: Partial<ObjetivoFinanceiro>) => void;
  deleteObjetivo: (id: number) => void;

  // Contas Movimento (new integrated system)
  contasMovimento: ContaCorrente[];
  setContasMovimento: (accounts: ContaCorrente[]) => void;
  getContasCorrentesTipo: () => ContaCorrente[];
  
  // Categorias V2 (with nature)
  categoriasV2: Categoria[];
  setCategoriasV2: (categories: Categoria[]) => void;
  
  // Transações V2 (integrated)
  transacoesV2: TransacaoCompleta[];
  setTransacoesV2: (transactions: TransacaoCompleta[]) => void;
  addTransacaoV2: (transaction: TransacaoCompleta) => void;
  
  // Data Filtering (NEW)
  dateRanges: ComparisonDateRanges;
  setDateRanges: (ranges: ComparisonDateRanges) => void;
  
  // Cálculos principais
  getTotalReceitas: (mes?: string) => number;
  getTotalDespesas: (mes?: string) => number;
  getTotalDividas: () => number;
  getCustoVeiculos: () => number;
  getSaldoAtual: () => number;
  getValorFipeTotal: () => number;
  
  // Cálculos avançados para relatórios
  getSaldoDevedor: () => number;
  getJurosTotais: () => number;
  getDespesasFixas: () => number;
  getPatrimonioLiquido: () => number;
  getAtivosTotal: () => number;
  getPassivosTotal: () => number;
  
  // Nova função de cálculo de saldo por data
  calculateBalanceUpToDate: (accountId: string, date: Date | undefined, allTransactions: TransacaoCompleta[], accounts: ContaCorrente[]) => number;

  // Exportação e Importação
  exportData: () => void;
  importData: (file: File) => Promise<{ success: boolean; message: string }>;
  
  // Removidos: Investimentos RF, Criptomoedas, Stablecoins, Movimentações de Investimento
  // Mantidos apenas para evitar erros de tipagem em componentes que ainda usam o nome, mas com valor vazio
  investimentosRF: any[];
  criptomoedas: any[];
  stablecoins: any[];
  movimentacoesInvestimento: any[];
  addInvestimentoRF: (inv: any) => void;
  updateInvestimentoRF: (id: number, inv: any) => void;
  deleteInvestimentoRF: (id: number) => void;
  addCriptomoeda: (cripto: any) => void;
  updateCriptomoeda: (id: number, cripto: any) => void;
  deleteCriptomoeda: (id: number) => void;
  addStablecoin: (stable: any) => void;
  updateStablecoin: (id: number, stable: any) => void;
  deleteStablecoin: (id: number) => void;
  addMovimentacaoInvestimento: (mov: any) => void;
  updateMovimentacaoInvestimento: (id: number, mov: any) => void;
  deleteMovimentacaoInvestimento: (id: number, mov: any) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// ============================================
// CHAVES DO LOCALSTORAGE
// ============================================

const STORAGE_KEYS = {
  // Entidades V2
  EMPRESTIMOS: "neon_finance_emprestimos",
  VEICULOS: "neon_finance_veiculos",
  SEGUROS_VEICULO: "neon_finance_seguros_veiculo",
  OBJETIVOS: "neon_finance_objetivos",
  
  // Core V2
  CONTAS_MOVIMENTO: "fin_accounts_v1",
  CATEGORIAS_V2: "fin_categories_v1",
  TRANSACOES_V2: "fin_transactions_v1",
  
  // Data Filtering (NEW)
  DATE_RANGES: "fin_date_ranges_v1",
};

// ============================================
// DADOS INICIAIS
// ============================================

const initialEmprestimos: Emprestimo[] = [];
const initialVeiculos: Veiculo[] = [];
const initialSegurosVeiculo: SeguroVeiculo[] = [];
const initialObjetivos: ObjetivoFinanceiro[] = [];

// ============================================
// FUNÇÕES AUXILIARES DE LOCALSTORAGE
// ============================================

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // Special handling for date ranges
      if (key === STORAGE_KEYS.DATE_RANGES) {
          return parseDateRanges(parsed) as unknown as T;
      }
      
      return parsed;
    }
  } catch (error) {
    console.error(`Erro ao carregar ${key} do localStorage:`, error);
  }
  return defaultValue;
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    // Special handling for date ranges: convert Date objects to ISO strings
    let dataToStore = data;
    if (key === STORAGE_KEYS.DATE_RANGES) {
        const ranges = data as unknown as ComparisonDateRanges;
        dataToStore = {
            range1: {
                from: ranges.range1.from?.toISOString(),
                to: ranges.range1.to?.toISOString(),
            },
            range2: {
                from: ranges.range2.from?.toISOString(),
                to: ranges.range2.to?.toISOString(),
            },
        } as unknown as T;
    }
    
    localStorage.setItem(key, JSON.stringify(dataToStore));
  } catch (error) {
    console.error(`Erro ao salvar ${key} no localStorage:`, error);
  }
}

// ============================================
// PROVIDER PRINCIPAL
// ============================================

export function FinanceProvider({ children }: { children: ReactNode }) {
  // Estados de Entidade V2 (Mantidos)
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>(() => 
    loadFromStorage(STORAGE_KEYS.EMPRESTIMOS, initialEmprestimos)
  );
  const [veiculos, setVeiculos] = useState<Veiculo[]>(() => 
    loadFromStorage(STORAGE_KEYS.VEICULOS, initialVeiculos)
  );
  const [segurosVeiculo, setSegurosVeiculo] = useState<SeguroVeiculo[]>(() => 
    loadFromStorage(STORAGE_KEYS.SEGUROS_VEICULO, initialSegurosVeiculo)
  );
  const [objetivos, setObjetivos] = useState<ObjetivoFinanceiro[]>(() => 
    loadFromStorage(STORAGE_KEYS.OBJETIVOS, initialObjetivos)
  );
  
  // Estados V2 Core
  const [contasMovimento, setContasMovimento] = useState<ContaCorrente[]>(() => 
    loadFromStorage(STORAGE_KEYS.CONTAS_MOVIMENTO, DEFAULT_ACCOUNTS)
  );
  const [categoriasV2, setCategoriasV2] = useState<Categoria[]>(() => 
    loadFromStorage(STORAGE_KEYS.CATEGORIAS_V2, DEFAULT_CATEGORIES)
  );
  const [transacoesV2, setTransacoesV2] = useState<TransacaoCompleta[]>(() => 
    loadFromStorage(STORAGE_KEYS.TRANSACOES_V2, [])
  );
  
  // Data Filtering State (NEW)
  const [dateRanges, setDateRanges] = useState<ComparisonDateRanges>(() => 
    loadFromStorage(STORAGE_KEYS.DATE_RANGES, DEFAULT_RANGES)
  );

  // ============================================
  // EFEITOS PARA PERSISTÊNCIA AUTOMÁTICA
  // ============================================

  useEffect(() => { saveToStorage(STORAGE_KEYS.EMPRESTIMOS, emprestimos); }, [emprestimos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.VEICULOS, veiculos); }, [veiculos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.SEGUROS_VEICULO, segurosVeiculo); }, [segurosVeiculo]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.OBJETIVOS, objetivos); }, [objetivos]);
  
  useEffect(() => { saveToStorage(STORAGE_KEYS.CONTAS_MOVIMENTO, contasMovimento); }, [contasMovimento]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CATEGORIAS_V2, categoriasV2); }, [categoriasV2]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.TRANSACOES_V2, transacoesV2); }, [transacoesV2]);
  
  // NEW EFFECT for dateRanges
  useEffect(() => { saveToStorage(STORAGE_KEYS.DATE_RANGES, dateRanges); }, [dateRanges]);

  // ============================================
  // FUNÇÃO CENTRAL DE CÁLCULO DE SALDO POR DATA
  // ============================================

  const calculateBalanceUpToDate = useCallback((accountId: string, date: Date | undefined, allTransactions: TransacaoCompleta[], accounts: ContaCorrente[]): number => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;

    // Se a conta tem startDate, o saldo inicial é 0 e dependemos da transação sintética.
    // Caso contrário, usamos o initialBalance legado.
    let balance = account.startDate ? 0 : account.initialBalance; 
    
    // If no date is provided, calculate global balance (end of all history)
    const targetDate = date || new Date(9999, 11, 31);

    const transactionsBeforeDate = allTransactions
        .filter(t => t.accountId === accountId && parseISO(t.date) < targetDate)
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

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
          if (t.flow === 'in' || t.flow === 'transfer_in' || t.operationType === 'initial_balance') {
            balance += t.amount;
          } else {
            balance -= t.amount;
          }
        }
    });

    return balance;
  }, [contasMovimento, transacoesV2]); // Dependências para garantir que o useCallback seja refeito quando os dados mudam

  // ============================================
  // OPERAÇÕES DE ENTIDADES V2 (Empréstimos, Veículos, etc.)
  // ============================================

  const addEmprestimo = (emprestimo: Omit<Emprestimo, "id">) => {
    const newId = Math.max(0, ...emprestimos.map(e => e.id)) + 1;
    setEmprestimos([...emprestimos, { ...emprestimo, id: newId, status: emprestimo.status || 'ativo', parcelasPagas: 0 }]);
  };

  const updateEmprestimo = (id: number, updates: Partial<Emprestimo>) => {
    setEmprestimos(emprestimos.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteEmprestimo = (id: number) => {
    setEmprestimos(emprestimos.filter(e => e.id !== id));
  };

  const getPendingLoans = useCallback(() => {
    return emprestimos.filter(e => e.status === 'pendente_config');
  }, [emprestimos]);

  const markLoanParcelPaid = useCallback((loanId: number, valorPago: number, dataPagamento: string, parcelaNumero?: number) => {
    setEmprestimos(prev => prev.map(e => {
      if (e.id !== loanId) return e;
      
      const parcelasPagas = (e.parcelasPagas || 0) + 1;
      
      return {
        ...e,
        parcelasPagas,
        status: parcelasPagas >= e.meses ? 'quitado' : e.status,
      };
    }));
  }, []);
  
  const unmarkLoanParcelPaid = useCallback((loanId: number) => {
    setEmprestimos(prev => prev.map(e => {
      if (e.id !== loanId) return e;
      
      const parcelasPagas = Math.max(0, (e.parcelasPagas || 0) - 1);
      
      return {
        ...e,
        parcelasPagas,
        status: 'ativo',
      };
    }));
  }, []);

  const addVeiculo = (veiculo: Omit<Veiculo, "id">) => {
    const newId = Math.max(0, ...veiculos.map(v => v.id)) + 1;
    setVeiculos([...veiculos, { ...veiculo, id: newId, status: veiculo.status || 'ativo' }]);
  };

  const updateVeiculo = (id: number, updates: Partial<Veiculo>) => {
    setVeiculos(veiculos.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const deleteVeiculo = (id: number) => {
    setVeiculos(veiculos.filter(v => v.id !== id));
  };

  const getPendingVehicles = useCallback(() => {
    return veiculos.filter(v => v.status === 'pendente_cadastro');
  }, [veiculos]);

  const addSeguroVeiculo = (seguro: Omit<SeguroVeiculo, "id">) => {
    const newId = Math.max(0, ...segurosVeiculo.map(s => s.id)) + 1;
    setSegurosVeiculo([...segurosVeiculo, { ...seguro, id: newId }]);
  };

  const updateSeguroVeiculo = (id: number, updates: Partial<SeguroVeiculo>) => {
    setSegurosVeiculo(segurosVeiculo.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSeguroVeiculo = (id: number) => {
    setSegurosVeiculo(segurosVeiculo.filter(s => s.id !== id));
  };
  
  const markSeguroParcelPaid = useCallback((seguroId: number, parcelaNumero: number, transactionId: string) => {
    setSegurosVeiculo(prevSeguros => prevSeguros.map(seguro => {
      if (seguro.id !== seguroId) return seguro;
      
      const updatedParcelas = seguro.parcelas.map(parcela => {
        if (parcela.numero === parcelaNumero) {
          return { ...parcela, paga: true, transactionId };
        }
        return parcela;
      });
      
      return { ...seguro, parcelas: updatedParcelas };
    }));
  }, []);

  const addObjetivo = (obj: Omit<ObjetivoFinanceiro, "id">) => {
    const newId = Math.max(0, ...objetivos.map(o => o.id)) + 1;
    setObjetivos([...objetivos, { ...obj, id: newId }]);
  };

  const updateObjetivo = (id: number, updates: Partial<ObjetivoFinanceiro>) => {
    setObjetivos(objetivos.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  const deleteObjetivo = (id: number) => {
    setObjetivos(objetivos.filter(o => o.id !== id));
  };

  // ============================================
  // OPERAÇÕES TRANSAÇÕES V2
  // ============================================

  const addTransacaoV2 = (transaction: TransacaoCompleta) => {
    setTransacoesV2(prev => [...prev, transaction]);
  };

  // ============================================
  // FUNÇÕES DE CONTAS MOVIMENTO
  // ============================================

  const getContasCorrentesTipo = useCallback(() => {
    return contasMovimento.filter(c => c.accountType === 'conta_corrente');
  }, [contasMovimento]);

  // ============================================
  // CÁLCULOS - Baseados em TransacoesV2
  // ============================================

  const getTotalReceitas = (mes?: string): number => {
    const receitas = transacoesV2.filter(t => {
      const isReceita = t.operationType === 'receita' || t.operationType === 'rendimento';
      if (!mes) return isReceita;
      return isReceita && t.date.startsWith(mes);
    });
    return receitas.reduce((acc, t) => acc + t.amount, 0);
  };

  const getTotalDespesas = (mes?: string): number => {
    const despesas = transacoesV2.filter(t => {
      const isDespesa = t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo';
      if (!mes) return isDespesa;
      return isDespesa && t.date.startsWith(mes);
    });
    return despesas.reduce((acc, t) => acc + t.amount, 0);
  };

  const getTotalDividas = () => {
    return emprestimos.reduce((acc, e) => acc + e.valorTotal, 0);
  };

  const getCustoVeiculos = () => {
    return veiculos.filter(v => v.status !== 'vendido').reduce((acc, v) => acc + v.valorSeguro, 0);
  };

  const getSaldoAtual = useCallback(() => {
    let totalBalance = 0;

    contasMovimento.forEach(conta => {
      // Calcula o saldo final global (end of all history)
      const balance = calculateBalanceUpToDate(conta.id, undefined, transacoesV2, contasMovimento);
      
      totalBalance += balance;
    });

    return totalBalance;
  }, [contasMovimento, transacoesV2, calculateBalanceUpToDate]);

  const getValorFipeTotal = () => {
    return veiculos.filter(v => v.status !== 'vendido').reduce((acc, v) => acc + v.valorFipe, 0);
  };

  // Cálculos avançados
  const getSaldoDevedor = () => {
    const saldoEmprestimos = emprestimos.reduce((acc, e) => {
      const parcelasRestantes = e.meses - (e.parcelasPagas || 0);
      const saldoDevedor = Math.max(0, parcelasRestantes * e.parcela);
      return acc + saldoDevedor;
    }, 0);
    
    const saldoCartoes = contasMovimento
      .filter(c => c.accountType === 'cartao_credito')
      .reduce((acc, c) => {
        const balance = calculateBalanceUpToDate(c.id, undefined, transacoesV2, contasMovimento);
        return acc + Math.abs(Math.min(0, balance));
      }, 0);
      
    return saldoEmprestimos + saldoCartoes;
  };

  const getJurosTotais = () => {
    return emprestimos.reduce((acc, e) => {
      const custoTotal = e.parcela * e.meses;
      const juros = custoTotal - e.valorTotal;
      return acc + juros;
    }, 0);
  };

  const getDespesasFixas = () => {
    const despesasFixas = transacoesV2.filter(t => {
      const category = categoriasV2.find(c => c.id === t.categoryId);
      return category?.nature === 'despesa_fixa';
    });
    return despesasFixas.reduce((acc, t) => acc + t.amount, 0);
  };

  const getAtivosTotal = useCallback(() => {
    // Ativos = Saldo de contas (exceto CC) + Investimentos (V2) + Veículos
    const saldoContasAtivas = contasMovimento
      .filter(c => c.accountType !== 'cartao_credito')
      .reduce((acc, c) => {
        const balance = calculateBalanceUpToDate(c.id, undefined, transacoesV2, contasMovimento);
        return acc + Math.max(0, balance); // Apenas saldos positivos são ativos
      }, 0);
      
    const valorVeiculos = getValorFipeTotal();
                          
    return saldoContasAtivas + valorVeiculos;
  }, [contasMovimento, transacoesV2, getValorFipeTotal, calculateBalanceUpToDate]);

  const getPassivosTotal = useCallback(() => {
    return getSaldoDevedor();
  }, [getSaldoDevedor]);

  const getPatrimonioLiquido = useCallback(() => {
    return getAtivosTotal() - getPassivosTotal();
  }, [getAtivosTotal, getPassivosTotal]);

  // ============================================
  // EXPORTAÇÃO E IMPORTAÇÃO (Atualizado para V2)
  // ============================================

  const exportData = () => {
    const data: FinanceExportV2 = {
      schemaVersion: "2.0",
      exportedAt: new Date().toISOString(),
      data: {
        accounts: contasMovimento,
        categories: categoriasV2,
        transactions: transacoesV2,
        transferGroups: [],
      }
    };

    // Adiciona entidades V2 mantidas para compatibilidade de exportação
    (data.data as any).emprestimos = emprestimos;
    (data.data as any).veiculos = veiculos;
    (data.data as any).segurosVeiculo = segurosVeiculo;
    (data.data as any).objetivos = objetivos;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File): Promise<{ success: boolean; message: string }> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.schemaVersion === '2.0' && data.data) {
        // Importa coleções V2
        if (data.data.accounts) setContasMovimento(data.data.accounts);
        if (data.data.categories) setCategoriasV2(data.data.categories);
        if (data.data.transactions) setTransacoesV2(data.data.transactions);
        
        // Importa entidades V2 mantidas
        if (data.data.emprestimos) setEmprestimos(data.data.emprestimos);
        if (data.data.veiculos) setVeiculos(data.data.veiculos);
        if (data.data.segurosVeiculo) setSegurosVeiculo(data.data.segurosVeiculo);
        if (data.data.objetivos) setObjetivos(data.data.objetivos);
        
        return { success: true, message: "Dados V2 importados com sucesso!" };
      } else {
        return { success: false, message: "Erro ao importar dados. Versão do schema incompatível." };
      }
    } catch (error) {
      return { success: false, message: "Erro ao importar dados. Verifique o formato do arquivo." };
    }
  };

  // ============================================
  // VALOR DO CONTEXTO
  // ============================================

  const value: FinanceContextType = {
    emprestimos,
    addEmprestimo,
    updateEmprestimo,
    deleteEmprestimo,
    getPendingLoans,
    markLoanParcelPaid,
    unmarkLoanParcelPaid,
    veiculos,
    addVeiculo,
    updateVeiculo,
    deleteVeiculo,
    getPendingVehicles,
    segurosVeiculo,
    addSeguroVeiculo,
    updateSeguroVeiculo,
    deleteSeguroVeiculo,
    markSeguroParcelPaid,
    objetivos,
    addObjetivo,
    updateObjetivo,
    deleteObjetivo,
    contasMovimento,
    setContasMovimento,
    getContasCorrentesTipo,
    categoriasV2,
    setCategoriasV2,
    transacoesV2,
    setTransacoesV2,
    addTransacaoV2,
    
    // Data Filtering (NEW)
    dateRanges,
    setDateRanges,
    
    getTotalReceitas,
    getTotalDespesas,
    getTotalDividas,
    getCustoVeiculos,
    getSaldoAtual,
    getValorFipeTotal,
    getSaldoDevedor,
    getJurosTotais,
    getDespesasFixas,
    getPatrimonioLiquido,
    getAtivosTotal,
    getPassivosTotal,
    calculateBalanceUpToDate, // Exportando a função central
    exportData,
    importData,
    
    // Placeholders para V1 removidos (mantidos para evitar erros de tipagem)
    investimentosRF: [],
    criptomoedas: [],
    stablecoins: [],
    movimentacoesInvestimento: [],
    addInvestimentoRF: () => { console.warn("Função V1 removida"); },
    updateInvestimentoRF: () => { console.warn("Função V1 removida"); },
    deleteInvestimentoRF: () => { console.warn("Função V1 removida"); },
    addCriptomoeda: () => { console.warn("Função V1 removida"); },
    updateCriptomoeda: () => { console.warn("Função V1 removida"); },
    deleteCriptomoeda: () => { console.warn("Função V1 removida"); },
    addStablecoin: () => { console.warn("Função V1 removida"); },
    updateStablecoin: () => { console.warn("Função V1 removida"); },
    deleteStablecoin: () => { console.warn("Função V1 removida"); },
    addMovimentacaoInvestimento: () => { console.warn("Função V1 removida"); },
    updateMovimentacaoInvestimento: () => { console.warn("Função V1 removida"); },
    deleteMovimentacaoInvestimento: () => { console.warn("Função V1 removida"); },
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error("useFinance deve ser usado dentro de um FinanceProvider");
  }
  return context;
}