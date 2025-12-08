// ============================================
// SCHEMA v1.0 - Tipos para Receitas & Despesas
// ============================================

// Conta Corrente
export interface ContaCorrente {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'wallet' | 'investment';
  currency: string;
  initialBalance: number;
  color?: string;
  icon?: string;
  createdAt: string;
  meta: Record<string, unknown>;
}

// Tipo Contábil (para DRE)
export interface TipoContabil {
  id: string;
  label: string;
  nature: 'credit' | 'debit';
  dreGroup: string;
}

// Categoria de Transação
export interface Categoria {
  id: string;
  label: string;
  icon?: string;
  type?: 'income' | 'expense' | 'both';
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

// Links de vinculação
export interface TransactionLinks {
  investmentId: string | null;
  loanId: string | null;
  transferGroupId: string | null;
  parcelaId?: string | null;
}

// Tipos de Fluxo
export type FlowType = 'in' | 'out' | 'transfer_in' | 'transfer_out';

// Tipos de Operação no Modal
export type OperationType = 
  | 'receita' 
  | 'despesa' 
  | 'transferencia' 
  | 'aplicacao' 
  | 'resgate' 
  | 'pagamento_emprestimo';

// Domínio da Transação
export type TransactionDomain = 'operational' | 'investment' | 'financing';

// Meta informações
export interface TransactionMeta {
  createdBy: string;
  source: 'manual' | 'import' | 'api';
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

// Transação Completa (novo schema)
export interface TransacaoCompleta {
  id: string;
  date: string;
  accountId: string;
  flow: FlowType;
  operationType: OperationType;
  domain: TransactionDomain;
  amount: number;
  accountingTypeId: string | null;
  categoryId: string | null;
  description: string;
  links: TransactionLinks;
  conciliated: boolean;
  attachments: string[];
  meta: TransactionMeta;
}

// Schema de Exportação v1.0
export interface FinanceExportV1 {
  schemaVersion: '1.0';
  exportedAt: string;
  data: {
    accounts: ContaCorrente[];
    accountingTypes: TipoContabil[];
    categories: Categoria[];
    investments: Array<{ id: string; name: string; status: string; meta: Record<string, unknown> }>;
    loans: Array<{ id: string; institution: string; currentBalance: number; meta: Record<string, unknown> }>;
    transferGroups: TransferGroup[];
    transactions: TransacaoCompleta[];
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

// Tipos de eventos para integração
export type FinanceEventType = 
  | 'transaction.created'
  | 'transaction.updated'
  | 'transaction.deleted'
  | 'transfer.created'
  | 'investment.linked'
  | 'loan.payment';

export interface FinanceEvent {
  type: FinanceEventType;
  payload: {
    transactionId?: string;
    transferGroupId?: string;
    investmentId?: string;
    loanId?: string;
    parcelaId?: string;
    links?: TransactionLinks;
  };
  timestamp: string;
}

// Projeção de saldo
export interface BalanceProjection {
  date: string;
  accountId: string;
  projectedBalance: number;
  confirmedBalance: number;
  pendingIn: number;
  pendingOut: number;
}

// Resumo de conta
export interface AccountSummary {
  accountId: string;
  accountName: string;
  initialBalance: number;
  currentBalance: number;
  projectedBalance: number;
  totalIn: number;
  totalOut: number;
  reconciliationStatus: 'ok' | 'warning' | 'error';
  transactionCount: number;
}

// Dados iniciais padrão
export const DEFAULT_ACCOUNTS: ContaCorrente[] = [
  {
    id: 'acc_principal',
    name: 'Conta Principal',
    type: 'checking',
    currency: 'BRL',
    initialBalance: 10000,
    color: 'hsl(var(--primary))',
    icon: 'building-2',
    createdAt: new Date().toISOString(),
    meta: {}
  },
  {
    id: 'acc_poupanca',
    name: 'Poupança',
    type: 'savings',
    currency: 'BRL',
    initialBalance: 5000,
    color: 'hsl(var(--success))',
    icon: 'piggy-bank',
    createdAt: new Date().toISOString(),
    meta: {}
  },
  {
    id: 'acc_carteira',
    name: 'Carteira',
    type: 'wallet',
    currency: 'BRL',
    initialBalance: 500,
    color: 'hsl(var(--warning))',
    icon: 'wallet',
    createdAt: new Date().toISOString(),
    meta: {}
  }
];

export const DEFAULT_ACCOUNTING_TYPES: TipoContabil[] = [
  { id: 'receita_operacional', label: 'Receita Operacional', nature: 'credit', dreGroup: 'RECEITAS_OPERACIONAIS' },
  { id: 'receita_financeira', label: 'Receita Financeira', nature: 'credit', dreGroup: 'RECEITAS_FINANCEIRAS' },
  { id: 'despesa_fixa', label: 'Despesa Fixa', nature: 'debit', dreGroup: 'DESPESAS_OPERACIONAIS' },
  { id: 'despesa_variavel', label: 'Despesa Variável', nature: 'debit', dreGroup: 'DESPESAS_OPERACIONAIS' },
  { id: 'investimento', label: 'Investimento', nature: 'debit', dreGroup: 'INVESTIMENTOS' },
  { id: 'financiamento', label: 'Financiamento', nature: 'debit', dreGroup: 'FINANCIAMENTOS' },
];

export const DEFAULT_CATEGORIES: Categoria[] = [
  { id: 'alimentacao', label: 'Alimentação', icon: '🍽️', type: 'expense' },
  { id: 'transporte', label: 'Transporte', icon: '🚗', type: 'expense' },
  { id: 'lazer', label: 'Lazer', icon: '🎮', type: 'expense' },
  { id: 'saude', label: 'Saúde', icon: '💊', type: 'expense' },
  { id: 'moradia', label: 'Moradia', icon: '🏠', type: 'expense' },
  { id: 'salario', label: 'Salário', icon: '💰', type: 'income' },
  { id: 'freelance', label: 'Freelance', icon: '💻', type: 'income' },
  { id: 'investimentos', label: 'Investimentos', icon: '📈', type: 'both' },
  { id: 'outros', label: 'Outros', icon: '📦', type: 'both' },
];

// Helpers
export function generateTransactionId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateTransferGroupId(): string {
  return `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency
  }).format(value);
}

export function getFlowTypeFromOperation(op: OperationType): FlowType {
  switch (op) {
    case 'receita':
    case 'resgate':
      return 'in';
    case 'despesa':
    case 'aplicacao':
    case 'pagamento_emprestimo':
      return 'out';
    case 'transferencia':
      return 'transfer_out';
    default:
      return 'out';
  }
}

export function getDomainFromOperation(op: OperationType): TransactionDomain {
  switch (op) {
    case 'receita':
    case 'despesa':
      return 'operational';
    case 'aplicacao':
    case 'resgate':
      return 'investment';
    case 'pagamento_emprestimo':
      return 'financing';
    case 'transferencia':
      return 'operational';
    default:
      return 'operational';
  }
}
