import { createContext, useContext, useState, useEffect, ReactNode, useCallback, Dispatch, SetStateAction } from "react";
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
  setContasMovimento: Dispatch<SetStateAction<ContaCorrente[]>>;
  getContasCorrentesTipo: () => ContaCorrente[];
  
  // Categorias V2 (with nature)
  categoriasV2: Categoria[];
  setCategoriasV2: Dispatch<SetStateAction<Categoria[]>>;
  
  // Transações V2 (integrated)
  transacoesV2: TransacaoCompleta[];
  setTransacoesV2: Dispatch<SetStateAction<TransacaoCompleta[]>>;
  addTransacaoV2: (transaction: TransacaoCompleta) => void;
  
  // Data Filtering (NEW)
  dateRanges: ComparisonDateRanges;
  setDateRanges: Dispatch<SetStateAction<ComparisonDateRanges>>;
  
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

    let balance = 0; 
    
    // Se não houver data, calcula o saldo global (fim de todo o histórico)
    const targetDate = date || new Date(9999, 11, 31);

    // Filtra transações até a data limite (inclusive)
    const transactionsBeforeDate = allTransactions
        .filter(t => t.accountId === accountId && parseISO(t.date) <= targetDate) // MUDANÇA AQUI: <= targetDate
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    transactionsBeforeDate.forEach(t => {
        const isCreditCard = account.accountType === 'cartao_credito';
        
        // 1. Tratar Saldo Inicial (initial_balance)
        if (t.operationType === 'initial_balance') {
            // O fluxo da transação initial_balance já indica se é 'in' (positivo) ou 'out' (negativo)
            if (t.flow === 'in') {
                balance += t.amount;
            } else {
                balance -= t.amount;
            }
            return; // Pula para a próxima transação
        }
        
        // 2. Tratar transações operacionais e de transferência
        if (isCreditCard) {
          // Cartão de Crédito: Despesa (out) subtrai, Transferência (in) soma (Pagamento de Fatura)
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
</dyad-file>

### 2. `src/pages/ReceitasDespesas.tsx`

Ajustar o cálculo do `periodInitialBalance` para usar a data de início do período (`periodStart`) como limite, garantindo que a transação de saldo inicial sintético seja incluída se estiver na data de início do período.

<dyad-write path="src/pages/ReceitasDespesas.tsx" description="Ajustando o cálculo do Saldo Inicial do Período para incluir transações na data de início do período.">
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
  DateRange, ComparisonDateRanges
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
    categoriasV2, 
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
  const categories = categoriasV2;

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

  // Calculate account summaries
  const accountSummaries: AccountSummary[] = useMemo(() => {
    const periodStart = dateRanges.range1.from;
    const periodEnd = dateRanges.range1.to;
    
    return accounts.map(account => {
      // 1. Calculate Period Initial Balance (balance right before periodStart)
      // Se houver data de início, calculamos o saldo ATÉ o dia anterior ao início do período.
      // Se a transação de saldo inicial estiver na data de início do período, ela deve ser incluída aqui.
      const dateBeforeStart = periodStart ? subDays(periodStart, 1) : undefined;
      
      // CORREÇÃO: Se a transação de saldo inicial estiver na data de início do período, ela deve ser incluída no saldo inicial.
      // No entanto, a função calculateBalanceUpToDate já lida com a inclusão de transações 'initial_balance'
      // se a data for <= targetDate.
      // Se periodStart é 01/11/2025, dateBeforeStart é 31/10/2025.
      // Se a transação inicial é 01/11/2025, ela é excluída.
      // Para incluir a transação inicial na data de início do período, precisamos de uma lógica mais refinada.
      
      // Vamos usar a data de início do período como limite para o cálculo do saldo inicial,
      // mas apenas para transações de 'initial_balance'.
      
      const initialTx = transactions.find(t => 
          t.accountId === account.id && t.operationType === 'initial_balance'
      );
      
      let periodInitialBalance = 0;
      
      if (initialTx && periodStart && parseISO(initialTx.date) <= periodStart) {
          // Se a transação inicial existe e está na data de início do período ou antes,
          // usamos o saldo calculado até a data de início do período (inclusive)
          periodInitialBalance = calculateBalanceUpToDate(account.id, periodStart, transactions, accounts);
          
          // Agora, subtraímos as transações operacionais que ocorreram no dia 'periodStart'
          // para obter o saldo ANTES das operações do dia.
          const txOnStartDay = transactions.filter(t => 
              t.accountId === account.id && 
              t.operationType !== 'initial_balance' &&
              t.date === initialTx.date
          );
          
          txOnStartDay.forEach(t => {
              const isCreditCard = account.accountType === 'cartao_credito';
              
              if (isCreditCard) {
                  if (t.operationType === 'despesa') {
                      periodInitialBalance += t.amount;
                  } else if (t.operationType === 'transferencia') {
                      periodInitialBalance -= t.amount;
                  }
              } else {
                  if (t.flow === 'in' || t.flow === 'transfer_in') {
                      periodInitialBalance -= t.amount;
                  } else {
                      periodInitialBalance += t.amount;
                  }
              }
          });
          
      } else if (periodStart) {
          // Se não há transação inicial ou ela é posterior ao período, calculamos o saldo até o dia anterior
          periodInitialBalance = calculateBalanceUpToDate(account.id, dateBeforeStart, transactions, accounts);
      } else {
          // Se não há período selecionado, o saldo inicial é 0 (ou o saldo inicial da conta, que é 0)
          periodInitialBalance = 0;
      }
      
      // 2. Calculate Period Transactions (transactions within the selected period)
      const accountTxInPeriod = transactions.filter(t => {
        if (t.accountId !== account.id) return false;
        const transactionDate = parseISO(t.date);
        
        // Se não houver data de início, consideramos todas as transações
        if (!periodStart) return true;
        
        // Se houver data de início, filtramos as transações DENTRO do período
        // E excluímos a transação de 'initial_balance' se ela estiver na data de início do período,
        // pois ela já foi contabilizada no periodInitialBalance.
        const isInitialTxOnStartDay = t.operationType === 'initial_balance' && t.date === initialTx?.date;
        if (isInitialTxOnStartDay) return false;
        
        return isWithinInterval(transactionDate, { start: periodStart, end: periodEnd || new Date() });
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
    if (editingTransaction) {
      // When editing, also update linked transactions
      const linkedGroupId = editingTransaction.links?.transferGroupId;
      if (linkedGroupId) {
        // Update both sides of the transfer
        setTransacoesV2(prev => prev.map(t => {
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
        
        const isToCreditCard = toAccount?.accountType === 'cartao_credito';
        
        let incomingTx: TransacaoCompleta;
        
        if (isToCreditCard) {
          // Pagamento de Fatura: 
          // Transação original (transaction) é a ENTRADA no CC (flow: in)
          // Precisamos criar a transação de SAÍDA da Conta Corrente (fromAccount)
          
          // Transação de SAÍDA da Conta Corrente (fromAccount)
          incomingTx = {
            ...transaction,
            id: generateTransactionId(),
            accountId: transferGroup.fromAccountId,
            flow: 'transfer_out', // Saída da conta corrente
            operationType: 'transferencia',
            domain: 'operational',
            categoryId: null,
            links: { ...transaction.links, transferGroupId: transferGroup.id },
            description: transferGroup.description || `Pagamento de fatura CC ${toAccount?.name}`,
          };
          
          // Atualiza a transação original (entrada no CC)
          transaction.links.transferGroupId = transferGroup.id;
          transaction.flow = 'in';
          
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
          ...transaction,
          id: generateTransactionId(),
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
          ...transaction,
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
            // The context handles the update via markSeguroParcelPaid
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
          // The transaction itself (type 'rendimento') is enough to update the account balance.
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
      
      // Saldo inicial é extraído do objeto temporário do modal, mas não é salvo no ContaCorrente.
      // O valor inicial é sempre representado pela transação sintética.
      const initialBalanceAmount = account.initialBalance;
      
      // A conta é salva com initialBalance = 0, pois o valor inicial será representado pela transação.
      const newAccount: ContaCorrente = { ...account, initialBalance: 0 }; 
      
      if (isNewAccount) {
        setContasMovimento([...accounts, newAccount]);
        
        // 2. Cria a transação sintética de saldo inicial se o valor for diferente de zero
        if (initialBalanceAmount !== 0) {
          const initialTx: TransacaoCompleta = {
            id: generateTransactionId(),
            date: account.startDate!, // Data de início é obrigatória no formulário
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
        // --- EDITING LOGIC ---
        setContasMovimento(accounts.map(a => a.id === newAccount.id ? newAccount : a));
        
        // Handle synthetic initial balance transaction update
        const existingInitialTx = transactions.find(t => 
            t.accountId === newAccount.id && t.operationType === 'initial_balance'
        );
        
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
                // Update existing transaction
                setTransacoesV2(prev => prev.map(t => t.id === existingInitialTx.id ? newInitialTx : t));
            } else {
                // Add new transaction
                addTransacaoV2(newInitialTx);
            }
        } else if (existingInitialTx) {
            // Delete existing transaction if new balance is 0
            setTransacoesV2(prev => prev.filter(t => t.id !== existingInitialTx.id));
        }
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