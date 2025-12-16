// ============================================
// SCHEMA v1.1 - Tipos para Receitas & Despesas
// ============================================

// Tipos de Conta Movimento
export type AccountType = 
  | 'conta_corrente' 
  | 'aplicacao_renda_fixa' 
  | 'poupanca' 
  | 'criptoativos' 
  | 'reserva_emergencia' 
  | 'objetivos_financeiros'
  | 'cartao_credito'; // NOVO TIPO

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  conta_corrente: 'Conta Corrente',
  aplicacao_renda_fixa: 'Aplicação Renda Fixa',
  poupanca: 'Poupança',
  criptoativos: 'Criptoativos',
  reserva_emergencia: 'Reserva de Emergência',
  objetivos_financeiros: 'Objetivos Financeiros',
  cartao_credito: 'Cartão de Crédito', // NOVO LABEL
};

// Tipos de Categoria
export type CategoryNature = 'receita' | 'despesa_fixa' | 'despesa_variavel';

export const CATEGORY_NATURE_LABELS: Record<CategoryNature, string> = {
  receita: 'Receita',
  despesa_fixa: 'Despesa Fixa',
  despesa_variavel: 'Despesa Variável',
};

// Conta Movimento (antes ContaCorrente)
export interface ContaCorrente {
  id: string;
  name: string;
  accountType: AccountType;
  institution?: string;
  currency: string;
  initialBalance: number;
  startDate?: string; // ADICIONADO: Data de início para o saldo de implantação
  color?: string;
  icon?: string;
  createdAt: string;
  meta: Record<string, unknown>;
  hidden?: boolean; // NOVO: Para contas de contrapartida
}

// Categoria de Transação (atualizada)
export interface Categoria {
  id: string;
  label: string;
  icon?: string;
  nature: CategoryNature;
  type?: 'income' | 'expense' | 'both'; // Compatibilidade
}

// Links de vinculação (atualizado com veículos)
export interface TransactionLinks {
  investmentId: string | null;
  loanId: string | null;
  transferGroupId: string | null;
  parcelaId: string | null;
  vehicleTransactionId: string | null;
}

// Tipos de Operação no Modal (atualizado com veículos e liberação empréstimo)
export type OperationType = 
  | 'receita' 
  | 'despesa' 
  | 'transferencia' 
  | 'aplicacao' 
  | 'resgate' 
  | 'pagamento_emprestimo'
  | 'liberacao_emprestimo'
  | 'veiculo'
  | 'rendimento'
  | 'initial_balance'; // ADICIONADO

// NOVO: Labels para OperationType
export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  receita: 'Receita',
  despesa: 'Despesa',
  transferencia: 'Transferência',
  aplicacao: 'Aplicação',
  resgate: 'Resgate',
  pagamento_emprestimo: 'Pag. Empréstimo',
  liberacao_emprestimo: 'Liberação Empréstimo',
  veiculo: 'Veículo',
  rendimento: 'Rendimento',
  initial_balance: 'Saldo Inicial',
};

// Domínio da Transação
export type TransactionDomain = 'operational' | 'investment' | 'financing' | 'asset';

// Meta informações
export interface TransactionMeta {
  createdBy: string;
  source: 'manual' | 'import' | 'api' | 'bill_tracker'; // CORRIGIDO: Adicionado 'bill_tracker'
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  vehicleOperation?: 'compra' | 'venda';
  tipoVeiculo?: 'carro' | 'moto' | 'caminhao';
  numeroContrato?: string;
  pendingLoanConfig?: boolean;
  valorDevido?: number; // ADICIONADO para rastrear o valor original da parcela de seguro
  originalDescription?: string; // ADICIONADO para rastrear a descrição original da importação
}

// Transação Completa (atualizada)
export interface TransacaoCompleta {
  id: string;
  date: string;
  accountId: string;
  flow: FlowType;
  operationType: OperationType;
  domain: TransactionDomain;
  amount: number;
  categoryId: string | null;
  description: string;
  links: TransactionLinks;
  conciliated: boolean;
  attachments: string[];
  meta: TransactionMeta;
}

// Grupo de Transferência
export interface TransferGroup {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string;
}

// Empréstimo V2
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

// Veículo V2
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

// Seguro de Veículo V2
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

// Objetivo Financeiro V2
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
// NOVO: RASTREADOR DE CONTAS A PAGAR (BillTracker)
// ============================================

export type BillSourceType = 'loan_installment' | 'insurance_installment' | 'fixed_expense' | 'ad_hoc' | 'variable_expense'; // ADDED variable_expense

export interface BillTracker {
  id: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  expectedAmount: number;
  isPaid: boolean;
  paymentDate?: string; // YYYY-MM-DD
  transactionId?: string; // Link to TransacaoCompleta
  
  // Vínculos
  sourceType: BillSourceType;
  sourceRef?: string; // ID do Empréstimo, Seguro, ou Categoria
  parcelaNumber?: number; // Número da parcela (se for installment)
  
  // Conta de débito sugerida
  suggestedAccountId?: string;
  
  // Categoria sugerida
  suggestedCategoryId?: string;
  
  isExcluded?: boolean; // NEW: Mark if excluded from current month's list
}

// ============================================
// NOVO: IMPORTAÇÃO E PADRONIZAÇÃO
// ============================================

export interface StandardizationRule {
  id: string;
  pattern: string; // Substring a ser buscada na descrição original
  categoryId: string;
  operationType: OperationType; // 'receita', 'despesa', 'transferencia', etc.
  descriptionTemplate: string; // Nova descrição padronizada
}

export interface ImportedTransaction {
  id: string; // ID temporário para rastreamento
  date: string; // YYYY-MM-DD
  amount: number;
  originalDescription: string;
  
  // Campos para revisão (pré-preenchidos por regras)
  accountId: string;
  categoryId: string | null;
  operationType: OperationType | null;
  description: string; // Descrição padronizada ou original
  
  // Campos de Vínculo (preenchidos manualmente na revisão)
  isTransfer: boolean;
  destinationAccountId: string | null; // Para Transferência
  tempInvestmentId: string | null; // Para Aplicação/Resgate
  tempLoanId: string | null; // Para Pagamento Empréstimo
  tempVehicleOperation: 'compra' | 'venda' | null; // Para Veículo
  
  // Meta
  sourceType: 'csv' | 'ofx';
  
  // NEW: Rastreamento de contabilização
  isContabilized?: boolean;
  contabilizedTransactionId?: string;
}

// NOVO: Metadados do Extrato Importado
export interface ImportedStatement {
  id: string;
  accountId: string;
  fileName: string;
  importDate: string; // ISO string
  startDate: string; // YYYY-MM-DD (data da transação mais antiga)
  endDate: string; // YYYY-MM-DD (data da transação mais recente)
  status: 'pending' | 'partial' | 'complete'; // Status de revisão
  rawTransactions: ImportedTransaction[]; // Transações brutas do arquivo
}

// Schema de Exportação V2 (Simplificado)
export interface FinanceExportV2 {
  schemaVersion: '2.0';
  exportedAt: string;
  data: {
    accounts: ContaCorrente[];
    categories: Categoria[];
    transactions: TransacaoCompleta[];
    transferGroups: TransferGroup[];
    importedStatements: ImportedStatement[]; // ADICIONADO
  };
}

// Estado de conciliação de conta
export interface AccountReconciliation {
  accountId: string;
  periodStart: string;
  periodEnd: string;
  expectedInitialBalance: number;
  expectedFinalBalance: number;
  actualInitialBalance: number;
  actualFinalBalance: number;
  status: 'pending' | 'reconciled' | 'divergent';
  divergenceAmount: number;
}

// Resumo de conta
export interface AccountSummary {
  accountId: string;
  accountName: string;
  accountType: AccountType;
  institution?: string;
  initialBalance: number;
  currentBalance: number;
  projectedBalance: number;
  totalIn: number;
  totalOut: number;
  reconciliationStatus: 'ok' | 'warning' | 'error';
  transactionCount: number;
}

// ============================================
// TIPOS DE DATA FILTERING (NEW)
// ============================================

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface ComparisonDateRanges {
  range1: DateRange;
  range2: DateRange;
}

// Dados iniciais padrão - Sistema limpo, sem dados pré-preenchidos
export const DEFAULT_ACCOUNTS: ContaCorrente[] = [];

export const DEFAULT_CATEGORIES: Categoria[] = [
  { id: 'cat_salario', label: 'Salário', icon: '💰', nature: 'receita', type: 'income' },
  { id: 'cat_rendimentos', label: 'Rendimentos sobre Investimentos', icon: '📈', nature: 'receita', type: 'income' },
  { id: 'cat_seguro', label: 'Seguro', icon: '🛡️', nature: 'despesa_fixa', type: 'expense' },
  { id: 'cat_alimentacao', label: 'Alimentação', icon: '🍽️', nature: 'despesa_variavel', type: 'expense' },
];

// Helpers
export function generateTransactionId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateTransferGroupId(): string {
  return `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateAccountId(): string {
  return `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateCategoryId(): string {
  return `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateBillId(): string {
  return `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateStatementId(): string {
  return `stmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2, // Garante 2 casas
    maximumFractionDigits: 2, // Limita a 2 casas
  }).format(value);
}

export function getFlowTypeFromOperation(op: OperationType, vehicleOp?: 'compra' | 'venda'): FlowType {
  switch (op) {
    case 'receita':
    case 'resgate':
    case 'liberacao_emprestimo':
    case 'rendimento':
    case 'initial_balance': // ADICIONADO
      return 'in';
    case 'despesa':
    case 'aplicacao':
    case 'pagamento_emprestimo':
      return 'out';
    case 'transferencia':
      return 'transfer_out';
    case 'veiculo':
      return vehicleOp === 'venda' ? 'in' : 'out';
    default:
      return 'out';
  }
}

export function getDomainFromOperation(op: OperationType): TransactionDomain {
  switch (op) {
    case 'receita':
    case 'despesa':
    case 'transferencia':
    case 'initial_balance': // ADICIONADO
      return 'operational';
    case 'aplicacao':
    case 'resgate':
    case 'rendimento': // Rendimento é do domínio de investimento
      return 'investment';
    case 'pagamento_emprestimo':
    case 'liberacao_emprestimo':
      return 'financing';
    case 'veiculo':
      return 'asset';
    default:
      return 'operational';
  }
}

export function getCategoryTypeFromNature(nature: CategoryNature): 'income' | 'expense' | 'both' {
  return nature === 'receita' ? 'income' : 'expense';
}