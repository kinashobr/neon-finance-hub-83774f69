import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AccountCard } from "./AccountCard";
import { AccountSummary } from "@/types/finance";
import { cn } from "@/lib/utils";

interface SortableAccountCardProps {
  summary: AccountSummary;
  onMovimentar: (accountId: string) => void;
  onViewHistory: (accountId: string) => void;
  onEdit?: (accountId: string) => void;
}

export function SortableAccountCard({
  summary,
  onMovimentar,
  onViewHistory,
  onEdit,
}: SortableAccountCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: summary.accountId });

  // Aplicamos a transformação CSS para o movimento horizontal
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.9 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    boxShadow: isDragging ? "0 4px 20px rgba(0,0,0,0.3)" : "none",
    // Garante que o elemento arrastado não se desloque verticalmente
    touchAction: 'pan-y', 
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("shrink-0 transition-transform duration-300 ease-out", isDragging && "scale-[1.05]")}
      {...attributes}
      {...listeners}
    >
      <AccountCard
        summary={summary}
        onMovimentar={onMovimentar}
        onViewHistory={onViewHistory}
        onEdit={onEdit}
      />
    </div>
  );
}