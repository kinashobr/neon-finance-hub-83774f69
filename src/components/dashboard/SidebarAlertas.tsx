import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  AlertTriangle, 
  Bell, 
  TrendingDown, 
  CreditCard, 
  Target,
  Settings2,
  ChevronRight,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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

const DEFAULT_CONFIG: AlertaConfig[] = [
  { id: "saldo-negativo", nome: "Saldo Negativo", ativo: true, tolerancia: 0 },
  { id: "dividas-altas", nome: "Dívidas Altas", ativo: true, tolerancia: 200 },
  { id: "margem-baixa", nome: "Margem Baixa", ativo: true, tolerancia: 10 },
  { id: "emprestimos-pendentes", nome: "Empréstimos Pendentes", ativo: true, tolerancia: 0 },
];

interface SidebarAlertasProps {
  collapsed?: boolean;
}

export function SidebarAlertas({ collapsed = false }: SidebarAlertasProps) {
  const navigate = useNavigate();
  const { transacoesV2, contasMovimento, emprestimos } = useFinance();
  const [configOpen, setConfigOpen] = useState(false);
  const [alertasConfig, setAlertasConfig] = useState<AlertaConfig[]>(() => {
    const saved = localStorage.getItem("alertas-config");
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  const [dismissedAlertas, setDismissedAlertas] = useState<Set<string>>(new Set());

  // Calcular métricas
  const metricas = useMemo(() => {
    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();

    // Saldo total das contas
    const saldoContas = contasMovimento.reduce((acc, conta) => {
      const contaTx = transacoesV2.filter(t => t.accountId === conta.id);
      const totalIn = contaTx.filter(t => t.flow === 'in' || t.flow === 'transfer_in').reduce((s, t) => s + t.amount, 0);
      const totalOut = contaTx.filter(t => t.flow === 'out' || t.flow === 'transfer_out').reduce((s, t) => s + t.amount, 0);
      return acc + conta.initialBalance + totalIn - totalOut;
    }, 0);

    // Receitas e despesas do mês
    const transacoesMes = transacoesV2.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    });

    const receitasMes = transacoesMes
      .filter(t => t.operationType === 'receita' || t.operationType === 'rendimento')
      .reduce((acc, t) => acc + t.amount, 0);

    const despesasMes = transacoesMes
      .filter(t => t.operationType === 'despesa' || t.operationType === 'pagamento_emprestimo')
      .reduce((acc, t) => acc + t.amount, 0);

    // Dívidas
    const totalDividas = emprestimos
      .filter(e => e.status !== 'pendente_config' && e.status !== 'quitado')
      .reduce((acc, e) => {
        const parcelasPagas = e.parcelasPagas || 0;
        const saldoDevedor = Math.max(0, e.valorTotal - (parcelasPagas * e.parcela));
        return acc + saldoDevedor;
      }, 0);

    const emprestimosPendentes = emprestimos.filter(e => e.status === 'pendente_config').length;

    const margemPoupanca = receitasMes > 0 ? ((receitasMes - despesasMes) / receitasMes) * 100 : 0;

    return {
      saldoContas,
      receitasMes,
      despesasMes,
      totalDividas,
      emprestimosPendentes,
      margemPoupanca
    };
  }, [transacoesV2, contasMovimento, emprestimos]);

  // Gerar alertas baseados nas configurações
  const alertas = useMemo(() => {
    const alerts: Alerta[] = [];
    const configMap = new Map(alertasConfig.map(c => [c.id, c]));

    // Saldo negativo
    if (configMap.get("saldo-negativo")?.ativo && metricas.saldoContas < 0) {
      alerts.push({
        id: "saldo-negativo",
        tipo: "danger",
        titulo: "Saldo Negativo",
        descricao: `R$ ${metricas.saldoContas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        rota: "/receitas-despesas"
      });
    }

    // Dívidas altas
    const toleranciaDividas = configMap.get("dividas-altas")?.tolerancia || 200;
    if (configMap.get("dividas-altas")?.ativo && metricas.totalDividas > metricas.saldoContas * (toleranciaDividas / 100)) {
      alerts.push({
        id: "dividas-altas",
        tipo: "warning",
        titulo: "Dívidas Elevadas",
        descricao: `R$ ${metricas.totalDividas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        rota: "/emprestimos"
      });
    }

    // Margem baixa
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

    // Empréstimos pendentes
    if (configMap.get("emprestimos-pendentes")?.ativo && metricas.emprestimosPendentes > 0) {
      alerts.push({
        id: "emprestimos-pendentes",
        tipo: "info",
        titulo: "Configurar Empréstimos",
        descricao: `${metricas.emprestimosPendentes} pendente(s)`,
        rota: "/emprestimos"
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

  const getAlertIcon = (tipo: string) => {
    switch (tipo) {
      case "danger": return AlertTriangle;
      case "warning": return TrendingDown;
      case "info": return CreditCard;
      default: return Target;
    }
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
              const Icon = getAlertIcon(alerta.tipo);
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
