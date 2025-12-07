import { useState } from "react";
import { Pencil, ArrowUpDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EditableCell } from "@/components/EditableCell";

interface ConsolidadoItem {
  id: string;
  categoria: string;
  valor: number;
  percentual: number;
  rentabilidade?: number;
  volatilidade: string;
  risco: string;
}

interface TabelaConsolidadaProps {
  data: ConsolidadoItem[];
}

export function TabelaConsolidada({ data }: TabelaConsolidadaProps) {
  const [sortField, setSortField] = useState<string>("valor");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState("");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedData = [...data]
    .filter(item => 
      item.categoria.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortField as keyof ConsolidadoItem];
      const bVal = b[sortField as keyof ConsolidadoItem];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

  const getRiscoColor = (risco: string) => {
    switch (risco) {
      case "A": return "bg-success/20 text-success";
      case "B": return "bg-primary/20 text-primary";
      case "C": return "bg-warning/20 text-warning";
      case "D": return "bg-destructive/20 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getVolatilidadeColor = (vol: string) => {
    switch (vol.toLowerCase()) {
      case "baixa": return "text-success";
      case "média": return "text-warning";
      case "alta": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="glass-card p-5 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Carteira Consolidada</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-8 h-8 w-40 bg-muted border-border text-sm"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Categoria</TableHead>
              <TableHead 
                className="text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort("valor")}
              >
                <div className="flex items-center gap-1">
                  Valor <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead 
                className="text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort("percentual")}
              >
                <div className="flex items-center gap-1">
                  % Patrimônio <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-muted-foreground">Rentabilidade</TableHead>
              <TableHead className="text-muted-foreground">Volatilidade</TableHead>
              <TableHead className="text-muted-foreground">Risco</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item) => (
              <TableRow key={item.id} className="border-border hover:bg-muted/50">
                <TableCell className="font-medium text-foreground">
                  {item.categoria}
                </TableCell>
                <TableCell>
                  <EditableCell
                    value={item.valor}
                    type="currency"
                    onSave={(value) => {
                      // Handle save if needed
                    }}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.percentual.toFixed(1)}%
                </TableCell>
                <TableCell className={item.rentabilidade && item.rentabilidade >= 0 ? "text-success" : "text-destructive"}>
                  {item.rentabilidade !== undefined ? `${item.rentabilidade >= 0 ? "+" : ""}${item.rentabilidade.toFixed(1)}%` : "–"}
                </TableCell>
                <TableCell className={getVolatilidadeColor(item.volatilidade)}>
                  {item.volatilidade}
                </TableCell>
                <TableCell>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    getRiscoColor(item.risco)
                  )}>
                    {item.risco}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}