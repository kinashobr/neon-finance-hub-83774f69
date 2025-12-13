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
  Shield
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
  "dividas-altas": {
    icon: Target,
    descricao: "Alerta quando dívidas ultrapassarem X% do saldo disponível",
    unidade: "%"
  },
  "margem-baixa": {
    icon: Target,
    descricao: "Alerta quando a margem de poupança ficar abaixo de X%",
    unidade: "%"
  },
  "emprestimos-pendentes": {
    icon: Target,
    descricao: "Alerta sobre empréstimos aguardando configuração",
    unidade: ""
  },
  "comprometimento-renda": {
    icon: CreditCard,
    descricao: "Alerta quando parcelas de empréstimo ultrapassam X% da receita mensal",
    unidade: "%"
  },
  "rigidez-orcamentaria": {
    icon: Repeat,
    descricao: "Alerta quando despesas fixas ultrapassam X% das despesas totais",
    unidade: "%"
  },
  "seguro-vencendo": {
    icon: Shield,
    descricao: "Alerta quando seguros de veículos estão próximos do vencimento (60 dias)",
    unidade: ""
  },
};

const DEFAULT_CONFIG: AlertaConfig[] = [
  { id: "saldo-negativo", nome: "Saldo Negativo", ativo: true, tolerancia: 0 },
  { id: "dividas-altas", nome: "Dívidas Altas", ativo: true, tolerancia: 200 },
  { id: "margem-baixa", nome: "Margem Baixa", ativo: true, tolerancia: 10 },
  { id: "emprestimos-pendentes", nome: "Empréstimos Pendentes", ativo: true, tolerancia: 0 },
  { id: "comprometimento-renda", nome: "Comprometimento Renda", ativo: true, tolerancia: 30 },
  { id: "rigidez-orcamentaria", nome: "Rigidez Orçamentária", ativo: true, tolerancia: 60 },
  { id: "seguro-vencendo", nome: "Seguro Vencendo", ativo: true, tolerancia: 0 },
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
    getSaldoDevedor,
  } = useFinance();
  const [configOpen, setConfigOpen] = useState(false);
  const [alertasConfig, setAlertasConfig] = useState<AlertaConfig[]>(() => {
    const saved = localStorage.getItem("alertas-config");
    const savedConfig = saved ? JSON.parse(saved) : [];
    const configMap = new Map(savedConfig.map((c: AlertaConfig) => [c.id, c]));
    
    // Merge saved config with new defaults
    return DEFAULT_CONFIG.map(defaultAlert => {
        if (configMap.has(defaultAlert.id)) {
            // FIX: Use non-null assertion '!' since we checked 'has'
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
    const saldoContas = getSaldoAtual(); 

    // 2. Dívidas (Global)
    const totalDividas = getSaldoDevedor(); 
    
    // 3. Empréstimos pendentes (Configuration pending)
    const emprestimosPendentes = emprestimos.filter(e => e.status === 'pendente_config').length;

    // 4. Transações do mês (Current Month)
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
      
    // 5. Despesas Fixas do Mês
    const categoriasMap = new Map(categoriasV2.map(c => [c.id, c]));
    const despesasFixasMes = transacoesMes
        .filter(t => {
            const cat = categoriasMap.get(t.categoryId || '');
            return cat?.nature === 'despesa_fixa';
        })
        .reduce((acc, t) => acc + t.amount, 0);

    // 6. Margem de Poupança (Savings Rate)
    const margemPoupanca = receitasMes > 0 ? ((receitasMes - despesasMes) / receitasMes) * 100 : 0;
    
    // 7. Total de Parcelas de Empréstimo do Mês (Debt Service)
    const parcelasEmprestimoMes = transacoesMes
        .filter(t => t.operationType === 'pagamento_emprestimo')
        .reduce((acc, t) => acc + t.amount, 0);
        
    // 8. Seguros vencendo em 60 dias
    const dataLimiteSeguro = new Date();
    dataLimiteSeguro.setDate(dataLimiteSeguro.getDate() + 60);
    
    const segurosVencendo = segurosVeiculo.filter(s => {
        try {
            const vigenciaFim = parseDateLocal(s.vigenciaFim);
            return vigenciaFim > now && vigenciaFim <= dataLimiteSeguro;
        } catch {
            return false;
        }
    }).length;


    return {
      saldoContas,
      receitasMes,
      despesasMes,
      totalDividas,
      emprestimosPendentes,
      margemPoupanca,
      despesasFixasMes,
      parcelasEmprestimoMes,
      segurosVencendo,
    };
  }, [transacoesV2, emprestimos, segurosVeiculo, categoriasV2, getSaldoAtual, getSaldoDevedor]);

  // Gerar alertas baseados nas configurações
  const alertas = useMemo(() => {
    const alerts: Alerta[] = [];
    const configMap = new Map(alertasConfig.map(c => [c.id, c]));

    // 1. Saldo negativo
    if (configMap.get("saldo-negativo")?.ativo && metricas.saldoContas < 0) {
      alerts.push({
        id: "saldo-negativo",
        tipo: "danger",
        titulo: "Saldo Negativo",
        descricao: `R$ ${metricas.saldoContas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        rota: "/receitas-despesas"
      });
    }

    // 2. Dívidas altas (Debt to Asset Ratio - using totalDividas vs saldoContas as proxy)
    const toleranciaDividas = configMap.get("dividas-altas")?.tolerancia || 200;
    if (configMap.get("dividas-altas")?.ativo && metricas.totalDividas > metricas.saldoContas * (toleranciaDividas / 100) && metricas.saldoContas > 0) {
      alerts.push({
        id: "dividas-altas",
        tipo: "warning",
        titulo: "Dívidas Elevadas",
        descricao: `Dívida total: R$ ${metricas.totalDividas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        rota: "/emprestimos"
      });
    }

    // 3. Margem baixa (Savings Rate)
    const toleranciaMargem = configMap.get("margem-baixa")?.tolerancia || 10;
    if (configMap.get("margem-baixa")?.ativo && metricas.margemPoupanca < toleranciaMargem && metricas.receitasMes > 0) {
      alerts.push({
        id: "margem-baixa",
        tipo: "warning",
        titulo: "Margem Baixa",
        descricao: `${metricas.margemPoupanca.toFixed(1)}% de poupança`,
        rota: "/receitas-despesas"
      });
    }

    // 4. Empréstimos pendentes
    if (configMap.get("emprestimos-pendentes")?.ativo && metricas.emprestimosPendentes > 0) {
      alerts.push({
        id: "emprestimos-pendentes",
        tipo: "info",
        titulo: "Configurar Empréstimos",
        descricao: `${metricas.emprestimosPendentes} pendente(s)`,
        rota: "/emprestimos"
      });
    }
    
    // 5. Alto Comprometimento de Renda (Debt Service Ratio)
    const configComprometimento = configMap.get("comprometimento-renda");
    const toleranciaComprometimento = configComprometimento?.tolerancia || 30;
    const comprometimentoRenda = metricas.receitasMes > 0 ? (metricas.parcelasEmprestimoMes / metricas.receitasMes) * 100 : 0;
    
    if (configComprometimento?.ativo && comprometimentoRenda > toleranciaComprometimento && metricas.receitasMes > 0) {
        alerts.push({
            id: "comprometimento-renda",
            tipo: "danger",
            titulo: "Comprometimento Alto",
            descricao: `${comprometimentoRenda.toFixed(1)}% da renda em parcelas`,
            rota: "/emprestimos"
        });
    }
    
    // 6. Rigidez Orçamentária (Fixed Expense Ratio)
    const configRigidez = configMap.get("rigidez-orcamentaria");
    const toleranciaRigidez = configRigidez?.tolerancia || 60;
    const rigidezOrcamentaria = metricas.despesasMes > 0 ? (metricas.despesasFixasMes / metricas.despesasMes) * 100 : 0;
    
    if (configRigidez?.ativo && rigidezOrcamentaria > toleranciaRigidez && metricas.despesasMes > 0) {
        alerts.push({
            id: "rigidez-orcamentaria",
            tipo: "warning",
            titulo: "Rigidez Orçamentária",
            descricao: `${rigidezOrcamentaria.toFixed(1)}% das despesas são fixas`,
            rota: "/receitas-despesas"
        });
    }
    
    // 7. Seguro Vencendo
    const configSeguro = configMap.get("seguro-vencendo");
    if (configSeguro?.ativo && metricas.segurosVencendo > 0) {
        alerts.push({
            id: "seguro-vencendo",
            tipo: "warning",
            titulo: "Seguro Vencendo",
            descricao: `${metricas.segurosVencendo} seguro(s) vencendo em 60 dias`,
            rota: "/veiculos"
        });
    }

    return alerts.filter(a => !dismissedAlertas.has(a.id));
  }, [metricas, alertasConfig, dismissedAlertas]);

  const handleSaveConfig = (newConfig: AlertaConfig[]) => {
    setAlertasConfig(newConfig);
    localStorage.setItem("alertas-config", JSON.stringify(newConfig));
  };

  const handleDismiss = (alertaId: string) => {
    setDismissedAlertas(prev => new Set([...prev, alertaId]));
  };

  const getAlertIcon = (alertaId: string) => {
    const info = ALERTA_INFO[alertaId];
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
    <div className="px-2">
      <div className="flex items-center justify-between mb-2 px-1">
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
        <div className="space-y-2">
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
                  <div className="flex-1 min-w-0">
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