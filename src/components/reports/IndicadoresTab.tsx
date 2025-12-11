import { useMemo, useState } from "react";
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
  X,
  Trash2,
} from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { IndicatorBadge } from "./IndicatorBadge";
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
import { cn } from "@/lib/utils";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { toast } from "sonner";
import { DateRange } from "../dashboard/PeriodSelector";

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
  dateRange: DateRange;
}

export function IndicadoresTab({ dateRange }: IndicadoresTabProps) {
  const {
    transacoesV2,
    contasMovimento,
    emprestimos,
    veiculos,
    investimentosRF,
    criptomoedas,
    stablecoins,
    objetivos,
    categoriasV2,
  } = useFinance();

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

  // Cálculos principais
  const indicadores = useMemo(() => {
    const now = new Date();
    
    // 1. Filtrar transações para o período selecionado
    const transacoesPeriodo = transacoesV2.filter(t => {
      if (!dateRange.from || !dateRange.to) return true;
      try {
        const dataT = parseISO(t.date);
        return isWithinInterval(dataT, { start: dateRange.from!, end: dateRange.to! });
      } catch {
        return false;
      }
    });
    
    // 2. Calcular transações do período anterior para variação
    const diffInMonths = dateRange.from && dateRange.to ? dateRange.to.getMonth() - dateRange.from.getMonth() + 12 * (dateRange.to.getFullYear() - dateRange.from.getFullYear()) : 1;
    const prevFrom = dateRange.from ? subMonths(dateRange.from, diffInMonths) : undefined;
    const prevTo = dateRange.to ? subMonths(dateRange.to, diffInMonths) : undefined;

    const transacoesPeriodoAnterior = transacoesV2.filter(t => {
      if (!prevFrom || !prevTo) return false;
      try {
        const dataT = parseISO(t.date);
        return isWithinInterval(dataT, { start: prevFrom, end: prevTo });
      } catch {
        return false;
      }
    });

    // Calcular saldos das contas (saldo final do período)
    const saldosPorConta: Record<string, number> = {};
    contasMovimento.forEach(conta => {
      // Saldo inicial do período
      const saldoInicialPeriodo = dateRange.from 
        ? calculateBalanceUpToDate(conta.id, dateRange.from, transacoesV2, contasMovimento)
        : conta.initialBalance;
        
      saldosPorConta[conta.id] = saldoInicialPeriodo;
    });

    transacoesPeriodo.forEach(t => {
      if (!saldosPorConta[t.accountId]) saldosPorConta[t.accountId] = 0;
      if (t.flow === 'in' || t.flow === 'transfer_in') {
        saldosPorConta[t.accountId] += t.amount;
      } else {
        saldosPorConta[t.accountId] -= t.amount;
      }
    });
    
    // Helper para calcular saldo até uma data (usado para saldo inicial do período)
    function calculateBalanceUpToDate(accountId: string, date: Date, allTransactions: typeof transacoesV2, accounts: typeof contasMovimento): number {
      const account = accounts.find(a => a.id === accountId);
      if (!account) return 0;

      let balance = account.initialBalance;
      
      const transactionsBeforeDate = allTransactions
          .filter(t => t.accountId === accountId && parseISO(t.date) < date)
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
            if (t.flow === 'in' || t.flow === 'transfer_in') {
              balance += t.amount;
            } else {
              balance -= t.amount;
            }
          }
      });

      return balance;
    };


    // Ativos
    const contasLiquidas = contasMovimento.filter(c => 
      ['conta_corrente', 'poupanca', 'reserva_emergencia'].includes(c.accountType)
    );
    const caixaTotal = contasLiquidas.reduce((acc, c) => acc + Math.max(0, saldosPorConta[c.id] || 0), 0);

    const contasInvestimento = contasMovimento.filter(c => 
      ['aplicacao_renda_fixa', 'criptoativos', 'objetivos_financeiros'].includes(c.accountType)
    );
    const investimentosContas = contasInvestimento.reduce((acc, c) => acc + Math.max(0, saldosPorConta[c.id] || 0), 0);
    
    const investimentosLegado = 
      investimentosRF.reduce((acc, i) => acc + i.valor, 0) +
      criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0) +
      stablecoins.reduce((acc, s) => acc + s.valorBRL, 0) +
      objetivos.reduce((acc, o) => acc + o.atual, 0);

    const investimentosTotal = Math.max(investimentosContas, investimentosLegado);

    const veiculosAtivos = veiculos.filter(v => v.status !== 'vendido');
    const valorVeiculos = veiculosAtivos.reduce((acc, v) => acc + (v.valorFipe || v.valorVeiculo || 0), 0);

    const totalAtivos = caixaTotal + investimentosTotal + valorVeiculos;

    // Passivos
    const emprestimosAtivos = emprestimos.filter(e => e.status !== 'quitado');
    const saldoDevedor = emprestimosAtivos.reduce((acc, e) => {
      const parcelasRestantes = e.meses - (e.parcelasPagas || 0);
      return acc + (e.parcela * parcelasRestantes);
    }, 0);
    const passivoCurtoPrazo = emprestimosAtivos.reduce((acc, e) => {
      const parcelasRestantes = Math.min(12, e.meses - (e.parcelasPagas || 0));
      return acc + (e.parcela * parcelasRestantes);
    }, 0);
    const totalPassivos = saldoDevedor;

    // Patrimônio Líquido
    const patrimonioLiquido = totalAtivos - totalPassivos;

    // Receitas e Despesas do período
    const calcReceitas = (trans: typeof transacoesV2) => trans
      .filter(t => t.flow === 'in' && t.operationType !== 'transferencia' && t.operationType !== 'liberacao_emprestimo')
      .reduce((acc, t) => acc + t.amount, 0);
    const calcDespesas = (trans: typeof transacoesV2) => trans
      .filter(t => t.flow === 'out' && t.operationType !== 'transferencia' && t.operationType !== 'aplicacao')
      .reduce((acc, t) => acc + t.amount, 0);

    const receitasMesAtual = calcReceitas(transacoesPeriodo);
    const despesasMesAtual = calcDespesas(transacoesPeriodo);
    const receitasMesAnterior = calcReceitas(transacoesPeriodoAnterior);
    const despesasMesAnterior = calcDespesas(transacoesPeriodoAnterior);

    // Despesas fixas e variáveis
    const categoriasMap = new Map(categoriasV2.map(c => [c.id, c]));
    let despesasFixasMes = 0;
    let despesasVariaveisMes = 0;
    
    transacoesPeriodo.filter(t => t.flow === 'out' && t.operationType !== 'transferencia').forEach(t => {
      const cat = categoriasMap.get(t.categoryId || '');
      if (cat?.nature === 'despesa_fixa') {
        despesasFixasMes += t.amount;
      } else {
        despesasVariaveisMes += t.amount;
      }
    });

    // Juros
    const jurosTotais = emprestimosAtivos.reduce((acc, e) => acc + (e.parcela * e.taxaMensal / 100), 0);

    // Resultado
    const resultadoMesAtual = receitasMesAtual - despesasMesAtual;

    // === INDICADORES DE LIQUIDEZ ===
    const liquidezCorrente = passivoCurtoPrazo > 0 ? caixaTotal / passivoCurtoPrazo : caixaTotal > 0 ? 999 : 0;
    const liquidezSeca = passivoCurtoPrazo > 0 ? (caixaTotal * 0.8) / passivoCurtoPrazo : caixaTotal > 0 ? 999 : 0;
    const liquidezImediata = passivoCurtoPrazo > 0 ? (caixaTotal * 0.5) / passivoCurtoPrazo : caixaTotal > 0 ? 999 : 0;
    const liquidezGeral = totalPassivos > 0 ? totalAtivos / totalPassivos : totalAtivos > 0 ? 999 : 0;

    // === INDICADORES DE ENDIVIDAMENTO ===
    const endividamentoTotal = totalAtivos > 0 ? (totalPassivos / totalAtivos) * 100 : 0;
    const dividaPL = patrimonioLiquido > 0 ? (saldoDevedor / patrimonioLiquido) * 100 : 0;
    const composicaoEndividamento = totalPassivos > 0 ? (passivoCurtoPrazo / totalPassivos) * 100 : 0;
    const imobilizacaoPL = patrimonioLiquido > 0 ? (valorVeiculos / patrimonioLiquido) * 100 : 0;

    // === INDICADORES DE RENTABILIDADE ===
    const margemLiquida = receitasMesAtual > 0 ? (resultadoMesAtual / receitasMesAtual) * 100 : 0;
    const retornoAtivos = totalAtivos > 0 ? ((resultadoMesAtual * 12) / totalAtivos) * 100 : 0;
    const retornoPL = patrimonioLiquido > 0 ? ((resultadoMesAtual * 12) / patrimonioLiquido) * 100 : 0;

    // === INDICADORES DE EFICIÊNCIA ===
    const indiceDespesasFixas = despesasMesAtual > 0 ? (despesasFixasMes / despesasMesAtual) * 100 : 0;
    const crescimentoReceitas = receitasMesAnterior > 0
      ? ((receitasMesAtual - receitasMesAnterior) / receitasMesAnterior) * 100
      : 0;
    const crescimentoDespesas = despesasMesAnterior > 0
      ? ((despesasMesAtual - despesasMesAnterior) / despesasMesAnterior) * 100
      : 0;
    const eficienciaOperacional = receitasMesAtual > 0 ? (despesasMesAtual / receitasMesAtual) * 100 : 0;

    // === INDICADORES PESSOAIS ===
    const custoVidaMensal = despesasMesAtual;
    const mesesSobrevivencia = custoVidaMensal > 0 ? caixaTotal / custoVidaMensal : 999;
    const taxaPoupanca = receitasMesAtual > 0 ? (resultadoMesAtual / receitasMesAtual) * 100 : 0;
    const comprometimentoRenda = receitasMesAtual > 0 ? (despesasMesAtual / receitasMesAtual) * 100 : 0;

    // === INDICADORES DIVERSOS ===
    const solvencia = totalPassivos > 0 ? totalAtivos / totalPassivos : totalAtivos > 0 ? 999 : 0;
    const coberturaJuros = jurosTotais > 0 ? resultadoMesAtual / jurosTotais : resultadoMesAtual > 0 ? 999 : 0;
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
        crescimentoReceitas: { valor: crescimentoReceitas, status: (crescimentoReceitas > 5 ? "success" : crescimentoReceitas >= 0 ? "warning" : "danger") as IndicatorStatus },
        crescimentoDespesas: { valor: crescimentoDespesas, status: (crescimentoDespesas < 0 ? "success" : crescimentoDespesas < 10 ? "warning" : "danger") as IndicatorStatus },
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
      // Dados brutos para indicadores customizados
      raw: {
        caixaTotal,
        investimentosTotal,
        valorVeiculos,
        totalAtivos,
        totalPassivos,
        patrimonioLiquido,
        receitasMesAtual,
        despesasMesAtual,
        resultadoMesAtual,
        saldoDevedor,
        passivoCurtoPrazo,
      },
    };
  }, [transacoesV2, contasMovimento, emprestimos, veiculos, investimentosRF, criptomoedas, stablecoins, objetivos, categoriasV2, dateRange]);

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const formatRatio = (value: number) => value >= 999 ? "∞" : `${value.toFixed(2)}x`;
  const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const formatMeses = (value: number) => value >= 999 ? "∞" : `${value.toFixed(1)} meses`;

  // Sparkline generator
  const generateSparkline = (current: number, trend: "up" | "down" | "stable" = "stable") => {
    const base = Math.abs(current) * 0.7;
    const range = Math.abs(current) * 0.3 || 10;
    return Array.from({ length: 6 }, (_, i) => {
      const progress = i / 5;
      if (trend === "up") return base + range * progress + Math.random() * range * 0.2;
      if (trend === "down") return base + range * (1 - progress) + Math.random() * range * 0.2;
      return base + range * 0.5 + (Math.random() - 0.5) * range * 0.4;
    }).concat([Math.abs(current)]);
  };

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
                  Variáveis disponíveis: caixaTotal, investimentosTotal, totalAtivos, totalPassivos, patrimonioLiquido, receitasMesAtual, despesasMesAtual, resultadoMesAtual
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
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
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
          value={formatRatio(indicadores.liquidez.corrente.valor)}
          status={indicadores.liquidez.corrente.status}
          trend={indicadores.liquidez.corrente.valor >= 1.5 ? "up" : "down"}
          descricao="Mede a capacidade de pagar obrigações de curto prazo com ativos circulantes. Valor ideal: acima de 1.5x"
          formula="Ativo Circulante / Passivo Circulante"
          sparklineData={generateSparkline(indicadores.liquidez.corrente.valor, indicadores.liquidez.corrente.valor >= 1.5 ? "up" : "down")}
          icon={<Droplets className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Liquidez Seca"
          value={formatRatio(indicadores.liquidez.seca.valor)}
          status={indicadores.liquidez.seca.status}
          trend={indicadores.liquidez.seca.valor >= 1 ? "up" : "down"}
          descricao="Capacidade de pagamento excluindo ativos menos líquidos. Mais conservador que a liquidez corrente. Ideal: acima de 1x"
          formula="(Ativo Circulante × 0.8) / Passivo Circulante"
          sparklineData={generateSparkline(indicadores.liquidez.seca.valor, indicadores.liquidez.seca.valor >= 1 ? "up" : "down")}
          icon={<Droplets className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Liquidez Imediata"
          value={formatRatio(indicadores.liquidez.imediata.valor)}
          status={indicadores.liquidez.imediata.status}
          trend={indicadores.liquidez.imediata.valor >= 0.5 ? "up" : "down"}
          descricao="Capacidade de pagamento instantâneo apenas com disponibilidades. Ideal: acima de 0.5x"
          formula="Disponibilidades / Passivo Circulante"
          sparklineData={generateSparkline(indicadores.liquidez.imediata.valor, indicadores.liquidez.imediata.valor >= 0.5 ? "up" : "down")}
          icon={<Droplets className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Liquidez Geral"
          value={formatRatio(indicadores.liquidez.geral.valor)}
          status={indicadores.liquidez.geral.status}
          trend={indicadores.liquidez.geral.valor >= 2 ? "up" : "down"}
          descricao="Capacidade de pagar todas as dívidas com todos os ativos. Visão de longo prazo. Ideal: acima de 2x"
          formula="Ativo Total / Passivo Total"
          sparklineData={generateSparkline(indicadores.liquidez.geral.valor, indicadores.liquidez.geral.valor >= 2 ? "up" : "down")}
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
          value={formatPercent(indicadores.endividamento.total.valor)}
          status={indicadores.endividamento.total.status}
          trend={indicadores.endividamento.total.valor < 30 ? "up" : "down"}
          descricao="Percentual dos ativos financiados por terceiros (dívidas). Quanto menor, melhor. Ideal: abaixo de 30%"
          formula="(Passivo Total / Ativo Total) × 100"
          sparklineData={generateSparkline(indicadores.endividamento.total.valor, indicadores.endividamento.total.valor < 30 ? "down" : "up")}
          icon={<Shield className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Dívida / Patrimônio"
          value={formatPercent(indicadores.endividamento.dividaPL.valor)}
          status={indicadores.endividamento.dividaPL.status}
          trend={indicadores.endividamento.dividaPL.valor < 50 ? "up" : "down"}
          descricao="Relação entre capital de terceiros e capital próprio. Indica alavancagem. Ideal: abaixo de 50%"
          formula="(Dívida Total / Patrimônio Líquido) × 100"
          sparklineData={generateSparkline(indicadores.endividamento.dividaPL.valor, indicadores.endividamento.dividaPL.valor < 50 ? "down" : "up")}
          icon={<Shield className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Composição do Endividamento"
          value={formatPercent(indicadores.endividamento.composicao.valor)}
          status={indicadores.endividamento.composicao.status}
          trend={indicadores.endividamento.composicao.valor < 50 ? "up" : "down"}
          descricao="Percentual das dívidas que vencem no curto prazo. Menor valor indica menor pressão imediata. Ideal: abaixo de 50%"
          formula="(Passivo Circulante / Passivo Total) × 100"
          sparklineData={generateSparkline(indicadores.endividamento.composicao.valor, indicadores.endividamento.composicao.valor < 50 ? "down" : "up")}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Imobilização do PL"
          value={formatPercent(indicadores.endividamento.imobilizacao.valor)}
          status={indicadores.endividamento.imobilizacao.status}
          trend={indicadores.endividamento.imobilizacao.valor < 30 ? "up" : "down"}
          descricao="Quanto do patrimônio está investido em bens imobilizados (veículos). Ideal: abaixo de 30%"
          formula="(Ativo Imobilizado / Patrimônio Líquido) × 100"
          sparklineData={generateSparkline(indicadores.endividamento.imobilizacao.valor, indicadores.endividamento.imobilizacao.valor < 30 ? "down" : "up")}
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
          value={formatPercent(indicadores.rentabilidade.margemLiquida.valor)}
          status={indicadores.rentabilidade.margemLiquida.status}
          trend={indicadores.rentabilidade.margemLiquida.valor >= 20 ? "up" : "down"}
          descricao="Percentual das receitas que sobra como lucro. Mede eficiência na conversão de receita em resultado. Ideal: acima de 20%"
          formula="(Resultado Líquido / Receitas) × 100"
          sparklineData={generateSparkline(indicadores.rentabilidade.margemLiquida.valor, indicadores.rentabilidade.margemLiquida.valor >= 20 ? "up" : "down")}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Retorno sobre Ativos (ROA)"
          value={formatPercent(indicadores.rentabilidade.retornoAtivos.valor)}
          status={indicadores.rentabilidade.retornoAtivos.status}
          trend={indicadores.rentabilidade.retornoAtivos.valor >= 10 ? "up" : "down"}
          descricao="Retorno anualizado sobre o total de ativos. Mede eficiência no uso dos recursos. Ideal: acima de 10%"
          formula="(Resultado Anualizado / Ativo Total) × 100"
          sparklineData={generateSparkline(indicadores.rentabilidade.retornoAtivos.valor, indicadores.rentabilidade.retornoAtivos.valor >= 10 ? "up" : "down")}
          icon={<Target className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Retorno sobre PL (ROE)"
          value={formatPercent(indicadores.rentabilidade.retornoPL.valor)}
          status={indicadores.rentabilidade.retornoPL.status}
          trend={indicadores.rentabilidade.retornoPL.valor >= 15 ? "up" : "down"}
          descricao="Retorno anualizado sobre o capital próprio. Indica remuneração do patrimônio. Ideal: acima de 15%"
          formula="(Resultado Anualizado / Patrimônio Líquido) × 100"
          sparklineData={generateSparkline(indicadores.rentabilidade.retornoPL.valor, indicadores.rentabilidade.retornoPL.valor >= 15 ? "up" : "down")}
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
          value={formatPercent(indicadores.eficiencia.despesasFixas.valor)}
          status={indicadores.eficiencia.despesasFixas.status}
          trend={indicadores.eficiencia.despesasFixas.valor < 50 ? "up" : "down"}
          descricao="Proporção de despesas fixas no total. Indica rigidez do orçamento. Ideal: abaixo de 50%"
          formula="(Despesas Fixas / Despesas Totais) × 100"
          sparklineData={generateSparkline(indicadores.eficiencia.despesasFixas.valor, indicadores.eficiencia.despesasFixas.valor < 50 ? "down" : "up")}
          icon={<Gauge className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Crescimento Receitas"
          value={formatPercent(indicadores.eficiencia.crescimentoReceitas.valor)}
          status={indicadores.eficiencia.crescimentoReceitas.status}
          trend={indicadores.eficiencia.crescimentoReceitas.valor > 0 ? "up" : "down"}
          descricao="Variação das receitas em relação ao mês anterior. Indica tendência de ganhos. Ideal: positivo"
          formula="((Receitas Mês Atual - Receitas Mês Anterior) / Receitas Mês Anterior) × 100"
          sparklineData={generateSparkline(Math.abs(indicadores.eficiencia.crescimentoReceitas.valor) + 10, indicadores.eficiencia.crescimentoReceitas.valor > 0 ? "up" : "down")}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Crescimento Despesas"
          value={formatPercent(indicadores.eficiencia.crescimentoDespesas.valor)}
          status={indicadores.eficiencia.despesasFixas.status}
          trend={indicadores.eficiencia.crescimentoDespesas.valor < 0 ? "up" : "down"}
          descricao="Variação das despesas em relação ao mês anterior. Ideal: negativo ou controlado"
          formula="((Despesas Mês Atual - Despesas Mês Anterior) / Despesas Mês Anterior) × 100"
          sparklineData={generateSparkline(Math.abs(indicadores.eficiencia.crescimentoDespesas.valor) + 10, indicadores.eficiencia.crescimentoDespesas.valor < 0 ? "down" : "up")}
          icon={<TrendingDown className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Eficiência Operacional"
          value={formatPercent(indicadores.eficiencia.operacional.valor)}
          status={indicadores.eficiencia.operacional.status}
          trend={indicadores.eficiencia.operacional.valor < 70 ? "up" : "down"}
          descricao="Percentual das receitas consumidas por despesas. Menor valor indica maior eficiência. Ideal: abaixo de 70%"
          formula="(Despesas Totais / Receitas) × 100"
          sparklineData={generateSparkline(indicadores.eficiencia.operacional.valor, indicadores.eficiencia.operacional.valor < 70 ? "down" : "up")}
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
          value={formatCurrency(indicadores.pessoais.custoVida.valor)}
          status="neutral"
          descricao="Valor total de despesas no mês atual. Base para cálculo de reserva de emergência."
          formula="Σ Despesas do Mês"
          icon={<Wallet className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Meses de Sobrevivência"
          value={formatMeses(indicadores.pessoais.mesesSobrevivencia.valor)}
          status={indicadores.pessoais.mesesSobrevivencia.status}
          trend={indicadores.pessoais.mesesSobrevivencia.valor >= 6 ? "up" : "down"}
          descricao="Quantos meses você consegue manter seu padrão de vida apenas com reservas. Ideal: acima de 6 meses"
          formula="Caixa e Equivalentes / Custo de Vida Mensal"
          sparklineData={generateSparkline(indicadores.pessoais.mesesSobrevivencia.valor, indicadores.pessoais.mesesSobrevivencia.valor >= 6 ? "up" : "down")}
          icon={<Clock className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Taxa de Poupança"
          value={formatPercent(indicadores.pessoais.taxaPoupanca.valor)}
          status={indicadores.pessoais.taxaPoupanca.status}
          trend={indicadores.pessoais.taxaPoupanca.valor >= 20 ? "up" : "down"}
          descricao="Percentual da renda que sobra para poupar/investir. Ideal: acima de 20%"
          formula="(Receitas - Despesas) / Receitas × 100"
          sparklineData={generateSparkline(indicadores.pessoais.taxaPoupanca.valor, indicadores.pessoais.taxaPoupanca.valor >= 20 ? "up" : "down")}
          icon={<PiggyBank className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Comprometimento da Renda"
          value={formatPercent(indicadores.pessoais.comprometimento.valor)}
          status={indicadores.pessoais.comprometimento.status}
          trend={indicadores.pessoais.comprometimento.valor < 70 ? "up" : "down"}
          descricao="Percentual da renda utilizada em despesas. Quanto menor, mais folga financeira. Ideal: abaixo de 70%"
          formula="(Despesas / Receitas) × 100"
          sparklineData={generateSparkline(indicadores.pessoais.comprometimento.valor, indicadores.pessoais.comprometimento.valor < 70 ? "down" : "up")}
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
          value={formatRatio(indicadores.outros.solvencia.valor)}
          status={indicadores.outros.solvencia.status}
          trend={indicadores.outros.solvencia.valor >= 2 ? "up" : "down"}
          descricao="Capacidade de pagar todas as dívidas com os ativos disponíveis. Ideal: acima de 2x"
          formula="Ativo Total / Passivo Total"
          sparklineData={generateSparkline(indicadores.outros.solvencia.valor, indicadores.outros.solvencia.valor >= 2 ? "up" : "down")}
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Cobertura de Juros"
          value={formatRatio(indicadores.outros.coberturaJuros.valor)}
          status={indicadores.outros.coberturaJuros.status}
          trend={indicadores.outros.coberturaJuros.valor >= 3 ? "up" : "down"}
          descricao="Capacidade de pagar juros com o resultado operacional. Ideal: acima de 3x"
          formula="Resultado Operacional / Despesas com Juros"
          sparklineData={generateSparkline(indicadores.outros.coberturaJuros.valor, indicadores.outros.coberturaJuros.valor >= 3 ? "up" : "down")}
          icon={<Shield className="w-4 h-4" />}
        />
        <DetailedIndicatorBadge
          title="Diversificação Patrimonial"
          value={formatPercent(indicadores.outros.diversificacao.valor)}
          status={indicadores.outros.diversificacao.status}
          trend={indicadores.outros.diversificacao.valor >= 40 ? "up" : "down"}
          descricao="Nível de distribuição dos ativos entre diferentes classes. Maior valor indica menor concentração. Ideal: acima de 40%"
          formula="100 - Max(% Caixa, % Investimentos, % Imobilizado)"
          sparklineData={generateSparkline(indicadores.outros.diversificacao.valor, indicadores.outros.diversificacao.valor >= 40 ? "up" : "down")}
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
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </IndicatorGroup>
      )}
    </div>
  );
}