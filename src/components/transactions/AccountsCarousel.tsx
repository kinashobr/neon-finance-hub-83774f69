import { useRef, useState, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AccountSummary, ContaCorrente } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { SortableAccountCard } from "./SortableAccountCard";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";

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
  const { contasMovimento, setContasMovimento } = useFinance();

  // Filtra contas ocultas (como a conta de contrapartida)
  const visibleContasMovimento = useMemo(() => 
    contasMovimento.filter(c => !c.hidden), 
    [contasMovimento]
  );

  // Mapear summaries para a ordem atual das contas visíveis
  const orderedSummaries = useMemo(() => visibleContasMovimento
    .map(account => accounts.find(s => s.accountId === account.id))
    .filter((s): s is AccountSummary => !!s), 
    [visibleContasMovimento, accounts]
  );
  
  const accountIds = useMemo(() => visibleContasMovimento.map(a => a.id), [visibleContasMovimento]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Aumenta a tolerância para evitar drag acidental ao rolar
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      // Encontra os IDs das contas visíveis e suas posições
      const visibleIds = contasMovimento.filter(c => !c.hidden).map(c => c.id);
      const oldIndex = visibleIds.indexOf(active.id as string);
      const newIndex = visibleIds.indexOf(over?.id as string);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        // Cria uma lista temporária apenas com as contas visíveis
        const visibleAccounts = contasMovimento.filter(c => !c.hidden);
        const newVisibleOrder = arrayMove(visibleAccounts, oldIndex, newIndex);
        
        // Reconstroi a lista completa, mantendo as contas ocultas no final (ou onde estavam)
        const hiddenAccounts = contasMovimento.filter(c => c.hidden);
        const newFullOrder = [...newVisibleOrder, ...hiddenAccounts];
        
        setContasMovimento(newFullOrder);
      }
    }
  };

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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToHorizontalAxis]}
      >
        <SortableContext
          items={accountIds}
          strategy={horizontalListSortingStrategy}
        >
          <ScrollArea className="w-full" ref={scrollRef}>
            <div 
              className="flex gap-4 pb-4"
              // O innerRef do SortableContext não é necessário aqui, pois o ScrollArea já gerencia o container
            >
              {orderedSummaries.map((summary) => (
                <SortableAccountCard
                  key={summary.accountId}
                  summary={summary}
                  onMovimentar={onMovimentar}
                  onViewHistory={onViewHistory}
                  onEdit={onEditAccount}
                />
              ))}

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
        </SortableContext>
      </DndContext>
    </div>
  );
}