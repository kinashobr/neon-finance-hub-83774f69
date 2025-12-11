import { useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AccountCard } from "./AccountCard";
import { AccountSummary, ContaCorrente } from "@/types/finance";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { useFinance } from "@/contexts/FinanceContext";

interface AccountsCarouselProps {
  accounts: AccountSummary[];
  onMovimentar: (accountId: string) => void;
  onViewHistory: (accountId: string) => void;
  onAddAccount?: () => void;
  onEditAccount?: (accountId: string) => void;
}

// Função auxiliar para reordenar a lista
const reorder = (list: ContaCorrente[], startIndex: number, endIndex: number): ContaCorrente[] => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

export function AccountsCarousel({ 
  accounts, 
  onMovimentar, 
  onViewHistory,
  onAddAccount,
  onEditAccount
}: AccountsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { contasMovimento, setContasMovimento } = useFinance();

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const startIndex = result.source.index;
    const endIndex = result.destination.index;

    const reorderedAccounts = reorder(
      contasMovimento,
      startIndex,
      endIndex
    );

    setContasMovimento(reorderedAccounts);
  }, [contasMovimento, setContasMovimento]);

  // Mapear summaries para a ordem atual das contasMovimento
  const orderedSummaries = contasMovimento
    .map(account => accounts.find(s => s.accountId === account.id))
    .filter((s): s is AccountSummary => !!s);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-foreground">Contas Movimento</h3>
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

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="accounts-carousel" direction="horizontal">
          {(droppableProvided) => (
            <ScrollArea className="w-full" ref={scrollRef}>
              <div 
                className="flex gap-4 pb-4"
                ref={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
              >
                {orderedSummaries.map((summary, index) => (
                  <Draggable key={summary.accountId} draggableId={summary.accountId} index={index}>
                    {(draggableProvided) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        {...draggableProvided.dragHandleProps}
                        className="shrink-0"
                      >
                        <AccountCard
                          summary={summary}
                          onMovimentar={onMovimentar}
                          onViewHistory={onViewHistory}
                          onEdit={onEditAccount}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {droppableProvided.placeholder}

                {orderedSummaries.length === 0 && (
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
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}