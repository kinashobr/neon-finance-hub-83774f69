import { createContext, useContext, useState, useEffect, useCallback, Dispatch, SetStateAction, ReactNode, useMemo } from "react";
import {
  Categoria, TransacaoCompleta,
  DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES,
  ContaCorrente,
  FinanceExportV2,
  Emprestimo,
  Veiculo,
  SeguroVeiculo,
  ObjetivoFinanceiro,
  AccountType,
  DateRange,
  ComparisonDateRanges,
  generateAccountId,
  generateTransactionId,
  BillTracker,
  generateBillId,
  StandardizationRule,
  generateRuleId,
  ImportedStatement,
  ImportedTransaction,
  generateStatementId,
  OperationType,
  getFlowTypeFromOperation,
  BillSourceType,
  TransactionLinks,
  PotentialFixedBill,
  ExternalPaidBill,
  BillDisplayItem,
} from "@/types/finance";
import { parseISO, startOfMonth, endOfMonth, subDays, differenceInDays, differenceInMonths, addMonths, isBefore, isAfter, isSameDay, isSameMonth, isSameYear, startOfDay, endOfDay, subMonths, format, isWithinInterval } from "date-fns";
import { parseDateLocal } from "@/lib/utils";

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

export const getDueDate = (startDateStr: string, installmentNumber: number): Date => {
  const startDate = parseDateLocal(startDateStr);
  const dueDate = new Date(startDate);
  dueDate.setMonth(dueDate.getMonth() + installmentNumber - 1);
  return dueDate;
};

const normalizeAmount = (amountStr: string): number => {
    let cleaned = amountStr.trim();
    const isNegative = cleaned.startsWith('-');
    if (isNegative) cleaned = cleaned.substring(1);
    cleaned = cleaned.replace(/[^\d.,]/g, '');
    if (cleaned.includes(',') && cleaned.includes('.')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
        cleaned = cleaned.replace(',', '.');
    } else if (cleaned.includes('.')) {
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            const lastPart = parts.pop();
            cleaned = parts.join('') + '.' + lastPart;
        }
    }
    const parsed = parseFloat(cleaned);
    return isNegative ? -parsed : parsed;
};

const normalizeOfxDate = (dateStr: string): string => {
    if (dateStr.length >= 8) {
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
};

const parseCSV = (content: string, accountId: string): ImportedTransaction[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];
    const separator = lines[0].includes('\t') ? '\t' : ',';
    const header = lines[0].toLowerCase();
    const cols = header.split(separator);
    const normalizeHeader = (h: string) => h.normalize("NFD").replace(/[\u0300-\u036f]/g, '').trim();
    const dataIndex = cols.findIndex(h => normalizeHeader(h).includes('data'));
    const valorIndex = cols.findIndex(h => normalizeHeader(h).includes('valor'));
    const descIndex = cols.findIndex(h => normalizeHeader(h).includes('descri'));
    if (dataIndex === -1 || valorIndex === -1 || descIndex === -1) {
        throw new Error(`CSV inválido.`);
    }
    const transactions: ImportedTransaction[] = [];
    for (let i = 1; i < lines.length; i++) {
        const lineCols = lines[i].split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
        if (lineCols.length > Math.max(dataIndex, valorIndex, descIndex)) {
            const dateStr = lineCols[dataIndex];
            const amountStr = lineCols[valorIndex];
            const originalDescription = lineCols[descIndex];
            if (!dateStr || !amountStr || !originalDescription) continue;
            const amount = normalizeAmount(amountStr);
            let normalizedDate = dateStr;
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
            } else {
                normalizedDate = normalizeOfxDate(dateStr);
            }
            if (normalizedDate.length < 10 || isNaN(parseDateLocal(normalizedDate).getTime())) continue;
            transactions.push({
                id: generateTransactionId(),
                date: normalizedDate,
                amount: Math.abs(amount),
                originalDescription,
                accountId,
                categoryId: null,
                operationType: amount < 0 ? 'despesa' : 'receita',
                description: originalDescription,
                isTransfer: false,
                destinationAccountId: null,
                tempInvestmentId: null,
                tempLoanId: null,
                tempParcelaId: null,
                tempVehicleOperation: null,
                sourceType: 'csv',
                isContabilized: false,
                isPotentialDuplicate: false,
            });
        }
    }
    return transactions;
};

const parseOFX = (content: string, accountId: string): ImportedTransaction[] => {
    const transactions: ImportedTransaction[] = [];
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
    let match;
    while ((match = stmtTrnRegex.exec(content)) !== null) {
        const stmtTrnBlock = match[1];
        const dtPostedMatch = stmtTrnBlock.match(/<DTPOSTED>(\d+)/);
        const trnAmtMatch = stmtTrnBlock.match(/<TRNAMT>([\d.-]+)/);
        const memoMatch = stmtTrnBlock.match(/<MEMO>([\s\S]*?)</);
        if (dtPostedMatch && trnAmtMatch && memoMatch) {
            const dateStr = dtPostedMatch[1];
            const amount = parseFloat(trnAmtMatch[1]);
            const originalDescription = memoMatch[1].trim();
            if (isNaN(amount)) continue;
            const normalizedDate = normalizeOfxDate(dateStr);
            transactions.push({
                id: generateTransactionId(),
                date: normalizedDate,
                amount: Math.abs(amount),
                originalDescription,
                accountId,
                categoryId: null,
                operationType: amount < 0 ? 'despesa' : 'receita',
                description: originalDescription,
                isTransfer: false,
                destinationAccountId: null,
                tempInvestmentId: null,
                tempLoanId: null,
                tempParcelaId: null,
                tempVehicleOperation: null,
                sourceType: 'ofx',
                isContabilized: false,
                isPotentialDuplicate: false,
            });
        }
    }
    return transactions;
};

export interface AmortizationItem {
    parcela: number;
    juros: number;
    amortizacao: number;
    saldoDevedor: number;
}

interface FinanceContextType {
  emprestimos: Emprestimo[];
  addEmprestimo: (emprestimo: Omit<Emprestimo, "id">) => void;
  updateEmprestimo: (id: number, emprestimo: Partial<Emprestimo>) => void;
  deleteEmprestimo: (id: number) => void;
  getPendingLoans: () => Emprestimo[];
  markLoanParcelPaid: (loanId: number, valorPago: number, dataPagamento: string, parcelaNumero?: number) => void;
  unmarkLoanParcelPaid: (loanId: number) => void;
  calculateLoanSchedule: (loanId: number) => AmortizationItem[];
  calculateLoanAmortizationAndInterest: (loanId: number, parcelaNumber: number) => AmortizationItem | null;
  calculateLoanPrincipalDueInNextMonths: (targetDate: Date, months: number) => number; 
  veiculos: Veiculo[];
  addVeiculo: (veiculo: Omit<Veiculo, "id">) => void;
  updateVeiculo: (id: number, veiculo: Partial<Veiculo>) => void;
  deleteVeiculo: (id: number) => void;
  getPendingVehicles: () => Veiculo[];
  segurosVeiculo: SeguroVeiculo[];
  addSeguroVeiculo: (seguro: Omit<SeguroVeiculo, "id">) => void;
  updateSeguroVeiculo: (id: number, seguro: Partial<SeguroVeiculo>) => void;
  deleteSeguroVeiculo: (id: number) => void;
  markSeguroParcelPaid: (seguroId: number, parcelaNumero: number, transactionId: string) => void;
  unmarkSeguroParcelPaid: (seguroId: number, parcelaNumero: number) => void;
  objetivos: ObjetivoFinanceiro[];
  addObjetivo: (obj: Omit<ObjetivoFinanceiro, "id">) => void;
  updateObjetivo: (id: number, obj: Partial<ObjetivoFinanceiro>) => void;
  deleteObjetivo: (id: number) => void;
  billsTracker: BillTracker[];
  setBillsTracker: Dispatch<SetStateAction<BillTracker[]>>;
  updateBill: (id: string, updates: Partial<BillTracker>) => void;
  deleteBill: (id: string) => void;
  getBillsForMonth: (date: Date) => BillTracker[];
  getPotentialFixedBillsForMonth: (date: Date, localBills: BillTracker[]) => PotentialFixedBill[];
  getFutureFixedBills: (referenceDate: Date, localBills: BillTracker[]) => PotentialFixedBill[];
  getOtherPaidExpensesForMonth: (date: Date) => ExternalPaidBill[];
  contasMovimento: ContaCorrente[];
  setContasMovimento: Dispatch<SetStateAction<ContaCorrente[]>>;
  getContasCorrentesTipo: () => ContaCorrente[];
  categoriasV2: Categoria[];
  setCategoriasV2: Dispatch<SetStateAction<Categoria[]>>;
  transacoesV2: TransacaoCompleta[];
  setTransacoesV2: Dispatch<SetStateAction<TransacaoCompleta[]>>;
  addTransacaoV2: (transaction: TransacaoCompleta) => void;
  standardizationRules: StandardizationRule[];
  addStandardizationRule: (rule: Omit<StandardizationRule, "id">) => void;
  deleteStandardizationRule: (id: string) => void;
  importedStatements: ImportedStatement[];
  processStatementFile: (file: File, accountId: string) => Promise<{ success: boolean; message: string }>;
  deleteImportedStatement: (statementId: string) => void;
  getTransactionsForReview: (accountId: string, range: DateRange) => ImportedTransaction[];
  updateImportedStatement: (statementId: string, updates: Partial<ImportedStatement>) => void;
  uncontabilizeImportedTransaction: (transactionId: string) => void;
  dateRanges: ComparisonDateRanges;
  setDateRanges: Dispatch<SetStateAction<ComparisonDateRanges>>;
  alertStartDate: string;
  setAlertStartDate: Dispatch<SetStateAction<string>>;
  monthlyRevenueForecast: number;
  setMonthlyRevenueForecast: Dispatch<SetStateAction<number>>;
  getRevenueForPreviousMonth: (date: Date) => number;
  getTotalReceitas: (mes?: string) => number;
  getTotalDespesas: (mes?: string) => number;
  getTotalDividas: () => number;
  getCustoVeiculos: () => number;
  getSaldoAtual: () => number;
  getValorFipeTotal: (targetDate?: Date) => number;
  getSaldoDevedor: (targetDate?: Date) => number;
  getLoanPrincipalRemaining: (targetDate?: Date) => number;
  getCreditCardDebt: (targetDate?: Date) => number;
  getJurosTotais: () => number;
  getDespesasFixas: () => number;
  getPatrimonioLiquido: (targetDate?: Date) => number;
  getAtivosTotal: (targetDate?: Date) => number;
  getPassivosTotal: (targetDate?: Date) => number;
  getSegurosAApropriar: (targetDate?: Date) => number;
  getSegurosAPagar: (targetDate?: Date) => number;
  calculateBalanceUpToDate: (accountId: string, date: Date | undefined, allTransactions: TransacaoCompleta[], accounts: ContaCorrente[]) => number;
  calculateTotalInvestmentBalanceAtDate: (date: Date | undefined) => number;
  calculatePaidInstallmentsUpToDate: (loanId: number, targetDate: Date) => number; 
  exportData: () => void;
  importData: (file: File) => Promise<{ success: boolean; message: string }>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEYS = {
  EMPRESTIMOS: "neon_finance_emprestimos",
  VEICULOS: "neon_finance_veiculos",
  SEGUROS_VEICULO: "neon_finance_seguros_veiculo",
  OBJETIVOS: "neon_finance_objetivos",
  BILLS_TRACKER: "neon_finance_bills_tracker",
  CONTAS_MOVIMENTO: "fin_accounts_v1",
  CATEGORIAS_V2: "fin_categories_v1",
  TRANSACOES_V2: "fin_transactions_v1",
  STANDARDIZATION_RULES: "fin_standardization_rules_v1",
  IMPORTED_STATEMENTS: "fin_imported_statements_v1",
  DATE_RANGES: "fin_date_ranges_v1",
  ALERT_START_DATE: "fin_alert_start_date_v1",
  MONTHLY_REVENUE_FORECAST: "fin_monthly_revenue_forecast_v1",
};

const initialEmprestimos: Emprestimo[] = [];
const initialVeiculos: Veiculo[] = [];
const initialSegurosVeiculo: SeguroVeiculo[] = [];
const initialObjetivos: ObjetivoFinanceiro[] = [];
const initialBillsTracker: BillTracker[] = [];
const initialStandardizationRules: StandardizationRule[] = [];
const initialImportedStatements: ImportedStatement[] = [];
const defaultAlertStartDate = subMonths(new Date(), 6).toISOString().split('T')[0];

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (key === STORAGE_KEYS.DATE_RANGES) return parseDateRanges(parsed) as unknown as T;
      return parsed;
    }
  } catch (error) {
    console.error(error);
  }
  return defaultValue;
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    let dataToStore = data;
    if (key === STORAGE_KEYS.DATE_RANGES) {
        const ranges = data as unknown as ComparisonDateRanges;
        dataToStore = {
            range1: { from: ranges.range1.from?.toISOString().split('T')[0], to: ranges.range1.to?.toISOString().split('T')[0] },
            range2: { from: ranges.range2.from?.toISOString().split('T')[0], to: ranges.range2.to?.toISOString().split('T')[0] },
        } as unknown as T;
    }
    localStorage.setItem(key, JSON.stringify(dataToStore));
  } catch (error) {
    console.error(error);
  }
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>(() => loadFromStorage(STORAGE_KEYS.EMPRESTIMOS, initialEmprestimos));
  const [veiculos, setVeiculos] = useState<Veiculo[]>(() => loadFromStorage(STORAGE_KEYS.VEICULOS, initialVeiculos));
  const [segurosVeiculo, setSegurosVeiculo] = useState<SeguroVeiculo[]>(() => loadFromStorage(STORAGE_KEYS.SEGUROS_VEICULO, initialSegurosVeiculo));
  const [objetivos, setObjetivos] = useState<ObjetivoFinanceiro[]>(() => loadFromStorage(STORAGE_KEYS.OBJETIVOS, initialObjetivos));
  const [billsTracker, setBillsTracker] = useState<BillTracker[]>(() => loadFromStorage(STORAGE_KEYS.BILLS_TRACKER, initialBillsTracker));
  const [contasMovimento, setContasMovimento] = useState<ContaCorrente[]>(() => loadFromStorage(STORAGE_KEYS.CONTAS_MOVIMENTO, DEFAULT_ACCOUNTS));
  const [categoriasV2, setCategoriasV2] = useState<Categoria[]>(() => loadFromStorage(STORAGE_KEYS.CATEGORIAS_V2, DEFAULT_CATEGORIES));
  const [transacoesV2, setTransacoesV2] = useState<TransacaoCompleta[]>(() => loadFromStorage(STORAGE_KEYS.TRANSACOES_V2, []));
  const [standardizationRules, setStandardizationRules] = useState<StandardizationRule[]>(() => loadFromStorage(STORAGE_KEYS.STANDARDIZATION_RULES, initialStandardizationRules));
  const [importedStatements, setImportedStatements] = useState<ImportedStatement[]>(() => loadFromStorage(STORAGE_KEYS.IMPORTED_STATEMENTS, initialImportedStatements));
  const [dateRanges, setDateRanges] = useState<ComparisonDateRanges>(() => loadFromStorage(STORAGE_KEYS.DATE_RANGES, DEFAULT_RANGES));
  const [alertStartDate, setAlertStartDate] = useState<string>(() => loadFromStorage(STORAGE_KEYS.ALERT_START_DATE, defaultAlertStartDate));
  const [monthlyRevenueForecast, setMonthlyRevenueForecast] = useState<number>(() => loadFromStorage(STORAGE_KEYS.MONTHLY_REVENUE_FORECAST, 0));

  useEffect(() => { saveToStorage(STORAGE_KEYS.EMPRESTIMOS, emprestimos); }, [emprestimos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.VEICULOS, veiculos); }, [veiculos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.SEGUROS_VEICULO, segurosVeiculo); }, [segurosVeiculo]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.OBJETIVOS, objetivos); }, [objetivos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.BILLS_TRACKER, billsTracker); }, [billsTracker]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.STANDARDIZATION_RULES, standardizationRules); }, [standardizationRules]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.IMPORTED_STATEMENTS, importedStatements); }, [importedStatements]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.DATE_RANGES, dateRanges); }, [dateRanges]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.ALERT_START_DATE, alertStartDate); }, [alertStartDate]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.MONTHLY_REVENUE_FORECAST, monthlyRevenueForecast); }, [monthlyRevenueForecast]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CONTAS_MOVIMENTO, contasMovimento); }, [contasMovimento]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.CATEGORIAS_V2, categoriasV2); }, [categoriasV2]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.TRANSACOES_V2, transacoesV2); }, [transacoesV2]);

  const balanceCache = useMemo(() => {
    const cache = new Map<string, number>();
    const sortedTransactions = [...transacoesV2].sort((a, b) => {
        const dateA = parseDateLocal(a.date).getTime();
        const dateB = parseDateLocal(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.id.localeCompare(b.id);
    });
    const accountBalances: Record<string, number> = {};
    contasMovimento.forEach(account => { accountBalances[account.id] = 0; });
    sortedTransactions.forEach(t => {
        const account = contasMovimento.find(a => a.id === t.accountId);
        if (!account) return;
        const isCreditCard = account.accountType === 'cartao_credito';
        let amountChange = 0;
        if (isCreditCard) {
            if (t.flow === 'out') amountChange = -t.amount;
            else if (t.flow === 'in') amountChange = t.amount;
        } else {
            if (t.flow === 'in' || t.flow === 'transfer_in') amountChange = t.amount;
            else amountChange = -t.amount;
        }
        accountBalances[t.accountId] = (accountBalances[t.accountId] || 0) + amountChange;
        cache.set(`${t.accountId}_${t.date}`, accountBalances[t.accountId]);
    });
    return cache;
  }, [transacoesV2, contasMovimento]);

  const calculateBalanceUpToDate = useCallback((accountId: string, date: Date | undefined, allTransactions: TransacaoCompleta[], accounts: ContaCorrente[]): number => {
    const targetDate = date || new Date(9999, 11, 31);
    const targetDateStr = format(targetDate, 'yyyy-MM-dd');
    if (balanceCache.has(`${accountId}_${targetDateStr}`)) return balanceCache.get(`${accountId}_${targetDateStr}`)!;
    const transactionsBeforeDate = allTransactions
        .filter(t => t.accountId === accountId && parseDateLocal(t.date) <= targetDate)
        .sort((a, b) => {
            const dateA = parseDateLocal(a.date).getTime();
            const dateB = parseDateLocal(b.date).getTime();
            if (dateA !== dateB) return dateB - dateA;
            return b.id.localeCompare(a.id);
        });
    if (transactionsBeforeDate.length > 0) {
        const latestDateStr = transactionsBeforeDate[0].date;
        return balanceCache.get(`${accountId}_${latestDateStr}`) || 0;
    }
    return 0;
  }, [balanceCache]);

  const calculateTotalInvestmentBalanceAtDate = useCallback((date: Date | undefined): number => {
    const targetDate = date || new Date(9999, 11, 31);
    const investmentAccountIds = contasMovimento.filter(c => ['renda_fixa', 'poupanca', 'cripto', 'reserva', 'objetivo'].includes(c.accountType)).map(c => c.id);
    return investmentAccountIds.reduce((acc, accountId) => acc + Math.max(0, calculateBalanceUpToDate(accountId, targetDate, transacoesV2, contasMovimento)), 0);
  }, [contasMovimento, transacoesV2, calculateBalanceUpToDate]);
  
  const calculatePaidInstallmentsUpToDate = useCallback((loanId: number, targetDate: Date): number => {
    const loanPayments = transacoesV2.filter(t => t.operationType === 'pagamento_emprestimo' && t.links?.loanId === `loan_${loanId}`);
    const paymentsUpToDate = loanPayments.filter(t => parseDateLocal(t.date) <= targetDate);
    const paidParcelas = new Set<string>();
    paymentsUpToDate.forEach(p => { if (p.links?.parcelaId) paidParcelas.add(p.links.parcelaId); });
    return paidParcelas.size > 0 ? paidParcelas.size : paymentsUpToDate.length;
  }, [transacoesV2]);
  
  const calculateLoanSchedule = useCallback((loanId: number): AmortizationItem[] => {
    const loan = emprestimos.find(e => e.id === loanId);
    if (!loan || loan.meses === 0 || loan.taxaMensal === 0) return [];
    const taxa = loan.taxaMensal / 100;
    const parcelaFixaCents = Math.round(loan.parcela * 100);
    let saldoDevedorCents = Math.round(loan.valorTotal * 100);
    const schedule: AmortizationItem[] = [];
    for (let i = 1; i <= loan.meses; i++) {
      if (saldoDevedorCents <= 0) { schedule.push({ parcela: i, juros: 0, amortizacao: 0, saldoDevedor: 0 }); continue; }
      const jurosCents = Math.round(saldoDevedorCents * taxa);
      let amortizacaoCents = i === loan.meses ? saldoDevedorCents : parcelaFixaCents - jurosCents;
      const novoSaldoDevedorCents = Math.max(0, saldoDevedorCents - amortizacaoCents);
      schedule.push({ parcela: i, juros: Math.max(0, jurosCents / 100), amortizacao: Math.max(0, amortizacaoCents / 100), saldoDevedor: novoSaldoDevedorCents / 100 });
      saldoDevedorCents = novoSaldoDevedorCents;
    }
    return schedule;
  }, [emprestimos]);
  
  const calculateLoanAmortizationAndInterest = useCallback((loanId: number, parcelaNumber: number): AmortizationItem | null => {
      return calculateLoanSchedule(loanId).find(item => item.parcela === parcelaNumber) || null;
  }, [calculateLoanSchedule]);
  
  const calculateLoanPrincipalDueInNextMonths = useCallback((targetDate: Date, months: number): number => {
    const lookaheadDate = addMonths(targetDate, months);
    return emprestimos.reduce((acc, e) => {
        if (e.status === 'quitado' || e.status === 'pendente_config') return acc;
        let principalDue = 0;
        const paidUpToDate = calculatePaidInstallmentsUpToDate(e.id, targetDate);
        calculateLoanSchedule(e.id).forEach(item => {
            const dueDate = getDueDate(e.dataInicio!, item.parcela);
            if (item.parcela > paidUpToDate && (isBefore(dueDate, lookaheadDate) || isSameDay(dueDate, lookaheadDate))) principalDue += item.amortizacao;
        });
        return acc + principalDue;
    }, 0);
  }, [emprestimos, calculatePaidInstallmentsUpToDate, calculateLoanSchedule]);

  const getSegurosAApropriar = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date();
    return segurosVeiculo.reduce((acc, seguro) => {
        try {
            const vigenciaInicio = parseDateLocal(seguro.vigenciaInicio);
            const vigenciaFim = parseDateLocal(seguro.vigenciaFim);
            if (isAfter(vigenciaInicio, date) || isBefore(vigenciaFim, date)) return acc;
            const totalDays = differenceInDays(vigenciaFim, vigenciaInicio) + 1;
            if (totalDays <= 0) return acc;
            const dailyRate = seguro.valorTotal / totalDays;
            const daysConsumed = differenceInDays(date, vigenciaInicio) + 1;
            return acc + Math.max(0, seguro.valorTotal - (dailyRate * daysConsumed));
        } catch { return acc; }
    }, 0);
  }, [segurosVeiculo]);

  const getSegurosAPagar = useCallback((targetDate?: Date) => {
    const date = targetDate || new Date();
    return segurosVeiculo.reduce((acc, seguro) => {
        let totalPaid = 0;
        seguro.parcelas.forEach(parcela => {
            if (parcela.paga && parcela.transactionId) {
                const tx = transacoesV2.find(t => t.id === parcela.transactionId);
                if (tx && parseDateLocal(tx.date) <= date) totalPaid += tx.amount;
            }
        });
        return acc + Math.max(0, seguro.valorTotal - totalPaid);
    }, 0); 
  }, [segurosVeiculo, transacoesV2]);

  const applyRules = useCallback((transactions: ImportedTransaction[], rules: StandardizationRule[]): ImportedTransaction[] => {
    return transactions.map(tx => {
      let updatedTx = { ...tx };
      const originalDesc = tx.originalDescription.toLowerCase();
      for (const rule of rules) {
        if (originalDesc.includes(rule.pattern.toLowerCase())) {
          updatedTx.categoryId = rule.categoryId;
          updatedTx.operationType = rule.operationType;
          updatedTx.description = rule.descriptionTemplate;
          updatedTx.isTransfer = rule.operationType === 'transferencia';
          break;
        }
      }
      return updatedTx;
    });
  }, []);

  const processStatementFile = useCallback(async (file: File, accountId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const content = await file.text();
      let rawTransactions = content.toLowerCase().includes('<ofx>') ? parseOFX(content, accountId) : parseCSV(content, accountId);
      if (rawTransactions.length === 0) return { success: false, message: "Nenhuma transação encontrada." };
      const processed = applyRules(rawTransactions, standardizationRules);
      const dates = processed.map(t => parseDateLocal(t.date)).sort((a, b) => a.getTime() - b.getTime());
      setImportedStatements(prev => [...prev, { id: generateStatementId(), accountId, fileName: file.name, importDate: new Date().toISOString(), startDate: format(dates[0], 'yyyy-MM-dd'), endDate: format(dates[dates.length-1], 'yyyy-MM-dd'), status: 'pending', rawTransactions: processed }]);
      return { success: true, message: `${processed.length} transações carregadas.` };
    } catch (e: any) { return { success: false, message: e.message }; }
  }, [standardizationRules, applyRules]);

  const deleteImportedStatement = useCallback((id: string) => setImportedStatements(prev => prev.filter(s => s.id !== id)), []);
  const updateImportedStatement = useCallback((id: string, updates: Partial<ImportedStatement>) => setImportedStatements(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s)), []);
  const uncontabilizeImportedTransaction = useCallback((id: string) => {
    setTransacoesV2(prev => prev.filter(t => t.id !== id));
    setImportedStatements(prev => prev.map(s => {
        const newRaw = s.rawTransactions.map(t => t.contabilizedTransactionId === id ? { ...t, isContabilized: false, contabilizedTransactionId: undefined } : t);
        return { ...s, rawTransactions: newRaw, status: newRaw.filter(t => !t.isContabilized).length === 0 ? 'complete' : 'partial' };
    }));
  }, [setTransacoesV2]);
  
  const getTransactionsForReview = useCallback((accountId: string, range: DateRange): ImportedTransaction[] => {
    const allRaw: ImportedTransaction[] = [];
    importedStatements.filter(s => s.accountId === accountId).forEach(s => s.rawTransactions.filter(t => !t.isContabilized).forEach(t => allRaw.push(t)));
    if (!range.from || !range.to) return allRaw;
    const filtered = applyRules(allRaw.filter(t => isWithinInterval(parseDateLocal(t.date), { start: startOfDay(range.from!), end: endOfDay(range.to!) })), standardizationRules);
    return filtered.map(importedTx => {
        const isDuplicate = transacoesV2.find(m => m.accountId === importedTx.accountId && Math.abs(m.amount - importedTx.amount) < 0.01 && Math.abs(differenceInDays(parseDateLocal(importedTx.date), parseDateLocal(m.date))) <= 1 && m.operationType !== 'initial_balance');
        return isDuplicate ? { ...importedTx, isPotentialDuplicate: true, duplicateOfTxId: isDuplicate.id, operationType: isDuplicate.operationType, categoryId: isDuplicate.categoryId, description: isDuplicate.description } : importedTx;
    });
  }, [importedStatements, transacoesV2, standardizationRules, applyRules]);

  const updateBill = useCallback((id: string, updates: Partial<BillTracker>) => setBillsTracker(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b)), []);
  const deleteBill = useCallback((id: string) => setBillsTracker(prev => prev.filter(b => b.id !== id)), []);
  const getRevenueForPreviousMonth = useCallback((date: Date) => {
    const prev = format(subMonths(date, 1), 'yyyy-MM');
    return transacoesV2.filter(t => (t.operationType === 'receita' || t.operationType === 'rendimento') && t.date.startsWith(prev)).reduce((acc, t) => acc + t.amount, 0);
  }, [transacoesV2]);

  const getBillsForMonth = useCallback((date: Date) => {
    return billsTracker.filter(b => (isSameMonth(parseDateLocal(b.dueDate), date) || (b.isPaid && b.paymentDate && isSameMonth(parseDateLocal(b.paymentDate), date))) && (!b.isExcluded || b.isPaid)).sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
  }, [billsTracker]);
  
  const getPotentialFixedBillsForMonth = useCallback((date: Date, localBills: BillTracker[]): PotentialFixedBill[] => {
    const potential: PotentialFixedBill[] = [];
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const isIncluded = (type: BillSourceType, ref: string, num: number) => localBills.some(b => b.sourceType === type && b.sourceRef === ref && b.parcelaNumber === num && !b.isExcluded);
    emprestimos.filter(e => e.status === 'ativo').forEach(loan => {
        calculateLoanSchedule(loan.id).forEach(item => {
            const due = getDueDate(loan.dataInicio!, item.parcela);
            const isPaid = transacoesV2.some(t => t.operationType === 'pagamento_emprestimo' && t.links?.loanId === `loan_${loan.id}` && t.links?.parcelaId === String(item.parcela));
            if (isWithinInterval(due, { start, end }) || isPaid) potential.push({ key: `loan_${loan.id}_${item.parcela}`, sourceType: 'loan_installment', sourceRef: String(loan.id), parcelaNumber: item.parcela, dueDate: format(due, 'yyyy-MM-dd'), expectedAmount: loan.parcela, description: `Empréstimo ${loan.contrato} - P${item.parcela}/${loan.meses}`, isPaid, isIncluded: isIncluded('loan_installment', String(loan.id), item.parcela) });
        });
    });
    segurosVeiculo.forEach(seguro => {
        seguro.parcelas.forEach(p => {
            const due = parseDateLocal(p.vencimento);
            if (isWithinInterval(due, { start, end }) || p.paga) potential.push({ key: `insurance_${seguro.id}_${p.numero}`, sourceType: 'insurance_installment', sourceRef: String(seguro.id), parcelaNumber: p.numero, dueDate: p.vencimento, expectedAmount: p.valor, description: `Seguro ${seguro.numeroApolice} - P${p.numero}/${seguro.numeroParcelas}`, isPaid: p.paga, isIncluded: isIncluded('insurance_installment', String(seguro.id), p.numero) });
        });
    });
    return potential.sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
  }, [emprestimos, segurosVeiculo, transacoesV2, calculateLoanSchedule]);
  
  const getFutureFixedBills = useCallback((refDate: Date, localBills: BillTracker[]): PotentialFixedBill[] => {
    const future: PotentialFixedBill[] = [];
    const refEnd = endOfMonth(refDate);
    const isIncluded = (type: BillSourceType, ref: string, num: number) => localBills.some(b => b.sourceType === type && b.sourceRef === ref && b.parcelaNumber === num && !b.isExcluded);
    emprestimos.filter(e => e.status === 'ativo').forEach(loan => {
        calculateLoanSchedule(loan.id).forEach(item => {
            const due = getDueDate(loan.dataInicio!, item.parcela);
            if (isAfter(due, refEnd)) {
                const isPaid = transacoesV2.some(t => t.operationType === 'pagamento_emprestimo' && t.links?.loanId === `loan_${loan.id}` && t.links?.parcelaId === String(item.parcela));
                future.push({ key: `loan_${loan.id}_${item.parcela}`, sourceType: 'loan_installment', sourceRef: String(loan.id), parcelaNumber: item.parcela, dueDate: format(due, 'yyyy-MM-dd'), expectedAmount: loan.parcela, description: `Empréstimo ${loan.contrato} - P${item.parcela}/${loan.meses}`, isPaid, isIncluded: isIncluded('loan_installment', String(loan.id), item.parcela) });
            }
        });
    });
    segurosVeiculo.forEach(seguro => {
        seguro.parcelas.forEach(p => {
            if (isAfter(parseDateLocal(p.vencimento), refEnd)) future.push({ key: `insurance_${seguro.id}_${p.numero}`, sourceType: 'insurance_installment', sourceRef: String(seguro.id), parcelaNumber: p.numero, dueDate: p.vencimento, expectedAmount: p.valor, description: `Seguro ${seguro.numeroApolice} - P${p.numero}/${seguro.numeroParcelas}`, isPaid: p.paga, isIncluded: isIncluded('insurance_installment', String(seguro.id), p.numero) });
        });
    });
    return future.sort((a, b) => parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
  }, [emprestimos, segurosVeiculo, transacoesV2, calculateLoanSchedule]);
  
  const getOtherPaidExpensesForMonth = useCallback((date: Date): ExternalPaidBill[] => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const trackerTxIds = new Set(billsTracker.filter(b => b.isPaid && b.transactionId).map(b => b.transactionId!));
    return transacoesV2.filter(t => {
        const d = parseDateLocal(t.date);
        return isWithinInterval(d, { start, end }) && (t.flow === 'out' || t.flow === 'transfer_out') && ['despesa', 'pagamento_emprestimo', 'veiculo'].includes(t.operationType) && !(t.meta.source === 'import' && !t.conciliated) && !(t.meta.source === 'bill_tracker' || trackerTxIds.has(t.id));
    }).map(t => ({ id: t.id, type: 'external_paid', dueDate: t.date, paymentDate: t.date, expectedAmount: t.amount, description: t.description, suggestedAccountId: t.accountId, suggestedCategoryId: t.categoryId, sourceType: 'external_expense', isPaid: true, isExcluded: false }));
  }, [billsTracker, transacoesV2]);

  const addEmprestimo = (e: Omit<Emprestimo, "id">) => setEmprestimos([...emprestimos, { ...e, id: Math.max(0, ...emprestimos.map(x => x.id)) + 1, status: e.status || 'ativo', parcelasPagas: 0 }]);
  const updateEmprestimo = (id: number, u: Partial<Emprestimo>) => setEmprestimos(emprestimos.map(e => e.id === id ? { ...e, ...u } : e));
  const deleteEmprestimo = (id: number) => setEmprestimos(emprestimos.filter(e => e.id !== id));
  const getPendingLoans = useCallback(() => emprestimos.filter(e => e.status === 'pendente_config'), [emprestimos]);
  const markLoanParcelPaid = useCallback((id: number, val: number, date: string, num?: number) => setEmprestimos(prev => prev.map(e => e.id === id ? { ...e, status: 'ativo' } : e)), []);
  const unmarkLoanParcelPaid = useCallback((id: number) => setEmprestimos(prev => prev.map(e => e.id === id ? { ...e, status: 'ativo' } : e)), []);
  const addVeiculo = (v: Omit<Veiculo, "id">) => setVeiculos([...veiculos, { ...v, id: Math.max(0, ...veiculos.map(x => x.id)) + 1, status: v.status || 'ativo' }]);
  const updateVeiculo = (id: number, u: Partial<Veiculo>) => setVeiculos(veiculos.map(v => v.id === id ? { ...v, ...u } : v));
  const deleteVeiculo = (id: number) => setVeiculos(veiculos.filter(v => v.id !== id));
  const getPendingVehicles = useCallback(() => veiculos.filter(v => v.status === 'pendente_cadastro'), [veiculos]);
  const addSeguroVeiculo = (s: Omit<SeguroVeiculo, "id">) => setSegurosVeiculo([...segurosVeiculo, { ...s, id: Math.max(0, ...segurosVeiculo.map(x => x.id)) + 1 }]);
  const updateSeguroVeiculo = (id: number, u: Partial<SeguroVeiculo>) => setSegurosVeiculo(segurosVeiculo.map(s => s.id === id ? { ...s, ...u } : s));
  const deleteSeguroVeiculo = (id: number) => setSegurosVeiculo(segurosVeiculo.filter(s => s.id !== id));
  const markSeguroParcelPaid = useCallback((id: number, num: number, txId: string) => setSegurosVeiculo(prev => prev.map(s => s.id === id ? { ...s, parcelas: s.parcelas.map(p => p.numero === num ? { ...p, paga: true, transactionId: txId } : p) } : s)), []);
  const unmarkSeguroParcelPaid = useCallback((id: number, num: number) => setSegurosVeiculo(prev => prev.map(s => s.id === id ? { ...s, parcelas: s.parcelas.map(p => p.numero === num ? { ...p, paga: false, transactionId: undefined } : p) } : s)), []);
  const addObjetivo = (o: Omit<ObjetivoFinanceiro, "id">) => setObjetivos([...objetivos, { ...o, id: Math.max(0, ...objetivos.map(x => x.id)) + 1 }]);
  const updateObjetivo = (id: number, u: Partial<ObjetivoFinanceiro>) => setObjetivos(objetivos.map(o => o.id === id ? { ...o, ...u } : o));
  const deleteObjetivo = (id: number) => setObjetivos(objetivos.filter(o => o.id !== id));
  const addTransacaoV2 = (t: TransacaoCompleta) => setTransacoesV2(prev => [...prev, t]);
  const addStandardizationRule = useCallback((r: Omit<StandardizationRule, "id">) => setStandardizationRules(prev => [...prev, { ...r, id: generateRuleId() }]), []);
  const deleteStandardizationRule = useCallback((id: string) => setStandardizationRules(prev => prev.filter(r => r.id !== id)), []);
  const getContasCorrentesTipo = useCallback(() => contasMovimento.filter(c => c.accountType === 'corrente'), [contasMovimento]);
  const getTotalReceitas = (mes?: string) => transacoesV2.filter(t => (t.operationType === 'receita' || t.operationType === 'rendimento') && (!mes || t.date.startsWith(mes))).reduce((acc, t) => acc + t.amount, 0);
  const getTotalDespesas = (mes?: string) => transacoesV2.filter(t => (t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo') && (!mes || t.date.startsWith(mes))).reduce((acc, t) => acc + t.amount, 0);
  const getTotalDividas = () => emprestimos.reduce((acc, e) => acc + e.valorTotal, 0);
  const getCustoVeiculos = () => veiculos.filter(v => v.status !== 'vendido').reduce((acc, v) => acc + v.valorSeguro, 0);
  const getSaldoAtual = useCallback(() => contasMovimento.reduce((acc, c) => acc + calculateBalanceUpToDate(c.id, undefined, transacoesV2, contasMovimento), 0), [contasMovimento, transacoesV2, calculateBalanceUpToDate]);
  const getValorFipeTotal = useCallback((date?: Date) => veiculos.filter(v => v.status !== 'vendido' && parseDateLocal(v.dataCompra) <= (date || new Date(9999, 11, 31))).reduce((acc, v) => acc + v.valorFipe, 0), [veiculos]);
  const getLoanPrincipalRemaining = useCallback((date?: Date) => {
    const d = date || new Date(9999, 11, 31);
    return emprestimos.reduce((acc, e) => {
      if (e.status === 'quitado' || e.status === 'pendente_config') return acc;
      const paid = calculatePaidInstallmentsUpToDate(e.id, d);
      const schedule = calculateLoanSchedule(e.id);
      const last = schedule.find(item => item.parcela === paid);
      return acc + Math.max(0, last ? last.saldoDevedor : e.valorTotal);
    }, 0);
  }, [emprestimos, calculatePaidInstallmentsUpToDate, calculateLoanSchedule]);

  const getCreditCardDebt = useCallback((date?: Date) => {
    const d = date || new Date(9999, 11, 31);
    return contasMovimento.filter(c => c.accountType === 'cartao_credito').reduce((acc, c) => {
        const balance = calculateBalanceUpToDate(c.id, d, transacoesV2, contasMovimento);
        const futureObligations = transacoesV2.filter(t => t.accountId === c.id && t.flow === 'out' && parseDateLocal(t.date) > d).reduce((sum, t) => sum + t.amount, 0);
        return acc + Math.abs(Math.min(0, balance)) + futureObligations;
    }, 0);
  }, [contasMovimento, transacoesV2, calculateBalanceUpToDate]);

  const getSaldoDevedor = useCallback((date?: Date) => getLoanPrincipalRemaining(date) + getCreditCardDebt(date), [getLoanPrincipalRemaining, getCreditCardDebt]);
  const getJurosTotais = () => emprestimos.reduce((acc, e) => acc + (e.parcela * e.meses - e.valorTotal), 0);
  const getDespesasFixas = () => transacoesV2.filter(t => categoriasV2.find(c => c.id === t.categoryId)?.nature === 'despesa_fixa').reduce((acc, t) => acc + t.amount, 0);
  const getAtivosTotal = useCallback((date?: Date) => {
    const d = date || new Date(9999, 11, 31);
    const cash = contasMovimento.filter(c => c.accountType !== 'cartao_credito').reduce((acc, c) => acc + Math.max(0, calculateBalanceUpToDate(c.id, d, transacoesV2, contasMovimento)), 0);
    return cash + getValorFipeTotal(d) + getSegurosAApropriar(d);
  }, [contasMovimento, transacoesV2, getValorFipeTotal, calculateBalanceUpToDate, getSegurosAApropriar]);
  const getPassivosTotal = useCallback((date?: Date) => getSaldoDevedor(date) + getSegurosAPagar(date), [getSaldoDevedor, getSegurosAPagar]);
  const getPatrimonioLiquido = useCallback((date?: Date) => getAtivosTotal(date) - getPassivosTotal(date), [getAtivosTotal, getPassivosTotal]);

  const exportData = () => {
    const data: FinanceExportV2 = { schemaVersion: "2.0", exportedAt: new Date().toISOString(), data: { accounts: contasMovimento, categories: categoriasV2, transactions: transacoesV2, transferGroups: [], emprestimos, veiculos, segurosVeiculo, objetivos, billsTracker, standardizationRules, importedStatements, monthlyRevenueForecast, alertStartDate } };
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
        if (data.data.accounts) setContasMovimento(data.data.accounts);
        if (data.data.categories) setCategoriasV2(data.data.categories);
        if (data.data.transactions) setTransacoesV2(data.data.transactions);
        if (data.data.emprestimos) setEmprestimos(data.data.emprestimos);
        if (data.data.veiculos) setVeiculos(data.data.veiculos);
        if (data.data.segurosVeiculo) setSegurosVeiculo(data.data.segurosVeiculo);
        if (data.data.objetivos) setObjetivos(data.data.objetivos);
        if (data.data.billsTracker) setBillsTracker(data.data.billsTracker);
        if (data.data.standardizationRules) setStandardizationRules(data.data.standardizationRules);
        if (data.data.importedStatements) setImportedStatements(data.data.importedStatements);
        if (data.data.monthlyRevenueForecast !== undefined) setMonthlyRevenueForecast(data.data.monthlyRevenueForecast);
        if (data.data.alertStartDate) setAlertStartDate(data.data.alertStartDate);
        return { success: true, message: "Dados importados!" };
      }
      return { success: false, message: "Versão incompatível." };
    } catch { return { success: false, message: "Erro no arquivo." }; }
  };

  const value: FinanceContextType = {
    emprestimos, addEmprestimo, updateEmprestimo, deleteEmprestimo, getPendingLoans, markLoanParcelPaid, unmarkLoanParcelPaid, calculateLoanSchedule, calculateLoanAmortizationAndInterest, calculateLoanPrincipalDueInNextMonths,
    veiculos, addVeiculo, updateVeiculo, deleteVeiculo, getPendingVehicles,
    segurosVeiculo, addSeguroVeiculo, updateSeguroVeiculo, deleteSeguroVeiculo, markSeguroParcelPaid, unmarkSeguroParcelPaid,
    objetivos, addObjetivo, updateObjetivo, deleteObjetivo,
    billsTracker, setBillsTracker, updateBill, deleteBill, getBillsForMonth, getPotentialFixedBillsForMonth, getFutureFixedBills, getOtherPaidExpensesForMonth,
    contasMovimento, setContasMovimento, getContasCorrentesTipo,
    categoriasV2, setCategoriasV2,
    transacoesV2, setTransacoesV2, addTransacaoV2,
    standardizationRules, addStandardizationRule, deleteStandardizationRule,
    importedStatements, processStatementFile, deleteImportedStatement, getTransactionsForReview, updateImportedStatement, uncontabilizeImportedTransaction,
    dateRanges, setDateRanges,
    alertStartDate, setAlertStartDate,
    monthlyRevenueForecast, setMonthlyRevenueForecast, getRevenueForPreviousMonth,
    getTotalReceitas, getTotalDespesas, getTotalDividas, getCustoVeiculos, getSaldoAtual, getValorFipeTotal, getSaldoDevedor, getLoanPrincipalRemaining, getCreditCardDebt, getJurosTotais, getDespesasFixas, getPatrimonioLiquido, getAtivosTotal, getPassivosTotal, getSegurosAApropriar, getSegurosAPagar, calculateBalanceUpToDate, calculateTotalInvestmentBalanceAtDate, calculatePaidInstallmentsUpToDate, exportData, importData,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) throw new Error("useFinance deve ser usado dentro de um FinanceProvider");
  return context;
}