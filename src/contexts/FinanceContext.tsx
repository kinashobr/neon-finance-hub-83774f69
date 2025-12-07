import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// ============================================
// TIPOS DE DADOS
// Define a estrutura de cada entidade financeira
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
}

export interface Veiculo {
  id: number;
  modelo: string;
  ano: number;
  dataCompra: string;
  valorVeiculo: number;
  valorSeguro: number;
  vencimentoSeguro: string;
  parcelaSeguro: number;
  valorFipe: number;
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
}

export interface Criptomoeda {
  id: number;
  nome: string;
  simbolo: string;
  quantidade: number;
  valorBRL: number;
  percentual: number;
  sparkline: number[];
}

export interface Stablecoin {
  id: number;
  nome: string;
  quantidade: number;
  valorBRL: number;
  cotacao: number;
}

export interface ObjetivoFinanceiro {
  id: number;
  nome: string;
  atual: number;
  meta: number;
  rentabilidade: number;
  cor: string;
}

export interface MovimentacaoInvestimento {
  id: number;
  data: string;
  tipo: string;
  categoria: string;
  ativo: string;
  descricao: string;
  valor: number;
}

// ============================================
// INTERFACE DO CONTEXTO
// Define todas as funções e dados disponíveis
// ============================================

// Estrutura do arquivo de exportação
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
  
  // Veículos
  veiculos: Veiculo[];
  addVeiculo: (veiculo: Omit<Veiculo, "id">) => void;
  updateVeiculo: (id: number, veiculo: Partial<Veiculo>) => void;
  deleteVeiculo: (id: number) => void;

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
// Centralizadas para fácil manutenção
// ============================================

const STORAGE_KEYS = {
  TRANSACOES: "neon_finance_transacoes",
  CATEGORIAS: "neon_finance_categorias",
  EMPRESTIMOS: "neon_finance_emprestimos",
  VEICULOS: "neon_finance_veiculos",
  INVESTIMENTOS_RF: "neon_finance_investimentos_rf",
  CRIPTOMOEDAS: "neon_finance_criptomoedas",
  STABLECOINS: "neon_finance_stablecoins",
  OBJETIVOS: "neon_finance_objetivos",
  MOVIMENTACOES_INV: "neon_finance_movimentacoes_inv",
};

// ============================================
// DADOS INICIAIS (usados se localStorage vazio)
// ============================================

const initialTransacoes: Transacao[] = [
  { id: 1, data: "2024-01-05", descricao: "Salário", valor: 12000, categoria: "Salário", tipo: "receita" },
  { id: 2, data: "2024-01-10", descricao: "Freelance projeto web", valor: 2500, categoria: "Freelance", tipo: "receita" },
  { id: 3, data: "2024-01-03", descricao: "Aluguel apartamento", valor: 3500, categoria: "Moradia", tipo: "despesa" },
  { id: 4, data: "2024-01-05", descricao: "Supermercado", valor: 850, categoria: "Alimentação", tipo: "despesa" },
  { id: 5, data: "2024-01-10", descricao: "Combustível", valor: 400, categoria: "Transporte", tipo: "despesa" },
  { id: 6, data: "2024-01-15", descricao: "Restaurante", valor: 350, categoria: "Lazer", tipo: "despesa" },
  { id: 7, data: "2024-01-20", descricao: "Plano de saúde", valor: 280, categoria: "Saúde", tipo: "despesa" },
  { id: 8, data: "2024-02-05", descricao: "Salário", valor: 12000, categoria: "Salário", tipo: "receita" },
  { id: 9, data: "2024-02-08", descricao: "Farmácia", valor: 150, categoria: "Saúde", tipo: "despesa" },
];

const initialCategorias = ["Alimentação", "Transporte", "Lazer", "Saúde", "Moradia", "Salário", "Freelance", "Outros"];

const initialEmprestimos: Emprestimo[] = [
  { id: 1, contrato: "Banco Itaú - Pessoal", parcela: 1250, meses: 48, taxaMensal: 1.89, valorTotal: 50000 },
  { id: 2, contrato: "Nubank - Crédito", parcela: 750, meses: 24, taxaMensal: 1.49, valorTotal: 15000 },
  { id: 3, contrato: "Santander - Veículo", parcela: 890, meses: 36, taxaMensal: 2.10, valorTotal: 25000 },
];

const initialVeiculos: Veiculo[] = [
  {
    id: 1,
    modelo: "Honda Civic EXL",
    ano: 2022,
    dataCompra: "2022-06-10",
    valorVeiculo: 120000,
    valorSeguro: 4800,
    vencimentoSeguro: "2024-06-10",
    parcelaSeguro: 400,
    valorFipe: 115000,
  },
  {
    id: 2,
    modelo: "Toyota Corolla XEi",
    ano: 2021,
    dataCompra: "2021-03-15",
    valorVeiculo: 95000,
    valorSeguro: 3600,
    vencimentoSeguro: "2024-03-15",
    parcelaSeguro: 300,
    valorFipe: 88000,
  },
];

// Dados iniciais de investimentos
const initialInvestimentosRF: InvestimentoRF[] = [
  { id: 1, aplicacao: "CDB Banco Inter", instituicao: "Inter", tipo: "CDB", valor: 25000, cdi: 110, rentabilidade: 12.5, vencimento: "2025-06-15", risco: "Baixo" },
  { id: 2, aplicacao: "Tesouro Selic 2029", instituicao: "Tesouro", tipo: "Tesouro", valor: 50000, cdi: 100, rentabilidade: 11.2, vencimento: "2029-03-01", risco: "Baixo" },
  { id: 3, aplicacao: "LCI Nubank", instituicao: "Nubank", tipo: "LCI", valor: 15000, cdi: 95, rentabilidade: 10.8, vencimento: "2024-12-20", risco: "Baixo" },
  { id: 4, aplicacao: "CDB BTG 3 anos", instituicao: "BTG", tipo: "CDB", valor: 30000, cdi: 115, rentabilidade: 13.1, vencimento: "2027-01-10", risco: "Médio" },
];

const initialCriptomoedas: Criptomoeda[] = [
  { id: 1, nome: "Bitcoin", simbolo: "BTC", quantidade: 0.5, valorBRL: 150000, percentual: 45, sparkline: [40000, 42000, 38000, 45000, 48000, 46000, 50000] },
  { id: 2, nome: "Ethereum", simbolo: "ETH", quantidade: 3.2, valorBRL: 45000, percentual: 13.5, sparkline: [2000, 2100, 1900, 2200, 2400, 2300, 2500] },
  { id: 3, nome: "Solana", simbolo: "SOL", quantidade: 50, valorBRL: 25000, percentual: 7.5, sparkline: [80, 90, 75, 100, 110, 105, 120] },
];

const initialStablecoins: Stablecoin[] = [
  { id: 1, nome: "USDC", quantidade: 10000, valorBRL: 50000, cotacao: 5.0 },
  { id: 2, nome: "USDT", quantidade: 5000, valorBRL: 25000, cotacao: 5.0 },
];

const initialObjetivos: ObjetivoFinanceiro[] = [
  { id: 1, nome: "Reserva de Emergência", atual: 30000, meta: 50000, rentabilidade: 11.2, cor: "hsl(142, 76%, 36%)" },
  { id: 2, nome: "Viagem Internacional", atual: 15000, meta: 25000, rentabilidade: 10.5, cor: "hsl(199, 89%, 48%)" },
  { id: 3, nome: "Aposentadoria", atual: 80000, meta: 500000, rentabilidade: 12.8, cor: "hsl(270, 100%, 65%)" },
  { id: 4, nome: "Fundo de Oportunidades", atual: 20000, meta: 50000, rentabilidade: 15.2, cor: "hsl(38, 92%, 50%)" },
];

const initialMovimentacoesInv: MovimentacaoInvestimento[] = [
  { id: 1, data: "2024-01-15", tipo: "Aporte", categoria: "Renda Fixa", ativo: "CDB Banco Inter", descricao: "Aplicação mensal", valor: 5000 },
  { id: 2, data: "2024-01-10", tipo: "Compra", categoria: "Cripto", ativo: "BTC", descricao: "DCA Bitcoin", valor: 2000 },
  { id: 3, data: "2024-01-08", tipo: "Venda", categoria: "Cripto", ativo: "ETH", descricao: "Realização parcial", valor: 3500 },
  { id: 4, data: "2024-01-05", tipo: "Aporte", categoria: "Stablecoin", ativo: "USDC", descricao: "Reserva dólar", valor: 5000 },
];

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
  // Inicializa estados com dados do localStorage ou valores padrão
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

  // ============================================
  // EFEITOS PARA PERSISTÊNCIA AUTOMÁTICA
  // Salva no localStorage sempre que os dados mudam
  // ============================================

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TRANSACOES, transacoes);
  }, [transacoes]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CATEGORIAS, categorias);
  }, [categorias]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.EMPRESTIMOS, emprestimos);
  }, [emprestimos]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.VEICULOS, veiculos);
  }, [veiculos]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.INVESTIMENTOS_RF, investimentosRF);
  }, [investimentosRF]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CRIPTOMOEDAS, criptomoedas);
  }, [criptomoedas]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.STABLECOINS, stablecoins);
  }, [stablecoins]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.OBJETIVOS, objetivos);
  }, [objetivos]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.MOVIMENTACOES_INV, movimentacoesInvestimento);
  }, [movimentacoesInvestimento]);

  // ============================================
  // OPERAÇÕES DE TRANSAÇÕES
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
    setEmprestimos([...emprestimos, { ...emprestimo, id: newId }]);
  };

  const updateEmprestimo = (id: number, updates: Partial<Emprestimo>) => {
    setEmprestimos(emprestimos.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteEmprestimo = (id: number) => {
    setEmprestimos(emprestimos.filter(e => e.id !== id));
  };

  // ============================================
  // OPERAÇÕES DE VEÍCULOS
  // ============================================

  const addVeiculo = (veiculo: Omit<Veiculo, "id">) => {
    const newId = Math.max(0, ...veiculos.map(v => v.id)) + 1;
    setVeiculos([...veiculos, { ...veiculo, id: newId }]);
  };

  const updateVeiculo = (id: number, updates: Partial<Veiculo>) => {
    setVeiculos(veiculos.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const deleteVeiculo = (id: number) => {
    setVeiculos(veiculos.filter(v => v.id !== id));
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
  // CÁLCULOS BÁSICOS
  // ============================================

  // Total de receitas (opcional: filtrar por mês no formato "YYYY-MM")
  const getTotalReceitas = (mes?: string) => {
    return transacoes
      .filter(t => t.tipo === "receita" && (!mes || t.data.startsWith(mes)))
      .reduce((acc, t) => acc + t.valor, 0);
  };

  // Total de despesas (opcional: filtrar por mês)
  const getTotalDespesas = (mes?: string) => {
    return transacoes
      .filter(t => t.tipo === "despesa" && (!mes || t.data.startsWith(mes)))
      .reduce((acc, t) => acc + t.valor, 0);
  };

  // Total contratado de empréstimos
  const getTotalDividas = () => emprestimos.reduce((acc, e) => acc + e.valorTotal, 0);

  // Custo total dos veículos (valor + seguro)
  const getCustoVeiculos = () => veiculos.reduce((acc, v) => acc + v.valorVeiculo + v.valorSeguro, 0);

  // Valor FIPE total (valor de mercado dos veículos)
  const getValorFipeTotal = () => veiculos.reduce((acc, v) => acc + v.valorFipe, 0);

  // ============================================
  // CÁLCULOS AVANÇADOS PARA RELATÓRIOS
  // ============================================

  // Saldo devedor estimado (assumindo 30% das parcelas pagas)
  const getSaldoDevedor = () => {
    return emprestimos.reduce((acc, e) => {
      const parcelasPagas = Math.floor(e.meses * 0.3);
      const saldo = e.valorTotal - (parcelasPagas * e.parcela);
      return acc + Math.max(0, saldo);
    }, 0);
  };

  // Juros totais estimados
  const getJurosTotais = () => {
    return emprestimos.reduce((acc, e) => {
      const totalPago = e.parcela * e.meses;
      return acc + (totalPago - e.valorTotal);
    }, 0);
  };

  // Despesas fixas (Moradia, Saúde, Transporte são consideradas fixas)
  const getDespesasFixas = () => {
    const categoriasFixas = ["Moradia", "Saúde", "Transporte"];
    return transacoes
      .filter(t => t.tipo === "despesa" && categoriasFixas.includes(t.categoria))
      .reduce((acc, t) => acc + t.valor, 0);
  };

  // Total de ativos: Caixa (saldo) + Valor FIPE dos veículos
  const getAtivosTotal = () => {
    const caixa = getTotalReceitas() - getTotalDespesas();
    const veiculosFipe = getValorFipeTotal();
    return Math.max(0, caixa) + veiculosFipe;
  };

  // Total de passivos: Saldo devedor dos empréstimos
  const getPassivosTotal = () => {
    return getSaldoDevedor();
  };

  // Patrimônio líquido: Ativos - Passivos
  const getPatrimonioLiquido = () => {
    return getAtivosTotal() - getPassivosTotal();
  };

  // Saldo atual simplificado
  const getSaldoAtual = () => {
    return getTotalReceitas() - getTotalDespesas();
  };

  // ============================================
  // EXPORTAÇÃO DE DADOS
  // Serializa todos os dados para JSON e baixa arquivo
  // ============================================
  const exportData = () => {
    const data: FinanceDataExport = {
      version: "1.0",
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
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = "finance-data.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ============================================
  // IMPORTAÇÃO DE DADOS
  // Lê arquivo JSON, valida e atualiza estado
  // ============================================
  const importData = async (file: File): Promise<{ success: boolean; message: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content) as FinanceDataExport;
          
          // Validação básica da estrutura
          if (!data.transacoes || !Array.isArray(data.transacoes)) {
            resolve({ success: false, message: "Arquivo inválido: transações não encontradas" });
            return;
          }
          if (!data.categorias || !Array.isArray(data.categorias)) {
            resolve({ success: false, message: "Arquivo inválido: categorias não encontradas" });
            return;
          }
          if (!data.emprestimos || !Array.isArray(data.emprestimos)) {
            resolve({ success: false, message: "Arquivo inválido: empréstimos não encontrados" });
            return;
          }
          if (!data.veiculos || !Array.isArray(data.veiculos)) {
            resolve({ success: false, message: "Arquivo inválido: veículos não encontrados" });
            return;
          }

          // Validação de tipos dos campos essenciais
          const transacoesValidas = data.transacoes.every(t => 
            typeof t.id === "number" && 
            typeof t.data === "string" && 
            typeof t.valor === "number" &&
            (t.tipo === "receita" || t.tipo === "despesa")
          );
          if (!transacoesValidas) {
            resolve({ success: false, message: "Arquivo inválido: estrutura de transações incorreta" });
            return;
          }

          // Atualiza o estado com os dados importados
          setTransacoes(data.transacoes);
          setCategorias(data.categorias);
          setEmprestimos(data.emprestimos);
          setVeiculos(data.veiculos);
          if (data.investimentosRF) setInvestimentosRF(data.investimentosRF);
          if (data.criptomoedas) setCriptomoedas(data.criptomoedas);
          if (data.stablecoins) setStablecoins(data.stablecoins);
          if (data.objetivos) setObjetivos(data.objetivos);
          if (data.movimentacoesInvestimento) setMovimentacoesInvestimento(data.movimentacoesInvestimento);

          resolve({ 
            success: true, 
            message: `Dados importados com sucesso! ${data.transacoes.length} transações, ${data.emprestimos.length} empréstimos, ${data.veiculos.length} veículos.` 
          });
        } catch (error) {
          resolve({ success: false, message: "Erro ao processar arquivo: JSON inválido ou corrompido" });
        }
      };

      reader.onerror = () => {
        resolve({ success: false, message: "Erro ao ler arquivo" });
      };

      reader.readAsText(file);
    });
  };

  return (
    <FinanceContext.Provider value={{
      transacoes, addTransacao, updateTransacao, deleteTransacao,
      categorias, addCategoria, removeCategoria,
      emprestimos, addEmprestimo, updateEmprestimo, deleteEmprestimo,
      veiculos, addVeiculo, updateVeiculo, deleteVeiculo,
      investimentosRF, addInvestimentoRF, updateInvestimentoRF, deleteInvestimentoRF,
      criptomoedas, addCriptomoeda, updateCriptomoeda, deleteCriptomoeda,
      stablecoins, addStablecoin, updateStablecoin, deleteStablecoin,
      objetivos, addObjetivo, updateObjetivo, deleteObjetivo,
      movimentacoesInvestimento, addMovimentacaoInvestimento, updateMovimentacaoInvestimento, deleteMovimentacaoInvestimento,
      getTotalReceitas, getTotalDespesas, getTotalDividas, getCustoVeiculos, 
      getSaldoAtual, getValorFipeTotal, getSaldoDevedor, getJurosTotais,
      getDespesasFixas, getPatrimonioLiquido, getAtivosTotal, getPassivosTotal,
      exportData, importData,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }
  return context;
}
