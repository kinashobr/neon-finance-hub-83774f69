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
import { Card } from "@/components/ui/card";

interface AccountsGridProps {
  accounts: AccountSummary[];
  onMovimentar: (accountId: string) => void;
  onViewHistory: (accountId: string) => void;
  onAddAccount?: () => void;
  onEditAccount?: (accountId: string) => void;
}

export function AccountsGrid({ 
  accounts, 
  onMovimentar, 
  onViewHistory,
  onAddAccount,
  onEditAccount
}: AccountsGridProps) {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Contas Movimento</h3>
        {onAddAccount && (
          <Button variant="outline" size="sm" onClick={onAddAccount} className="gap-1">
            <Plus className="w-4 h-4" />
            Nova Conta
          </Button>
        )}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
              <Card className="col-span-full p-8 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <p className="text-sm">Nenhuma conta cadastrada</p>
                {onAddAccount && (
                  <Button variant="outline" size="sm" onClick={onAddAccount}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Conta
                  </Button>
                )}
              </Card>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}