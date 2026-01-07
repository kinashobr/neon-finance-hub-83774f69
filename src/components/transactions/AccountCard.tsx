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
  onImport?: (accountId: string) => void;
}

export function AccountCard({ summary, onMovimentar, onViewHistory, onEdit, onImport }: AccountCardProps) {
  const {
    accountId,
    accountName,
    initialBalance,
    currentBalance,
    projectedBalance,
    reconciliationStatus,
    transactionCount
  } = summary;

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

  return (
    <Card className={cn(
      "glass-card min-w-[85vw] sm:min-w-[280px] max-w-[320px] p-3 md:p-4 transition-all hover:shadow-md",
      statusClasses[reconciliationStatus]
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
            {onImport && (
              <DropdownMenuItem onClick={() => onImport(accountId)}>
                Importar Extrato
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Saldo Inicial</span>
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

      {/* Seção de rodapé com variação e botão */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md",
                isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              )}>
                {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>{isPositive ? '+' : ''}{formatCurrency(balanceChange)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Variação líquida no período selecionado</p>
              <p className="text-[10px] opacity-70">Baseado em {transactionCount} transações</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button 
          size="sm" 
          className="bg-primary hover:bg-primary/90 h-8"
          onClick={() => onMovimentar(accountId)}
        >
          Movimentar
        </Button>
      </div>
    </Card>
  );
}