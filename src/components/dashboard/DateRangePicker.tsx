import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronDown, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfToday, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// Interface para Date range (usado em componentes que esperam Date)
export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  onDateRangeChange: (range: DateRange) => void;
  tabId: string;
  className?: string;
}

const months = [
  { value: 0, label: "Janeiro" },
  { value: 1, label: "Fevereiro" },
  { value: 2, label: "Março" },
  { value: 3, label: "Abril" },
  { value: 4, label: "Maio" },
  { value: 5, label: "Junho" },
  { value: 6, label: "Julho" },
  { value: 7, label: "Agosto" },
  { value: 8, label: "Setembro" },
  { value: 9, label: "Outubro" },
  { value: 10, label: "Novembro" },
  { value: 11, label: "Dezembro" },
];

const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = 2020; year <= currentYear + 1; year++) {
    years.push(year);
  }
  return years;
};

const yearsOptions = getAvailableYears();

const presets = [
  { id: "today", label: "Hoje" },
  { id: "last7", label: "Últimos 7 dias" },
  { id: "last30", label: "Últimos 30 dias" },
  { id: "thisMonth", label: "Este mês" },
  { id: "lastMonth", label: "Mês passado" },
  { id: "last3Months", label: "Últimos 3 meses" },
  { id: "thisYear", label: "Este ano" },
  { id: "all", label: "Todo o período" },
];

// Função para aplicar o preset e retornar o DateRange
const getRangeFromPreset = (presetId: string): DateRange => {
  const today = startOfToday();
  let from: Date | undefined;
  let to: Date | undefined;

  switch (presetId) {
    case "today":
      from = today;
      to = today;
      break;
    case "last7":
      from = subDays(today, 6);
      to = today;
      break;
    case "last30":
      from = subDays(today, 29);
      to = today;
      break;
    case "thisMonth":
      from = startOfMonth(today);
      to = endOfMonth(today);
      break;
    case "lastMonth":
      from = startOfMonth(subMonths(today, 1));
      to = endOfMonth(subMonths(today, 1));
      break;
    case "last3Months":
      from = startOfMonth(subMonths(today, 2));
      to = endOfMonth(today);
      break;
    case "thisYear":
      from = startOfYear(today);
      to = endOfYear(today);
      break;
    case "all":
      from = undefined;
      to = undefined;
      break;
    default:
      return { from: undefined, to: undefined };
  }
  return { from, to };
};

// Função para formatar o display do botão
const formatDateRange = (range: DateRange) => {
  if (!range.from && !range.to) return "Todo o período";
  if (!range.from || !range.to) return "Selecione um período";

  const start = range.from;
  const end = range.to;

  // Se for o mesmo mês/ano, exibe apenas o mês/ano
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return format(start, "MMM yyyy", { locale: ptBR });
  }
  
  // Se for o mesmo ano, exibe Mês - Mês Ano
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, "MMM", { locale: ptBR })} - ${format(end, "MMM yyyy", { locale: ptBR })}`;
  }

  // Caso contrário, exibe data completa
  return `${format(start, "MMM yyyy", { locale: ptBR })} - ${format(end, "MMM yyyy", { locale: ptBR })}`;
};

export function DateRangePicker({
  onDateRangeChange,
  tabId,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('thisMonth');
  
  // Estado interno para Mês/Ano
  const [startMonth, setStartMonth] = useState<string | undefined>(undefined);
  const [startYear, setStartYear] = useState<string | undefined>(undefined);
  const [endMonth, setEndMonth] = useState<string | undefined>(undefined);
  const [endYear, setEndYear] = useState<string | undefined>(undefined);
  
  // Estado para o range de datas atual (o que está aplicado)
  const [currentRange, setCurrentRange] = useState<DateRange>(getRangeFromPreset('thisMonth'));

  // 1. Inicialização e Persistência
  useEffect(() => {
    const savedRange = localStorage.getItem(`dateRange-${tabId}`);
    if (savedRange) {
      try {
        const parsed = JSON.parse(savedRange);
        const range: DateRange = {
          from: parsed.from ? new Date(parsed.from) : undefined,
          to: parsed.to ? new Date(parsed.to) : undefined,
        };
        setCurrentRange(range);
        onDateRangeChange(range);
        
        // Tenta preencher os seletores Mês/Ano com o range salvo
        if (range.from && range.to) {
          setStartMonth(range.from.getMonth().toString());
          setStartYear(range.from.getFullYear().toString());
          setEndMonth(range.to.getMonth().toString());
          setEndYear(range.to.getFullYear().toString());
        }
        
      } catch (e) {
        console.error("Erro ao carregar período salvo:", e);
        // Se falhar, aplica o preset 'Este mês'
        const defaultRange = getRangeFromPreset('thisMonth');
        setCurrentRange(defaultRange);
        onDateRangeChange(defaultRange);
      }
    } else {
      // Aplica o preset 'Este mês' se não houver nada salvo
      const defaultRange = getRangeFromPreset('thisMonth');
      setCurrentRange(defaultRange);
      onDateRangeChange(defaultRange);
    }
  }, [tabId, onDateRangeChange]);

  // 2. Função para salvar e aplicar o range
  const applyRange = useCallback((range: DateRange) => {
    if (range.from && range.to && range.from > range.to) {
      setError("Período inicial não pode ser posterior ao período final.");
      return;
    }
    
    setError(null);
    setCurrentRange(range);
    onDateRangeChange(range);
    localStorage.setItem(`dateRange-${tabId}`, JSON.stringify({
      from: range.from?.toISOString(),
      to: range.to?.toISOString(),
    }));
    setIsOpen(false);
  }, [onDateRangeChange, tabId]);

  // 3. Lógica de aplicação de presets
  const handleApplyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const range = getRangeFromPreset(presetId);
    
    // Atualiza os seletores Mês/Ano para refletir o preset
    if (range.from && range.to) {
      setStartMonth(range.from.getMonth().toString());
      setStartYear(range.from.getFullYear().toString());
      setEndMonth(range.to.getMonth().toString());
      setEndYear(range.to.getFullYear().toString());
    } else {
      setStartMonth(undefined);
      setStartYear(undefined);
      setEndMonth(undefined);
      setEndYear(undefined);
    }
    
    applyRange(range);
  };
  
  // 4. Lógica de aplicação de Mês/Ano customizado
  const handleApplyCustom = () => {
    if (!startMonth || !startYear || !endMonth || !endYear) {
      setError("Selecione o mês e ano inicial e final.");
      return;
    }
    
    const from = startOfMonth(new Date(parseInt(startYear), parseInt(startMonth)));
    const to = endOfMonth(new Date(parseInt(endYear), parseInt(endMonth)));
    
    applyRange({ from, to });
  };
  
  // 5. Limpar filtros
  const handleClear = () => {
    setStartMonth(undefined);
    setStartYear(undefined);
    setEndMonth(undefined);
    setEndYear(undefined);
    setSelectedPreset('all');
    applyRange({ from: undefined, to: undefined });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex items-center gap-2 bg-muted border-border h-9 px-3 py-2 text-sm w-[280px] justify-start",
            className,
            error && "border-destructive"
          )}
        >
          <Calendar className="w-4 h-4" />
          <span className="truncate">{formatDateRange(currentRange)}</span>
          <ChevronDown
            className={cn("w-4 h-4 ml-auto transition-transform", isOpen && "rotate-180")}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-4 bg-card border-border" align="end">
        <div className="space-y-4">
          {/* Seleção Mês/Ano */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Período Inicial
              </label>
              <div className="flex gap-2">
                <Select value={startMonth} onValueChange={setStartMonth}>
                  <SelectTrigger className="flex-1 bg-muted border-border h-9">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={startYear} onValueChange={setStartYear}>
                  <SelectTrigger className="flex-1 bg-muted border-border h-9">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearsOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Período Final
              </label>
              <div className="flex gap-2">
                <Select value={endMonth} onValueChange={setEndMonth}>
                  <SelectTrigger className="flex-1 bg-muted border-border h-9">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={endYear} onValueChange={setEndYear}>
                  <SelectTrigger className="flex-1 bg-muted border-border h-9">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearsOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleApplyCustom} 
            className="w-full h-9"
            disabled={!startMonth || !startYear || !endMonth || !endYear}
          >
            Aplicar Período Customizado
          </Button>

          {error && (
            <div className="p-2 bg-destructive/10 text-destructive text-xs rounded">
              {error}
            </div>
          )}

          <Separator />

          {/* Presets */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Períodos Pré-definidos
            </label>
            <div className="grid grid-cols-4 gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.id}
                  variant={currentRange.from && currentRange.to && 
                           formatDateRange(currentRange) === formatDateRange(getRangeFromPreset(preset.id)) 
                           ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => handleApplyPreset(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-xs gap-1"
            >
              <X className="w-3 h-3" />
              Limpar
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}