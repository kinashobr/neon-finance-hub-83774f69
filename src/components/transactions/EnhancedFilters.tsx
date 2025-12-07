import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SlidersHorizontal, ArrowUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedFiltersProps {
  filterValorMin: string;
  setFilterValorMin: (value: string) => void;
  filterValorMax: string;
  setFilterValorMax: (value: string) => void;
  filterMes: string;
  setFilterMes: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  tiposAtivos: string[];
  setTiposAtivos: (tipos: string[]) => void;
}

const meses = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

export const EnhancedFilters = ({
  filterValorMin,
  setFilterValorMin,
  filterValorMax,
  setFilterValorMax,
  filterMes,
  setFilterMes,
  sortBy,
  setSortBy,
  tiposAtivos,
  setTiposAtivos,
}: EnhancedFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleTipo = (tipo: string) => {
    if (tiposAtivos.includes(tipo)) {
      setTiposAtivos(tiposAtivos.filter(t => t !== tipo));
    } else {
      setTiposAtivos([...tiposAtivos, tipo]);
    }
  };

  const hasActiveFilters = filterValorMin || filterValorMax || filterMes !== "all" || 
    sortBy !== "recente" || tiposAtivos.length < 2;

  const clearFilters = () => {
    setFilterValorMin("");
    setFilterValorMax("");
    setFilterMes("all");
    setSortBy("recente");
    setTiposAtivos(["receita", "despesa"]);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "gap-2 border-border",
              hasActiveFilters && "border-primary text-primary"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros Avançados
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-primary" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-card border-border" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filtros Avançados</h4>
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Faixa de Valor */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Faixa de Valor (R$)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Mín"
                  value={filterValorMin}
                  onChange={(e) => setFilterValorMin(e.target.value)}
                  className="bg-muted border-border text-sm h-8"
                />
                <Input
                  type="number"
                  placeholder="Máx"
                  value={filterValorMax}
                  onChange={(e) => setFilterValorMax(e.target.value)}
                  className="bg-muted border-border text-sm h-8"
                />
              </div>
            </div>

            {/* Mês */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Mês</Label>
              <Select value={filterMes} onValueChange={setFilterMes}>
                <SelectTrigger className="bg-muted border-border h-8">
                  <SelectValue placeholder="Todos os meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {meses.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Transação */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="receita"
                    checked={tiposAtivos.includes("receita")}
                    onCheckedChange={() => toggleTipo("receita")}
                  />
                  <label htmlFor="receita" className="text-sm cursor-pointer">
                    Receitas
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="despesa"
                    checked={tiposAtivos.includes("despesa")}
                    onCheckedChange={() => toggleTipo("despesa")}
                  />
                  <label htmlFor="despesa" className="text-sm cursor-pointer">
                    Despesas
                  </label>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Ordenação */}
      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger className="w-40 bg-muted border-border h-8">
          <ArrowUpDown className="w-3 h-3 mr-2" />
          <SelectValue placeholder="Ordenar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recente">Mais Recente</SelectItem>
          <SelectItem value="antigo">Mais Antigo</SelectItem>
          <SelectItem value="maior">Maior Valor</SelectItem>
          <SelectItem value="menor">Menor Valor</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
