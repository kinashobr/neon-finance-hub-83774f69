import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  AlertTriangle, 
  Bell, 
  TrendingDown, 
  CreditCard, 
  Target,
  Settings2,
  ChevronRight,
  X,
  Repeat,
  Shield,
  Car,
  DollarSign,
  CheckCircle2,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { cn, parseDateLocal } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { AlertasConfigDialog } from "./AlertasConfigDialog";
import { differenceInDays, addMonths, isBefore, isAfter, isSameDay } from "date-fns";

interface Alerta {
  id: string;
  tipo: "warning" | "danger" | "info" | "success";
  titulo: string;
  descricao: string;
  rota?: string;
}

interface AlertaConfig {
  id: string;
  nome: string;
  ativo: boolean;
  tolerancia: number;
}

const ALERTA_INFO: Record<string, { icon: React.ElementType; descricao: string; unidade: string }> = {
  "saldo-negativo": {
    icon: AlertTriangle,
    descricao: "Alerta quando o saldo total das contas ficar negativo",
    unidade: ""
  },
  "emprestimos-pendentes": {
    icon: Settings2,
    descricao: "Empréstimos aguardando configuração de contrato",
    unidade: ""
  },
  "veiculos-pendentes": {
    icon: Car,
    descricao: "Veículos comprados aguardando cadastro completo",
    unidade: ""
  },
  "parcela-emprestimo-vencida": {
    icon: CreditCard,
    descricao: "Parcela de empréstimo em atraso",
    unidade: ""
  },
  "seguro-vencendo": {
    icon: Shield,
    descricao: "Seguro de veículo vencendo nos próximos 30 dias",
    unidade: ""
  },
  "comprometimento-renda": {
    icon: Percent,
    descricao: "Parcelas de empréstimo e despesas fixas ultrapassam X% da receita",
    unidade: "%"
  },
  "margem-baixa": {
    icon: DollarSign,
    descricao: "Margem de poupança abaixo de X%",
    unidade: "%"
  },
  "conquista-amortizacao": {
    icon: CheckCircle2,
    descricao: "Empréstimo atingiu um marco de quitação (50% ou 75%)",
    unidade: ""
  },
};

const DEFAULT_CONFIG: AlertaConfig[] = [
  { id: "saldo-negativo", nome: "Risco de Descoberto", ativo: true, tolerancia: 0 },
  { id: "emprestimos-pendentes", nome: "Configuração de Empréstimo", ativo: true, tolerancia: 0 },
  { id: "veiculos-pendentes", nome: "Cadastro de Veículo Pendente", ativo: true, tolerancia: 0 },
  { id: "parcela-emprestimo-vencida", nome: "Parcela de Empréstimo Vencida", ativo: true, tolerancia: 0 },
  { id: "seguro-vencendo", nome: "Seguro Próximo ao Vencimento", ativo: true, tolerancia: 30 }, // 30 dias
  { id: "comprometimento-renda", nome: "Comprometimento de Renda", ativo: true, tolerancia: 30 }, // 30%
  { id: "margem-baixa", nome: "Margem de Poupança Baixa", ativo: true, tolerancia: 10 }, // 10%
];

interface SidebarAlertasProps {
  collapsed?: boolean;
}

export function SidebarAlertas({ collapsed = false }: SidebarAlertasProps) {
  const navigate = useNavigate();
  const { 
    transacoesV2, 
    emprestimos, 
    segurosVeiculo,
    categoriasV2,
    getSaldoAtual,
    getPendingLoans,
    getPendingVehicles,
    hasOverdueLoanInstallments, // NEW
    hasOverdueSeguroInstallments, // NEW
  } = useFinance();
  
  const [configOpen, setConfigOpen] = useState(false);
  const [alertasConfig, setAlertasConfig] = useState<AlertaConfig[]>(() => {
    const saved = localStorage.getItem("alertas-config");
    const savedConfig: AlertaConfig[] = saved ? JSON.parse(saved) : [];
    const configMap = new Map(savedConfig.map((c: AlertaConfig) => [c.id, c]));
    
    // Merge saved config with new defaults
    return DEFAULT_CONFIG.map(defaultAlert => {
        if (configMap.has(defaultAlert.id)) {
            return { ...defaultAlert, ...configMap.get(defaultAlert.id)! };
        }
        return defaultAlert;
    });
  });
  const [dismissedAlertas, setDismissedAlertas] = useState<Set<string>>(new Set());

  // Calcular métricas
  const metricas = useMemo(() => {
    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();

    // 1. Saldo total das contas (Global)
    // Usamos getSaldoAtual() que calcula o saldo até o final do histórico (hoje)
    const saldoContas = getSaldoAtual(); 

    // 2. Transações do mês (Current Month)
    const transacoesMes = transacoesV2.filter(t => {
      try {
        const d = parseDateLocal(t.date);
        return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
      } catch {
        return false;
      }
    });

    const receitasMes = transacoesMes
      .filter(t => t.operationType === 'receita' || t.operationType === 'rendimento')
      .reduce((acc, t) => acc + t.amount, 0);

    const despesasMes = transacoesMes
      .filter(t => t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo')
      .reduce((acc, t) => acc + t.amount, 0);
      
    // 3. Despesas Fixas do Mês (para comprometimento)
    const categoriasMap = new Map(categoriasV2.map(c => [c.id, c]));
    const despesasFixasMes = transacoesMes
        .filter(t => {
            const cat = categoriasMap.get(t.categoryId || '');
            return cat?.nature === 'despesa_fixa';
        })
        .reduce((acc, t) => acc + t.amount, 0);
        
    // 4. Total de Parcelas de Empréstimo do Mês (Debt Service)
    const parcelasEmprestimoMes = transacoesMes
        .filter(t => t.operationType === 'pagamento_emprestimo')
        .reduce((acc, t) => acc + t.amount, 0);
        
    // 5. Seguros vencendo em 30 dias (usando a tolerância padrão)
    const dataLimiteSeguro = addMonths(now, 1); // 30 dias é aproximadamente 1 mês
    
    const segurosVencendo = segurosVeiculo.filter(s => {
        try {
            const vigenciaFim = parseDateLocal(s.vigenciaFim);
            // Verifica se a vigência termina entre hoje e o limite de 30 dias
            return isAfter(vigenciaFim, now) && isBefore(vigenciaFim, dataLimiteSeguro);
        } catch {
            return false;
        }
    }).length;

    // 6. Margem de Poupança (Savings Rate)
    const margemPoupanca = receitasMes > 0 ? ((receitasMes - despesasMes) / receitasMes) * 100 : 0;
    
    // 7. Comprometimento de Renda (Parcelas + Fixas / Receita)
    const comprometimentoRenda = receitasMes > 0 ? ((parcelasEmprestimoMes + despesasFixasMes) / receitasMes) * 100 : 0;


    return {
      saldoContas,
      receitasMes,
      despesasMes,
      emprestimosPendentes: getPendingLoans().length,
      veiculosPendentes: getPendingVehicles().length,
      margemPoupanca,
      comprometimentoRenda,
      segurosVencendo,
    };
  }, [transacoesV2, emprestimos, segurosVeiculo, categoriasV2, getSaldoAtual, getPendingLoans, getPendingVehicles]);

  // Gerar alertas baseados nas configurações
  const alertas = useMemo(() => {
    const alerts: Alerta[] = [];
    const configMap = new Map(alertasConfig.map(c => [c.id, c]));
    const today = new Date();

    // --- 1. Ação Imediata ---

    // 1.1. Saldo negativo
    const configSaldo = configMap.get("saldo-negativo");
    if (configSaldo?.ativo && metricas.saldoContas < configSaldo.tolerancia) {
      alerts.push({
        id: "saldo-negativo",
        tipo: "danger",
        titulo: "Risco de Descoberto",
        descricao: `Saldo atual: R$ ${metricas.saldoContas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        rota: "/receitas-despesas"
      });
    }
    
    // 1.2. Empréstimos Pendentes de Configuração
    if (configMap.get("emprestimos-pendentes")?.ativo && metricas.emprestimosPendentes > 0) {
      alerts.push({
        id: "emprestimos-pendentes",
        tipo: "info",
        titulo: "Configurar Empréstimos",
        descricao: `${metricas.emprestimosPendentes} contrato(s) aguardando detalhes.`,
        rota: "/emprestimos"
      });
    }
    
    // 1.3. Veículos Pendentes de Cadastro
    if (configMap.get("veiculos-pendentes")?.ativo && metricas.veiculosPendentes > 0) {
      alerts.push({
        id: "veiculos-pendentes",
        tipo: "info",
        titulo: "Cadastro de Veículo Pendente",
        descricao: `${metricas.veiculosPendentes} veículo(s) aguardando detalhes.`,
        rota: "/veiculos"
      });
    }

    // 1.4. Parcela de Empréstimo Vencida
    if (configMap.get("parcela-emprestimo-vencida")?.ativo && hasOverdueLoanInstallments(today)) {
        alerts.push({
            id: "parcela-emprestimo-vencida",
            tipo: "danger",
            titulo: "Parcela de Empréstimo Vencida",
            descricao: `Pelo menos uma parcela está em atraso.`,
            rota: "/emprestimos"
        });
    }
    
    // 1.5. Seguro Vencendo (30 dias)
    const configSeguro = configMap.get("seguro-vencendo");
    if (configSeguro?.ativo && metricas.segurosVencendo > 0) {
        alerts.push({
            id: "seguro-vencendo",
            tipo: "warning",
            titulo: "Seguro Vencendo",
            descricao: `${metricas.segurosVencendo} seguro(s) vencendo em 30 dias.`,
            rota: "/veiculos"
        });
    }
    
    // 1.6. Parcela de Seguro Vencida
    if (hasOverdueSeguroInstallments(today)) {
        alerts.push({
            id: "parcela-seguro-vencida",
            tipo: "danger",
            titulo: "Parcela de Seguro Vencida",
            descricao: `Pelo menos uma parcela de seguro está em atraso.`,
            rota: "/veiculos"
        });
    }

    // --- 2. Risco Estrutural ---

    // 2.1. Comprometimento de Renda
    const configComprometimento = configMap.get("comprometimento-renda");
    const toleranciaComprometimento = configComprometimento?.tolerancia || 30;
    
    if (configComprometimento?.ativo && metricas.comprometimentoRenda > toleranciaComprometimento && metricas.receitasMes > 0) {
        alerts.push({
            id: "comprometimento-renda",
            tipo: metricas.comprometimentoRenda > 50 ? "danger" : "warning",
            titulo: "Comprometimento Alto",
            descricao: `${metricas.comprometimentoRenda.toFixed(1)}% da renda em dívidas/fixas.`,
            rota: "/relatorios"
        });
    }
    
    // 2.2. Margem de Poupança Baixa
    const configMargem = configMap.get("margem-baixa");
    const toleranciaMargem = configMargem?.tolerancia || 10;
    
    if (configMargem?.ativo && metricas.margemPoupanca < toleranciaMargem && metricas.receitasMes > 0) {
        alerts.push({
            id: "margem-baixa",
            tipo: "warning",
            titulo: "Margem de Poupança Baixa",
            descricao: `${metricas.margemPoupanca.toFixed(1)}% de poupança.`,
            rota: "/relatorios"
        });
    }
    
    // --- 3. Oportunidade/Conquista (Simplificado) ---
    
    // 3.1. Conquista de Amortização (Exemplo: 50% ou 75% do principal)
    emprestimos.forEach(loan => {
        if (loan.status === 'ativo' && loan.meses > 0) {
            const paidCount = loan.parcelasPagas || 0;
            const progress = (paidCount / loan.meses) * 100;
            
            if (progress >= 50 && progress < 75 && !dismissedAlertas.has(`conquista-50-${loan.id}`)) {
                alerts.push({
                    id: `conquista-50-${loan.id}`,
                    tipo: "success",
                    titulo: "Conquista: 50% Amortizado!",
                    descricao: `Empréstimo ${loan.contrato} atingiu 50% de quitação.`,
                    rota: "/emprestimos"
                });
            } else if (progress >= 75 && progress < 100 && !dismissedAlertas.has(`conquista-75-${loan.id}`)) {
                alerts.push({
                    id: `conquista-75-${loan.id}`,
                    tipo: "success",
                    titulo: "Conquista: Reta Final!",
                    descricao: `Empréstimo ${loan.contrato} atingiu 75% de quitação.`,
                    rota: "/emprestimos"
                });
            }
        }
    });


    return alerts.filter(a => !dismissedAlertas.has(a.id));
  }, [metricas, alertasConfig, dismissedAlertas, emprestimos, hasOverdueLoanInstallments, hasOverdueSeguroInstallments]);

  const handleSaveConfig = (newConfig: AlertaConfig[]) => {
    setAlertasConfig(newConfig);
    localStorage.setItem("alertas-config", JSON.stringify(newConfig));
  };

  const handleDismiss = (alertaId: string) => {
    setDismissedAlertas(prev => new Set([...prev, alertaId]));
  };

  const getAlertIcon = (alertaId: string) => {
    const info = ALERTA_INFO[alertaId.split('-')[0]]; // Usa a chave base
    return info?.icon || Target;
  };

  const getAlertStyles = (tipo: string) => {
    switch (tipo) {
      case "danger": return "bg-destructive/10 border-destructive/30 text-destructive";
      case "warning": return "bg-warning/10 border-warning/30 text-warning";
      case "info": return "bg-primary/10 border-primary/30 text-primary";
      default: return "bg-success/10 border-success/30 text-success";
    }
  };

  if (collapsed) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "w-10 h-10 rounded-lg",
                  alertas.length > 0 ? "sidebar-alert-warning" : "sidebar-action-btn"
                )}
                onClick={() => setConfigOpen(true)}
              >
                <Bell className="w-4 h-4" />
              </Button>
              {alertas.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive">
                  {alertas.length}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="sidebar-tooltip max-w-xs">
            <div className="space-y-1">
              {alertas.length > 0 ? (
                alertas.map(a => (
                  <div key={a.id} className="text-xs">{a.titulo}</div>
                ))
              ) : (
                <div className="text-xs">Sem alertas</div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        <AlertasConfigDialog
          open={configOpen}
          onOpenChange={setConfigOpen}
          config={alertasConfig}
          onSave={handleSaveConfig}
        />
      </>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs sidebar-section-label">Alertas</p>
          {alertas.length > 0 && (
            <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
              {alertas.length}
            </Badge>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setConfigOpen(true)}
            >
              <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Configurar alertas</TooltipContent>
        </Tooltip>
      </div>

      <ScrollArea className="max-h-40">
        <div className="space-y-2 px-2">
          {alertas.length > 0 ? (
            alertas.map((alerta) => {
              const Icon = getAlertIcon(alerta.id);
              return (
                <div
                  key={alerta.id}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded-lg text-xs border cursor-pointer group",
                    getAlertStyles(alerta.tipo)
                  )}
                  onClick={() => alerta.rota && navigate(alerta.rota)}
                >
                  <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0 overflow-hidden"> {/* Adicionado overflow-hidden */}
                    <p className="font-medium truncate">{alerta.titulo}</p>
                    <p className="text-[10px] opacity-80 truncate">{alerta.descricao}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(alerta.id);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-lg text-xs bg-muted/30 text-muted-foreground">
              <Target className="w-3.5 h-3.5" />
              <span>Sem alertas no momento</span>
            </div>
          )}
        </div>
      </ScrollArea>

      <AlertasConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        config={alertasConfig}
        onSave={handleSaveConfig}
      />
    </div>
  );
}