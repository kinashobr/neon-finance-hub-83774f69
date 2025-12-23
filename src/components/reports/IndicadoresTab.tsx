import { useMemo, useState, useCallback } from "react";
import {
  Droplets,
  Shield,
  TrendingUp,
  TrendingDown,
  Gauge,
  Wallet,
  Target,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Percent,
  PiggyBank,
  HeartPulse,
  Clock,
  Car,
  Calculator,
  Plus,
  Info,
  Settings,
  Save,
  Trash2,
} from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { ExpandablePanel } from "./ExpandablePanel";
import { DetailedIndicatorBadge } from "./DetailedIndicatorBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, parseDateLocal } from "@/lib/utils";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval, subDays, startOfDay, endOfDay, addMonths, isBefore, isAfter, isSameDay, differenceInMonths, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { ComparisonDateRanges, DateRange } from "@/types/finance";
import { ContaCorrente, TransacaoCompleta } from "@/types/finance";

interface IndicatorGroupProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function IndicatorGroup({ title, subtitle, icon, children, className }: IndicatorGroupProps) {
  return (
    <ExpandablePanel
      title={title}
      subtitle={subtitle}
      icon={icon}
      className={className}
      defaultExpanded={true}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </ExpandablePanel>
  );
}

// Interface para indicador personalizado
interface CustomIndicator {
  id: string;
  nome: string;
  descricao: string;
  formula: string;
  formato: 'percent' | 'ratio' | 'currency' | 'number';
  limiteVerde: number;
  limiteAmarelo: number;
  invertido: boolean; // Se true, menor é melhor
}

// Define o tipo de status esperado pelo IndicatorBadge
type IndicatorStatus = "success" | "warning" | "danger" | "neutral";

// Storage key for custom indicators
const CUSTOM_INDICATORS_KEY = "fin_custom_indicators_v1";

interface IndicadoresTabProps {
  dateRanges: ComparisonDateRanges;
}

export function IndicadoresTab({ dateRanges }: IndicadoresTabProps) {
  const {
    transacoesV2,
    contasMovimento,
    emprestimos,
    veiculos,
    categoriasV2,
    segurosVeiculo,
    getAtivosTotal,
    getPassivosTotal,
    getPatrimonioLiquido,
    getSaldoDevedor,
    getJurosTotais,
    calculateBalanceUpToDate,
    getValorFipeTotal,
    getSegurosAPagar,
    calculateLoanPrincipalDueInNextMonths,
    calculateLoanSchedule, // <-- NEW
  } = useFinance();

  const { range1, range2 } = dateRanges;

  // Estado para indicadores personalizados
  const [customIndicators, setCustomIndicators] = useState<CustomIndicator[]>(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_INDICATORS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newIndicator, setNewIndicator] = useState<Partial<CustomIndicator>>({
    nome: '',
    descricao: '',
    formula: '',
    formato: 'percent',
    limiteVerde: 0,
    limiteAmarelo: 0,
    invertido: false,
  });

  // --- NOVOS TIPOS PARA CORREÇÃO ---
  type LiquidezKey = 'corrente' | 'seca' | 'imediata' | 'geral';
  type EndividamentoKey = 'total' | 'dividaPL' | 'composicao' | 'imobilizacao';
  type RentabilidadeKey = 'margemLiquida' | 'retornoAtivos' | 'retornoPL';
  type EficienciaKey = 'despesasFixas' | 'operacional';
  type PessoaisKey = 'custoVida' | 'mesesSobrevivencia' | 'taxaPoupanca' | 'comprometimento';
  type OutrosKey = 'solvencia' | 'coberturaJuros' | 'diversificacao';

  type AllIndicatorKeys = LiquidezKey | EndividamentoKey | RentabilidadeKey | EficienciaKey | PessoaisKey | OutrosKey;
  type ValidGroupKey = 'liquidez' | 'endividamento' | 'rentabilidade' | 'eficiencia' | 'pessoais' | 'outros';

  type TrendResult = {
    diff: number;
    percent: number;
    trend: "up" | "down" | "stable";
  };

  type DisplayTrendResult = {
    percent: number;
    trend: "up" | "down" | "stable";
    status: IndicatorStatus;
  };
  // ---------------------------------

  // Sparkline generator (copiado de BalancoTab para consistência)
  const generateSparkline = useCallback((current: number, trend: "up" | "down" | "stable" = "stable") => {
    const base = Math.abs(current) * 0.7;
    const range = Math.abs(current) * 0.3 || 10;
    return Array.from({ length: 6 }, (_, i) => {
      const progress = i / 5;
      if (trend === "up") return base + range * progress + Math.random() * range * 0.2;
      if (trend === "down") return base + range * (1 - progress) + Math.random() * range * 0.2;
      return base + range * 0.5 + (Math.random() - 0.5) * range * 0.4;
    }).concat([Math.abs(current)]);
  }, []);

  // Salvar indicadores personalizados
  const saveCustomIndicators = (indicators: CustomIndicator[]) => {
    setCustomIndicators(indicators);
    localStorage.setItem(CUSTOM_INDICATORS_KEY, JSON.stringify(indicators));
  };

  // Adicionar novo indicador
  const handleAddIndicator = () => {
    if (!newIndicator.nome || !newIndicator.formula) {
      toast.error("Nome e fórmula são obrigatórios");
      return;
    }

    const indicator: CustomIndicator = {
      id: `custom_${Date.now()}`,
      nome: newIndicator.nome || '',
      descricao: newIndicator.descricao || '',
      formula: newIndicator.formula || '',
      formato: newIndicator.formato || 'percent',
      limiteVerde: newIndicator.limiteVerde || 0,
      limiteAmarelo: newIndicator.limiteAmarelo || 0,
      invertido: newIndicator.invertido || false,
    };

    saveCustomIndicators([...customIndicators, indicator]);
    setNewIndicator({
      nome: '',
      descricao: '',
      formula: '',
      formato: 'percent',
      limiteVerde: 0,
      limiteAmarelo: 0,
      invertido: false,
    });
    setDialogOpen(false);
    toast.success("Indicador personalizado criado!");
  };

  // Remover indicador
  const handleRemoveIndicator = (id: string) => {
    saveCustomIndicators(customIndicators.filter(i => i.id !== id));
    toast.success("Indicador removido");
  };
  
  // Implementação de handleReset
  const handleReset = () => {
    setNewIndicator({
      nome: '',
      descricao: '',
      formula: '',
      formato: 'percent',
      limiteVerde: 0,
      limiteAmarelo: 0,
      invertido: false,
    });
    setDialogOpen(false);
  };

  // Função para calcular a variação percentual
  const calculatePercentChange = useCallback((value1: number, value2: number) => {
    if (value2 === 0) return 0;
    return ((value1 - value2) / Math.abs(value2)) * 100;
  }, []);

  // Função para calcular a soma das parcelas de empréstimo que vencem DENTRO de um range
  const calculateLoanInstallmentsInPeriod = useCallback((range: DateRange) => {
    if (!range.from || !range.to) return 0;
    
    const start = startOfDay(range.from);
    const end = endOfDay(range.to);
    
    return emprestimos.reduce((acc, e) => {
      if (!e.dataInicio || e.meses === 0 || e.status === 'quitado') return acc;
      
      let totalParcelasNoPeriodo = 0;
      
      // Simular parcelas para encontrar as que caem no range
      for (let i = 1; i <= e.meses; i++) {
        const startDate = parseDateLocal(e.dataInicio);
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i - 1);
        
        if (isWithinInterval(dueDate, { start, end })) {
          totalParcelasNoPeriodo += e.parcela;
        }
      }
      
      return acc + totalParcelasNoPeriodo;
    }, 0);
  }, [emprestimos]);

  // Função para calcular todos os dados brutos e indicadores para um período
  const calculateIndicatorsForRange = useCallback((range: DateRange) => {
    
    // Se não houver data final, usamos o saldo atual (fim do histórico)
    const finalDate = range.to || new Date(9999, 11, 31);
    
    // 1. Filtrar transações para o período (para receitas/despesas)
    const transacoesPeriodo = transacoesV2.filter(t => {
      if (!range.from || !range.to) return true;
      try {
        const dataT = parseDateLocal(t.date);
        return isWithinInterval(dataT, { start: startOfDay(range.from!), end: endOfDay(range.to!) });
      } catch {
        return false;
      }
    });
    
    // 2. Calcular saldos das contas (saldo final do período)
    const saldosPorConta = contasMovimento.map(c => ({
        ...c,
        saldo: calculateBalanceUpToDate(c.id, finalDate, transacoesV2, contasMovimento)
    }));
    
    // Ativos
    // Contas Circulantes (incluindo Renda Fixa e Poupança)
    const contasLiquidas = saldosPorConta.filter(c => 
      ['corrente', 'poupanca', 'reserva', 'renda_fixa'].includes(c.accountType)
    );
    const caixaTotal = contasLiquidas.reduce((acc, c) => acc + Math.max(0, c.saldo), 0);

    // Contas Não Circulantes (Apenas Cripto e Objetivos)
    const contasInvestimentoNaoCirculante = saldosPorConta.filter(c => 
      ['cripto', 'objetivo'].includes(c.accountType)
    );
    const investimentosTotal = contasInvestimentoNaoCirculante.reduce((acc, c) => acc + Math.max(0, c.saldo), 0);
    
    const valorVeiculos = getValorFipeTotal(finalDate);

    const totalAtivos = getAtivosTotal(finalDate);

    // Passivos
    const saldoDevedor = getSaldoDevedor(finalDate); // Saldo devedor total na data
    const totalPassivos = getPassivosTotal(finalDate); // Total passivo global
    
    // Saldo devedor de cartões de crédito (saldos negativos na data final)
    const saldoDevedorCartoes = contasMovimento
      .filter(c => c.accountType === 'cartao_credito')
      .reduce((acc, c) => {
        const balance = saldosPorConta.find(s => s.id === c.id)?.saldo || 0;
        return acc + Math.abs(Math.min(0, balance)); // Only negative balance is liability
      }, 0);
      
    // Total Insurance Payable (from context)
    const segurosAPagarTotal = getSegurosAPagar(finalDate);
    
    // --- PASSIVO CURTO PRAZO (12 meses lookahead from finalDate) ---
    
    // Loan Principal Due in Next 12 Months
    const loanPrincipalShortTerm = calculateLoanPrincipalDueInNextMonths(finalDate, 12);
    
    // Insurance Premium Due in Next 12 Months
    let segurosAPagarShortTerm = 0;
    const lookaheadDate = addMonths(finalDate, 12);
    
    segurosVeiculo.forEach(seguro => {
        seguro.parcelas.forEach(parcela => {
            const dueDate = parseDateLocal(parcela.vencimento);
            
            // Check if the installment is due within the next 12 months AND is not yet paid AND is after the reporting date
            if (!parcela.paga && (isBefore(dueDate, lookaheadDate) || isSameDay(dueDate, lookaheadDate)) && isAfter(dueDate, finalDate)) {
                segurosAPagarShortTerm += parcela.valor;
            }
        });
    });
    
    segurosAPagarShortTerm = Math.min(segurosAPagarShortTerm, segurosAPagarTotal);
    
    // Passivo Curto Prazo (Total)
    const passivoCurtoPrazo = saldoDevedorCartoes + loanPrincipalShortTerm + segurosAPagarShortTerm; 
    
    // Receitas do período (Accrual/Cash basis is the same for Revenue)
    const calcReceitas = (trans: typeof transacoesV2) => trans
      .filter(t => t.operationType !== 'initial_balance' && (t.operationType === 'receita' || t.operationType === 'rendimento'))
      .reduce((acc, t) => acc + t.amount, 0);
      
    const receitasMesAtual = calcReceitas(transacoesPeriodo);
    
    // --- ACCRUAL BASIS CALCULATIONS FOR DRE-BASED INDICATORS ---
    
    const categoriasMap = new Map(categoriasV2.map(c => [c.id, c]));
    const seguroCategory = categoriasV2.find(c => c.label.toLowerCase() === 'seguro');
    
    // 1. Accrued Insurance Expense (from DRE logic)
    let accruedInsuranceExpense = 0;
    if (seguroCategory && range.from && range.to) {
        segurosVeiculo.forEach(seguro => {
            try {
                const vigenciaInicio = parseDateLocal(seguro.vigenciaInicio);
                const vigenciaFim = parseDateLocal(seguro.vigenciaFim);
                
                // Apropriação só ocorre se a vigência do seguro se sobrepõe ao período do relatório
                if (isAfter(vigenciaInicio, range.to) || isBefore(vigenciaFim, range.from)) return;

                const totalMonths = differenceInMonths(vigenciaFim, vigenciaInicio) + 1;
                if (totalMonths <= 0) return;
                
                const monthlyAccrual = seguro.valorTotal / totalMonths;
                
                const accrualStart = vigenciaInicio > range.from! ? vigenciaInicio : range.from!;
                const accrualEnd = vigenciaFim < range.to! ? vigenciaFim : range.to!;
                
                if (accrualStart <= accrualEnd) {
                    const monthsToAccrue = differenceInMonths(accrualEnd, accrualStart) + 1;
                    accruedInsuranceExpense += monthlyAccrual * monthsToAccrue;
                }
            } catch (e) {
                // Ignore calculation errors
            }
        });
    }
    
    // 2. Operating Expenses (Accrual Basis)
    let despesasFixasMesAccrual = 0;
    let despesasVariaveisMesAccrual = 0;
    
    // Despesas Cash Basis (used for personal indicators)
    let despesasMesAtualCash = 0;
    
    const transacoesDespesaOperacional = transacoesPeriodo.filter(t => 
      t.operationType !== 'initial_balance' && // EXCLUIR SALDO INICIAL
      t.operationType !== 'veiculo' && // EXCLUIR COMPRA/VENDA DE VEÍCULO
      t.flow === 'out' &&
      // EXCLUDE cash insurance payments if they are linked to the 'Seguro' category
      (t.categoryId !== seguroCategory?.id)
    );
    
    transacoesDespesaOperacional.forEach(t => {
        despesasMesAtualCash += t.amount; // Total cash outflow for expenses/payments
        
        const cat = categoriasMap.get(t.categoryId || '');
        const nature = cat?.nature || 'despesa_variavel';
        
        // Exclude cash insurance payments from accrual calculation if they are linked to the 'Seguro' category
        const isCashInsurancePayment = t.categoryId === seguroCategory?.id;

        if (!isCashInsurancePayment && t.operationType !== 'pagamento_emprestimo') {
            if (nature === 'despesa_fixa') {
                despesasFixasMesAccrual += t.amount;
            } else {
                despesasVariaveisMesAccrual += t.amount;
            }
        }
    });
    
    // Inject Accrued Insurance Expense
    despesasFixasMesAccrual += accruedInsuranceExpense;
    
    const totalDespesasOperacionaisAccrual = despesasFixasMesAccrual + despesasVariaveisMesAccrual;
    
    // 3. Interest Expense (Juros Empréstimos)
    let jurosEmprestimosPeriodo = 0;
    const pagamentosEmprestimo = transacoesPeriodo.filter(t => t.operationType === 'pagamento_emprestimo');
    
    pagamentosEmprestimo.forEach(t => {
        const loanIdStr = t.links?.loanId?.replace('loan_', '');
        const parcelaIdStr = t.links?.parcelaId;
        
        if (loanIdStr && parcelaIdStr) {
            const loanId = parseInt(loanIdStr);
            const parcelaNumber = parseInt(parcelaIdStr);
            
            if (!isNaN(loanId) && !isNaN(parcelaNumber)) {
                // NEW LOGIC: Use calculateLoanSchedule to find the exact interest component
                const loan = emprestimos.find(e => e.id === loanId);
                if (loan) {
                    const schedule = calculateLoanSchedule(loanId);
                    const item = schedule.find(i => i.parcela === parcelaNumber);
                    
                    if (item) {
                        jurosEmprestimosPeriodo += item.juros;
                    }
                }
            }
        }
    });
    
    // 4. Resultado Líquido (Accrual Basis)
    const resultadoOperacionalAccrual = receitasMesAtual - totalDespesasOperacionaisAccrual;
    const resultadoLiquidoAccrual = resultadoOperacionalAccrual - jurosEmprestimosPeriodo;

    // Annualized result factor
    const numDays = range.from && range.to ? differenceInDays(range.to, range.from) + 1 : 30;
    const annualizedFactor = 365 / numDays;
    const resultadoAnualizado = resultadoLiquidoAccrual * annualizedFactor;

    // --- INDICATORS CALCULATION ---

    // === INDICADORES DE LIQUIDEZ ===
    const liquidezCorrente = passivoCurtoPrazo > 0 ? caixaTotal / passivoCurtoPrazo : caixaTotal > 0 ? 999 : 0;
    const liquidezSeca = passivoCurtoPrazo > 0 ? (caixaTotal * 0.8) / passivoCurtoPrazo : caixaTotal > 0 ? 999 : 0;
    const liquidezImediata = passivoCurtoPrazo > 0 ? (caixaTotal * 0.5) / passivoCurtoPrazo : caixaTotal > 0 ? 999 : 0;
    const liquidezGeral = totalPassivos > 0 ? totalAtivos / totalPassivos : totalAtivos > 0 ? 999 : 0;

    // === INDICADORES DE ENDIVIDAMENTO ===
    const endividamentoTotal = totalAtivos > 0 ? (totalPassivos / totalAtivos) * 100 : 0;
    const patrimonioLiquido = totalAtivos - totalPassivos;
    const dividaPL = patrimonioLiquido > 0 ? (saldoDevedor / patrimonioLiquido) * 100 : 0;
    const composicaoEndividamento = totalPassivos > 0 ? (passivoCurtoPrazo / totalPassivos) * 100 : 0;
    const imobilizacaoPL = patrimonioLiquido > 0 ? (valorVeiculos / patrimonioLiquido) * 100 : 0;

    // === INDICADORES DE RENTABILIDADE ===
    const margemLiquida = receitasMesAtual > 0 ? (resultadoLiquidoAccrual / receitasMesAtual) * 100 : 0;
    const retornoAtivos = totalAtivos > 0 ? (resultadoAnualizado / totalAtivos) * 100 : 0;
    const retornoPL = patrimonioLiquido > 0 ? (resultadoAnualizado / patrimonioLiquido) * 100 : 0;

    // === INDICADORES DE EFICIÊNCIA ===
    const indiceDespesasFixas = totalDespesasOperacionaisAccrual > 0 ? (despesasFixasMesAccrual / totalDespesasOperacionaisAccrual) * 100 : 0;
    const eficienciaOperacional = receitasMesAtual > 0 ? (totalDespesasOperacionaisAccrual / receitasMesAtual) * 100 : 0;

    // === INDICADORES PESSOAIS ===
    const custoVidaMensal = despesasMesAtualCash;
    const mesesSobrevivencia = custoVidaMensal > 0 ? caixaTotal / custoVidaMensal : 999;
    const taxaPoupanca = receitasMesAtual > 0 ? (resultadoLiquidoAccrual / receitasMesAtual) * 100 : 0;
    const comprometimentoRenda = receitasMesAtual > 0 ? (despesasMesAtualCash / receitasMesAtual) * 100 : 0;

    // === INDICADORES DIVERSOS ===
    const solvencia = totalPassivos > 0 ? totalAtivos / totalPassivos : totalAtivos > 0 ? 999 : 0;
    const coberturaJuros = jurosEmprestimosPeriodo > 0 ? resultadoOperacionalAccrual / jurosEmprestimosPeriodo : resultadoOperacionalAccrual > 0 ? 999 : 0;
    const diversificacao = totalAtivos > 0 
      ? 100 - Math.max(
          (caixaTotal / totalAtivos) * 100,
          (investimentosTotal / totalAtivos) * 100,
          (valorVeiculos / totalAtivos) * 100
        )
      : 0;

    return {
      liquidez: {
        corrente: { valor: liquidezCorrente, status: (liquidezCorrente >= 1.5 ? "success" : liquidezCorrente >= 1 ? "warning" : "danger") as IndicatorStatus },
        seca: { valor: liquidezSeca, status: (liquidezSeca >= 1 ? "success" : liquidezSeca >= 0.7 ? "warning" : "danger") as IndicatorStatus },
        imediata: { valor: liquidezImediata, status: (liquidezImediata >= 0.5 ? "success" : liquidezImediata >= 0.3 ? "warning" : "danger") as IndicatorStatus },
        geral: { valor: liquidezGeral, status: (liquidezGeral >= 2 ? "success" : liquidezGeral >= 1 ? "warning" : "danger") as IndicatorStatus },
      },
      endividamento: {
        total: { valor: endividamentoTotal, status: (endividamentoTotal < 30 ? "success" : endividamentoTotal < 50 ? "warning" : "danger") as IndicatorStatus },
        dividaPL: { valor: dividaPL, status: (dividaPL < 50 ? "success" : dividaPL < 100 ? "warning" : "danger") as IndicatorStatus },
        composicao: { valor: composicaoEndividamento, status: (composicaoEndividamento < 50 ? "success" : composicaoEndividamento < 70 ? "warning" : "danger") as IndicatorStatus },
        imobilizacao: { valor: imobilizacaoPL, status: (imobilizacaoPL < 30 ? "success" : imobilizacaoPL < 50 ? "warning" : "danger") as IndicatorStatus },
      },
      rentabilidade: {
        margemLiquida: { valor: margemLiquida, status: (margemLiquida >= 20 ? "success" : margemLiquida >= 10 ? "warning" : "danger") as IndicatorStatus },
        retornoAtivos: { valor: retornoAtivos, status: (retornoAtivos >= 10 ? "success" : retornoAtivos >= 5 ? "warning" : "danger") as IndicatorStatus },
        retornoPL: { valor: retornoPL, status: (retornoPL >= 15 ? "success" : retornoPL >= 8 ? "warning" : "danger") as IndicatorStatus },
      },
      eficiencia: {
        despesasFixas: { valor: indiceDespesasFixas, status: (indiceDespesasFixas < 50 ? "success" : indiceDespesasFixas < 70 ? "warning" : "danger") as IndicatorStatus },
        operacional: { valor: eficienciaOperacional, status: (eficienciaOperacional < 70 ? "success" : eficienciaOperacional < 85 ? "warning" : "danger") as IndicatorStatus },
      },
      pessoais: {
        custoVida: { valor: custoVidaMensal, status: "neutral" as IndicatorStatus },
        mesesSobrevivencia: { valor: mesesSobrevivencia, status: (mesesSobrevivencia >= 6 ? "success" : mesesSobrevivencia >= 3 ? "warning" : "danger") as IndicatorStatus },
        taxaPoupanca: { valor: taxaPoupanca, status: (taxaPoupanca >= 20 ? "success" : taxaPoupanca >= 10 ? "warning" : "danger") as IndicatorStatus },
        comprometimento: { valor: comprometimentoRenda, status: (comprometimentoRenda < 70 ? "success" : comprometimentoRenda < 90 ? "warning" : "danger") as IndicatorStatus },
      },
      outros: {
        solvencia: { valor: solvencia, status: (solvencia >= 2 ? "success" : solvencia >= 1 ? "warning" : "danger") as IndicatorStatus },
        coberturaJuros: { valor: coberturaJuros, status: (coberturaJuros >= 3 ? "success" : coberturaJuros >= 1.5 ? "warning" : "danger") as IndicatorStatus },
        diversificacao: { valor: diversificacao, status: (diversificacao >= 40 ? "success" : diversificacao >= 20 ? "warning" : "danger") as IndicatorStatus },
      },
      raw: {
        caixaTotal,
        investimentosTotal,
        valorVeiculos,
        totalAtivos,
        totalPassivos,
        patrimonioLiquido,
        receitasMesAtual,
        despesasMesAtual: totalDespesasOperacionaisAccrual,
        resultadoMesAtual: resultadoLiquidoAccrual,
        saldoDevedor,
        passivoCurtoPrazo,
      },
      receitasMesAtual,
      despesasMesAtual: totalDespesasOperacionaisAccrual,
    };
  }, [transacoesV2, contasMovimento, emprestimos, veiculos, categoriasV2, getSaldoDevedor, calculateBalanceUpToDate, getAtivosTotal, getPassivosTotal, getValorFipeTotal, getSegurosAPagar, calculateLoanPrincipalDueInNextMonths, segurosVeiculo, calculateLoanSchedule, calculatePercentChange]);

  // Cálculos para Período 1 e Período 2
  const indicadores1 = useMemo(() => calculateIndicatorsForRange(range1), [calculateIndicatorsForRange, range1]);
  const indicadores2 = useMemo(() => calculateIndicatorsForRange(range2), [calculateIndicatorsForRange, range2]);

  // Função para calcular a variação percentual entre P1 e P2 para um indicador
  const calculateTrend = useCallback(<G extends ValidGroupKey, K extends AllIndicatorKeys>(key: K, group: G): TrendResult => {
    // Usamos 'as any' para acessar as propriedades dinamicamente
    const val1 = (indicadores1[group] as any)[key].valor;
    const val2 = (indicadores2[group] as any)[key].valor;
    
    if (!range2.from || val2 === 0) return { diff: 0, percent: 0, trend: "stable" };
    
    const percent = calculatePercentChange(val1, val2);
    const trend: "up" | "down" | "stable" = percent >= 0 ? "up" : "down";
    
    return { diff: val1 - val2, percent, trend };
  }, [indicadores1, indicadores2, range2.from, calculatePercentChange]);

  // Função para determinar o status e a tendência de exibição
  const getDisplayTrend = useCallback(<G extends ValidGroupKey, K extends AllIndicatorKeys>(key: K, group: G): DisplayTrendResult => {
    const { percent, trend } = calculateTrend(key, group);
    const { status } = (indicadores1[group] as any)[key];
    
    // Indicadores onde 'menor é melhor' (tendência invertida)
    const isInverse = group === 'endividamento' || 
                      (group === 'eficiencia' && key === 'operacional') || 
                      (group === 'pessoais' && key === 'comprometimento');

    let finalTrend: "up" | "down" | "stable" = trend;

    if (range2.from) {
        // Se houver comparação, inverte a tendência se for um indicador 'menor é melhor'
        if (isInverse) {
            finalTrend = trend === 'up' ? 'down' : trend === 'down' ? 'up' : 'stable';
        }
    } else {
        // Se não houver comparação, a tendência é baseada no status (simplificado)
        if (status === 'success') {
            finalTrend = isInverse ? 'down' : 'up';
        } else if (status === 'danger') {
            finalTrend = isInverse ? 'up' : 'down';
        } else {
            finalTrend = 'stable';
        }
    }

    return { trend: finalTrend, percent, status };
  }, [calculateTrend, indicadores1, range2.from]);

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const formatRatio = (value: number) => value >= 999 ? "∞" : `${value.toFixed(2)}x`;
  const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatMeses = (value: number) => value >= 999 ? "∞" : `${value.toFixed(1)} meses`;

  // Indicadores de Crescimento (Calculados separadamente para usar P1 vs P2)
  const crescimentoReceitas = useMemo(() => {
    const rec1 = indicadores1.receitasMesAtual;
    const rec2 = indicadores2.receitasMesAtual;
    const percent = calculatePercentChange(rec1, rec2);
    const trend: "up" | "down" | "stable" = percent >= 0 ? "up" : "down";
    const status: IndicatorStatus = percent > 5 ? "success" : percent >= 0 ? "warning" : "danger";
    return { valor: percent, trend, status, formula: "((Receitas P1 - Receitas P2) / Receitas P2) × 100" };
  }, [indicadores1, indicadores2, calculatePercentChange]);

  const crescimentoDespesas = useMemo(() => {
    const desp1 = indicadores1.despesasMesAtual;
    const desp2 = indicadores2.despesasMesAtual;
    const percent = calculatePercentChange(desp1, desp2);
    const trend: "up" | "down" | "stable" = percent <= 0 ? "up" : "down"; // Menor crescimento de despesas é melhor (up)
    const status: IndicatorStatus = percent < 0 ? "success" : percent < 10 ? "warning" : "danger";
    return { valor: percent, trend, status, formula: "((Despesas P1 - Despesas P2) / Despesas P2) × 100" };
  }, [indicadores1, indicadores2, calculatePercentChange]);

  return (
    <div className="space-y-6">
      {/* Header com Legenda e Botão */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4 animate-fade-in">
        <div className="flex flex-wrap items-center gap-6">
          <span className="text-sm font-medium text-muted-foreground">Legenda:</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-sm text-muted-foreground">Saudável</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-sm text-muted-foreground">Atenção</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-sm text-muted-foreground">Crítico</span>
          </div>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Indicador
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Indicador Personalizado</DialogTitle>
              <DialogDescription>
                Defina um novo indicador financeiro com sua própria fórmula e limites.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome do Indicador</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Taxa de Economia"
                  value={newIndicator.nome}
                  onChange={(e) => setNewIndicator({ ...newIndicator, nome: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva o que este indicador mede..."
                  value={newIndicator.descricao}
                  onChange={(e) => setNewIndicator({ ...newIndicator, descricao: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="formula">Fórmula (texto explicativo)</Label>
                <Input
                  id="formula"
                  placeholder="Ex: (Receitas - Despesas) / Receitas × 100"
                  value={newIndicator.formula}
                  onChange={(e) => setNewIndicator({ ...newIndicator, formula: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis disponíveis: caixaTotal, investimentosTotal, valorVeiculos, totalAtivos, totalPassivos, patrimonioLiquido, receitasMesAtual, despesasMesAtual, resultadoMesAtual, saldoDevedor, passivoCurtoPrazo
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="formato">Formato</Label>
                  <Select 
                    value={newIndicator.formato} 
                    onValueChange={(v) => setNewIndicator({ ...newIndicator, formato: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentual (%)</SelectItem>
                      <SelectItem value="ratio">Razão (x)</SelectItem>
                      <SelectItem value="currency">Moeda (R$)</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Invertido?</Label>
                  <Select 
                    value={newIndicator.invertido ? "true" : "false"} 
                    onValueChange={(v) => setNewIndicator({ ...newIndicator, invertido: v === "true" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Maior é melhor</SelectItem>
                      <SelectItem value="true">Menor é melhor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="limiteVerde">Limite Verde (Saudável)</Label>
                  <Input
                    id="limiteVerde"
                    type="number"
                    placeholder="Ex: 20"
                    value={newIndicator.limiteVerde}
                    onChange={(e) => setNewIndicator({ ...newIndicator, limiteVerde: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="limiteAmarelo">Limite Amarelo (Atenção)</Label>
                  <Input
                    id="limiteAmarelo"
                    type="number"
                    placeholder="Ex: 10"
                    value={newIndicator.limiteAmarelo}
                    onChange={(e) => setNewIndicator({ ...newIndicator, limiteAmarelo: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleReset}>
                Cancelar
              </Button>
              <Button onClick={handleAddIndicator} className="gap-2">
                <Save className="w-4 h-4" />
                Salvar Indicador
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* LIQUIDEZ */}
      <IndicatorGroup
        title="Indicadores de Liquidez"
        subtitle="Capacidade de pagamento de curto prazo"
        icon={<Droplets className="w-4 h-4" />}
      >
        <DetailedIndicatorBadge
          title="Liquidez Corrente"
          value={formatRatio(indicadores1.liquidez.corrente.valor)}
          status={indicadores1.liquidez.corrente.status}
          trend={getDisplayTrend('corrente', 'liquidez').trend}
          trendLabel={range2.from ? `${getDisplayTrend('corrente', 'liquidez').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Mede a capacidade de pagar obrigações de curto prazo com ativos circulantes. Valor ideal: acima de 1.5x"
          formula="Ativo Circulante / Passivo Circulante (12 meses)"
          sparklineData={generateSparkline(indicadores1.liquidez.corrente.valor, getDisplayTrend('corrente', 'liquidez').trend)}
          icon={<Droplets className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Liquidez Seca"
          value={formatRatio(indicadores1.liquidez.seca.valor)}
          status={indicadores1.liquidez.seca.status}
          trend={getDisplayTrend('seca', 'liquidez').trend}
          trendLabel={range2.from ? `${getDisplayTrend('seca', 'liquidez').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Capacidade de pagamento excluindo ativos menos líquidos. Mais conservador que a liquidez corrente. Ideal: acima de 1x"
          formula="(Ativo Circulante × 0.8) / Passivo Circulante (12 meses)"
          sparklineData={generateSparkline(indicadores1.liquidez.seca.valor, getDisplayTrend('seca', 'liquidez').trend)}
          icon={<Droplets className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Liquidez Imediata"
          value={formatRatio(indicadores1.liquidez.imediata.valor)}
          status={indicadores1.liquidez.imediata.status}
          trend={getDisplayTrend('imediata', 'liquidez').trend}
          trendLabel={range2.from ? `${getDisplayTrend('imediata', 'liquidez').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Capacidade de pagamento instantâneo apenas com disponibilidades. Ideal: acima de 0.5x"
          formula="Disponibilidades / Passivo Circulante (12 meses)"
          sparklineData={generateSparkline(indicadores1.liquidez.imediata.valor, getDisplayTrend('imediata', 'liquidez').trend)}
          icon={<Droplets className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Liquidez Geral"
          value={formatRatio(indicadores1.liquidez.geral.valor)}
          status={indicadores1.liquidez.geral.status}
          trend={getDisplayTrend('geral', 'liquidez').trend}
          trendLabel={range2.from ? `${getDisplayTrend('geral', 'liquidez').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Capacidade de pagar todas as dívidas com todos os ativos. Visão de longo prazo. Ideal: acima de 2x"
          formula="Ativo Total / Passivo Total (na data final)"
          sparklineData={generateSparkline(indicadores1.liquidez.geral.valor, getDisplayTrend('geral', 'liquidez').trend)}
          icon={<Shield className="w-4 h-4" />}
        />
      </IndicatorGroup>

      {/* ENDIVIDAMENTO */}
      <IndicatorGroup
        title="Indicadores de Endividamento"
        subtitle="Nível de comprometimento com dívidas"
        icon={<Shield className="w-4 h-4" />}
      >
        <DetailedIndicatorBadge
          title="Endividamento Total"
          value={formatPercent(indicadores1.endividamento.total.valor)}
          status={indicadores1.endividamento.total.status}
          trend={getDisplayTrend('total' as EndividamentoKey, 'endividamento').trend}
          trendLabel={range2.from ? `${getDisplayTrend('total' as EndividamentoKey, 'endividamento').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Percentual dos ativos financiados por terceiros (dívidas). Quanto menor, melhor. Ideal: abaixo de 30%"
          formula="(Passivo Total / Ativo Total) × 100 (na data final)"
          sparklineData={generateSparkline(indicadores1.endividamento.total.valor, getDisplayTrend('total' as EndividamentoKey, 'endividamento').trend)}
          icon={<Shield className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Dívida / Patrimônio"
          value={formatPercent(indicadores1.endividamento.dividaPL.valor)}
          status={indicadores1.endividamento.dividaPL.status}
          trend={getDisplayTrend('dividaPL' as EndividamentoKey, 'endividamento').trend}
          trendLabel={range2.from ? `${getDisplayTrend('dividaPL' as EndividamentoKey, 'endividamento').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Relação entre capital de terceiros e capital próprio. Indica alavancagem. Ideal: abaixo de 50%"
          formula="(Dívida Total / Patrimônio Líquido) × 100 (na data final)"
          sparklineData={generateSparkline(indicadores1.endividamento.dividaPL.valor, getDisplayTrend('dividaPL' as EndividamentoKey, 'endividamento').trend)}
          icon={<Shield className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Composição do Endividamento"
          value={formatPercent(indicadores1.endividamento.composicao.valor)}
          status={indicadores1.endividamento.composicao.status}
          trend={getDisplayTrend('composicao' as EndividamentoKey, 'endividamento').trend}
          trendLabel={range2.from ? `${getDisplayTrend('composicao' as EndividamentoKey, 'endividamento').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Percentual das dívidas que vencem no curto prazo. Menor valor indica menor pressão imediata. Ideal: abaixo de 50%"
          formula="(Passivo Circulante (12 meses) / Passivo Total) × 100"
          sparklineData={generateSparkline(indicadores1.endividamento.composicao.valor, getDisplayTrend('composicao' as EndividamentoKey, 'endividamento').trend)}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Imobilização do PL"
          value={formatPercent(indicadores1.endividamento.imobilizacao.valor)}
          status={indicadores1.endividamento.imobilizacao.status}
          trend={getDisplayTrend('imobilizacao' as EndividamentoKey, 'endividamento').trend}
          trendLabel={range2.from ? `${getDisplayTrend('imobilizacao' as EndividamentoKey, 'endividamento').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Quanto do patrimônio está investido em bens imobilizados (veículos). Ideal: abaixo de 30%"
          formula="(Ativo Imobilizado / Patrimônio Líquido) × 100 (na data final)"
          sparklineData={generateSparkline(indicadores1.endividamento.imobilizacao.valor, getDisplayTrend('imobilizacao' as EndividamentoKey, 'endividamento').trend)}
          icon={<Car className="w-4 h-4" />}
        />
      </IndicatorGroup>

      {/* RENTABILIDADE */}
      <IndicatorGroup
        title="Indicadores de Rentabilidade"
        subtitle="Retorno sobre recursos"
        icon={<TrendingUp className="w-4 h-4" />}
      >
        <DetailedIndicatorBadge
          title="Margem Líquida"
          value={formatPercent(indicadores1.rentabilidade.margemLiquida.valor)}
          status={indicadores1.rentabilidade.margemLiquida.status}
          trend={getDisplayTrend('margemLiquida' as RentabilidadeKey, 'rentabilidade').trend}
          trendLabel={range2.from ? `${getDisplayTrend('margemLiquida' as RentabilidadeKey, 'rentabilidade').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Percentual das receitas que sobra como lucro. Mede eficiência na conversão de receita em resultado. Ideal: acima de 20%"
          formula="(Resultado Líquido / Receitas) × 100 (no período)"
          sparklineData={generateSparkline(indicadores1.rentabilidade.margemLiquida.valor, getDisplayTrend('margemLiquida' as RentabilidadeKey, 'rentabilidade').trend)}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Retorno sobre Ativos (ROA)"
          value={formatPercent(indicadores1.rentabilidade.retornoAtivos.valor)}
          status={indicadores1.rentabilidade.retornoAtivos.status}
          trend={getDisplayTrend('retornoAtivos' as RentabilidadeKey, 'rentabilidade').trend}
          trendLabel={range2.from ? `${getDisplayTrend('retornoAtivos' as RentabilidadeKey, 'rentabilidade').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Retorno anualizado sobre o total de ativos. Mede eficiência no uso dos recursos. Ideal: acima de 10%"
          formula="(Resultado Anualizado / Ativo Total) × 100 (na data final)"
          sparklineData={generateSparkline(indicadores1.rentabilidade.retornoAtivos.valor, getDisplayTrend('retornoAtivos' as RentabilidadeKey, 'rentabilidade').trend)}
          icon={<Target className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Retorno sobre PL (ROE)"
          value={formatPercent(indicadores1.rentabilidade.retornoPL.valor)}
          status={indicadores1.rentabilidade.retornoPL.status}
          trend={getDisplayTrend('retornoPL' as RentabilidadeKey, 'rentabilidade').trend}
          trendLabel={range2.from ? `${getDisplayTrend('retornoPL' as RentabilidadeKey, 'rentabilidade').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Retorno anualizado sobre o capital próprio. Indica remuneração do patrimônio. Ideal: acima de 15%"
          formula="(Resultado Anualizado / Patrimônio Líquido) × 100 (na data final)"
          sparklineData={generateSparkline(indicadores1.rentabilidade.retornoPL.valor, getDisplayTrend('retornoPL' as RentabilidadeKey, 'rentabilidade').trend)}
          icon={<PiggyBank className="w-4 h-4" />}
        />
      </IndicatorGroup>

      {/* EFICIÊNCIA */}
      <IndicatorGroup
        title="Indicadores de Eficiência"
        subtitle="Otimização de recursos"
        icon={<Gauge className="w-4 h-4" />}
      >
        <DetailedIndicatorBadge
          title="Índice Despesas Fixas"
          value={formatPercent(indicadores1.eficiencia.despesasFixas.valor)}
          status={indicadores1.eficiencia.despesasFixas.status}
          trend={getDisplayTrend('despesasFixas' as EficienciaKey, 'eficiencia').trend}
          trendLabel={range2.from ? `${getDisplayTrend('despesasFixas' as EficienciaKey, 'eficiencia').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Proporção de despesas fixas no total. Indica rigidez do orçamento. Ideal: abaixo de 50%"
          formula="(Despesas Fixas / Despesas Totais) × 100 (no período)"
          sparklineData={generateSparkline(indicadores1.eficiencia.despesasFixas.valor, getDisplayTrend('despesasFixas' as EficienciaKey, 'eficiencia').trend)}
          icon={<Gauge className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Crescimento Receitas"
          value={formatPercent(crescimentoReceitas.valor)}
          status={crescimentoReceitas.status}
          trend={crescimentoReceitas.trend}
          trendLabel={range2.from ? `vs P2` : undefined}
          descricao="Variação das receitas em relação ao período anterior. Indica tendência de ganhos. Ideal: positivo"
          formula={crescimentoReceitas.formula}
          sparklineData={generateSparkline(Math.abs(crescimentoReceitas.valor) + 10, crescimentoReceitas.trend)}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Crescimento Despesas"
          value={formatPercent(crescimentoDespesas.valor)}
          status={crescimentoDespesas.status}
          trend={crescimentoDespesas.trend}
          trendLabel={range2.from ? `vs P2` : undefined}
          descricao="Variação das despesas em relação ao período anterior. Ideal: negativo ou controlado"
          formula={crescimentoDespesas.formula}
          sparklineData={generateSparkline(Math.abs(crescimentoDespesas.valor) + 10, crescimentoDespesas.trend)}
          icon={<TrendingDown className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Eficiência Operacional"
          value={formatPercent(indicadores1.eficiencia.operacional.valor)}
          status={indicadores1.eficiencia.operacional.status}
          trend={getDisplayTrend('operacional' as EficienciaKey, 'eficiencia').trend}
          trendLabel={range2.from ? `${getDisplayTrend('operacional' as EficienciaKey, 'eficiencia').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Percentual das receitas consumidas por despesas. Menor valor indica maior eficiência. Ideal: abaixo de 70%"
          formula="(Despesas Totais / Receitas) × 100 (no período)"
          sparklineData={generateSparkline(indicadores1.eficiencia.operacional.valor, getDisplayTrend('operacional' as EficienciaKey, 'eficiencia').trend)}
          icon={<Activity className="w-4 h-4" />}
        />
      </IndicatorGroup>

      {/* PESSOAIS */}
      <IndicatorGroup
        title="Indicadores Pessoais"
        subtitle="Saúde financeira individual"
        icon={<HeartPulse className="w-4 h-4" />}
      >
        <DetailedIndicatorBadge
          title="Custo de Vida Mensal"
          value={formatCurrency(indicadores1.pessoais.custoVida.valor)}
          status="neutral"
          descricao="Valor total de despesas no mês atual. Base para cálculo de reserva de emergência."
          formula="Σ Despesas do Mês (no período)"
          icon={<Wallet className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Meses de Sobrevivência"
          value={formatMeses(indicadores1.pessoais.mesesSobrevivencia.valor)}
          status={indicadores1.pessoais.mesesSobrevivencia.status}
          trend={getDisplayTrend('mesesSobrevivencia' as PessoaisKey, 'pessoais').trend}
          trendLabel={range2.from ? `${getDisplayTrend('mesesSobrevivencia' as PessoaisKey, 'pessoais').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Quantos meses você consegue manter seu padrão de vida apenas com reservas. Ideal: acima de 6 meses"
          formula="Caixa e Equivalentes / Custo de Vida Mensal"
          sparklineData={generateSparkline(indicadores1.pessoais.mesesSobrevivencia.valor, getDisplayTrend('mesesSobrevivencia' as PessoaisKey, 'pessoais').trend)}
          icon={<Clock className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Taxa de Poupança"
          value={formatPercent(indicadores1.pessoais.taxaPoupanca.valor)}
          status={indicadores1.pessoais.taxaPoupanca.status}
          trend={getDisplayTrend('taxaPoupanca' as PessoaisKey, 'pessoais').trend}
          trendLabel={range2.from ? `${getDisplayTrend('taxaPoupanca' as PessoaisKey, 'pessoais').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Percentual da renda que sobra para poupar/investir. Ideal: acima de 20%"
          formula="(Resultado Líquido / Receitas) × 100 (no período)"
          sparklineData={generateSparkline(indicadores1.pessoais.taxaPoupanca.valor, getDisplayTrend('taxaPoupanca' as PessoaisKey, 'pessoais').trend)}
          icon={<PiggyBank className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Comprometimento da Renda"
          value={formatPercent(indicadores1.pessoais.comprometimento.valor)}
          status={indicadores1.pessoais.comprometimento.status}
          trend={getDisplayTrend('comprometimento' as PessoaisKey, 'pessoais').trend}
          trendLabel={range2.from ? `${getDisplayTrend('comprometimento' as PessoaisKey, 'pessoais').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Percentual da renda utilizada em despesas. Quanto menor, mais folga financeira. Ideal: abaixo de 70%"
          formula="(Despesas / Receitas) × 100 (no período)"
          sparklineData={generateSparkline(indicadores1.pessoais.comprometimento.valor, getDisplayTrend('comprometimento' as PessoaisKey, 'pessoais').trend)}
          icon={<Percent className="w-4 h-4" />}
        />
      </IndicatorGroup>

      {/* OUTROS */}
      <IndicatorGroup
        title="Outros Indicadores"
        subtitle="Métricas complementares"
        icon={<Target className="w-4 h-4" />}
      >
        <DetailedIndicatorBadge
          title="Índice de Solvência"
          value={formatRatio(indicadores1.outros.solvencia.valor)}
          status={indicadores1.outros.solvencia.status}
          trend={getDisplayTrend('solvencia' as OutrosKey, 'outros').trend}
          trendLabel={range2.from ? `${getDisplayTrend('solvencia' as OutrosKey, 'outros').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Capacidade de pagar todas as dívidas com os ativos disponíveis. Ideal: acima de 2x"
          formula="Ativo Total / Passivo Total (na data final)"
          sparklineData={generateSparkline(indicadores1.outros.solvencia.valor, getDisplayTrend('solvencia' as OutrosKey, 'outros').trend)}
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Cobertura de Juros"
          value={formatRatio(indicadores1.outros.coberturaJuros.valor)}
          status={indicadores1.outros.coberturaJuros.status}
          trend={getDisplayTrend('coberturaJuros' as OutrosKey, 'outros').trend}
          trendLabel={range2.from ? `${getDisplayTrend('coberturaJuros' as OutrosKey, 'outros').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Capacidade de pagar juros com o resultado operacional. Ideal: acima de 3x"
          formula="Resultado Operacional / Despesas com Juros (no período)"
          sparklineData={generateSparkline(indicadores1.outros.coberturaJuros.valor, getDisplayTrend('coberturaJuros' as OutrosKey, 'outros').trend)}
          icon={<Shield className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Diversificação Patrimonial"
          value={formatPercent(indicadores1.outros.diversificacao.valor)}
          status={indicadores1.outros.diversificacao.status}
          trend={getDisplayTrend('diversificacao' as OutrosKey, 'outros').trend}
          trendLabel={range2.from ? `${getDisplayTrend('diversificacao' as OutrosKey, 'outros').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Nível de distribuição dos ativos entre diferentes classes. Maior valor indica menor concentração. Ideal: acima de 40%"
          formula="100 - Max(% Caixa, % Investimentos, % Imobilizado) (na data final)"
          sparklineData={generateSparkline(indicadores1.outros.diversificacao.valor, getDisplayTrend('diversificacao' as OutrosKey, 'outros').trend)}
          icon={<Activity className="w-4 h-4" />}
        />
      </IndicatorGroup>

      {/* INDICADORES PERSONALIZADOS */}
      {customIndicators.length > 0 && (
        <IndicatorGroup
          title="Indicadores Personalizados"
          subtitle="Criados por você"
          icon={<Settings className="w-4 h-4" />}
        >
          {customIndicators.map((ind) => (
            <div key={ind.id} className="relative group">
              <DetailedIndicatorBadge
                title={ind.nome}
                value="--"
                status="neutral"
                descricao={ind.descricao}
                formula={ind.formula}
                icon={<Calculator className="w-4 h-4" />}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemoveIndicator(ind.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </IndicatorGroup>
      )}
    </div>
  );
}