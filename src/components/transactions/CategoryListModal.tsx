import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tags, Plus, Pencil, Trash2, TrendingUp, TrendingDown, Repeat } from "lucide-react";
import { Categoria, CategoryNature, CATEGORY_NATURE_LABELS } from "@/types/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CategoryListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Categoria[];
  onAddCategory: () => void;
  onEditCategory: (category: Categoria) => void;
  onDeleteCategory: (categoryId: string) => void;
  transactionCountByCategory: Record<string, number>;
}

const getNatureIcon = (nature: CategoryNature) => {
  switch (nature) {
    case 'receita':
      return <TrendingUp className="w-4 h-4 text-success" />;
    case 'despesa_fixa':
      return <Repeat className="w-4 h-4 text-orange-500" />;
    case 'despesa_variavel':
      return <TrendingDown className="w-4 h-4 text-destructive" />;
    default:
      return null;
  }
};

const getNatureBadgeColor = (nature: CategoryNature) => {
  switch (nature) {
    case 'receita':
      return 'bg-success/10 text-success border-success/20';
    case 'despesa_fixa':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'despesa_variavel':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return '';
  }
};

export function CategoryListModal({
  open,
  onOpenChange,
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  transactionCountByCategory
}: CategoryListModalProps) {
  const groupedCategories = {
    receita: categories.filter(c => c.nature === 'receita'),
    despesa_fixa: categories.filter(c => c.nature === 'despesa_fixa'),
    despesa_variavel: categories.filter(c => c.nature === 'despesa_variavel'),
  };

  const handleDelete = (category: Categoria) => {
    const count = transactionCountByCategory[category.id] || 0;
    if (count > 0) {
      toast.error(`Não é possível excluir: ${count} transações usam esta categoria`);
      return;
    }

    if (confirm(`Excluir a categoria "${category.label}"?`)) {
      onDeleteCategory(category.id);
      toast.success("Categoria excluída!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-primary" />
            Categorias
          </DialogTitle>
          <DialogDescription>
            Gerencie as categorias para classificar suas transações
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button onClick={onAddCategory} size="sm" className="gap-1">
            <Plus className="w-4 h-4" />
            Nova Categoria
          </Button>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {/* Receitas */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-success" />
                <h4 className="font-semibold text-sm">Receitas</h4>
                <Badge variant="outline" className="ml-auto text-xs">
                  {groupedCategories.receita.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {groupedCategories.receita.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhuma categoria de receita
                  </p>
                ) : (
                  groupedCategories.receita.map(cat => (
                    <CategoryItem
                      key={cat.id}
                      category={cat}
                      transactionCount={transactionCountByCategory[cat.id] || 0}
                      onEdit={() => onEditCategory(cat)}
                      onDelete={() => handleDelete(cat)}
                    />
                  ))
                )}
              </div>
            </div>

            <Separator />

            {/* Despesas Fixas */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Repeat className="w-4 h-4 text-orange-500" />
                <h4 className="font-semibold text-sm">Despesas Fixas</h4>
                <Badge variant="outline" className="ml-auto text-xs">
                  {groupedCategories.despesa_fixa.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {groupedCategories.despesa_fixa.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhuma categoria de despesa fixa
                  </p>
                ) : (
                  groupedCategories.despesa_fixa.map(cat => (
                    <CategoryItem
                      key={cat.id}
                      category={cat}
                      transactionCount={transactionCountByCategory[cat.id] || 0}
                      onEdit={() => onEditCategory(cat)}
                      onDelete={() => handleDelete(cat)}
                    />
                  ))
                )}
              </div>
            </div>

            <Separator />

            {/* Despesas Variáveis */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-destructive" />
                <h4 className="font-semibold text-sm">Despesas Variáveis</h4>
                <Badge variant="outline" className="ml-auto text-xs">
                  {groupedCategories.despesa_variavel.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {groupedCategories.despesa_variavel.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhuma categoria de despesa variável
                  </p>
                ) : (
                  groupedCategories.despesa_variavel.map(cat => (
                    <CategoryItem
                      key={cat.id}
                      category={cat}
                      transactionCount={transactionCountByCategory[cat.id] || 0}
                      onEdit={() => onEditCategory(cat)}
                      onDelete={() => handleDelete(cat)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface CategoryItemProps {
  category: Categoria;
  transactionCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

function CategoryItem({ category, transactionCount, onEdit, onDelete }: CategoryItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <span className="text-xl">{category.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{category.label}</p>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn("text-xs", getNatureBadgeColor(category.nature))}
          >
            {getNatureIcon(category.nature)}
            <span className="ml-1">{CATEGORY_NATURE_LABELS[category.nature]}</span>
          </Badge>
          {transactionCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {transactionCount} transações
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
          disabled={transactionCount > 0}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
