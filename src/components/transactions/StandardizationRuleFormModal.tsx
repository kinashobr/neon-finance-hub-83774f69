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
  const [categoryId, setCategoryId] = useState<string | null>(null); // Allow null
  const [operationType, setOperationType] = useState<OperationType | ''>('');
  const [descriptionTemplate, setDescriptionTemplate] = useState("");

  const NON_CATEGORY_OPERATIONS: OperationType[] = [
    'transferencia', 
    'aplicacao', 
    'resgate', 
    'pagamento_emprestimo', 
    'liberacao_emprestimo', 
    'veiculo'
  ];
  
  const categoryRequired = operationType && !NON_CATEGORY_OPERATIONS.includes(operationType as OperationType);

  useEffect(() => {
    if (open && initialTransaction) {
      setPattern(initialTransaction.originalDescription);
      setOperationType(initialTransaction.operationType || "");
      setDescriptionTemplate(initialTransaction.description);
      
      // Set categoryId based on initial transaction, allowing null
      setCategoryId(initialTransaction.categoryId || null);
      
      // If the initial operation type doesn't require a category, clear it locally
      if (initialTransaction.operationType && NON_CATEGORY_OPERATIONS.includes(initialTransaction.operationType)) {
          setCategoryId(null);
      }
      
    } else if (!open) {
      // Reset state on close
      setPattern("");
      setCategoryId(null);
      setOperationType("");
      setDescriptionTemplate("");
    }
  }, [open, initialTransaction]);

  const getCategoryOptions = useMemo(() => {
    if (!operationType) return categories;
    
    // If category is not required, we don't need to filter options, but we keep the existing logic for required ones.
    if (!categoryRequired) return categories; 
    
    const isIncome = operationType === 'receita' || operationType === 'rendimento' || operationType === 'liberacao_emprestimo';
    
    return categories.filter(c => 
      (isIncome && c.nature === 'receita') || 
      (!isIncome && c.nature !== 'receita')
    );
  }, [categories, operationType, categoryRequired]);

  const handleSubmit = () => {
    if (!pattern.trim() || !operationType || !descriptionTemplate.trim()) {
      toast.error("Preencha o padrão, operação e descrição padronizada.");
      return;
    }
    
    if (categoryRequired && !categoryId) {
        toast.error("A categoria é obrigatória para esta operação.");
        return;
    }
    
    // If category is not required, save null
    const finalCategoryId = categoryRequired ? categoryId : null;

    onSave({
      pattern: pattern.trim(),
      categoryId: finalCategoryId,
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
                onValueChange={(v) => {
                    setOperationType(v as OperationType);
                    // Clear category if the new operation type doesn't require one
                    if (NON_CATEGORY_OPERATIONS.includes(v as OperationType)) {
                        setCategoryId(null);
                    }
                }}
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
              <Label htmlFor="categoryId">Categoria {categoryRequired ? '*' : '(Opcional)'}</Label>
              <Select
                value={categoryId || ''}
                onValueChange={setCategoryId}
                disabled={!categoryRequired}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={categoryRequired ? "Selecione..." : "Não aplicável"} />
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