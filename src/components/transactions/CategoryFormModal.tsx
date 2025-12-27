import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tags, TrendingUp, TrendingDown, Repeat } from "lucide-react";
import { Categoria, CategoryNature, CATEGORY_NATURE_LABELS, generateCategoryId, getCategoryTypeFromNature } from "@/types/finance";
import { toast } from "sonner";

interface CategoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Categoria;
  onSubmit: (category: Categoria) => void;
  onDelete?: (categoryId: string) => void;
  hasTransactions?: boolean;
}

// Organize os emojis por natureza/categoria
const EMOJI_BY_CATEGORY = {
  receita: [
    "💰", "💳", "🏦", "📈", "💼", "🧑‍💻", "🎯", "🛠️", "📝"
  ],
  despesa_fixa: [
    "🏠", "💊", "🛏️", "🔌", "📱", "🚗", "🦷", "🩺", "🧠",
    "🧾", "🐶", "🐱", "🍼", "🎓", "⚖️", "🛡️", "👚", "🧳","🏋️"
  ],
  despesa_variavel: [
    "🍽️", "🍕", "☕", "🎮", "🎬", "🎧", "🎨", "🎥", "✈️",
    "🏍️", "⛽", "🛒", "👕", "📚", "🎁", "💡", "🧹",
    "📦", "💎", "✂️", "🎵", "🙏", "💸", "👥"
  ]
};

// Todos os emojis em uma lista única (para manter compatibilidade)
const ALL_EMOJIS = [
  ...EMOJI_BY_CATEGORY.receita,
  ...EMOJI_BY_CATEGORY.despesa_fixa,
  ...EMOJI_BY_CATEGORY.despesa_variavel
];

export function CategoryFormModal({
  open,
  onOpenChange,
  category,
  onSubmit,
  onDelete,
  hasTransactions = false
}: CategoryFormModalProps) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("📦");
  const [nature, setNature] = useState<CategoryNature>("despesa_variavel");
  const [activeTab, setActiveTab] = useState("sugeridos");

  const isEditing = !!category;

  useEffect(() => {
    if (open && category) {
      setLabel(category.label);
      setIcon(category.icon || "📦");
      setNature(category.nature || "despesa_variavel");
      setActiveTab("sugeridos");
    } else if (open) {
      setLabel("");
      setIcon("📦");
      setNature("despesa_variavel");
      setActiveTab("sugeridos");
    }
  }, [open, category]);

  // Atualizar tab quando mudar a natureza
  useEffect(() => {
    setActiveTab("sugeridos");
  }, [nature]);

  const getSuggestedEmojis = () => {
    return EMOJI_BY_CATEGORY[nature] || [];
  };

  const handleSubmit = () => {
    if (!label.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    const newCategory: Categoria = {
      id: category?.id || generateCategoryId(),
      label: label.trim(),
      icon,
      nature,
      type: getCategoryTypeFromNature(nature)
    };

    onSubmit(newCategory);
    onOpenChange(false);
    toast.success(isEditing ? "Categoria atualizada!" : "Categoria criada!");
  };

  const handleDelete = () => {
    if (!category) return;
    
    if (hasTransactions) {
      toast.error("Não é possível excluir uma categoria em uso por transações");
      return;
    }

    if (confirm("Tem certeza que deseja excluir esta categoria?")) {
      onDelete?.(category.id);
      onOpenChange(false);
      toast.success("Categoria excluída!");
    }
  };

  const renderEmojiGrid = (emojis: string[]) => (
    <div className="flex flex-wrap gap-2 p-2">
      {emojis.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => setIcon(emoji)}
          className={`w-10 h-10 flex items-center justify-center text-xl rounded-lg transition-all ${
            icon === emoji 
              ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2" 
              : "hover:bg-muted"
          }`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-primary" />
            {isEditing ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Atualize os dados da categoria" 
              : "Crie uma nova categoria para classificar suas transações"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="label">Nome da Categoria *</Label>
            <Input
              id="label"
              placeholder="Ex: Alimentação"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label>Essa categoria representa o quê? *</Label>
            <RadioGroup value={nature} onValueChange={(v) => setNature(v as CategoryNature)}>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="receita" id="receita" />
                <Label htmlFor="receita" className="flex items-center gap-2 cursor-pointer flex-1">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <div>
                    <p className="font-medium">Receita</p>
                    <p className="text-xs text-muted-foreground">Entradas de dinheiro (salário, vendas, etc.)</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="despesa_fixa" id="despesa_fixa" />
                <Label htmlFor="despesa_fixa" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Repeat className="w-4 h-4 text-orange-500" />
                  <div>
                    <p className="font-medium">Despesa Fixa</p>
                    <p className="text-xs text-muted-foreground">Gastos recorrentes (aluguel, assinaturas, etc.)</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="despesa_variavel" id="despesa_variavel" />
                <Label htmlFor="despesa_variavel" className="flex items-center gap-2 cursor-pointer flex-1">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                  <div>
                    <p className="font-medium">Despesa Variável</p>
                    <p className="text-xs text-muted-foreground">Gastos que variam (alimentação, lazer, etc.)</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="sugeridos">
                  Sugeridos
                </TabsTrigger>
                <TabsTrigger value="todos">
                  Todos
                </TabsTrigger>
              </TabsList>
              <TabsContent value="sugeridos" className="mt-2">
                <div className="border rounded-lg">
                  {renderEmojiGrid(getSuggestedEmojis())}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Ícones mais relevantes para {CATEGORY_NATURE_LABELS[nature].toLowerCase()}
                </p>
              </TabsContent>
              <TabsContent value="todos" className="mt-2">
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {renderEmojiGrid(ALL_EMOJIS)}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {isEditing && onDelete && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={hasTransactions}
              className="mr-auto"
            >
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {isEditing ? "Salvar" : "Criar Categoria"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}