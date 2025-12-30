import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Calendar, DollarSign, ListOrdered, Tags, Check } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface AddPurchaseInstallmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: Date;
}

export function AddPurchaseInstallmentDialog({
  open,
  onOpenChange,
  currentDate,
}: AddPurchaseInstallmentDialogProps) {
  const { addPurchaseInstallments, contasMovimento, categoriasV2 } = useFinance();
  
  const [formData, setFormData] = useState({
    description: '',
    totalAmount: '',
    installments: '1',
    firstDueDate: format(currentDate, 'yyyy-MM-dd'),
    suggestedAccountId: '',
    suggestedCategoryId: '',
  });

  const expenseCategories = useMemo(() => 
    categoriasV2.filter(c => c.nature === 'despesa_fixa' || c.nature === 'despesa_variavel'),
    [categoriasV2]
  );

  const availableAccounts = useMemo(() => 
    contasMovimento.filter(c => c.accountType === 'corrente' || c.accountType === 'cartao_credito'),
    [contasMovimento]
  );

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^\d,]/g, '');
    setFormData(prev => ({ ...prev, totalAmount: cleaned }));
  };

  const parseAmount = (value: string): number => {
    const parsed = parseFloat(value.replace('.', '').replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseAmount(formData.totalAmount);
    const installments = parseInt(formData.installments);

    if (!formData.description || amount <= 0 || installments <= 0 || !formData.firstDueDate) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    addPurchaseInstallments({
      description: formData.description,
      totalAmount: amount,
      installments,
      firstDueDate: formData.firstDueDate,
      suggestedAccountId: formData.suggestedAccountId || undefined,
      suggestedCategoryId: formData.suggestedCategoryId || undefined,
    });

    toast.success(`Compra "${formData.description}" parcelada em ${installments}x registrada!`);
    onOpenChange(false);
    
    // Reset form
    setFormData({
      description: '',
      totalAmount: '',
      installments: '1',
      firstDueDate: format(currentDate, 'yyyy-MM-dd'),
      suggestedAccountId: '',
      suggestedCategoryId: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Nova Compra Parcelada</DialogTitle>
              <DialogDescription>
                Registre uma compra e gere as parcelas automaticamente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase">Descrição da Compra</Label>
            <div className="relative">
              <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ex: Geladeira Brastemp"
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Valor Total (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={formData.totalAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0,00"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Nº de Parcelas</Label>
              <div className="relative">
                <ListOrdered className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.installments}
                  onChange={(e) => setFormData(prev => ({ ...prev, installments: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase">1º Vencimento</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={formData.firstDueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, firstDueDate: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Conta Sugerida</Label>
              <Select 
                value={formData.suggestedAccountId} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, suggestedAccountId: v }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {availableAccounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Categoria</Label>
              <Select 
                value={formData.suggestedCategoryId} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, suggestedCategoryId: v }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.icon} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              <Check className="w-4 h-4 mr-2" />
              Gerar Parcelas
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}