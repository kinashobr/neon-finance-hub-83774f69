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
    initialBalance,
    currentBalance,
    projectedBalance,
    totalIn,
    totalOut,
    reconciliationStatus,
    transactionCount
  } = summary;

  const statusColors = {
    ok: 'border-l-success bg-success/5',
    warning: 'border-l-warning bg-warning/5',
    error: 'border-l-destructive bg-destructive/5'
  };

  const statusBadgeColors = {
    ok: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    error: 'bg-destructive/20 text-destructive'
  };

  const balanceChange = currentBalance - initialBalance;
  const isPositive = balanceChange >= 0;

  return (
    <Card className={cn(
      "min-w-[280px] max-w-[320px] p-4 border-l-4 transition-all hover:shadow-md",
      statusColors[reconciliationStatus]
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground truncate max-w-[160px]">
              {accountName}
            </h4>
            <span className={cn("text-xs px-1.5 py-0.5 rounded", statusBadgeColors[reconciliationStatus])}>
              {reconciliationStatus === 'ok' ? 'Conciliada' : 
               reconciliationStatus === 'warning' ? 'Pendente' : 'Divergente'}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
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

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Saldo Inicial (período)</span>
          <span>{formatCurrency(initialBalance)}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Saldo Atual</span>
          <span className="text-lg font-bold text-foreground">{formatCurrency(currentBalance)}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Saldo Projetado</span>
          <span>{formatCurrency(projectedBalance)}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 py-2 border-y border-border">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-success">
                <ArrowUpRight className="w-3 h-3" />
                <span>{formatCurrency(totalIn)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total de entradas no período</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-destructive">
                <ArrowDownRight className="w-3 h-3" />
                <span>{formatCurrency(totalOut)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total de saídas no período</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <span className="text-xs text-muted-foreground ml-auto">
          {transactionCount} transações
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className={cn(
          "flex items-center gap-1 text-xs",
          isPositive ? "text-success" : "text-destructive"
        )}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          <span>{isPositive ? '+' : ''}{formatCurrency(balanceChange)}</span>
        </div>

        <Button 
          size="sm" 
          className="bg-primary hover:bg-primary/90"
          onClick={() => onMovimentar(accountId)}
        >
          Movimentar
        </Button>
      </div>
    </Card>
  );
}
