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
  | 'objetivos_financeiros';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  conta_corrente: 'Conta Corrente',
  aplicacao_renda_fixa: 'Aplicação Renda Fixa',
  poupanca: 'Poupança',
  criptoativos: 'Criptoativos',
  reserva_emergencia: 'Reserva de Emergência',
  objetivos_financeiros: 'Objetivos Financeiros',
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
  color?: string;
  icon?: string;
  createdAt: string;
  meta: Record<string, unknown>;
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
  parcelaId?: string | null;
  vehicleTransactionId?: string | null;
}

// Tipos de Fluxo
export type FlowType = 'in' | 'out' | 'transfer_in' | 'transfer_out';

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
  | 'rendimento';

// Domínio da Transação
export type TransactionDomain = 'operational' | 'investment' | 'financing' | 'asset';

// Meta informações
export interface TransactionMeta {
  createdBy: string;
  source: 'manual' | 'import' | 'api';
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  vehicleOperation?: 'compra' | 'venda';
  tipoVeiculo?: 'carro' | 'moto' | 'caminhao';
  numeroContrato?: string;
  pendingLoanConfig?: boolean;
}

// Transação Completa (atualizado)
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

// Schema de Exportação v1.1
export interface FinanceExportV1 {
  schemaVersion: '1.1';
  exportedAt: string;
  data: {
    accounts: ContaCorrente[];
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
  | 'loan.payment'
  | 'vehicle.transaction';

export interface FinanceEvent {
  type: FinanceEventType;
  payload: {
    transactionId?: string;
    transferGroupId?: string;
    investmentId?: string;
    loanId?: string;
    parcelaId?: string;
    vehicleTransactionId?: string;
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

// Dados iniciais padrão
export const DEFAULT_ACCOUNTS: ContaCorrente[] = [
  {
    id: 'acc_principal',
    name: 'Conta Principal',
    accountType: 'conta_corrente',
    institution: 'Banco Principal',
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
    accountType: 'poupanca',
    institution: 'Banco Principal',
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
    accountType: 'reserva_emergencia',
    currency: 'BRL',
    initialBalance: 500,
    color: 'hsl(var(--warning))',
    icon: 'wallet',
    createdAt: new Date().toISOString(),
    meta: {}
  }
];

export const DEFAULT_CATEGORIES: Categoria[] = [
  { id: 'alimentacao', label: 'Alimentação', icon: '🍽️', nature: 'despesa_variavel', type: 'expense' },
  { id: 'transporte', label: 'Transporte', icon: '🚗', nature: 'despesa_variavel', type: 'expense' },
  { id: 'lazer', label: 'Lazer', icon: '🎮', nature: 'despesa_variavel', type: 'expense' },
  { id: 'saude', label: 'Saúde', icon: '💊', nature: 'despesa_variavel', type: 'expense' },
  { id: 'moradia', label: 'Moradia', icon: '🏠', nature: 'despesa_fixa', type: 'expense' },
  { id: 'salario', label: 'Salário', icon: '💰', nature: 'receita', type: 'income' },
  { id: 'freelance', label: 'Freelance', icon: '💻', nature: 'receita', type: 'income' },
  { id: 'investimentos', label: 'Investimentos', icon: '📈', nature: 'receita', type: 'both' },
  { id: 'seguro', label: 'Seguro', icon: '🛡️', nature: 'despesa_fixa', type: 'expense' },
  { id: 'outros', label: 'Outros', icon: '📦', nature: 'despesa_variavel', type: 'both' },
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

export function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency
  }).format(value);
}

export function getFlowTypeFromOperation(op: OperationType, vehicleOp?: 'compra' | 'venda'): FlowType {
  switch (op) {
    case 'receita':
    case 'resgate':
    case 'liberacao_emprestimo':
    case 'rendimento':
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
      return 'operational';
    case 'aplicacao':
    case 'resgate':
      return 'investment';
    case 'pagamento_emprestimo':
      return 'financing';
    case 'veiculo':
      return 'asset';
    case 'transferencia':
      return 'operational';
    default:
      return 'operational';
  }
}

export function getCategoryTypeFromNature(nature: CategoryNature): 'income' | 'expense' | 'both' {
  return nature === 'receita' ? 'income' : 'expense';
}
