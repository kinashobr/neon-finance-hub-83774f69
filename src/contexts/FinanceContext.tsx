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
  generateAccountId,
  BillTracker, // NEW
  generateBillId, // NEW
  BillSourceType, // NEW
  StandardizationRule, // <-- NEW IMPORT
  generateRuleId, // <-- NEW IMPORT
} from "@/types/finance";
import { parseISO, startOfMonth, endOfMonth, subDays, differenceInDays, differenceInMonths, addMonths, isBefore, isAfter, isSameDay, isSameMonth, isSameYear, startOfDay, endOfDay, subMonths, format } from "date-fns"; // Import date-fns helpers
import { parseDateLocal } from "@/lib/utils"; // Importando a nova função

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
            // Usamos parseDateLocal para garantir que as datas salvas sejam lidas corretamente
            const date = parseDateLocal(dateStr.split('T')[0]); 
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

// Helper function to calculate the due date of an installment
const getDueDate = (startDateStr: string, installmentNumber: number): Date => {
  // Uses parseDateLocal to ensure the start date is interpreted locally
  const startDate = parseDateLocal(startDateStr);
  const dueDate = new Date(startDate);
  
  // Adjustment: If installmentNumber = 1, add 0 months.
  dueDate.setMonth(dueDate.getMonth() + installmentNumber - 1);
  
  return dueDate;
};

// ============================================
// INTERFACE DO CONTEXTO (Atualizada)
// ============================================

// NEW TYPE: Detailed Amortization Schedule Item
export interface AmortizationItem {
    parcela: number;
    juros: number;
    amortizacao: number;
    saldoDevedor: number; // Saldo após o pagamento desta parcela
}

interface FinanceContextType {
  // Empréstimos
  emprestimos: Emprestimo[];
  addEmprestimo: (emprestimo: Omit<Emprestimo, "id">) => void;
  updateEmprestimo: (id: number, emprestimo: Partial<Emprestimo>) => void;
  deleteEmprestimo: (id: number) => void;
  getPendingLoans: () => Emprestimo[];
  markLoanParcelPaid: (loanId: number, valorPago: number, dataPagamento: string, parcelaNumero?: number) => void;
  unmarkLoanParcelPaid: (loanId: number) => void;
  
  // NEW: Function to calculate the full amortization schedule
  calculateLoanSchedule: (loanId: number) => AmortizationItem[];
  
  // NEW: Function to get specific installment details
  calculateLoanAmortizationAndInterest: (loanId: number, parcelaNumber: number) => AmortizationItem | null;
  
  calculateLoanPrincipalDueInNextMonths: (targetDate: Date, months: number) => number; 
  
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
  unmarkSeguroParcelPaid: (seguroId: number, parcelaNumero: number) => void;
  
  // Objetivos Financeiros
  objetivos: ObjetivoFinanceiro[];
  addObjetivo: (obj: Omit<ObjetivoFinanceiro, "id">) => void;
  updateObjetivo: (id: number, obj: Partial<ObjetivoFinanceiro>) => void;
  deleteObjetivo: (id: number) => void;

  // NEW: Bill Tracker
  billsTracker: BillTracker[];
  addBill: (bill: Omit<BillTracker, "id" | "isPaid">) => void;
  updateBill: (id: string, updates: Partial<BillTracker>) => void;
  deleteBill: (id: string) => void;
  getBillsForPeriod: (date: Date) => BillTracker[];
  
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
  
  // Standardization Rules (NEW)
  standardizationRules: StandardizationRule[];
  addStandardizationRule: (rule: Omit<StandardizationRule, "id">) => void;
  deleteStandardizationRule: (id: string) => void;
  
  // Data Filtering (NEW)
  dateRanges: ComparisonDateRanges;
  setDateRanges: Dispatch<SetStateAction<ComparisonDateRanges>>;
  
  // Alert Filtering (NEW)
  alertStartDate: string; // YYYY-MM-DD string
  setAlertStartDate: Dispatch<SetStateAction<string>>;
  
  // NEW: Revenue Forecast
  monthlyRevenueForecast: number;
  setMonthlyRevenueForecast: Dispatch<SetStateAction<number>>;
  getRevenueForPreviousMonth: (date: Date) => number;
  
  // Cálculos principais
  getTotalReceitas: (mes?: string) => number;
  getTotalDespesas: (mes?: string) => number;
  getTotalDividas: () => number;
  getCustoVeiculos: () => number;
  getSaldoAtual: () => number;
  
  // Cálculos avançados para relatórios (AGORA PERIOD-AWARE)
  getValorFipeTotal: (targetDate?: Date) => number;
  getSaldoDevedor: (targetDate?: Date) => number;
  getLoanPrincipalRemaining: (targetDate?: Date) => number; // NEW
  getCreditCardDebt: (targetDate?: Date) => number; // NEW
  getJurosTotais: () => number;
  getDespesasFixas: () => number;
  getPatrimonioLiquido: (targetDate?: Date) => number;
  getAtivosTotal: (targetDate?: Date) => number;
  getPassivosTotal: (targetDate?: Date) => number;
  
  // Seguros Accrual (NEW)
  getSegurosAApropriar: (targetDate?: Date) => number;
  getSegurosAPagar: (targetDate?: Date) => number;
  
  // Nova função de cálculo de saldo por data
  calculateBalanceUpToDate: (accountId: string, date: Date | undefined, allTransactions: TransacaoCompleta[], accounts: ContaCorrente[]) => number;
  calculateTotalInvestmentBalanceAtDate: (date: Date | undefined) => number;
  calculatePaidInstallmentsUpToDate: (loanId: number, targetDate: Date) => number; 

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
  deleteInvestimentoRF: (id: number, inv: any) => void;
  addCriptomoeda: (cripto: any) => void;
  updateCriptomoeda: (id: number, cripto: any) => void;
  deleteCriptomoeda: (id: number, cripto: any) => void;
  addStablecoin: (stable: any) => void;
  updateStablecoin: (id: number, stable: any) => void;
  deleteStablecoin: (id: number, stable: any) => void;
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
  BILLS_TRACKER: "neon_finance_bills_tracker", // NEW KEY
  
  // Core V2
  CONTAS_MOVIMENTO: "fin_accounts_v1",
  CATEGORIAS_V2: "fin_categories_v1",
  TRANSACOES_V2: "fin_transactions_v1",
  
  // Standardization Rules (NEW KEY)
  STANDARDIZATION_RULES: "fin_standardization_rules_v1",
  
  // Data Filtering (NEW)
  DATE_RANGES: "fin_date_ranges_v1",
  
  // Alert Filtering (NEW)
  ALERT_START_DATE: "fin_alert_start_date_v1",
  
  // NEW: Revenue Forecast
  MONTHLY_REVENUE_FORECAST: "fin_monthly_revenue_forecast_v1",
};

// ============================================
// DADOS INICIAIS (Vazios)
// ============================================

const initialEmprestimos: Emprestimo[] = [];
const initialVeiculos: Veiculo[] = [];
const initialSegurosVeiculo: SeguroVeiculo[] = [];
const initialObjetivos: ObjetivoFinanceiro[] = [];
const initialBillsTracker: BillTracker[] = []; // NEW INITIAL STATE
const initialStandardizationRules: StandardizationRule[] = []; // NEW INITIAL STATE

// Default alert start date is 6 months ago
const defaultAlertStartDate = subMonths(new Date(), 6).toISOString().split('T')[0];

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
      
      // Retorna o valor parseado, que pode ser um array vazio se o usuário limpou
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
            // Salvamos apenas a string YYYY-MM-DD para evitar problemas de fuso horário na leitura
            range1: {
                from: ranges.range1.from?.toISOString().split('T')[0],
                to: ranges.range1.to?.toISOString().split('T')[0],
            },
            range2: {
                from: ranges.range2.from?.toISOString().split('T')[0],
                to: ranges.range2.to?.toISOString().split('T')[0],
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
  
  // NEW: Bill Tracker State
  const [billsTracker, setBillsTracker] = useState<BillTracker[]>(() => 
    loadFromStorage(STORAGE_KEYS.BILLS_TRACKER, initialBillsTracker)
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
  
  // Standardization Rules State (NEW)
  const [standardizationRules, setStandardizationRules] = useState<StandardizationRule[]>(() => 
    loadFromStorage(STORAGE_KEYS.STANDARDIZATION_RULES, initialStandardizationRules)
  );
  
  // Data Filtering State (NEW)
  const [dateRanges, setDateRanges] = useState<ComparisonDateRanges>(() => 
    loadFromStorage(STORAGE_KEYS.DATE_RANGES, DEFAULT_RANGES)
  );
  
  // Alert Filtering State (NEW)
  const [alertStartDate, setAlertStartDate] = useState<string>(() => 
    loadFromStorage(STORAGE_KEYS.ALERT_START_DATE, defaultAlertStartDate)
  );
  
  // NEW: Revenue Forecast State
  const [monthlyRevenueForecast, setMonthlyRevenueForecast] = useState<number>(() => 
    loadFromStorage(STORAGE_KEYS.MONTHLY_REVENUE_FORECAST, 0)
  );

  // ============================================
  // EFEITOS PARA PERSISTÊNCIA AUTOMÁTICA
  // ============================================

  useEffect(() => { saveToStorage(STORAGE_KEYS.EMPRESTIMOS, emprestimos); }, [emprestimos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.VEICULOS, veiculos); }, [veiculos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.SEGUROS_VEICULO, segurosVeiculo); }, [segurosVeiculo]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.OBJETIVOS, objetivos); }, [objetivos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.BILLS_TRACKER, billsTracker); }, [billsTracker]); // NEW EFFECT
  
  // NEW EFFECT for Standardization Rules
  useEffect(() => { saveToStorage(STORAGE_KEYS.STANDARDIZATION_RULES, standardizationRules); }, [standardizationRules]);
  
  // NEW EFFECT for dateRanges
  useEffect(() => { saveToStorage(STORAGE_KEYS.DATE_RANGES, dateRanges); }, [dateRanges]);
  
  // NEW EFFECT for alertStartDate
  useEffect(() => { saveToStorage(STORAGE_KEYS.ALERT_START_DATE, alertStartDate); }, [alertStartDate]);
  
  // NEW EFFECT for monthlyRevenueForecast
  useEffect(() => { saveToStorage(STORAGE_KEYS.MONTHLY_REVENUE_FORECAST, monthlyRevenueForecast); }, [monthlyRevenueForecast]);
  
  // Core V2 persistence
  useEffect(() => { saveToStorage(STORAGE_KEYS.CONTAS_MOVIMENTO, contasMovimento); }, [contasMovimento]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CATEGORIAS_V2, categoriasV2); }, [categoriasV2]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.TRANSACOES_V2, transacoesV2); }, [transacoesV2]);


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
        .filter(t => t.accountId === accountId && parseDateLocal(t.date) <= targetDate)
        .sort((a, b) => parseDateLocal(a.date).getTime() - parseDateLocal(b.date).getTime());

    transactionsBeforeDate.forEach(t => {
        const isCreditCard = account.accountType === 'cartao_credito';
        
        // 1. Tratar transações operacionais e de transferência
        if (isCreditCard) {
          // Cartão de Crédito: Despesa (out) subtrai, Transferência (in) soma (Pagamento de Fatura)
          if (t.flow === 'out') { // Despesa (out)
            balance -= t.amount;
          } else if (t.flow === 'in') { // Transferência (in) - Pagamento de Fatura
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

  const calculateTotalInvestmentBalanceAtDate = useCallback((date: Date | undefined): number => {
    const targetDate = date || new Date(9999, 11, 31);
    
    const investmentAccountIds = contasMovimento
      .filter(c => 
        c.accountType === 'aplicacao_renda_fixa' || 
        c.accountType === 'poupanca' ||
        c.accountType === 'criptoativos' ||
        c.accountType === 'reserva_emergencia' ||
        c.accountType === 'objetivos_financeiros'
      )
      .map(c => c.id);

    return investmentAccountIds.reduce((acc, accountId) => {
        const balance = calculateBalanceUpToDate(accountId, targetDate, transacoesV2, contasMovimento);
        return acc + Math.max(0, balance);
    }, 0);
  }, [contasMovimento, transacoesV2, calculateBalanceUpToDate]);
  
  const calculatePaidInstallmentsUpToDate = useCallback((loanId: number, targetDate: Date): number => {
    const loan = emprestimos.find(e => e.id === loanId);
    if (!loan || !loan.dataInicio) return 0;

    // 1. Find all payment transactions linked to this loan
    const loanPayments = transacoesV2.filter(t => 
      t.operationType === 'pagamento_emprestimo' && 
      t.links?.loanId === `loan_${loanId}`
    );

    // 2. Filter payments that occurred on or before the targetDate
    const paymentsUpToDate = loanPayments.filter(t => 
      parseDateLocal(t.date) <= targetDate
    );
    
    // 3. If payments are tracked by parcelaId, count unique parcelaIds paid up to date.
    const paidParcelas = new Set<string>();
    paymentsUpToDate.forEach(p => {
        if (p.links?.parcelaId) {
            paidParcelas.add(p.links.parcelaId);
        }
    });
    
    if (paidParcelas.size > 0) {
        return paidParcelas.size;
    }

    // 4. Fallback: If no specific parcelaId is tracked, count the number of payments.
    return paymentsUpToDate.length;

  }, [emprestimos, transacoesV2]);
  
  // ============================================
  // NOVO: CÁLCULO DE CRONOGRAMA DE AMORTIZAÇÃO (MÉTODO PRICE)
  // ============================================
  
  const calculateLoanSchedule = useCallback((loanId: number): AmortizationItem[] => {
    const loan = emprestimos.find(e => e.id === loanId);
    if (!loan || loan.meses === 0 || loan.taxaMensal === 0) return [];

    const taxa = loan.taxaMensal / 100;
    const parcelaFixa = loan.parcela;
    
    // Helper para arredondar para 2 casas decimais
    const round = (num: number) => Math.round(num * 100) / 100;
    
    let saldoDevedor = loan.valorTotal;
    const schedule: AmortizationItem[] = [];

    for (let i = 1; i <= loan.meses; i++) {
      if (saldoDevedor <= 0) {
        // Se o saldo já foi quitado, preenche o restante com zeros
        schedule.push({
          parcela: i,
          juros: 0,
          amortizacao: 0,
          saldoDevedor: 0,
        });
        continue;
      }
      
      const juros = saldoDevedor * taxa;
      let amortizacao = parcelaFixa - juros;
      
      // Ajuste para a última parcela (garantir que o saldo feche em zero)
      if (i === loan.meses) {
          amortizacao = saldoDevedor;
      }
      
      const novoSaldoDevedor = round(Math.max(0, saldoDevedor - amortizacao));
      
      schedule.push({
        parcela: i,
        juros: round(Math.max(0, juros)),
        amortizacao: round(Math.max(0, amortizacao)),
        saldoDevedor: novoSaldoDevedor,
      });
      
      saldoDevedor = novoSaldoDevedor;
    }
    
    return schedule;
  }, [emprestimos]);
  
  const calculateLoanAmortizationAndInterest = useCallback((loanId: number, parcelaNumber: number): AmortizationItem | null => {
      const schedule = calculateLoanSchedule(loanId);
      return schedule.find(item => item.parcela === parcelaNumber) || null;
  }, [calculateLoanSchedule]);
  
  // NEW FUNCTION: Calculates the total principal amortization due in the next N months from targetDate
  const calculateLoanPrincipalDueInNextMonths = useCallback((targetDate: Date, months: number): number => {
    const lookaheadDate = addMonths(targetDate, months);
    
    return emprestimos.reduce((acc, e) => {
        if (!e.dataInicio || e.meses === 0 || e.status === 'quitado') return acc;

        let principalDue = 0;
        
        // 1. Determine the number of installments already paid up to targetDate
        const paidUpToDate = calculatePaidInstallmentsUpToDate(e.id, targetDate);
        
        // 2. Get the full schedule
        const schedule = calculateLoanSchedule(e.id);
        
        schedule.forEach(item => {
            const dueDate = getDueDate(e.dataInicio!, item.parcela);
            
            // If the installment is already paid (or considered paid by the system logic up to targetDate), skip it.
            if (item.parcela <= paidUpToDate) {
                return;
            }
            
            // If the installment is due within the next 'months' (i.e., dueDate is before or on lookaheadDate)
            if (isBefore(dueDate, lookaheadDate) || isSameDay(dueDate, lookaheadDate)) {
                // The principal due is the amortization component of this installment
                principalDue += item.amortizacao;
            }
        });
        
        return acc + principalDue;
    }, 0);
  }, [emprestimos, calculatePaidInstallmentsUpToDate, calculateLoanSchedule]);

  // ============================================
  // FUNÇÕES DE CÁLCULO DE SEGUROS (ACCRUAL) - REFINADAS
  // ============================================

  const getSegurosAApropriar = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date();
    
    return segurosVeiculo.reduce((acc, seguro) => {
        try {
            const vigenciaInicio = parseDateLocal(seguro.vigenciaInicio);
            const vigenciaFim = parseDateLocal(seguro.vigenciaFim);
            
            // Se a vigência ainda não começou, ou já terminou, não há ativo a apropriar
            if (isAfter(vigenciaInicio, date) || isBefore(vigenciaFim, date)) return acc;
            
            // 1. Calcular o total de dias de vigência
            const totalDays = differenceInDays(vigenciaFim, vigenciaInicio) + 1;
            if (totalDays <= 0) return acc;
            
            const dailyAccrual = seguro.valorTotal / totalDays;
            
            // 2. Calcular os dias consumidos (do início da vigência até a data de referência)
            // O consumo começa no dia da vigência e termina no dia da data de referência (inclusive)
            const daysConsumed = differenceInDays(date, vigenciaInicio) + 1;
            
            // 3. Ativo Remanescente = Valor Total - (Dias Consumidos * Custo Diário)
            const accruedExpense = Math.min(seguro.valorTotal, dailyAccrual * daysConsumed);
            
            const segurosAApropriar = Math.max(0, seguro.valorTotal - accruedExpense);
            
            // Arredondar para 2 casas decimais
            return acc + Math.round(segurosAApropriar * 100) / 100;
        } catch (e) {
            console.error("Error calculating Seguros a Apropriar:", e);
            return acc;
        }
    }, 0);
  }, [segurosVeiculo]);

  const getSegurosAPagar = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date();
    
    return segurosVeiculo.reduce((acc, seguro) => {
        // 1. Calcular o total pago (em dinheiro/cartão) até a data de referência
        let totalPaid = 0;
        
        seguro.parcelas.forEach(parcela => {
            if (parcela.paga && parcela.transactionId) {
                const paymentTx = transacoesV2.find(t => t.id === parcela.transactionId);
                
                // Se a transação de pagamento existe e ocorreu na data ou antes da data de referência
                if (paymentTx && parseDateLocal(paymentTx.date) <= date) {
                    // Usamos o valor pago na transação (que pode incluir juros/descontos)
                    totalPaid += paymentTx.amount; 
                }
            }
        });
        
        // 2. Seguros a Pagar = Valor Total do Prêmio - Total Pago (em dinheiro/cartão)
        // Nota: O Passivo a Pagar é o quanto falta pagar do prêmio total.
        const segurosAPagar = Math.max(0, seguro.valorTotal - totalPaid);
        
        // Arredondar para 2 casas decimais
        return acc + Math.round(segurosAPagar * 100) / 100;
    }, 0);
  }, [segurosVeiculo, transacoesV2]);

  // ============================================
  // OPERAÇÕES DE BILL TRACKER (NEW)
  // ============================================
  
  const addBill = useCallback((bill: Omit<BillTracker, "id" | "isPaid">) => {
    const newBill: BillTracker = {
        ...bill,
        id: generateBillId(),
        isPaid: false,
    };
    setBillsTracker(prev => [...prev, newBill]);
  }, []);

  const updateBill = useCallback((id: string, updates: Partial<BillTracker>) => {
    setBillsTracker(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const deleteBill = useCallback((id: string) => {
    setBillsTracker(prev => prev.filter(b => b.id !== id));
  }, []);
  
  const getRevenueForPreviousMonth = useCallback((date: Date): number => {
    const prevMonth = subMonths(date, 1);
    const prevMonthYear = format(prevMonth, 'yyyy-MM');
    
    return transacoesV2.filter(t => 
        (t.operationType === 'receita' || t.operationType === 'rendimento') && 
        t.date.startsWith(prevMonthYear)
    ).reduce((acc, t) => acc + t.amount, 0);
}, [transacoesV2]);

  const getBillsForPeriod = useCallback((date: Date): BillTracker[] => {
    const monthYear = format(date, 'yyyy-MM');
    const prevMonth = subMonths(date, 1);
    const prevMonthYear = format(prevMonth, 'yyyy-MM');
    
    const existingBillsMap = new Map<string, BillTracker>();
    
    // 1. Carregar Bills Ad-Hoc e Bills já persistidas (para manter o status isPaid/isExcluded)
    billsTracker.forEach(bill => {
        const billDate = parseDateLocal(bill.dueDate);
        
        // Bills Ad-Hoc are kept if they fall in the current month or are pending/excluded
        if (bill.sourceType === 'ad_hoc' && (isSameMonth(billDate, date) || !bill.isPaid)) {
            existingBillsMap.set(bill.id, bill);
        }
        
        // Bills de recorrência que caem no mês (mantidas para status)
        if (isSameMonth(billDate, date)) {
            existingBillsMap.set(bill.id, bill);
        }
    });
    
    // Helper to get the value of a category from the previous month
    const getPreviousMonthExpense = (categoryId: string): number => {
        const tx = transacoesV2.filter(t => 
            (t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo') && 
            t.categoryId === categoryId && 
            t.date.startsWith(prevMonthYear)
        );
        return tx.reduce((acc, t) => acc + t.amount, 0);
    };
    
    // 2. Gerar Bills de Empréstimos (loan_installment)
    emprestimos.forEach(loan => {
        if (loan.status !== 'ativo' || !loan.dataInicio || loan.meses === 0) return;
        
        for (let i = 1; i <= loan.meses; i++) {
            const dueDate = getDueDate(loan.dataInicio, i);
            
            if (isSameMonth(dueDate, date)) {
                const billId = `loan_${loan.id}_${i}`;
                const dueDateStr = format(dueDate, 'yyyy-MM-dd');
                
                const isPaidByTx = transacoesV2.some(t => 
                    t.operationType === 'pagamento_emprestimo' && 
                    t.links?.loanId === `loan_${loan.id}` && 
                    t.links?.parcelaId === i.toString()
                );
                
                const existing = existingBillsMap.get(billId);
                
                if (isPaidByTx) {
                    if (existing) {
                        existingBillsMap.set(billId, { ...existing, isPaid: true });
                    }
                    return; 
                }
                
                if (!existing) {
                    const newBill: BillTracker = {
                        id: billId,
                        description: `Parcela ${i}/${loan.meses} - ${loan.contrato}`,
                        dueDate: dueDateStr,
                        expectedAmount: loan.parcela,
                        isPaid: false,
                        sourceType: 'loan_installment',
                        sourceRef: loan.id.toString(),
                        parcelaNumber: i,
                        suggestedAccountId: loan.contaCorrenteId,
                        suggestedCategoryId: categoriasV2.find(c => c.label === 'Pag. Empréstimo')?.id,
                    };
                    existingBillsMap.set(billId, newBill);
                }
                
                break;
            }
        }
    });
    
    // 3. Gerar Bills de Seguros (insurance_installment)
    segurosVeiculo.forEach(seguro => {
        seguro.parcelas.forEach(parcela => {
            const dueDate = parseDateLocal(parcela.vencimento);
            
            if (isSameMonth(dueDate, date)) {
                const billId = `seguro_${seguro.id}_${parcela.numero}`;
                const dueDateStr = format(dueDate, 'yyyy-MM-dd');
                
                const isPaidByTx = parcela.paga;
                const existing = existingBillsMap.get(billId);
                
                if (isPaidByTx) {
                    if (existing) {
                        existingBillsMap.set(billId, { ...existing, isPaid: true });
                    }
                    return;
                }
                
                if (!existing) {
                    const newBill: BillTracker = {
                        id: billId,
                        description: `Seguro ${seguro.numeroApolice} - Parcela ${parcela.numero}/${seguro.numeroParcelas}`,
                        dueDate: dueDateStr,
                        expectedAmount: parcela.valor,
                        isPaid: false,
                        sourceType: 'insurance_installment',
                        sourceRef: seguro.id.toString(),
                        parcelaNumber: parcela.numero,
                        suggestedAccountId: contasMovimento.find(c => c.accountType === 'conta_corrente')?.id,
                        suggestedCategoryId: categoriasV2.find(c => c.label.toLowerCase() === 'seguro')?.id,
                    };
                    existingBillsMap.set(billId, newBill);
                }
            }
        });
    });
    
    // 4. Gerar Bills de Despesas Fixas (fixed_expense)
    const fixedExpenseCategories = categoriasV2.filter(c => c.nature === 'despesa_fixa' && c.label.toLowerCase() !== 'seguro');
    
    fixedExpenseCategories.forEach(cat => {
        const dueDate = new Date(date.getFullYear(), date.getMonth(), 10); // Assume dia 10
        const dueDateStr = format(dueDate, 'yyyy-MM-dd');
        const billId = `fixed_${cat.id}_${monthYear}`;
        
        const isPaidByTx = transacoesV2.some(t => 
            t.operationType === 'despesa' && 
            t.categoryId === cat.id && 
            t.date.startsWith(monthYear)
        );
        
        const existing = existingBillsMap.get(billId);
        
        if (isPaidByTx) {
            if (existing) {
                existingBillsMap.set(billId, { ...existing, isPaid: true });
            }
            return;
        }
        
        if (!existing) {
            const estimatedAmount = getPreviousMonthExpense(cat.id);
            
            const newBill: BillTracker = {
                id: billId,
                description: cat.label,
                dueDate: dueDateStr,
                expectedAmount: estimatedAmount || 0,
                isPaid: false,
                sourceType: 'fixed_expense',
                sourceRef: cat.id,
                suggestedAccountId: contasMovimento.find(c => c.accountType === 'conta_corrente')?.id,
                suggestedCategoryId: cat.id,
            };
            existingBillsMap.set(billId, newBill);
        } else {
            existingBillsMap.set(billId, { ...existing, isPaid: isPaidByTx });
        }
    });
    
    // 5. Gerar Bills de Despesas Variáveis (variable_expense)
    const variableExpenseCategories = categoriasV2.filter(c => c.nature === 'despesa_variavel');
    
    variableExpenseCategories.forEach(cat => {
        const dueDate = new Date(date.getFullYear(), date.getMonth(), 25); // Assume dia 25
        const dueDateStr = format(dueDate, 'yyyy-MM-dd');
        const billId = `variable_${cat.id}_${monthYear}`;
        
        const isPaidByTx = transacoesV2.some(t => 
            t.operationType === 'despesa' && 
            t.categoryId === cat.id && 
            t.date.startsWith(monthYear)
        );
        
        const existing = existingBillsMap.get(billId);
        
        if (isPaidByTx) {
            if (existing) {
                existingBillsMap.set(billId, { ...existing, isPaid: true });
            }
            return;
        }
        
        if (!existing) {
            const estimatedAmount = getPreviousMonthExpense(cat.id);
            
            const newBill: BillTracker = {
                id: billId,
                description: cat.label,
                dueDate: dueDateStr,
                expectedAmount: estimatedAmount || 0,
                isPaid: false,
                sourceType: 'variable_expense', // Changed to variable_expense
                sourceRef: cat.id,
                suggestedAccountId: contasMovimento.find(c => c.accountType === 'conta_corrente')?.id,
                suggestedCategoryId: cat.id,
            };
            existingBillsMap.set(billId, newBill);
        } else {
            existingBillsMap.set(billId, { ...existing, isPaid: isPaidByTx });
        }
    });
    
    // 6. Retorna a lista consolidada, filtrando excluídos e ordenando
    return Array.from(existingBillsMap.values())
        .filter(b => !b.isExcluded || isSameMonth(parseDateLocal(b.dueDate), date)) // Only filter out excluded if they are NOT from the current month
        .sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
}, [billsTracker, emprestimos, segurosVeiculo, categoriasV2, transacoesV2, contasMovimento, calculateLoanSchedule]);


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
      
      const isQuitado = (e.parcelasPagas || 0) + 1 >= e.meses;
      
      return {
        ...e,
        status: isQuitado ? 'quitado' : 'ativo',
      };
    }));
  }, []);
  
  const unmarkLoanParcelPaid = useCallback((loanId: number) => {
    setEmprestimos(prev => prev.map(e => {
      if (e.id !== loanId) return e;
      
      return {
        ...e,
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
  
  const unmarkSeguroParcelPaid = useCallback((seguroId: number, parcelaNumero: number) => {
    setSegurosVeiculo(prevSeguros => prevSeguros.map(seguro => {
      if (seguro.id !== seguroId) return seguro;
      
      const updatedParcelas = seguro.parcelas.map(parcela => {
        if (parcela.numero === parcelaNumero) {
          // Remove transactionId and mark as not paid
          return { ...parcela, paga: false, transactionId: undefined };
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
  // OPERAÇÕES DE REGRAS DE PADRONIZAÇÃO (NEW)
  // ============================================
  
  const addStandardizationRule = useCallback((rule: Omit<StandardizationRule, "id">) => {
    const newRule: StandardizationRule = {
        ...rule,
        id: generateRuleId(),
    };
    setStandardizationRules(prev => [...prev, newRule]);
  }, []);

  const deleteStandardizationRule = useCallback((id: string) => {
    setStandardizationRules(prev => prev.filter(r => r.id !== id));
  }, []);

  // ============================================
  // FUNÇÕES DE CONTAS MOVIMENTO
  // ============================================

  const getContasCorrentesTipo = useCallback(() => {
    return contasMovimento.filter(c => c.accountType === 'conta_corrente');
  }, [contasMovimento]);
  
  // Removida getInitialBalanceContraAccount

  // ============================================
  // CÁLCULOS - Baseados em TransacoesV2 (AGORA PERIOD-AWARE)
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

  const getValorFipeTotal = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date(9999, 11, 31);
    return veiculos
        .filter(v => v.status !== 'vendido' && parseDateLocal(v.dataCompra) <= date)
        .reduce((acc, v) => acc + v.valorFipe, 0);
  }, [veiculos]);

  // NEW: Calculates the remaining principal on all active loans
  const getLoanPrincipalRemaining = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date(9999, 11, 31);

    return emprestimos.reduce((acc, e) => {
      if (e.status === 'quitado' || e.status === 'pendente_config') return acc;
      
      const paidUpToDate = calculatePaidInstallmentsUpToDate(e.id, date);
      let currentSaldo = e.valorTotal;
      
      if (paidUpToDate > 0) {
          const schedule = calculateLoanSchedule(e.id);
          const lastPaidItem = schedule.find(item => item.parcela === paidUpToDate);
          if (lastPaidItem) {
              currentSaldo = lastPaidItem.saldoDevedor;
          }
      }
      
      return acc + Math.max(0, currentSaldo);
    }, 0);
  }, [emprestimos, calculatePaidInstallmentsUpToDate, calculateLoanSchedule]);

  // NEW: Calculates the total negative balance on all credit card accounts
  const getCreditCardDebt = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date(9999, 11, 31);

    return contasMovimento
      .filter(c => c.accountType === 'cartao_credito')
      .reduce((acc, c) => {
        const balance = calculateBalanceUpToDate(c.id, date, transacoesV2, contasMovimento);
        return acc + Math.abs(Math.min(0, balance)); // Only negative balance is liability
      }, 0);
  }, [contasMovimento, transacoesV2, calculateBalanceUpToDate]);

  // UPDATED: getSaldoDevedor now uses the new helpers
  const getSaldoDevedor = useCallback((targetDate?: Date) => {
    const saldoEmprestimos = getLoanPrincipalRemaining(targetDate);
    const saldoCartoes = getCreditCardDebt(targetDate);
    return saldoEmprestimos + saldoCartoes;
  }, [getLoanPrincipalRemaining, getCreditCardDebt]);

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

  const getAtivosTotal = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date(9999, 11, 31);

    // 1. Saldo de contas (exceto CC)
    const saldoContasAtivas = contasMovimento
      .filter(c => c.accountType !== 'cartao_credito')
      .reduce((acc, c) => {
        const balance = calculateBalanceUpToDate(c.id, date, transacoesV2, contasMovimento);
        return acc + Math.max(0, balance); // Apenas saldos positivos são ativos
      }, 0);
      
    // 2. Valor FIPE de veículos ativos na data
    const valorVeiculos = getValorFipeTotal(date);
    
    // 3. Seguros a Apropriar (Prepaid Insurance Asset)
    const segurosAApropriar = getSegurosAApropriar(date); 
                          
    return saldoContasAtivas + valorVeiculos + segurosAApropriar; 
  }, [contasMovimento, transacoesV2, getValorFipeTotal, calculateBalanceUpToDate, getSegurosAApropriar]); 

  const getPassivosTotal = useCallback((targetDate?: Date) => {
    const saldoDevedor = getSaldoDevedor(targetDate);
    
    // 2. Seguros a Pagar (Insurance Payable Liability)
    const segurosAPagar = getSegurosAPagar(targetDate); 
    
    return saldoDevedor + segurosAPagar; 
  }, [getSaldoDevedor, getSegurosAPagar]); 

  const getPatrimonioLiquido = useCallback((targetDate?: Date) => {
    return getAtivosTotal(targetDate) - getPassivosTotal(targetDate);
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
    (data.data as any).billsTracker = billsTracker; // NEW EXPORT
    (data.data as any).standardizationRules = standardizationRules; // NEW EXPORT

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
        if (data.data.accounts) {
            setContasMovimento(data.data.accounts);
        }
        if (data.data.categories) setCategoriasV2(data.data.categories);
        if (data.data.transactions) setTransacoesV2(data.data.transactions);
        
        // Importa entidades V2 mantidas
        if (data.data.emprestimos) setEmprestimos(data.data.emprestimos);
        if (data.data.veiculos) setVeiculos(data.data.veiculos);
        if (data.data.segurosVeiculo) setSegurosVeiculo(data.data.segurosVeiculo);
        if (data.data.objetivos) setObjetivos(data.data.objetivos);
        if (data.data.billsTracker) setBillsTracker(data.data.billsTracker); // NEW IMPORT
        if (data.data.standardizationRules) setStandardizationRules(data.data.standardizationRules); // NEW IMPORT
        
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
    calculateLoanSchedule, 
    calculateLoanAmortizationAndInterest, 
    calculateLoanPrincipalDueInNextMonths, 
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
    unmarkSeguroParcelPaid,
    objetivos,
    addObjetivo,
    updateObjetivo,
    deleteObjetivo,
    
    // Bill Tracker (NEW)
    billsTracker,
    addBill,
    updateBill,
    deleteBill,
    getBillsForPeriod,
    
    contasMovimento,
    setContasMovimento,
    getContasCorrentesTipo,
    categoriasV2,
    setCategoriasV2,
    transacoesV2,
    setTransacoesV2,
    addTransacaoV2,
    
    // Standardization Rules (NEW)
    standardizationRules,
    addStandardizationRule,
    deleteStandardizationRule,
    
    // Data Filtering (NEW)
    dateRanges,
    setDateRanges,
    
    // Alert Filtering (NEW)
    alertStartDate,
    setAlertStartDate,
    
    // Revenue Forecast (NEW)
    monthlyRevenueForecast,
    setMonthlyRevenueForecast,
    getRevenueForPreviousMonth,
    
    getTotalReceitas,
    getTotalDespesas,
    getTotalDividas,
    getCustoVeiculos,
    getSaldoAtual,
    getValorFipeTotal,
    getSaldoDevedor,
    getLoanPrincipalRemaining, 
    getCreditCardDebt, 
    getJurosTotais,
    getDespesasFixas,
    getPatrimonioLiquido,
    getAtivosTotal,
    getPassivosTotal,
    getSegurosAApropriar, 
    getSegurosAPagar, 
    calculateBalanceUpToDate, 
    calculateTotalInvestmentBalanceAtDate,
    calculatePaidInstallmentsUpToDate, 
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