import { Building2, PiggyBank, Wallet, TrendingUp, MoreVertical, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AccountSummary, formatCurrency } from "@/types/finance";
import { cn } from "@/lib/utils";

interface AccountCardProps {
  summary: AccountSummary;
  onMovimentar: (accountId: string) => void;
  onViewHistory: (accountId: string) => void;
  onEdit?: (accountId: string) => void;
}

const ACCOUNT_ICONS: Record<string, typeof Building2> = {
  'building-2': Building2,
  'piggy-bank': PiggyBank,
  'wallet': Wallet,
  'trending-up': TrendingUp,
};

export function AccountCard({ summary, onMovimentar, onViewHistory, onEdit }: AccountCardProps) {
  const {
    accountId,
    accountName,
    initialBalance, // Saldo inicial do período (calculado em ReceitasDespesas.tsx)
    currentBalance,
    projectedBalance,
    totalIn,
    totalOut,
    reconciliationStatus,
    transactionCount
  } = summary;

  // Mapeamento para as classes CSS customizadas
  const statusClasses = {
    ok: 'stat-card-positive',
    warning: 'stat-card-warning',
    error: 'stat-card-negative'
  };

  const statusBadgeColors = {
    ok: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    error: 'bg-destructive/20 text-destructive'
  };

  const balanceChange = currentBalance - initialBalance;
  const isPositive = balanceChange >= 0;
  const isCurrentBalancePositive = currentBalance >= 0;

  return (
    <Card className={cn(
      "glass-card min-w-[200px] p-3 transition-all hover:shadow-md",
      statusClasses[reconciliationStatus] // Aplica a classe customizada que define a borda de 4px
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <h4 className="font-semibold text-sm text-foreground truncate max-w-[120px]">
            {accountName}
          </h4>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewHistory(accountId)}>
              Ver Extrato
            </DropdownMenuItem>
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(accountId)}>
                Editar Conta
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-1 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Saldo Atual</span>
          <span className={cn(
            "text-lg font-bold",
            isCurrentBalancePositive ? "text-foreground" : "text-destructive"
          )}>
            {formatCurrency(currentBalance)}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Variação (Período)</span>
          <div className={cn(
            "flex items-center gap-1",
            isPositive ? "text-success" : "text-destructive"
          )}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{isPositive ? '+' : ''}{formatCurrency(balanceChange)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <Button 
          size="sm" 
          variant="outline"
          className="h-7 px-3 text-xs"
          onClick={() => onViewHistory(accountId)}
        >
          Extrato
        </Button>
        <Button 
          size="sm" 
          className="h-7 px-3 text-xs bg-primary hover:bg-primary/90"
          onClick={() => onMovimentar(accountId)}
        >
          Movimentar
        </Button>
      </div>
    </Card>
  );
}