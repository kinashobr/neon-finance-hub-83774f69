import { 
  ShoppingCart, Car, Home, Briefcase, Heart, 
  Utensils, Plane, Zap, ChevronRight, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Transacao } from "@/contexts/FinanceContext";
import { useNavigate } from "react-router-dom";

interface TransacoesRecentesProps {
  transacoes: Transacao[];
  limit?: number;
}

const categoriaIcons: Record<string, React.ElementType> = {
  "Alimentação": Utensils,
  "Transporte": Car,
  "Moradia": Home,
  "Lazer": Plane,
  "Saúde": Heart,
  "Salário": Briefcase,
  "Freelance": Zap,
  "Outros": ShoppingCart,
};

export function TransacoesRecentes({ transacoes, limit = 8 }: TransacoesRecentesProps) {
  const navigate = useNavigate();

  const recentTransacoes = [...transacoes]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, limit);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const getIcon = (categoria: string) => {
    return categoriaIcons[categoria] || DollarSign;
  };

  return (
    <TooltipProvider>
      <div className="glass-card p-5 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Transações Recentes</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs"
            onClick={() => navigate("/receitas-despesas")}
          >
            Ver todas <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        <div className="space-y-2">
          {recentTransacoes.map((transacao) => {
            const Icon = getIcon(transacao.categoria);
            const isReceita = transacao.tipo === "receita";
            
            return (
              <Tooltip key={transacao.id}>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        isReceita ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[150px]">
                          {transacao.descricao}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transacao.categoria} • {formatDate(transacao.data)}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "font-semibold text-sm",
                      isReceita ? "text-success" : "text-destructive"
                    )}>
                      {isReceita ? "+" : "-"} R$ {transacao.valor.toLocaleString("pt-BR")}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-medium">{transacao.descricao}</p>
                    <p>Categoria: {transacao.categoria}</p>
                    <p>Data: {new Date(transacao.data).toLocaleDateString("pt-BR")}</p>
                    <p>Valor: R$ {transacao.valor.toLocaleString("pt-BR")}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {transacoes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma transação registrada
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
