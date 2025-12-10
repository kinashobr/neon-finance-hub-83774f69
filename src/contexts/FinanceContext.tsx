import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import {
  ContaCorrente, Categoria, TransacaoCompleta, TransferGroup,
  AccountType, CategoryNature, DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES,
  generateTransactionId
} from "@/types/finance";

// ============================================
// TIPOS DE DADOS LEGADOS (para compatibilidade)
// ============================================

export interface Transacao {
  id: number;
  data: string;
  descricao: string;
  valor: number;
  categoria: string;
  tipo: "receita" | "despesa";
}

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
}

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

// Novo tipo para controle de seguro de veículo
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

// ============================================
// TIPOS DE INVESTIMENTOS
// ============================================

export interface InvestimentoRF {
  id: number;
  aplicacao: string;
  instituicao: string;
  tipo: string;
  valor: number;
  cdi: number;
  rentabilidade: number;
  vencimento: string;
  risco: string;
  contaMovimentoId?: string; // Link to account in ReceitasDespesas
}

export interface Criptomoeda {
  id: number;
  nome: string;
  simbolo: string;
  quantidade: number;
  valorBRL: number;
  percentual: number;
  sparkline: number[];
  contaMovimentoId?: string; // Link to crypto account
}

export interface Stablecoin {
  id: number;
  nome: string;
  quantidade: number;
  valorBRL: number;
  cotacao: number;
  contaMovimentoId?: string; // Link to crypto account
}

export interface ObjetivoFinanceiro {
  id: number;
  nome: string;
  atual: number;
  meta: number;
  rentabilidade: number;
  cor: string;
  contaMovimentoId?: string; // Link to objetivos account
}

export interface MovimentacaoInvestimento {
  id: number;
  data: string;
  tipo: string;
  categoria: string;
  ativo: string;
  descricao: string;
  valor: number;
  transactionId?: string; // Link to transaction in ReceitasDespesas
}

// ============================================
// INTERFACE DO CONTEXTO
// ============================================

export interface FinanceDataExport {
  version: string;
  exportDate: string;
  transacoes: Transacao[];
  categorias: string[];
  emprestimos: Emprestimo[];
  veiculos: Veiculo[];
  investimentosRF: InvestimentoRF[];
  criptomoedas: Criptomoeda[];
  stablecoins: Stablecoin[];
  objetivos: ObjetivoFinanceiro[];
  movimentacoesInvestimento: MovimentacaoInvestimento[];
  // New integrated data
  contasMovimento?: ContaCorrente[];
  categoriasV2?: Categoria[];
  transacoesV2?: TransacaoCompleta[];
  segurosVeiculo?: SeguroVeiculo[];
}

interface FinanceContextType {
  // Transações
  transacoes: Transacao[];
  addTransacao: (transacao: Omit<Transacao, "id">) => void;
  updateTransacao: (id: number, transacao: Partial<Transacao>) => void;
  deleteTransacao: (id: number) => void;
  
  // Categorias
  categorias: string[];
  addCategoria: (categoria: string) => void;
  removeCategoria: (categoria: string) => void;
  
  // Empréstimos
  emprestimos: Emprestimo[];
  addEmprestimo: (emprestimo: Omit<Emprestimo, "id">) => void;
  updateEmprestimo: (id: number, emprestimo: Partial<Emprestimo>) => void;
  deleteEmprestimo: (id: number) => void;
  getPendingLoans: () => Emprestimo[];
  
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

  // Investimentos RF
  investimentosRF: InvestimentoRF[];
  addInvestimentoRF: (inv: Omit<InvestimentoRF, "id">) => void;
  updateInvestimentoRF: (id: number, inv: Partial<InvestimentoRF>) => void;
  deleteInvestimentoRF: (id: number) => void;

  // Criptomoedas
  criptomoedas: Criptomoeda[];
  addCriptomoeda: (cripto: Omit<Criptomoeda, "id">) => void;
  updateCriptomoeda: (id: number, cripto: Partial<Criptomoeda>) => void;
  deleteCriptomoeda: (id: number) => void;

  // Stablecoins
  stablecoins: Stablecoin[];
  addStablecoin: (stable: Omit<Stablecoin, "id">) => void;
  updateStablecoin: (id: number, stable: Partial<Stablecoin>) => void;
  deleteStablecoin: (id: number) => void;

  // Objetivos Financeiros
  objetivos: ObjetivoFinanceiro[];
  addObjetivo: (obj: Omit<ObjetivoFinanceiro, "id">) => void;
  updateObjetivo: (id: number, obj: Partial<ObjetivoFinanceiro>) => void;
  deleteObjetivo: (id: number) => void;

  // Movimentações de Investimento
  movimentacoesInvestimento: MovimentacaoInvestimento[];
  addMovimentacaoInvestimento: (mov: Omit<MovimentacaoInvestimento, "id">) => void;
  updateMovimentacaoInvestimento: (id: number, mov: Partial<MovimentacaoInvestimento>) => void;
  deleteMovimentacaoInvestimento: (id: number) => void;
  
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
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// ============================================
// CHAVES DO LOCALSTORAGE
// ============================================

const STORAGE_KEYS = {
  TRANSACOES: "neon_finance_transacoes",
  CATEGORIAS: "neon_finance_categorias",
  EMPRESTIMOS: "neon_finance_emprestimos",
  VEICULOS: "neon_finance_veiculos",
  SEGUROS_VEICULO: "neon_finance_seguros_veiculo",
  INVESTIMENTOS_RF: "neon_finance_investimentos_rf",
  CRIPTOMOEDAS: "neon_finance_criptomoedas",
  STABLECOINS: "neon_finance_stablecoins",
  OBJETIVOS: "neon_finance_objetivos",
  MOVIMENTACOES_INV: "neon_finance_movimentacoes_inv",
  // New integrated keys
  CONTAS_MOVIMENTO: "fin_accounts_v1",
  CATEGORIAS_V2: "fin_categories_v1",
  TRANSACOES_V2: "fin_transactions_v1",
};

// ============================================
// DADOS INICIAIS (usados se localStorage vazio)
// ============================================

const initialTransacoes: Transacao[] = [];
const initialCategorias = ["Alimentação", "Transporte", "Lazer", "Saúde", "Moradia", "Salário", "Freelance", "Outros"];

const initialEmprestimos: Emprestimo[] = [];
const initialVeiculos: Veiculo[] = [];
const initialSegurosVeiculo: SeguroVeiculo[] = [];
const initialInvestimentosRF: InvestimentoRF[] = [];
const initialCriptomoedas: Criptomoeda[] = [];
const initialStablecoins: Stablecoin[] = [];
const initialObjetivos: ObjetivoFinanceiro[] = [];
const initialMovimentacoesInv: MovimentacaoInvestimento[] = [];

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
  // Estados legados
  const [transacoes, setTransacoes] = useState<Transacao[]>(() => 
    loadFromStorage(STORAGE_KEYS.TRANSACOES, initialTransacoes)
  );
  const [categorias, setCategorias] = useState<string[]>(() => 
    loadFromStorage(STORAGE_KEYS.CATEGORIAS, initialCategorias)
  );
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>(() => 
    loadFromStorage(STORAGE_KEYS.EMPRESTIMOS, initialEmprestimos)
  );
  const [veiculos, setVeiculos] = useState<Veiculo[]>(() => 
    loadFromStorage(STORAGE_KEYS.VEICULOS, initialVeiculos)
  );
  const [segurosVeiculo, setSegurosVeiculo] = useState<SeguroVeiculo[]>(() => 
    loadFromStorage(STORAGE_KEYS.SEGUROS_VEICULO, initialSegurosVeiculo)
  );
  const [investimentosRF, setInvestimentosRF] = useState<InvestimentoRF[]>(() => 
    loadFromStorage(STORAGE_KEYS.INVESTIMENTOS_RF, initialInvestimentosRF)
  );
  const [criptomoedas, setCriptomoedas] = useState<Criptomoeda[]>(() => 
    loadFromStorage(STORAGE_KEYS.CRIPTOMOEDAS, initialCriptomoedas)
  );
  const [stablecoins, setStablecoins] = useState<Stablecoin[]>(() => 
    loadFromStorage(STORAGE_KEYS.STABLECOINS, initialStablecoins)
  );
  const [objetivos, setObjetivos] = useState<ObjetivoFinanceiro[]>(() => 
    loadFromStorage(STORAGE_KEYS.OBJETIVOS, initialObjetivos)
  );
  const [movimentacoesInvestimento, setMovimentacoesInvestimento] = useState<MovimentacaoInvestimento[]>(() => 
    loadFromStorage(STORAGE_KEYS.MOVIMENTACOES_INV, initialMovimentacoesInv)
  );

  // Estados novos integrados
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
  // EFEITOS PARA PERSISTÊNCIA AUTOMÁTICA
  // ============================================

  useEffect(() => { saveToStorage(STORAGE_KEYS.TRANSACOES, transacoes); }, [transacoes]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CATEGORIAS, categorias); }, [categorias]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.EMPRESTIMOS, emprestimos); }, [emprestimos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.VEICULOS, veiculos); }, [veiculos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.SEGUROS_VEICULO, segurosVeiculo); }, [segurosVeiculo]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.INVESTIMENTOS_RF, investimentosRF); }, [investimentosRF]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CRIPTOMOEDAS, criptomoedas); }, [criptomoedas]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.STABLECOINS, stablecoins); }, [stablecoins]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.OBJETIVOS, objetivos); }, [objetivos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.MOVIMENTACOES_INV, movimentacoesInvestimento); }, [movimentacoesInvestimento]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CONTAS_MOVIMENTO, contasMovimento); }, [contasMovimento]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CATEGORIAS_V2, categoriasV2); }, [categoriasV2]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.TRANSACOES_V2, transacoesV2); }, [transacoesV2]);

  // ============================================
  // OPERAÇÕES DE TRANSAÇÕES LEGADAS
  // ============================================

  const addTransacao = (transacao: Omit<Transacao, "id">) => {
    const newId = Math.max(0, ...transacoes.map(t => t.id)) + 1;
    setTransacoes([...transacoes, { ...transacao, id: newId }]);
  };

  const updateTransacao = (id: number, updates: Partial<Transacao>) => {
    setTransacoes(transacoes.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTransacao = (id: number) => {
    setTransacoes(transacoes.filter(t => t.id !== id));
  };

  // ============================================
  // OPERAÇÕES DE CATEGORIAS
  // ============================================

  const addCategoria = (categoria: string) => {
    if (!categorias.includes(categoria)) {
      setCategorias([...categorias, categoria]);
    }
  };

  const removeCategoria = (categoria: string) => {
    setCategorias(categorias.filter(c => c !== categoria));
  };

  // ============================================
  // OPERAÇÕES DE EMPRÉSTIMOS
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

  // ============================================
  // OPERAÇÕES DE VEÍCULOS
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
  // OPERAÇÕES DE SEGUROS DE VEÍCULO
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

  // ============================================
  // OPERAÇÕES DE INVESTIMENTOS RF
  // ============================================

  const addInvestimentoRF = (inv: Omit<InvestimentoRF, "id">) => {
    const newId = Math.max(0, ...investimentosRF.map(i => i.id)) + 1;
    setInvestimentosRF([...investimentosRF, { ...inv, id: newId }]);
  };

  const updateInvestimentoRF = (id: number, updates: Partial<InvestimentoRF>) => {
    setInvestimentosRF(investimentosRF.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const deleteInvestimentoRF = (id: number) => {
    setInvestimentosRF(investimentosRF.filter(i => i.id !== id));
  };

  // ============================================
  // OPERAÇÕES DE CRIPTOMOEDAS
  // ============================================

  const addCriptomoeda = (cripto: Omit<Criptomoeda, "id">) => {
    const newId = Math.max(0, ...criptomoedas.map(c => c.id)) + 1;
    setCriptomoedas([...criptomoedas, { ...cripto, id: newId }]);
  };

  const updateCriptomoeda = (id: number, updates: Partial<Criptomoeda>) => {
    setCriptomoedas(criptomoedas.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCriptomoeda = (id: number) => {
    setCriptomoedas(criptomoedas.filter(c => c.id !== id));
  };

  // ============================================
  // OPERAÇÕES DE STABLECOINS
  // ============================================

  const addStablecoin = (stable: Omit<Stablecoin, "id">) => {
    const newId = Math.max(0, ...stablecoins.map(s => s.id)) + 1;
    setStablecoins([...stablecoins, { ...stable, id: newId }]);
  };

  const updateStablecoin = (id: number, updates: Partial<Stablecoin>) => {
    setStablecoins(stablecoins.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteStablecoin = (id: number) => {
    setStablecoins(stablecoins.filter(s => s.id !== id));
  };

  // ============================================
  // OPERAÇÕES DE OBJETIVOS FINANCEIROS
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
  // OPERAÇÕES DE MOVIMENTAÇÕES DE INVESTIMENTO
  // ============================================

  const addMovimentacaoInvestimento = (mov: Omit<MovimentacaoInvestimento, "id">) => {
    const newId = Math.max(0, ...movimentacoesInvestimento.map(m => m.id)) + 1;
    setMovimentacoesInvestimento([...movimentacoesInvestimento, { ...mov, id: newId }]);
  };

  const updateMovimentacaoInvestimento = (id: number, updates: Partial<MovimentacaoInvestimento>) => {
    setMovimentacoesInvestimento(movimentacoesInvestimento.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const deleteMovimentacaoInvestimento = (id: number) => {
    setMovimentacoesInvestimento(movimentacoesInvestimento.filter(m => m.id !== id));
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

  const getTotalReceitas = (mes?: string) => {
    const receitas = transacoesV2.filter(t => {
      const isReceita = t.operationType === 'receita' || t.operationType === 'rendimento';
      if (!mes) return isReceita;
      return isReceita && t.date.startsWith(mes);
    });
    return receitas.reduce((acc, t) => acc + t.amount, 0);
  };

  const getTotalDespesas = (mes?: string) => {
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
    return veiculos.reduce((acc, v) => acc + v.valorSeguro, 0);
  };

  const getSaldoAtual = () => {
    const totalIn = transacoesV2.filter(t => t.flow === 'in' || t.flow === 'transfer_in').reduce((acc, t) => acc + t.amount, 0);
    const totalOut = transacoesV2.filter(t => t.flow === 'out' || t.flow === 'transfer_out').reduce((acc, t) => acc + t.amount, 0);
    const initialBalances = contasMovimento.reduce((acc, c) => acc + c.initialBalance, 0);
    return initialBalances + totalIn - totalOut;
  };

  const getValorFipeTotal = () => {
    return veiculos.filter(v => v.status !== 'vendido').reduce((acc, v) => acc + v.valorFipe, 0);
  };

  // Cálculos avançados
  const getSaldoDevedor = () => {
    return emprestimos.reduce((acc, e) => {
      const parcelasPagas = e.parcelasPagas || 0;
      const saldoDevedor = Math.max(0, e.valorTotal - (parcelasPagas * e.parcela));
      return acc + saldoDevedor;
    }, 0);
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

  const getAtivosTotal = () => {
    const saldoContas = getSaldoAtual();
    const valorVeiculos = getValorFipeTotal();
    const investimentos = investimentosRF.reduce((acc, i) => acc + i.valor, 0) +
                          criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0) +
                          stablecoins.reduce((acc, s) => acc + s.valorBRL, 0) +
                          objetivos.reduce((acc, o) => acc + o.atual, 0);
    return saldoContas + valorVeiculos + investimentos;
  };

  const getPassivosTotal = () => {
    return getSaldoDevedor();
  };

  const getPatrimonioLiquido = () => {
    return getAtivosTotal() - getPassivosTotal();
  };

  // ============================================
  // EXPORTAÇÃO E IMPORTAÇÃO
  // ============================================

  const exportData = () => {
    const data: FinanceDataExport = {
      version: "2.0",
      exportDate: new Date().toISOString(),
      transacoes,
      categorias,
      emprestimos,
      veiculos,
      investimentosRF,
      criptomoedas,
      stablecoins,
      objetivos,
      movimentacoesInvestimento,
      contasMovimento,
      categoriasV2,
      transacoesV2,
      segurosVeiculo,
    };

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
      const data = JSON.parse(text) as FinanceDataExport;

      if (data.transacoes) setTransacoes(data.transacoes);
      if (data.categorias) setCategorias(data.categorias);
      if (data.emprestimos) setEmprestimos(data.emprestimos);
      if (data.veiculos) setVeiculos(data.veiculos);
      if (data.investimentosRF) setInvestimentosRF(data.investimentosRF);
      if (data.criptomoedas) setCriptomoedas(data.criptomoedas);
      if (data.stablecoins) setStablecoins(data.stablecoins);
      if (data.objetivos) setObjetivos(data.objetivos);
      if (data.movimentacoesInvestimento) setMovimentacoesInvestimento(data.movimentacoesInvestimento);
      if (data.contasMovimento) setContasMovimento(data.contasMovimento);
      if (data.categoriasV2) setCategoriasV2(data.categoriasV2);
      if (data.transacoesV2) setTransacoesV2(data.transacoesV2);
      if (data.segurosVeiculo) setSegurosVeiculo(data.segurosVeiculo);

      return { success: true, message: "Dados importados com sucesso!" };
    } catch (error) {
      return { success: false, message: "Erro ao importar dados. Verifique o formato do arquivo." };
    }
  };

  // ============================================
  // VALOR DO CONTEXTO
  // ============================================

  const value: FinanceContextType = {
    transacoes,
    addTransacao,
    updateTransacao,
    deleteTransacao,
    categorias,
    addCategoria,
    removeCategoria,
    emprestimos,
    addEmprestimo,
    updateEmprestimo,
    deleteEmprestimo,
    getPendingLoans,
    veiculos,
    addVeiculo,
    updateVeiculo,
    deleteVeiculo,
    getPendingVehicles,
    segurosVeiculo,
    addSeguroVeiculo,
    updateSeguroVeiculo,
    deleteSeguroVeiculo,
    investimentosRF,
    addInvestimentoRF,
    updateInvestimentoRF,
    deleteInvestimentoRF,
    criptomoedas,
    addCriptomoeda,
    updateCriptomoeda,
    deleteCriptomoeda,
    stablecoins,
    addStablecoin,
    updateStablecoin,
    deleteStablecoin,
    objetivos,
    addObjetivo,
    updateObjetivo,
    deleteObjetivo,
    movimentacoesInvestimento,
    addMovimentacaoInvestimento,
    updateMovimentacaoInvestimento,
    deleteMovimentacaoInvestimento,
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
