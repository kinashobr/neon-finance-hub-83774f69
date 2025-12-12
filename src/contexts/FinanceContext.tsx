import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import {
  Categoria, TransacaoCompleta, TransferGroup,
  AccountType, CategoryNature, DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES,
  generateTransactionId, ContaCorrente,
  getFlowTypeFromOperation, getDomainFromOperation,
  TransactionLinks, FinanceExportV2
} from "@/types/finance";
import { parseISO } from "date-fns";

// ============================================
// TIPOS DE DADOS V2 (Mantidos)
// ============================================

// Interfaces de Entidade V2 (Simplificadas para o que é necessário no contexto)
// Empréstimo V2 (Mantido para compatibilidade com Emprestimos.tsx, mas simplificado)
export interface Emprestimo {
  id: number;
  contrato: string;
  parcela: number;
  meses: number;
  taxaMensal: number;
  valorTotal: number;
  contaCorrenteId?: string; // Link to conta movimento
  dataInicio?: string;
  status?: 'ativo' | 'pendente_config' | 'quitado';
  parcelasPagas?: number;
  liberacaoTransactionId?: string; // Link to liberation transaction
  observacoes?: string;
}

// Veículo V2 (Mantido para compatibilidade com Veiculos.tsx, mas simplificado)
export interface Veiculo {
  id: number;
  modelo: string;
  tipo?: 'carro' | 'moto' | 'caminhao';
  marca?: string;
  ano: number;
  dataCompra: string;
  valorVeiculo: number;
  valorSeguro: number;
  vencimentoSeguro: string;
  parcelaSeguro: number;
  valorFipe: number;
  compraTransactionId?: string; // Link to purchase transaction
  vendaTransactionId?: string; // Link to sale transaction
  status?: 'ativo' | 'pendente_cadastro' | 'vendido';
}

// Seguro de Veículo V2 (Mantido para compatibilidade com Veiculos.tsx, mas simplificado)
export interface SeguroVeiculo {
  id: number;
  veiculoId: number;
  numeroApolice: string;
  seguradora: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  valorTotal: number;
  numeroParcelas: number;
  meiaParcela: boolean;
  parcelas: {
    numero: number;
    vencimento: string;
    valor: number;
    paga: boolean;
    transactionId?: string;
  }[];
}

// Objetivo Financeiro V2 (Mantido para compatibilidade com Investimentos.tsx, mas simplificado)
export interface ObjetivoFinanceiro {
  id: number;
  nome: string;
  atual: number;
  meta: number;
  rentabilidade: number;
  cor: string;
  contaMovimentoId?: string;
}

// ============================================
// INTERFACE DO CONTEXTO
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

  // Exportação e Importação
  exportData: () => void;
  importData: (file: File) => Promise<{ success: boolean; message: string }>;
  
  // Removidos: Investimentos RF, Criptomoedas, Stablecoins, Movimentações de Investimento
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
  deleteMovimentacaoInvestimento: (id: number) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// ============================================
// CHAVES DO LOCALSTORAGE (Apenas V2 e Entidades V2)
// ============================================

const STORAGE_KEYS = {
  // Mantidos para Entidades V2 (Empréstimos, Veículos, Seguros, Objetivos)
  EMPRESTIMOS: "neon_finance_emprestimos",
  VEICULOS: "neon_finance_veiculos",
  SEGUROS_VEICULO: "neon_finance_seguros_veiculo",
  OBJETIVOS: "neon_finance_objetivos",
  
  // New integrated keys (V2)
  CONTAS_MOVIMENTO: "fin_accounts_v1",
  CATEGORIAS_V2: "fin_categories_v1",
  TRANSACOES_V2: "fin_transactions_v1",
};

// ============================================
// DADOS INICIAIS (usados se localStorage vazio)
// ============================================

const initialEmprestimos: Emprestimo[] = [];
const initialVeiculos: Veiculo[] = [];
const initialSegurosVeiculo: SeguroVeiculo[] = [];
const initialObjetivos: ObjetivoFinanceiro[] = [];

// Dados V1 removidos, mas mantemos placeholders para evitar erros de compilação na Etapa 1
const initialInvestimentosRF: any[] = [];
const initialCriptomoedas: any[] = [];
const initialStablecoins: any[] = [];
const initialMovimentacoesInv: any[] = [];


// ============================================
// FUNÇÕES AUXILIARES DE LOCALSTORAGE
// ============================================

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error(`Erro ao carregar ${key} do localStorage:`, error);
  }
  return defaultValue;
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Erro ao salvar ${key} no localStorage:`, error);
  }
}

// ============================================
// PROVIDER PRINCIPAL
// ============================================

export function FinanceProvider({ children }: { children: ReactNode }) {
  // Estados de Entidade V2 (Mantidos temporariamente para Emprestimos/Veiculos/Objetivos)
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
  
  // Estados V1 removidos, mas mantemos o useState para evitar erros de compilação na Etapa 1
  const [investimentosRF, setInvestimentosRF] = useState<any[]>(initialInvestimentosRF);
  const [criptomoedas, setCriptomoedas] = useState<any[]>(initialCriptomoedas);
  const [stablecoins, setStablecoins] = useState<any[]>(initialStablecoins);
  const [movimentacoesInvestimento, setMovimentacoesInvestimento] = useState<any[]>(initialMovimentacoesInv);

  // Estados novos integrados (V2)
  const [contasMovimento, setContasMovimento] = useState<ContaCorrente[]>(() => 
    loadFromStorage(STORAGE_KEYS.CONTAS_MOVIMENTO, DEFAULT_ACCOUNTS)
  );
  const [categoriasV2, setCategoriasV2] = useState<Categoria[]>(() => 
    loadFromStorage(STORAGE_KEYS.CATEGORIAS_V2, DEFAULT_CATEGORIES)
  );
  const [transacoesV2, setTransacoesV2] = useState<TransacaoCompleta[]>(() => 
    loadFromStorage(STORAGE_KEYS.TRANSACOES_V2, [])
  );

  // ============================================
  // EFEITOS PARA PERSISTÊNCIA AUTOMÁTICA (Apenas V2 e Entidades V2)
  // ============================================

  useEffect(() => { saveToStorage(STORAGE_KEYS.EMPRESTIMOS, emprestimos); }, [emprestimos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.VEICULOS, veiculos); }, [veiculos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.SEGUROS_VEICULO, segurosVeiculo); }, [segurosVeiculo]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.OBJETIVOS, objetivos); }, [objetivos]);
  
  useEffect(() => { saveToStorage(STORAGE_KEYS.CONTAS_MOVIMENTO, contasMovimento); }, [contasMovimento]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CATEGORIAS_V2, categoriasV2); }, [categoriasV2]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.TRANSACOES_V2, transacoesV2); }, [transacoesV2]);

  // ============================================
  // OPERAÇÕES DE EMPRÉSTIMOS (Mantidas para Etapa 3)
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

  // ============================================
  // OPERAÇÕES DE VEÍCULOS (Mantidas para Etapa 3)
  // ============================================

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

  // ============================================
  // OPERAÇÕES DE SEGUROS DE VEÍCULO (Mantidas para Etapa 3)
  // ============================================

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

  // ============================================
  // OPERAÇÕES DE OBJETIVOS FINANCEIROS (Mantidas para Etapa 3)
  // ============================================

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

  // Helper para calcular saldo até uma data (usado para getSaldoAtual)
  const calculateBalanceUpToDate = useCallback((accountId: string, date: Date | undefined, allTransactions: TransacaoCompleta[], accounts: ContaCorrente[]): number => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;

    let balance = account.startDate ? 0 : account.initialBalance; 
    const targetDate = date || new Date(9999, 11, 31);

    const transactionsBeforeDate = allTransactions
        .filter(t => t.accountId === accountId && parseISO(t.date) < targetDate)
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    transactionsBeforeDate.forEach(t => {
        const isCreditCard = account.accountType === 'cartao_credito';
        
        if (isCreditCard) {
          if (t.operationType === 'despesa') {
            balance -= t.amount;
          } else if (t.operationType === 'transferencia') {
            balance += t.amount;
          }
        } else {
          if (t.flow === 'in' || t.flow === 'transfer_in' || t.operationType === 'initial_balance') {
            balance += t.amount;
          } else {
            balance -= t.amount;
          }
        }
    });

    return balance;
  }, [contasMovimento, transacoesV2]); // Dependências ajustadas

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
    
    // Investimentos Legados (agora vazios, mas mantemos a soma para o cálculo)
    const investimentosLegados = investimentosRF.reduce((acc, i) => acc + i.valor, 0) +
                          criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0) +
                          stablecoins.reduce((acc, s) => acc + s.valorBRL, 0) +
                          objetivos.reduce((acc, o) => acc + o.atual, 0);
                          
    return saldoContasAtivas + valorVeiculos + investimentosLegados;
  }, [contasMovimento, transacoesV2, getValorFipeTotal, investimentosRF, criptomoedas, stablecoins, objetivos, calculateBalanceUpToDate]);

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
        transferGroups: [], // Transfer groups are implicitly handled by transactions V2
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
        
        // Resetar estados V1 que foram removidos
        setInvestimentosRF(initialInvestimentosRF);
        setCriptomoedas(initialCriptomoedas);
        setStablecoins(initialStablecoins);
        setMovimentacoesInvestimento(initialMovimentacoesInv);

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
    exportData,
    importData,
    
    // Placeholders para V1 removidos
    investimentosRF,
    criptomoedas,
    stablecoins,
    movimentacoesInvestimento,
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