import { useRef } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AccountCard } from "./AccountCard";
import { AccountSummary } from "@/types/finance";

interface AccountsCarouselProps {
  accounts: AccountSummary[];
  onMovimentar: (accountId: string) => void;
  onViewHistory: (accountId: string) => void;
  onAddAccount?: () => void;
  onEditAccount?: (accountId: string) => void;
}

export function AccountsCarousel({ 
  accounts, 
  onMovimentar, 
  onViewHistory,
  onAddAccount,
  onEditAccount
}: AccountsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-foreground">Contas Correntes</h3>
        <div className="flex items-center gap-2">
          {onAddAccount && (
            <Button variant="outline" size="sm" onClick={onAddAccount} className="gap-1">
              <Plus className="w-4 h-4" />
              Nova Conta
            </Button>
          )}
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="w-full" ref={scrollRef}>
        <div className="flex gap-4 pb-4">
          {accounts.map(summary => (
            <AccountCard
              key={summary.accountId}
              summary={summary}
              onMovimentar={onMovimentar}
              onViewHistory={onViewHistory}
              onEdit={onEditAccount}
            />
          ))}

          {accounts.length === 0 && (
            <div className="min-w-[280px] p-8 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <p className="text-sm">Nenhuma conta cadastrada</p>
              {onAddAccount && (
                <Button variant="outline" size="sm" onClick={onAddAccount}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Conta
                </Button>
              )}
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
