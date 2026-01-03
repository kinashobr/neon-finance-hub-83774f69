import { 
  Landmark, 
  Bitcoin, 
  Coins, 
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface AtivoGrupo {
  id: string;
  nome: string;
  valor: number;
  variacao: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

interface AcompanhamentoAtivosProps {
  // Usando apenas valores consolidados, pois a lógica de cálculo está no Index.tsx
  investimentosRF: number;
  criptomoedas: number;
  stablecoins: number;
  reservaEmergencia: number;
  poupanca: number;
  variacaoRF?: number;
  variacaoCripto?: number;
}

export function AcompanhamentoAtivos({
  investimentosRF,
  criptomoedas,
  stablecoins,
  reservaEmergencia,
  poupanca,
  variacaoRF = 0,
  variacaoCripto = 0,
}: AcompanhamentoAtivosProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`;
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const grupos: AtivoGrupo[] = [
    {
      id: 'renda-fixa',
      nome: 'Renda Fixa',
      valor: investimentosRF + poupanca,
      variacao: variacaoRF,
      icon: Landmark,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      id: 'cripto',
      nome: 'Criptoativos',
      valor: criptomoedas,
      variacao: variacaoCripto,
      icon: Bitcoin,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      id: 'stables',
      nome: 'Stablecoins',
      valor: stablecoins,
      variacao: 0,
      icon: Coins,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      id: 'reserva',
      nome: 'Reserva Emergência',
      valor: reservaEmergencia,
      variacao: 0,
      icon: PiggyBank,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ].filter(g => g.valor > 0);

  const totalAtivos = grupos.reduce((acc, g) => acc + g.valor, 0);

  const VariacaoIcon = ({ variacao }: { variacao: number }) => {
    if (variacao > 0) return <TrendingUp className="h-3 w-3 text-success" />;
    if (variacao < 0) return <TrendingDown className="h-3 w-3 text-destructive" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <div className="glass-card p-4 md:p-5">
      <div className="mb-3 md:mb-4">
        <h3 className="text-base md:text-lg font-semibold text-foreground">Acompanhamento de Ativos</h3>
        <p className="text-xs text-muted-foreground">Visão consolidada dos investimentos</p>
      </div>

      {grupos.length > 0 ? (
        <div className="space-y-4">
          {grupos.map((grupo) => {
            const percentual = totalAtivos > 0 ? (grupo.valor / totalAtivos) * 100 : 0;
            
            return (
              <div key={grupo.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-md", grupo.bgColor)}>
                      <grupo.icon className={cn("h-3.5 w-3.5", grupo.color)} />
                    </div>
                    <span className="text-sm font-medium text-foreground">{grupo.nome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(grupo.valor)}
                    </span>
                    {grupo.variacao !== 0 && (
                      <div className="flex items-center gap-0.5">
                        <VariacaoIcon variacao={grupo.variacao} />
                        <span className={cn(
                          "text-xs font-medium",
                          grupo.variacao > 0 ? "text-success" : "text-destructive"
                        )}>
                          {grupo.variacao > 0 ? '+' : ''}{grupo.variacao.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={percentual} 
                    className="h-1.5 flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {percentual.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}

          <div className="pt-3 mt-3 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Investido</span>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(totalAtivos)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Nenhum ativo cadastrado</p>
          <p className="text-xs mt-1">Acesse Investimentos para adicionar</p>
        </div>
      )}
    </div>
  );
}