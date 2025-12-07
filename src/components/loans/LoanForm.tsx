import { useState } from "react";
import { Plus, Upload, FileText, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LoanFormData {
  contrato: string;
  banco: string;
  valorTotal: string;
  parcela: string;
  taxaMensal: string;
  meses: string;
  dataInicio: string;
  metodoAmortizacao: string;
  observacoes: string;
}

interface LoanFormProps {
  onSubmit: (data: {
    contrato: string;
    parcela: number;
    meses: number;
    taxaMensal: number;
    valorTotal: number;
  }) => void;
  className?: string;
}

export function LoanForm({ onSubmit, className }: LoanFormProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<LoanFormData>({
    contrato: "",
    banco: "",
    valorTotal: "",
    parcela: "",
    taxaMensal: "",
    meses: "",
    dataInicio: "",
    metodoAmortizacao: "price",
    observacoes: "",
  });

  const bancos = [
    "Banco do Brasil",
    "Bradesco",
    "Caixa Econômica",
    "Itaú",
    "Nubank",
    "Santander",
    "Inter",
    "C6 Bank",
    "PicPay",
    "Outro",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contrato || !formData.parcela || !formData.meses || !formData.taxaMensal || !formData.valorTotal) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const contratoCompleto = formData.banco 
      ? `${formData.banco} - ${formData.contrato}`
      : formData.contrato;

    onSubmit({
      contrato: contratoCompleto,
      parcela: Number(formData.parcela),
      meses: Number(formData.meses),
      taxaMensal: Number(formData.taxaMensal),
      valorTotal: Number(formData.valorTotal),
    });

    setFormData({
      contrato: "",
      banco: "",
      valorTotal: "",
      parcela: "",
      taxaMensal: "",
      meses: "",
      dataInicio: "",
      metodoAmortizacao: "price",
      observacoes: "",
    });

    setOpen(false);

    toast({
      title: "Empréstimo adicionado",
      description: "O empréstimo foi cadastrado com sucesso",
    });
  };

  // Cálculo automático da parcela (Price)
  const calcularParcela = () => {
    const valor = Number(formData.valorTotal);
    const taxa = Number(formData.taxaMensal) / 100;
    const n = Number(formData.meses);

    if (valor > 0 && taxa > 0 && n > 0) {
      const parcela = (valor * taxa * Math.pow(1 + taxa, n)) / (Math.pow(1 + taxa, n) - 1);
      setFormData(prev => ({ ...prev, parcela: parcela.toFixed(2) }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={cn("bg-neon-gradient hover:opacity-90", className)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Empréstimo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Cadastrar Novo Empréstimo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Banco e Contrato */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Banco / Instituição *</Label>
              <Select
                value={formData.banco}
                onValueChange={(v) => setFormData(prev => ({ ...prev, banco: v }))}
              >
                <SelectTrigger className="mt-1.5 bg-muted border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {bancos.map((banco) => (
                    <SelectItem key={banco} value={banco}>{banco}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome do Contrato *</Label>
              <Input
                value={formData.contrato}
                onChange={(e) => setFormData(prev => ({ ...prev, contrato: e.target.value }))}
                placeholder="Ex: Pessoal, Veículo, Consignado"
                className="mt-1.5 bg-muted border-border"
              />
            </div>
          </div>

          {/* Valor e Parcela */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valor Total (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valorTotal}
                onChange={(e) => setFormData(prev => ({ ...prev, valorTotal: e.target.value }))}
                placeholder="50000.00"
                className="mt-1.5 bg-muted border-border"
              />
            </div>
            <div>
              <Label>Valor da Parcela (R$) *</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  type="number"
                  step="0.01"
                  value={formData.parcela}
                  onChange={(e) => setFormData(prev => ({ ...prev, parcela: e.target.value }))}
                  placeholder="1250.00"
                  className="bg-muted border-border"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={calcularParcela}
                  title="Calcular parcela (Price)"
                  className="shrink-0"
                >
                  =
                </Button>
              </div>
            </div>
          </div>

          {/* Taxa e Meses */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Taxa Mensal (%) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.taxaMensal}
                onChange={(e) => setFormData(prev => ({ ...prev, taxaMensal: e.target.value }))}
                placeholder="1.89"
                className="mt-1.5 bg-muted border-border"
              />
            </div>
            <div>
              <Label>Qtd. Parcelas *</Label>
              <Input
                type="number"
                value={formData.meses}
                onChange={(e) => setFormData(prev => ({ ...prev, meses: e.target.value }))}
                placeholder="48"
                className="mt-1.5 bg-muted border-border"
              />
            </div>
            <div>
              <Label>Data de Início</Label>
              <Input
                type="date"
                value={formData.dataInicio}
                onChange={(e) => setFormData(prev => ({ ...prev, dataInicio: e.target.value }))}
                className="mt-1.5 bg-muted border-border"
              />
            </div>
          </div>

          {/* Método de Amortização */}
          <div>
            <Label>Método de Amortização</Label>
            <Select
              value={formData.metodoAmortizacao}
              onValueChange={(v) => setFormData(prev => ({ ...prev, metodoAmortizacao: v }))}
            >
              <SelectTrigger className="mt-1.5 bg-muted border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="price">Price (Parcelas Fixas)</SelectItem>
                <SelectItem value="sac">SAC (Amortização Constante)</SelectItem>
                <SelectItem value="americano">Americano</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Upload e Observações */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Upload do Contrato</Label>
              <div className="mt-1.5 border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">
                  Arraste ou clique para upload
                </p>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Notas adicionais..."
                className="mt-1.5 bg-muted border-border h-[88px] resize-none"
              />
            </div>
          </div>

          {/* Cálculos automáticos preview */}
          {formData.valorTotal && formData.parcela && formData.meses && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">Prévia dos cálculos:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total a pagar:</span>
                  <span className="font-medium">
                    R$ {(Number(formData.parcela) * Number(formData.meses)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Juros totais:</span>
                  <span className="font-medium text-warning">
                    R$ {((Number(formData.parcela) * Number(formData.meses)) - Number(formData.valorTotal)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full bg-neon-gradient hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Empréstimo
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
