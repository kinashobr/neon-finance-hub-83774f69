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
  Zap,
  Flame,
  Anchor,
  ShieldCheck,
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
    calculateLoanSchedule,
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
  type LiquidezKey = 'corrente' | 'seca' | 'imediata' | 'geral' | 'solvenciaImediata';
  type EndividamentoKey = 'total' | 'dividaPL' | 'composicao' | 'imobilizacao';
  type RentabilidadeKey = 'margemLiquida' | 'retornoAtivos' | 'retornoPL' | 'liberdadeFinanceira';
  type EficienciaKey = 'despesasFixas' | 'operacional' | 'burnRate';
  type PessoaisKey = 'custoVida' | 'mesesSobrevivencia' | 'taxaPoupanca' | 'comprometimento' | 'margemSeguranca';
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

  const saveCustomIndicators = (indicators: CustomIndicator[]) => {
    setCustomIndicators(indicators);
    localStorage.setItem(CUSTOM_INDICATORS_KEY, JSON.stringify(indicators));
  };

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

  const handleRemoveIndicator = (id: string) => {
    saveCustomIndicators(customIndicators.filter(i => i.id !== id));
    toast.success("Indicador removido");
  };
  
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

  const calculatePercentChange = useCallback((value1: number, value2: number) => {
    if (value2 === 0) return 0;
    return ((value1 - value2) / Math.abs(value2)) * 100;
  }, []);

  const calculateIndicatorsForRange = useCallback((range: DateRange) => {
    const finalDate = range.to || new Date(9999, 11, 31);
    
    const transacoesPeriodo = transacoesV2.filter(t => {
      if (!range.from || !range.to) return true;
      try {
        const dataT = parseDateLocal(t.date);
        return isWithinInterval(dataT, { start: startOfDay(range.from!), end: endOfDay(range.to!) });
      } catch {
        return false;
      }
    });
    
    const saldosPorConta = contasMovimento.map(c => ({
        ...c,
        saldo: calculateBalanceUpToDate(c.id, finalDate, transacoesV2, contasMovimento)
    }));
    
    const contasLiquidas = saldosPorConta.filter(c => 
      ['corrente', 'poupanca', 'reserva', 'renda_fixa'].includes(c.accountType)
    );
    const caixaTotal = contasLiquidas.reduce((acc, c) => acc + Math.max(0, c.saldo), 0);
    
    const contaCorrentePura = saldosPorConta.filter(c => c.accountType === 'corrente').reduce((acc, c) => acc + Math.max(0, c.saldo), 0);

    const contasInvestimentoNaoCirculante = saldosPorConta.filter(c => 
      ['cripto', 'objetivo'].includes(c.accountType)
    );
    const investimentosTotal = contasInvestimentoNaoCirculante.reduce((acc, c) => acc + Math.max(0, c.saldo), 0);
    
    const valorVeiculos = getValorFipeTotal(finalDate);
    const totalAtivos = getAtivosTotal(finalDate);
    const saldoDevedor = getSaldoDevedor(finalDate);
    const totalPassivos = getPassivosTotal(finalDate);
    
    const saldoDevedorCartoes = contasMovimento
      .filter(c => c.accountType === 'cartao_credito')
      .reduce((acc, c) => {
        const balance = saldosPorConta.find(s => s.id === c.id)?.saldo || 0;
        return acc + Math.abs(Math.min(0, balance));
      }, 0);
      
    const segurosAPagarTotal = getSegurosAPagar(finalDate);
    const loanPrincipalShortTerm = calculateLoanPrincipalDueInNextMonths(finalDate, 12);
    
    let segurosAPagarShortTerm = 0;
    const lookaheadDate = addMonths(finalDate, 12);
    segurosVeiculo.forEach(seguro => {
        seguro.parcelas.forEach(parcela => {
            const dueDate = parseDateLocal(parcela.vencimento);
            if (!parcela.paga && (isBefore(dueDate, lookaheadDate) || isSameDay(dueDate, lookaheadDate)) && isAfter(dueDate, finalDate)) {
                segurosAPagarShortTerm += parcela.valor;
            }
        });
    });
    segurosAPagarShortTerm = Math.min(segurosAPagarShortTerm, segurosAPagarTotal);
    
    const passivoCurtoPrazo = saldoDevedorCartoes + loanPrincipalShortTerm + segurosAPagarShortTerm; 
    
    const calcReceitas = (trans: typeof transacoesV2) => trans
      .filter(t => t.operationType !== 'initial_balance' && (t.operationType === 'receita' || t.operationType === 'rendimento'))
      .reduce((acc, t) => acc + t.amount, 0);
      
    const receitasMesAtual = calcReceitas(transacoesPeriodo);
    
    const rendimentosInvestimentos = transacoesPeriodo
      .filter(t => t.operationType === 'rendimento')
      .reduce((acc, t) => acc + t.amount, 0);
    
    const categoriasMap = new Map(categoriasV2.map(c => [c.id, c]));
    const seguroCategory = categoriasV2.find(c => c.label.toLowerCase() === 'seguro');
    
    let accruedInsuranceExpense = 0;
    if (seguroCategory && range.from && range.to) {
        segurosVeiculo.forEach(seguro => {
            try {
                const vigenciaInicio = parseDateLocal(seguro.vigenciaInicio);
                const vigenciaFim = parseDateLocal(seguro.vigenciaFim);
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
            } catch (e) {}
        });
    }
    
    let despesasFixasMesAccrual = 0;
    let despesasVariaveisMesAccrual = 0;
    let despesasMesAtualCash = 0;
    
    const transacoesDespesaOperacional = transacoesPeriodo.filter(t => 
      t.operationType !== 'initial_balance' && 
      t.operationType !== 'veiculo' && 
      t.flow === 'out' &&
      (t.categoryId !== seguroCategory?.id)
    );
    
    transacoesDespesaOperacional.forEach(t => {
        despesasMesAtualCash += t.amount;
        const cat = categoriasMap.get(t.categoryId || '');
        const nature = cat?.nature || 'despesa_variavel';
        if (t.categoryId !== seguroCategory?.id && t.operationType !== 'pagamento_emprestimo') {
            if (nature === 'despesa_fixa') despesasFixasMesAccrual += t.amount;
            else despesasVariaveisMesAccrual += t.amount;
        }
    });
    
    despesasFixasMesAccrual += accruedInsuranceExpense;
    const totalDespesasOperacionaisAccrual = despesasFixasMesAccrual + despesasVariaveisMesAccrual;
    
    let jurosEmprestimosPeriodo = 0;
    const pagamentosEmprestimo = transacoesPeriodo.filter(t => t.operationType === 'pagamento_emprestimo');
    pagamentosEmprestimo.forEach(t => {
        const loanIdStr = t.links?.loanId?.replace('loan_', '');
        const parcelaIdStr = t.links?.parcelaId;
        if (loanIdStr && parcelaIdStr) {
            const loanId = parseInt(loanIdStr);
            const parcelaNumber = parseInt(parcelaIdStr);
            if (!isNaN(loanId) && !isNaN(parcelaNumber)) {
                const schedule = calculateLoanSchedule(loanId);
                const item = schedule.find(i => i.parcela === parcelaNumber);
                if (item) jurosEmprestimosPeriodo += item.juros;
            }
        }
    });
    
    const resultadoOperacionalAccrual = receitasMesAtual - totalDespesasOperacionaisAccrual;
    const resultadoLiquidoAccrual = resultadoOperacionalAccrual - jurosEmprestimosPeriodo;
    const numDays = range.from && range.to ? differenceInDays(range.to, range.from) + 1 : 30;
    const annualizedFactor = 365 / numDays;
    const resultadoAnualizado = resultadoLiquidoAccrual * annualizedFactor;

    // --- INDICATORS CALCULATION ---
    const liquidezCorrente = passivoCurtoPrazo > 0 ? caixaTotal / passivoCurtoPrazo : caixaTotal > 0 ? 999 : 0;
    const liquidezSeca = passivoCurtoPrazo > 0 ? (caixaTotal * 0.8) / passivoCurtoPrazo : caixaTotal > 0 ? 999 : 0;
    const liquidezImediata = passivoCurtoPrazo > 0 ? (caixaTotal * 0.5) / passivoCurtoPrazo : caixaTotal > 0 ? 999 : 0;
    const liquidezGeral = totalPassivos > 0 ? totalAtivos / totalPassivos : totalAtivos > 0 ? 999 : 0;
    
    // NOVO: Solvência Imediata (Saldo CC / Dívidas Imediatas)
    const dividasImediatas = saldoDevedorCartoes + (despesasMesAtualCash / (numDays / 30)); // Proxy para contas do mês
    const solvenciaImediata = dividasImediatas > 0 ? contaCorrentePura / dividasImediatas : 999;

    const endividamentoTotal = totalAtivos > 0 ? (totalPassivos / totalAtivos) * 100 : 0;
    const patrimonioLiquido = totalAtivos - totalPassivos;
    const dividaPL = patrimonioLiquido > 0 ? (saldoDevedor / patrimonioLiquido) * 100 : 0;
    const composicaoEndividamento = totalPassivos > 0 ? (passivoCurtoPrazo / totalPassivos) * 100 : 0;
    const imobilizacaoPL = patrimonioLiquido > 0 ? (valorVeiculos / patrimonioLiquido) * 100 : 0;

    const margemLiquida = receitasMesAtual > 0 ? (resultadoLiquidoAccrual / receitasMesAtual) * 100 : 0;
    const retornoAtivos = totalAtivos > 0 ? (resultadoAnualizado / totalAtivos) * 100 : 0;
    const retornoPL = patrimonioLiquido > 0 ? (resultadoAnualizado / patrimonioLiquido) * 100 : 0;
    
    // NOVO: Liberdade Financeira (Rendimentos / Despesas)
    const liberdadeFinanceira = totalDespesasOperacionaisAccrual > 0 ? (rendimentosInvestimentos / totalDespesasOperacionaisAccrual) * 100 : 0;

    const indiceDespesasFixas = totalDespesasOperacionaisAccrual > 0 ? (despesasFixasMesAccrual / totalDespesasOperacionaisAccrual) * 100 : 0;
    const eficienciaOperacional = receitasMesAtual > 0 ? (totalDespesasOperacionaisAccrual / receitasMesAtual) * 100 : 0;
    
    // NOVO: Burn Rate (Despesas / Receitas)
    const burnRate = receitasMesAtual > 0 ? (despesasMesAtualCash / receitasMesAtual) * 100 : 0;

    const custoVidaMensal = despesasMesAtualCash;
    const mesesSobrevivencia = custoVidaMensal > 0 ? caixaTotal / custoVidaMensal : 999;
    const taxaPoupanca = receitasMesAtual > 0 ? (resultadoLiquidoAccrual / receitasMesAtual) * 100 : 0;
    const comprometimentoRenda = receitasMesAtual > 0 ? (despesasMesAtualCash / receitasMesAtual) * 100 : 0;
    
    // NOVO: Margem de Segurança (Receita - Despesas - Parcelas)
    const margemSeguranca = receitasMesAtual > 0 ? ((receitasMesAtual - despesasMesAtualCash) / receitasMesAtual) * 100 : 0;

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
        solvenciaImediata: { valor: solvenciaImediata, status: (solvenciaImediata >= 1 ? "success" : solvenciaImediata >= 0.5 ? "warning" : "danger") as IndicatorStatus },
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
        liberdadeFinanceira: { valor: liberdadeFinanceira, status: (liberdadeFinanceira >= 100 ? "success" : liberdadeFinanceira >= 20 ? "warning" : "danger") as IndicatorStatus },
      },
      eficiencia: {
        despesasFixas: { valor: indiceDespesasFixas, status: (indiceDespesasFixas < 50 ? "success" : indiceDespesasFixas < 70 ? "warning" : "danger") as IndicatorStatus },
        operacional: { valor: eficienciaOperacional, status: (eficienciaOperacional < 70 ? "success" : eficienciaOperacional < 85 ? "warning" : "danger") as IndicatorStatus },
        burnRate: { valor: burnRate, status: (burnRate < 70 ? "success" : burnRate < 90 ? "warning" : "danger") as IndicatorStatus },
      },
      pessoais: {
        custoVida: { valor: custoVidaMensal, status: "neutral" as IndicatorStatus },
        mesesSobrevivencia: { valor: mesesSobrevivencia, status: (mesesSobrevivencia >= 6 ? "success" : mesesSobrevivencia >= 3 ? "warning" : "danger") as IndicatorStatus },
        taxaPoupanca: { valor: taxaPoupanca, status: (taxaPoupanca >= 20 ? "success" : taxaPoupanca >= 10 ? "warning" : "danger") as IndicatorStatus },
        comprometimento: { valor: comprometimentoRenda, status: (comprometimentoRenda < 70 ? "success" : comprometimentoRenda < 90 ? "warning" : "danger") as IndicatorStatus },
        margemSeguranca: { valor: margemSeguranca, status: (margemSeguranca >= 20 ? "success" : margemSeguranca >= 5 ? "warning" : "danger") as IndicatorStatus },
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

  const indicadores1 = useMemo(() => calculateIndicatorsForRange(range1), [calculateIndicatorsForRange, range1]);
  const indicadores2 = useMemo(() => calculateIndicatorsForRange(range2), [calculateIndicatorsForRange, range2]);

  const calculateTrend = useCallback(<G extends ValidGroupKey, K extends AllIndicatorKeys>(key: K, group: G): TrendResult => {
    const val1 = (indicadores1[group] as any)[key].valor;
    const val2 = (indicadores2[group] as any)[key].valor;
    if (!range2.from || val2 === 0) return { diff: 0, percent: 0, trend: "stable" };
    const percent = calculatePercentChange(val1, val2);
    const trend: "up" | "down" | "stable" = percent >= 0 ? "up" : "down";
    return { diff: val1 - val2, percent, trend };
  }, [indicadores1, indicadores2, range2.from, calculatePercentChange]);

  const getDisplayTrend = useCallback(<G extends ValidGroupKey, K extends AllIndicatorKeys>(key: K, group: G): DisplayTrendResult => {
    const { percent, trend } = calculateTrend(key, group);
    const { status } = (indicadores1[group] as any)[key];
    const isInverse = group === 'endividamento' || 
                      (group === 'eficiencia' && (key === 'operacional' || key === 'burnRate')) || 
                      (group === 'pessoais' && key === 'comprometimento');
    let finalTrend: "up" | "down" | "stable" = trend;
    if (range2.from) {
        if (isInverse) finalTrend = trend === 'up' ? 'down' : trend === 'down' ? 'up' : 'stable';
    } else {
        if (status === 'success') finalTrend = isInverse ? 'down' : 'up';
        else if (status === 'danger') finalTrend = isInverse ? 'up' : 'down';
        else finalTrend = 'stable';
    }
    return { trend: finalTrend, percent, status };
  }, [calculateTrend, indicadores1, range2.from]);

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const formatRatio = (value: number) => value >= 999 ? "∞" : `${value.toFixed(2)}x`;
  const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatMeses = (value: number) => value >= 999 ? "∞" : `${value.toFixed(1)} meses`;

  return (
    <div className="space-y-6">
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
          title="Solvência Imediata"
          value={formatRatio(indicadores1.liquidez.solvenciaImediata.valor)}
          status={indicadores1.liquidez.solvenciaImediata.status}
          trend={getDisplayTrend('solvenciaImediata', 'liquidez').trend}
          trendLabel={range2.from ? `${getDisplayTrend('solvenciaImediata', 'liquidez').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Capacidade de cobrir dívidas imediatas e gastos do mês apenas com saldo em conta corrente. Ideal: acima de 1x"
          formula="Saldo Conta Corrente / (Dívidas Cartão + Gastos Médios Mês)"
          sparklineData={generateSparkline(indicadores1.liquidez.solvenciaImediata.valor, getDisplayTrend('solvenciaImediata', 'liquidez').trend)}
          icon={<Zap className="w-4 h-4" />}
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
          title="Liberdade Financeira"
          value={formatPercent(indicadores1.rentabilidade.liberdadeFinanceira.valor)}
          status={indicadores1.rentabilidade.liberdadeFinanceira.status}
          trend={getDisplayTrend('liberdadeFinanceira' as RentabilidadeKey, 'rentabilidade').trend}
          trendLabel={range2.from ? `${getDisplayTrend('liberdadeFinanceira' as RentabilidadeKey, 'rentabilidade').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Percentual das despesas cobertas por rendimentos passivos. 100% significa independência financeira."
          formula="(Rendimentos de Investimentos / Despesas Totais) × 100"
          sparklineData={generateSparkline(indicadores1.rentabilidade.liberdadeFinanceira.valor, getDisplayTrend('liberdadeFinanceira' as RentabilidadeKey, 'rentabilidade').trend)}
          icon={<Anchor className="w-4 h-4" />}
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
          title="Burn Rate (Consumo)"
          value={formatPercent(indicadores1.eficiencia.burnRate.valor)}
          status={indicadores1.eficiencia.burnRate.status}
          trend={getDisplayTrend('burnRate' as EficienciaKey, 'eficiencia').trend}
          trendLabel={range2.from ? `${getDisplayTrend('burnRate' as EficienciaKey, 'eficiencia').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Velocidade com que você consome sua receita mensal. Ideal: abaixo de 70%"
          formula="(Despesas Totais / Receitas Totais) × 100"
          sparklineData={generateSparkline(indicadores1.eficiencia.burnRate.valor, getDisplayTrend('burnRate' as EficienciaKey, 'eficiencia').trend)}
          icon={<Flame className="w-4 h-4" />}
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
          title="Margem de Segurança"
          value={formatPercent(indicadores1.pessoais.margemSeguranca.valor)}
          status={indicadores1.pessoais.margemSeguranca.status}
          trend={getDisplayTrend('margemSeguranca' as PessoaisKey, 'pessoais').trend}
          trendLabel={range2.from ? `${getDisplayTrend('margemSeguranca' as PessoaisKey, 'pessoais').percent.toFixed(1)}% vs P2` : undefined}
          descricao="Percentual da receita que sobra livre após todos os gastos e parcelas. Ideal: acima de 20%"
          formula="((Receita - Despesas - Parcelas) / Receita) × 100"
          sparklineData={generateSparkline(indicadores1.pessoais.margemSeguranca.valor, getDisplayTrend('margemSeguranca' as PessoaisKey, 'pessoais').trend)}
          icon={<ShieldCheck className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Meses de Sobrevivencia"
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