import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pin, Trash2, Tags, AlertCircle } from "lucide-react";
import { StandardizationRule, Categoria, OPERATION_TYPE_LABELS, CATEGORY_NATURE_LABELS } from "@/types/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StandardizationRuleManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules: StandardizationRule[];
  onDeleteRule: (id: string) => void;
  categories: Categoria[];
}

export function StandardizationRuleManagerModal({
  open,
  onOpenChange,
  rules,
  onDeleteRule,
  categories,
}: StandardizationRuleManagerModalProps) {
  
  const categoriesMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const handleDelete = (rule: StandardizationRule) => {
    if (window.confirm(`Tem certeza que deseja excluir a regra para o padrão "${rule.pattern}"?`)) {
      onDeleteRule(rule.id);
      toast.success("Regra excluída.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pin className="w-5 h-5 text-primary" />
            Gerenciar Regras de Padronização
          </DialogTitle>
          <DialogDescription>
            Visualize e exclua regras que categorizam automaticamente suas transações importadas.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[50vh] border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[250px]">Padrão de Busca</TableHead>
                <TableHead className="w-[150px]">Operação</TableHead>
                <TableHead className="w-[200px]">Categoria</TableHead>
                <TableHead>Descrição Padronizada</TableHead>
                <TableHead className="w-16 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => {
                const category = rule.categoryId ? categoriesMap.get(rule.categoryId) : null;
                return (
                  <TableRow key={rule.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm font-medium max-w-[250px] truncate" title={rule.pattern}>
                      {rule.pattern}
                    </TableCell>
                    <TableCell className="text-xs">
                      {OPERATION_TYPE_LABELS[rule.operationType] || rule.operationType}
                    </TableCell>
                    <TableCell className="text-xs">
                      {category ? (
                        <div className="flex items-center gap-1">
                          <span>{category.icon}</span>
                          <span>{category.label}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1">
                          — Não Aplicável
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-[300px] truncate" title={rule.descriptionTemplate}>
                      {rule.descriptionTemplate}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(rule)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma regra de padronização cadastrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}