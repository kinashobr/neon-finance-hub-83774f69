"use client";

import { useState, useMemo, useCallback } from "react";
import { 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  X, 
  Bell,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Shield,
  Calendar,
  Settings,
  Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Alerta {
  id: string;
  tipo: "warning" | "danger" | "info" | "success";
  categoria: "financeiro" | "investimento" | "seguro" | "meta" | "sistema";
  prioridade: "alta" | "media" | "baixa";
  titulo: string;
  descricao: string;
  detalhes?: string;
  acao?: {
    label: string;
    tipo: "navegar" | "modal" | "acao";
    destino?: string;
    modal?: string;
  };
  data: Date;
  lido: boolean;
  ignorado: boolean;
  metricas?: {
    valorAtual: number;
    valorMeta: number;
    variacao: number;
    unidade: string;
  };
}

interface AlertaConfig {
  id: string;
  nome: string;
  descricao: string;
  categoria: Alerta["categoria"];
  prioridade: Alerta["prioridade"];
  ativo: boolean;
  tolerancia: number;
  frequencia: "sempre" | "diario" | "semanal" | "mensal";
}

const ALERTA_CONFIGS: AlertaConfig[] = [
  {
    id: "saldo-negativo",
    nome: "Saldo Negativo",
    descricao: "Alerta quando as despesas superam as receitas no mês",
    categoria: "financeiro",
    prioridade: "alta",
    ativo: true,
    tolerancia: 0,
    frequencia: "sempre"
  },
  {
    id: "gasto-acima-media",
    nome: "Gasto Acima da Média",
    descricao: "Alerta quando alguma categoria de despesa está acima da média histórica",
    categoria: "financeiro",
    prioridade: "media",
    ativo: true,
    tolerancia: 20,
    frequencia: "semanal"
  },
  {
    id: "meta-poupanca",
    nome: "Meta de Poupança",
    descricao: "Alerta sobre o progresso da meta de poupança",
    categoria: "meta",
    prioridade: "media",
    ativo: true,
    tolerancia: 10,
    frequencia: "mensal"
  },
  {
    id: "endividamento",
    nome: "Endividamento",
    descricao: "Alerta quando o índice de endividamento está acima do recomendado",
    categoria: "financeiro",
    prioridade: "alta",
    ativo: true,
    tolerancia: 30,
    frequencia: "mensal"
  },
  {
    id: "vencimento-seguro",
    nome: "Vencimento de Seguro",
    descricao: "Alerta sobre vencimento de seguros de veículos",
    categoria: "seguro",
    prioridade: "media",
    ativo: true,
    tolerancia: 30,
    frequencia: "diario"
  },
  {
    id: "rentabilidade-investimentos",
    nome: "Rentabilidade dos Investimentos",
    descricao: "Alerta sobre a rentabilidade dos investimentos",
    categoria: "investimento",
    prioridade: "media",
    ativo: true,
    tolerancia: 5,
    frequencia: "mensal"
  },
  {
    id: "exposicao-cripto",
    nome: "Exposição em Criptomoedas",
    descricao: "Alerta sobre exposição em criptomoedas acima do recomendado",
    categoria: "investimento",
    prioridade: "media",
    ativo: true,
    tolerancia: 20,
    frequencia: "mensal"
  },
  {
    id: "aporte-mensal",
    nome: "Aporte Mensal",
    descricao: "Alerta sobre meta de aporte mensal não atingida",
    categoria: "meta",
    prioridade: "baixa",
    ativo: true,
    tolerancia: 100,
    frequencia: "mensal"
  }
];

export function AlertasFinanceiros() {
  const { 
    transacoesV2, 
    veiculos, 
    criptomoedas, 
    stablecoins, 
    objetivos,
    getAtivosTotal,
    getPassivosTotal,
    getPatrimonioLiquido
  } = useFinance();

  const [tab, setTab] = useState<"ativos" | "configuracoes">("ativos");
  const [alertasConfig, setAlertasConfig] = useState<AlertaConfig[]>(ALERTA_CONFIGS);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [alertasLidos, setAlertasLidos] = useState<Set<string>>(new Set());
  const [alertasIgnorados, setAlertasIgnorados] = useState<Set<string>>(new Set());
  const [detalhesAberto, setDetalhesAberto] = useState<Alerta | null>(null);
  const [configDialogAberto, setConfigDialogAberto] = useState<AlertaConfig | null>(null);

  // Backend: Cálculo inteligente de métricas
  const metricas = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    // Métricas de fluxo de caixa
    const transacoesMes = transacoesV2.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    });

    const receitasMes = transacoesMes
      .filter(t => t.operationType === "receita" || t.operationType === "rendimento")
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const despesasMes = transacoesMes
      .filter(t => t.operationType === "despesa" || t.operationType === "pagamento_emprestimo")
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    // Métricas históricas
    const mesesHistoricos = Array.from({ length: 12 }, (_, i) => {
      const mes = (mesAtual - i + 12) % 12;
      const ano = mes > mesAtual ? anoAtual - 1 : anoAtual;
      const transacoesHistorico = transacoesV2.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === mes && d.getFullYear() === ano;
      });
      
      const receitas = transacoesHistorico
        .filter(t => t.operationType === "receita" || t.operationType === "rendimento")
        .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      
      const despesas = transacoesHistorico
        .filter(t => t.operationType === "despesa" || t.operationType === "pagamento_emprestimo")
        .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

      return { mes, ano, receitas, despesas };
    });

    const mediaReceitas = mesesHistoricos.reduce((acc, m) => acc + m.receitas, 0) / mesesHistoricos.length;
    const mediaDespesas = mesesHistoricos.reduce((acc, m) => acc + m.despesas, 0) / mesesHistoricos.length;

    // Métricas de patrimônio
    const ativos = getAtivosTotal();
    const passivos = getPassivosTotal();
    const patrimonioLiquido = getPatrimonioLiquido();

    // Métricas de investimentos
    const totalInvestimentos = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0) +
      stablecoins.reduce((acc, s) => acc + s.valorBRL, 0) +
      objetivos.reduce((acc, o) => acc + o.atual, 0);

    const exposicaoCripto = totalInvestimentos > 0 ? 
      (criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0) / totalInvestimentos) * 100 : 0;

    // Métricas de metas
    const metaPoupanca = objetivos.find(o => o.nome.toLowerCase().includes("reserva") || o.nome.toLowerCase().includes("poupança"));
    const progressoMeta = metaPoupanca ? (metaPoupanca.atual / metaPoupanca.meta) * 100 : 0;

    return {
      fluxo: {
        receitas: { valor: receitasMes, meta: mediaReceitas, variacao: ((receitasMes - mediaReceitas) / Math.max(mediaReceitas, 1)) * 100, unidade: "R$", cor: "hsl(142, 76%, 36%)" },
        despesas: { valor: despesasMes, meta: mediaDespesas, variacao: ((despesasMes - mediaDespesas) / Math.max(mediaDespesas, 1)) * 100, unidade: "R$", cor: "hsl(0, 72%, 51%)" },
        saldo: { valor: receitasMes - despesasMes, meta: mediaReceitas - mediaDespesas, variacao: 0, unidade: "R$", cor: (receitasMes >= despesasMes) ? "hsl(142, 76%, 36%)" : "hsl(0, 72%, 51%)" }
      },
      patrimonio: {
        ativos: { valor: ativos, meta: 0, variacao: 0, unidade: "R$", cor: "hsl(199, 89%, 48%)" },
        passivos: { valor: passivos, meta: 0, variacao: 0, unidade: "R$", cor: "hsl(0, 72%, 51%)" },
        liquido: { valor: patrimonioLiquido, meta: 0, variacao: 0, unidade: "R$", cor: "hsl(142, 76%, 36%)" }
      },
      investimentos: {
        total: { valor: totalInvestimentos, meta: 0, variacao: 0, unidade: "R$", cor: "hsl(270, 100%, 65%)" },
        exposicaoCripto: { valor: exposicaoCripto, meta: 20, variacao: 0, unidade: "%", cor: "hsl(330, 100%, 65%)" },
        rentabilidade: { valor: 12.5, meta: 10, variacao: 2.5, unidade: "%", cor: "hsl(160, 100%, 45%)" }
      },
      metas: {
        poupanca: { valor: progressoMeta, meta: 100, variacao: 0, unidade: "%", cor: "hsl(142, 76%, 36%)" },
        endividamento: { valor: passivos > 0 ? (passivos / ativos) * 100 : 0, meta: 30, variacao: 0, unidade: "%", cor: "hsl(38, 92%, 50%)" }
      }
    };
  }, [transacoesV2, veiculos, criptomoedas, stablecoins, objetivos, getAtivosTotal, getPassivosTotal, getPatrimonioLiquido]);

  // Backend: Geração inteligente de alertas
  const gerarAlertas = useCallback(() => {
    const novosAlertas: Alerta[] = [];
    const hoje = new Date();

    // 1. Saldo negativo
    if (metricas.fluxo.saldo.valor < 0) {
      novosAlertas.push({
        id: "saldo-negativo",
        tipo: "danger",
        categoria: "financeiro",
        prioridade: "alta",
        titulo: "Saldo Negativo no Mês",
        descricao: "Suas despesas estão maiores que suas receitas",
        detalhes: `Despesas: R$ ${metricas.fluxo.despesas.valor.toLocaleString("pt-BR")} > Receitas: R$ ${metricas.fluxo.receitas.valor.toLocaleString("pt-BR")}`,
        acao: { label: "Ver detalhes", tipo: "modal", modal: "fluxo-caixa" },
        data: hoje,
        lido: false,
        ignorado: false,
        metricas: {
          valorAtual: metricas.fluxo.saldo.valor,
          valorMeta: metricas.fluxo.saldo.meta,
          variacao: metricas.fluxo.saldo.variacao,
          unidade: "R$"
        }
      });
    }

    // 2. Gasto acima da média
    if (metricas.fluxo.despesas.variacao > 20) {
      novosAlertas.push({
        id: "gasto-acima-media",
        tipo: "warning",
        categoria: "financeiro",
        prioridade: "media",
        titulo: "Gasto Acima da Média",
        descricao: "Suas despesas estão significativamente acima da média histórica",
        detalhes: `Despesas atuais: R$ ${metricas.fluxo.despesas.valor.toLocaleString("pt-BR")} (${metricas.fluxo.despesas.variacao.toFixed(1)}% acima da média)`,
        acao: { label: "Analisar categorias", tipo: "navegar", destino: "/receitas-despesas" },
        data: hoje,
        lido: false,
        ignorado: false,
        metricas: {
          valorAtual: metricas.fluxo.despesas.valor,
          valorMeta: metricas.fluxo.despesas.meta,
          variacao: metricas.fluxo.despesas.variacao,
          unidade: "R$"
        }
      });
    }

    // 3. Meta de poupança
    if (metricas.metas.poupanca.valor < 80) {
      novosAlertas.push({
        id: "meta-poupanca",
        tipo: metricas.metas.poupanca.valor < 50 ? "danger" : "warning",
        categoria: "meta",
        prioridade: metricas.metas.poupanca.valor < 50 ? "alta" : "media",
        titulo: "Meta de Poupança",
        descricao: "Seu progresso na meta de poupança está abaixo do esperado",
        detalhes: `Progresso: ${metricas.metas.poupanca.valor.toFixed(1)}% (meta: 100%)`,
        acao: { label: "Ajustar meta", tipo: "modal", modal: "metas" },
        data: hoje,
        lido: false,
        ignorado: false,
        metricas: {
          valorAtual: metricas.metas.poupanca.valor,
          valorMeta: metricas.metas.poupanca.meta,
          variacao: 0,
          unidade: "%"
        }
      });
    }

    // 4. Endividamento
    if (metricas.metas.endividamento.valor > 30) {
      novosAlertas.push({
        id: "endividamento",
        tipo: metricas.metas.endividamento.valor > 50 ? "danger" : "warning",
        categoria: "financeiro",
        prioridade: metricas.metas.endividamento.valor > 50 ? "alta" : "media",
        titulo: "Endividamento Alto",
        descricao: "Seu índice de endividamento está acima do recomendado",
        detalhes: `Endividamento: ${metricas.metas.endividamento.valor.toFixed(1)}% (ideal: < 30%)`,
        acao: { label: "Planejar quitação", tipo: "navegar", destino: "/emprestimos" },
        data: hoje,
        lido: false,
        ignorado: false,
        metricas: {
          valorAtual: metricas.metas.endividamento.valor,
          valorMeta: metricas.metas.endividamento.meta,
          variacao: 0,
          unidade: "%"
        }
      });
    }

    // 5. Vencimento de seguros
    const segurosVencendo = veiculos.filter(v => {
      if (!v.vencimentoSeguro) return false;
      const venc = new Date(v.vencimentoSeguro);
      const dias = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      return dias > 0 && dias <= 30;
    });

    if (segurosVencendo.length > 0) {
      novosAlertas.push({
        id: "vencimento-seguro",
        tipo: "warning",
        categoria: "seguro",
        prioridade: "media",
        titulo: "Seguro de Veículo Vencendo",
        descricao: `${segurosVencendo.length} seguro(s) vencendo nos próximos 30 dias`,
        detalhes: segurosVencendo.map(v => `${v.modelo} - ${v.vencimentoSeguro}`).join(", "),
        acao: { label: "Renovar seguros", tipo: "navegar", destino: "/veiculos" },
        data: hoje,
        lido: false,
        ignorado: false
      });
    }

    // 6. Exposição em cripto
    if (metricas.investimentos.exposicaoCripto.valor > 20) {
      novosAlertas.push({
        id: "exposicao-cripto",
        tipo: "warning",
        categoria: "investimento",
        prioridade: "media",
        titulo: "Exposição em Criptomoedas",
        descricao: "Sua exposição em criptomoedas está acima do recomendado",
        detalhes: `Exposição: ${metricas.investimentos.exposicaoCripto.valor.toFixed(1)}% (recomendado: < 20%)`,
        acao: { label: "Rebalancear", tipo: "modal", modal: "investimentos" },
        data: hoje,
        lido: false,
        ignorado: false,
        metricas: {
          valorAtual: metricas.investimentos.exposicaoCripto.valor,
          valorMeta: metricas.investimentos.exposicaoCripto.meta,
          variacao: 0,
          unidade: "%"
        }
      });
    }

    // 7. Rentabilidade dos investimentos
    if (metricas.investimentos.rentabilidade.valor < 5) {
      novosAlertas.push({
        id: "rentabilidade-investimentos",
        tipo: "info",
        categoria: "investimento",
        prioridade: "baixa",
        titulo: "Rentabilidade dos Investimentos",
        descricao: "A rentabilidade dos seus investimentos está abaixo do esperado",
        detalhes: `Rentabilidade: ${metricas.investimentos.rentabilidade.valor.toFixed(1)}% (meta: > 10%)`,
        acao: { label: "Analisar portfólio", tipo: "navegar", destino: "/investimentos" },
        data: hoje,
        lido: false,
        ignorado: false,
        metricas: {
          valorAtual: metricas.investimentos.rentabilidade.valor,
          valorMeta: metricas.investimentos.rentabilidade.meta,
          variacao: metricas.investimentos.rentabilidade.variacao,
          unidade: "%"
        }
      });
    }

    return novosAlertas;
  }, [metricas]);

  // Atualiza alertas quando as métricas mudam
  useMemo(() => {
    const novosAlertas = gerarAlertas();
    setAlertas(novosAlertas);
  }, [gerarAlertas]);

  // Filtra alertas com base em leitura e ignorados
  const alertasFiltrados = useMemo(() => {
    return alertas.filter(a => !alertasLidos.has(a.id) && !alertasIgnorados.has(a.id));
  }, [alertas, alertasLidos, alertasIgnorados]);

  // Contadores
  const contadores = useMemo(() => {
    const total = alertasFiltrados.length;
    const criticos = alertasFiltrados.filter(a => a.prioridade === "alta").length;
    const financeiros = alertasFiltrados.filter(a => a.categoria === "financeiro").length;
    const metas = alertasFiltrados.filter(a => a.categoria === "meta").length;
    
    return { total, criticos, financeiros, metas };
  }, [alertasFiltrados]);

  // Handlers
  const marcarComoLido = useCallback((alertaId: string) => {
    setAlertasLidos(prev => new Set([...prev, alertaId]));
  }, []);

  const marcarComoIgnorado = useCallback((alertaId: string) => {
    setAlertasIgnorados(prev => new Set([...prev, alertaId]));
  }, []);

  const marcarTodosComoLido = useCallback(() => {
    setAlertasLidos(new Set(alertas.map(a => a.id)));
  }, [alertas]);

  const toggleConfig = useCallback((configId: string) => {
    setAlertasConfig(prev => prev.map(c => 
      c.id === configId ? { ...c, ativo: !c.ativo } : c
    ));
  }, []);

  const abrirConfigDialog = useCallback((config: AlertaConfig) => {
    setConfigDialogAberto(config);
  }, []);

  const fecharConfigDialog = useCallback(() => {
    setConfigDialogAberto(null);
  }, []);

  const salvarConfig = useCallback((config: AlertaConfig) => {
    setAlertasConfig(prev => prev.map(c => 
      c.id === config.id ? { ...c, ...config } : c
    ));
    setConfigDialogAberto(null);
  }, []);

  const getIcon = (tipo: string, categoria: string) => {
    switch (categoria) {
      case "financeiro":
        return tipo === "danger" ? AlertTriangle : DollarSign;
      case "investimento":
        return tipo === "danger" ? TrendingDown : TrendingUp;
      case "seguro":
        return Shield;
      case "meta":
        return tipo === "success" ? Target : CheckCircle;
      default:
        return Info;
    }
  };

  const getStyles = (tipo: string, prioridade: string) => {
    const base = "border-l-4 transition-all hover:scale-[1.02]";
    
    switch (tipo) {
      case "danger":
        return `${base} ${prioridade === "alta" ? "border-l-destructive/80" : "border-l-destructive/60"} bg-destructive/10 text-destructive`;
      case "warning":
        return `${base} ${prioridade === "alta" ? "border-l-warning/80" : "border-l-warning/60"} bg-warning/10 text-warning`;
      case "success":
        return `${base} ${prioridade === "alta" ? "border-l-success/80" : "border-l-success/60"} bg-success/10 text-success`;
      default:
        return `${base} ${prioridade === "alta" ? "border-l-primary/80" : "border-l-primary/60"} bg-primary/10 text-primary`;
    }
  };

  const formatarValor = (valor: number, unidade: string) => {
    switch (unidade) {
      case "R$":
        return `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
      case "%":
        return `${valor.toFixed(1)}%`;
      default:
        return valor.toString();
    }
  };

  return (
    <Card className="glass-card animate-fade-in-up">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Alertas Financeiros Inteligentes</CardTitle>
              <p className="text-xs text-muted-foreground">Monitoramento automatizado e inteligente</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
              {contadores.criticos} críticos
            </Badge>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              {contadores.total} ativos
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="ativos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Alertas Ativos
              </TabsTrigger>
              <TabsTrigger value="configuracoes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Configurações
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={marcarTodosComoLido}
                className="border-border"
                disabled={alertasFiltrados.length === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                Marcar todos como lidos
              </Button>
            </div>
          </div>

          <TabsContent value="ativos" className="mt-0">
            {alertasFiltrados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-success/10 text-success rounded-full">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <p className="text-lg font-semibold mb-2">Tudo tranquilo! 🎉</p>
                <p>Nenhum alerta ativo no momento</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {alertasFiltrados.map((alerta) => {
                  const Icon = getIcon(alerta.tipo, alerta.categoria);
                  return (
                    <div
                      key={alerta.id}
                      className={cn(
                        "p-4 rounded-lg cursor-pointer",
                        getStyles(alerta.tipo, alerta.prioridade)
                      )}
                      onClick={() => setDetalhesAberto(alerta)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg shrink-0",
                            alerta.tipo === "danger" && "bg-destructive/20 text-destructive",
                            alerta.tipo === "warning" && "bg-warning/20 text-warning",
                            alerta.tipo === "success" && "bg-success/20 text-success",
                            alerta.tipo === "info" && "bg-primary/20 text-primary"
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{alerta.titulo}</h4>
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "text-xs",
                                  alerta.prioridade === "alta" && "bg-destructive/20 text-destructive",
                                  alerta.prioridade === "media" && "bg-warning/20 text-warning",
                                  alerta.prioridade === "baixa" && "bg-success/20 text-success"
                                )}
                              >
                                {alerta.prioridade.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="text-xs bg-muted/50">
                                {alerta.categoria}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{alerta.descricao}</p>
                            {alerta.detalhes && (
                              <p className="text-xs text-muted-foreground">{alerta.detalhes}</p>
                            )}
                            {alerta.metricas && (
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-xs text-muted-foreground">
                                  Atual: {formatarValor(alerta.metricas.valorAtual, alerta.metricas.unidade)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Meta: {formatarValor(alerta.metricas.valorMeta, alerta.metricas.unidade)}
                                </span>
                                {alerta.metricas.variacao !== 0 && (
                                  <span className={cn(
                                    "text-xs font-medium",
                                    alerta.metricas.variacao > 0 ? "text-success" : "text-destructive"
                                  )}>
                                    {alerta.metricas.variacao > 0 ? "▲" : "▼"} {Math.abs(alerta.metricas.variacao).toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetalhesAberto(alerta);
                            }}
                            className="text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Detalhes
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              marcarComoLido(alerta.id);
                            }}
                            className="h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="configuracoes" className="mt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {alertasConfig.map((config) => (
                  <Card key={config.id} className="border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Settings2 className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{config.nome}</h4>
                            <p className="text-xs text-muted-foreground">{config.descricao}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={config.ativo ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleConfig(config.id)}
                            className={config.ativo ? "bg-primary" : "border-border"}
                          >
                            {config.ativo ? "Ativo" : "Inativo"}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => abrirConfigDialog(config)}
                            className="h-8 w-8 border-border"
                            title="Configurar alerta"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Categoria: <span className="font-medium text-foreground">{config.categoria}</span></div>
                        <div>Prioridade: <span className="font-medium text-foreground">{config.prioridade}</span></div>
                        <div>Tolerância: <span className="font-medium text-foreground">{config.tolerancia}%</span></div>
                        <div>Frequência: <span className="font-medium text-foreground">{config.frequencia}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Modal de Detalhes */}
      <Dialog open={!!detalhesAberto} onOpenChange={() => setDetalhesAberto(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                detalhesAberto?.tipo === "danger" && "bg-destructive/20 text-destructive",
                detalhesAberto?.tipo === "warning" && "bg-warning/20 text-warning",
                detalhesAberto?.tipo === "success" && "bg-success/20 text-success",
                detalhesAberto?.tipo === "info" && "bg-primary/20 text-primary"
              )}>
                {detalhesAberto && (() => {
                  const Icon = getIcon(detalhesAberto.tipo, detalhesAberto.categoria);
                  return <Icon className="h-5 w-5" />;
                })()}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{detalhesAberto?.titulo}</h3>
                <p className="text-sm text-muted-foreground">{detalhesAberto?.descricao}</p>
              </div>
            </DialogTitle>
            <DialogDescription>
              {detalhesAberto?.detalhes}
            </DialogDescription>
          </DialogHeader>

          {detalhesAberto?.metricas && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Atual</p>
                        <p className="text-2xl font-bold">
                          {formatarValor(detalhesAberto.metricas.valorAtual, detalhesAberto.metricas.unidade)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/10 text-primary">
                        <DollarSign className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Meta</p>
                        <p className="text-2xl font-bold">
                          {formatarValor(detalhesAberto.metricas.valorMeta, detalhesAberto.metricas.unidade)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-success/10 text-success">
                        <Target className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Variação</p>
                        <p className={cn(
                          "text-2xl font-bold",
                          detalhesAberto.metricas.variacao >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {detalhesAberto.metricas.variacao >= 0 ? "▲" : "▼"} {Math.abs(detalhesAberto.metricas.variacao).toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-warning/10 text-warning">
                        <BarChart3 className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos de acompanhamento */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-border">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Evolução Mensal</h4>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={Array.from({ length: 12 }, (_, i) => ({
                          mes: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][i],
                          valor: Math.random() * 100
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          />
                          <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="hsl(var(--primary))" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Comparativo</h4>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={Array.from({ length: 6 }, (_, i) => ({
                          mes: ["M-5", "M-4", "M-3", "M-2", "M-1", "M+0"][i],
                          atual: Math.random() * 100,
                          meta: 80
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          />
                          <Line type="monotone" dataKey="atual" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                          <Line type="monotone" dataKey="meta" stroke="hsl(var(--success))" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: "hsl(var(--success))" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => marcarComoLido(detalhesAberto!.id)}
                className="border-border"
              >
                <Eye className="h-4 w-4 mr-2" />
                Marcar como lido
              </Button>
              <Button
                variant="outline"
                onClick={() => marcarComoIgnorado(detalhesAberto!.id)}
                className="border-border"
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Ignorar
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                onClick={() => setDetalhesAberto(null)}
              >
                Fechar
              </Button>
              {detalhesAberto?.acao && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (detalhesAberto.acao!.tipo === "navegar") {
                      // Navegação seria implementada aqui
                      console.log("Navegar para:", detalhesAberto.acao!.destino);
                    }
                    setDetalhesAberto(null);
                  }}
                  className="border-border"
                >
                  {detalhesAberto.acao.label}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Configuração de Alerta */}
      <Dialog open={!!configDialogAberto} onOpenChange={fecharConfigDialog}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Configurar Alerta</h3>
                <p className="text-sm text-muted-foreground">{configDialogAberto?.nome}</p>
              </div>
            </DialogTitle>
            <DialogDescription>
              Personalize as configurações deste alerta
            </DialogDescription>
          </DialogHeader>

          {configDialogAberto && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant={configDialogAberto.ativo ? "default" : "outline"}
                    size="sm"
                    onClick={() => setConfigDialogAberto(prev => prev ? { ...prev, ativo: !prev.ativo } : null)}
                    className={configDialogAberto.ativo ? "bg-primary" : "border-border"}
                  >
                    {configDialogAberto.ativo ? "Ativo" : "Inativo"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tolerância (%)</label>
                <Input
                  type="number"
                  value={configDialogAberto.tolerancia}
                  onChange={(e) => setConfigDialogAberto(prev => prev ? { ...prev, tolerancia: Number(e.target.value) } : null)}
                  className="bg-muted border-border"
                  min="0"
                  max="100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Frequência</label>
                <Select 
                  value={configDialogAberto.frequencia} 
                  onValueChange={(v) => setConfigDialogAberto(prev => prev ? { ...prev, frequencia: v as any } : null)}
                >
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sempre">Sempre</SelectItem>
                    <SelectItem value="diario">Diário</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <Select 
                  value={configDialogAberto.categoria} 
                  onValueChange={(v) => setConfigDialogAberto(prev => prev ? { ...prev, categoria: v as any } : null)}
                >
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="investimento">Investimento</SelectItem>
                    <SelectItem value="seguro">Seguro</SelectItem>
                    <SelectItem value="meta">Meta</SelectItem>
                    <SelectItem value="sistema">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Prioridade</label>
                <Select 
                  value={configDialogAberto.prioridade} 
                  onValueChange={(v) => setConfigDialogAberto(prev => prev ? { ...prev, prioridade: v as any } : null)}
                >
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              onClick={fecharConfigDialog}
              className="border-border"
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={() => configDialogAberto && salvarConfig(configDialogAberto)}
            >
              Salvar Configurações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}