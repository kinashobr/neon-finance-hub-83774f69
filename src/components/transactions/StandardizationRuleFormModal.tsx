import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pin, Save, AlertCircle } from "lucide-react";
import { StandardizationRule, ImportedTransaction, Categoria, OperationType, CATEGORY_NATURE_LABELS } from "@/types/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StandardizationRuleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTransaction: ImportedTransaction | null;
  categories: Categoria[];
  onSave: (rule: Omit<StandardizationRule, "id">) => void;
}

// Operações que podem ser padronizadas
const STANDARDIZABLE_OPERATIONS: { value: OperationType; label: string; color: string }[] = [
  { value: 'receita', label: 'Receita', color: 'text-success' },
  { value: 'despesa', label: 'Despesa', color: 'text-destructive' },
  { value: 'transferencia', label: 'Transferência', color: 'text-primary' },
  { value: 'aplicacao', label: 'Aplicação', color: 'text-purple-500' },
  { value: 'resgate', label: 'Resgate', color: 'text-amber-500' },
  { value: 'pagamento_emprestimo', label: 'Pag. Empréstimo', color: 'text-orange-500' },
  { value: 'liberacao_emprestimo', label: 'Liberação Empréstimo', color: 'text-emerald-500' },
  { value: 'veiculo', label: 'Veículo', color: 'text-blue-500' },
  { value: 'rendimento', label: 'Rendimento', color: 'text-teal-500' },
];

export function StandardizationRuleFormModal({
  open,
  onOpenChange,
  initialTransaction,
  categories,
  onSave,
}: StandardizationRuleFormModalProps) {
  const [pattern, setPattern] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [operationType, setOperationType] = useState<OperationType | ''>('');
  const [descriptionTemplate, setDescriptionTemplate] = useState("");

  useEffect(() => {
    if (open && initialTransaction) {
      setPattern(initialTransaction.originalDescription);
      setCategoryId(initialTransaction.categoryId || "");
      setOperationType(initialTransaction.operationType || "");
      setDescriptionTemplate(initialTransaction.description);
    } else if (!open) {
      // Reset state on close
      setPattern("");
      setCategoryId("");
      setOperationType("");
      setDescriptionTemplate("");
    }
  }, [open, initialTransaction]);

  const getCategoryOptions = useMemo(() => {
    if (!operationType || operationType === 'transferencia') return categories;
    
    const isIncome = operationType === 'receita' || operationType === 'rendimento' || operationType === 'liberacao_emprestimo';
    
    return categories.filter(c => 
      (isIncome && c.nature === 'receita') || 
      (!isIncome && c.nature !== 'receita')
    );
  }, [categories, operationType]);

  const handleSubmit = () => {
    if (!pattern.trim() || !categoryId || !operationType || !descriptionTemplate.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    
    onSave({
      pattern: pattern.trim(),
      categoryId,
      operationType: operationType as OperationType,
      descriptionTemplate: descriptionTemplate.trim(),
    });
    
    onOpenChange(false);
    toast.success("Regra de padronização criada com sucesso!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pin className="w-5 h-5 text-primary" />
            Criar Regra de Padronização
          </DialogTitle>
          <DialogDescription>
            Crie uma regra para categorizar automaticamente transações futuras com a mesma descrição.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pattern">Padrão de Busca (Descrição Original) *</Label>
            <Input
              id="pattern"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Ex: PAGAMENTO CARTAO DE CREDITO"
              className="bg-muted border-border"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                A regra será aplicada a qualquer transação que contenha este texto.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="operationType">Tipo de Operação *</Label>
              <Select
                value={operationType}
                onValueChange={(v) => setOperationType(v as OperationType)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {STANDARDIZABLE_OPERATIONS.map(op => (
                    <SelectItem key={op.value} value={op.value}>
                      <span className={cn("flex items-center gap-2", op.color)}>
                        {op.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="categoryId">Categoria *</Label>
              <Select
                value={categoryId}
                onValueChange={setCategoryId}
                disabled={operationType === 'transferencia' || operationType === ''}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {getCategoryOptions.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label} ({CATEGORY_NATURE_LABELS[cat.nature]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descriptionTemplate">Descrição Padronizada *</Label>
            <Input
              id="descriptionTemplate"
              value={descriptionTemplate}
              onChange={(e) => setDescriptionTemplate(e.target.value)}
              placeholder="Ex: Pagamento Fatura Cartão X"
              className="bg-muted border-border"
            />
            <p className="text-xs text-muted-foreground">
                Esta será a descrição usada no seu histórico financeiro.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="gap-2">
            <Save className="w-4 h-4" />
            Salvar Regra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}