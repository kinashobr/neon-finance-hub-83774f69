import { Calendar, Zap, Home, Wifi, CreditCard, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContaProxima {
  id: string;
  nome: string;
  valor: number;
  diasParaVencer: number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

interface ProximasContasCardProps {
  contas?: ContaProxima[];
}

// Default sample data when no real data is provided
const defaultContas: ContaProxima[] = [
  {
    id: '1',
    nome: 'Conta de Luz',
    valor: 342.00,
    diasParaVencer: 5,
    icon: Zap,
    iconColor: 'text-warning',
    iconBg: 'bg-warning/10',
  },
  {
    id: '2',
    nome: 'Aluguel',
    valor: 1500.00,
    diasParaVencer: 10,
    icon: Home,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
  },
  {
    id: '3',
    nome: 'Internet',
    valor: 99.90,
    diasParaVencer: 15,
    icon: Wifi,
    iconColor: 'text-info',
    iconBg: 'bg-info/10',
  },
];

export function ProximasContasCard({ contas = defaultContas }: ProximasContasCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getDueDateText = (dias: number) => {
    if (dias === 0) return 'Vence hoje';
    if (dias === 1) return 'Vence amanhã';
    if (dias < 0) return `Vencido há ${Math.abs(dias)} dias`;
    return `Vence em ${dias} dias`;
  };

  const getDueDateColor = (dias: number) => {
    if (dias < 0) return 'text-destructive';
    if (dias <= 3) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <div className="glass-card p-5 md:p-6 rounded-2xl h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2.5 rounded-xl bg-warning/10">
          <Calendar className="w-5 h-5 text-warning" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Próximas Contas</span>
      </div>

      <div className="space-y-3">
        {contas.slice(0, 4).map((conta) => {
          const Icon = conta.icon;
          
          return (
            <div 
              key={conta.id}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", conta.iconBg)}>
                  <Icon className={cn("w-4 h-4", conta.iconColor)} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{conta.nome}</p>
                  <p className={cn("text-xs", getDueDateColor(conta.diasParaVencer))}>
                    {getDueDateText(conta.diasParaVencer)}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(conta.valor)}
              </span>
            </div>
          );
        })}

        {contas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma conta pendente</p>
          </div>
        )}
      </div>
    </div>
  );
}
