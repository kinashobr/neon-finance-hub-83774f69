import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronDown, Calendar as CalendarIcon, X, Equal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subDays, isSameDay, isSameMonth, isSameYear, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

// Interface padronizada para range de data (usando Date)
export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

// Nova interface para o estado de comparação
export interface ComparisonDateRanges {
  range1: DateRange;
  range2: DateRange;
}

interface PeriodSelectorProps {
  onDateRangeChange: (ranges: ComparisonDateRanges) => void;
  initialRanges: ComparisonDateRanges;
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

const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

// Presets para o Período 1
const presets = [
  { id: "thisMonth", label: "Este mês" },
  { id: "lastMonth", label: "Mês passado" },
  { id: "last3Months", label: "Últimos 3 meses" },
  { id: "thisYear", label: "Este ano" },
  { id: "all", label: "Todo o período" },
];

// Presets para o Período 2 (Comparação)
const comparisonPresets = [
  { id: "previousPeriod", label: "Período Anterior" },
  { id: "previousYear", label: "Ano Anterior" },
  { id: "custom", label: "Personalizado" },
  { id: "none", label: "Nenhuma Comparação" },
];

export function PeriodSelector({
  onDateRangeChange,
  initialRanges,
  className,
}: PeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [ranges, setRanges] = useState<ComparisonDateRanges>(initialRanges);
  const [editingRange, setEditingRange] = useState<'range1' | 'range2'>('range1');
  const [customFrom, setCustomFrom] = useState<Date | undefined>(initialRanges.range1.from);
  const [customTo, setCustomTo] = useState<Date | undefined>(initialRanges.range1.to);
  const [selectedPreset1, setSelectedPreset1] = useState<string>('custom');
  const [selectedPreset2, setSelectedPreset2] = useState<string>('none');

  // Sincroniza o estado interno com o prop initialRanges
  useEffect(() => {
    setRanges(initialRanges);
    // Determinar presets iniciais (simplificado)
    setSelectedPreset1(initialRanges.range1.from ? 'custom' : 'all');
    setSelectedPreset2(initialRanges.range2.from ? 'custom' : 'none');
  }, [initialRanges]);

  // Função auxiliar para garantir que 'to' seja o final do dia
  const normalizeRange = (range: DateRange): DateRange => ({
    from: range.from ? startOfDay(range.from) : undefined,
    to: range.to ? endOfDay(range.to) : undefined,
  });

  // Calcula o Período 2 automaticamente com base no Período 1
  const calculatePreviousPeriod = useCallback((range: DateRange): DateRange => {
    if (!range.from || !range.to) return { from: undefined, to: undefined };
    
    const diffInDays = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24));
    
    const prevTo = subDays(range.from, 1);
    const prevFrom = subDays(prevTo, diffInDays);
    
    return normalizeRange({ from: prevFrom, to: prevTo });
  }, []);

  const calculatePreviousYear = useCallback((range: DateRange): DateRange => {
    if (!range.from || !range.to) return { from: undefined, to: undefined };
    
    const prevFrom = subMonths(range.from, 12);
    const prevTo = subMonths(range.to, 12);
    
    return normalizeRange({ from: prevFrom, to: prevTo });
  }, []);

  // Aplica as mudanças e fecha o popover
  const handleApply = useCallback((newRanges: ComparisonDateRanges) => {
    const finalRanges: ComparisonDateRanges = {
      range1: normalizeRange(newRanges.range1),
      range2: normalizeRange(newRanges.range2),
    };
    
    setRanges(finalRanges);
    onDateRangeChange(finalRanges);
    setIsOpen(false);
  }, [onDateRangeChange]);
  
  // Lógica de presets para o Período 1
  const handlePreset1Click = (presetId: string) => {
    const today = new Date();
    let newRange: DateRange;

    switch (presetId) {
      case "thisMonth":
        newRange = { from: startOfMonth(today), to: endOfMonth(today) };
        break;
      case "lastMonth":
        const lastMonth = subMonths(today, 1);
        newRange = { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
        break;
      case "last3Months":
        const last3Months = subMonths(today, 2);
        newRange = { from: startOfMonth(last3Months), to: endOfMonth(today) };
        break;
      case "thisYear":
        newRange = { from: startOfYear(today), to: endOfYear(today) };
        break;
      case "all":
        newRange = { from: undefined, to: undefined };
        break;
      default:
        return;
    }
    
    setSelectedPreset1(presetId);
    setCustomFrom(newRange.from);
    setCustomTo(newRange.to);
    
    // Atualiza o Período 2 automaticamente se estiver em 'Período Anterior'
    let newRange2 = ranges.range2;
    if (selectedPreset2 === 'previousPeriod') {
      newRange2 = calculatePreviousPeriod(newRange);
    } else if (selectedPreset2 === 'previousYear') {
      newRange2 = calculatePreviousYear(newRange);
    }

    handleApply({ range1: newRange, range2: newRange2 });
  };

  // Lógica de presets para o Período 2
  const handlePreset2Change = (presetId: string) => {
    setSelectedPreset2(presetId);
    let newRange2: DateRange = { from: undefined, to: undefined };
    
    if (presetId === 'previousPeriod') {
      newRange2 = calculatePreviousPeriod(ranges.range1);
    } else if (presetId === 'previousYear') {
      newRange2 = calculatePreviousYear(ranges.range1);
    } else if (presetId === 'none') {
      newRange2 = { from: undefined, to: undefined };
    }
    
    // Se for personalizado, abre o calendário para o range 2
    if (presetId === 'custom') {
      setEditingRange('range2');
      setCustomFrom(ranges.range2.from);
      setCustomTo(ranges.range2.to);
      return;
    }

    handleApply({ range1: ranges.range1, range2: newRange2 });
  };

  // Aplica o intervalo personalizado (usado para range1 ou range2)
  const handleCustomApply = () => {
    if (!customFrom && !customTo) return;
    
    const newRange: DateRange = (customFrom && customTo && customFrom > customTo)
      ? { from: customTo, to: customFrom }
      : { from: customFrom, to: customTo };

    let newRanges = { ...ranges };
    
    if (editingRange === 'range1') {
      newRanges.range1 = newRange;
      setSelectedPreset1('custom');
      
      // Recalcula o Período 2 se estiver em modo automático
      if (selectedPreset2 === 'previousPeriod') {
        newRanges.range2 = calculatePreviousPeriod(newRange);
      } else if (selectedPreset2 === 'previousYear') {
        newRanges.range2 = calculatePreviousYear(newRange);
      }
    } else {
      newRanges.range2 = newRange;
      setSelectedPreset2('custom');
    }
    
    handleApply(newRanges);
  };

  const handleClear = () => {
    handleApply({ range1: { from: undefined, to: undefined }, range2: { from: undefined, to: undefined } });
    setSelectedPreset1('all');
    setSelectedPreset2('none');
  };

  const formatDateRange = (range: DateRange) => {
    if (!range.from && !range.to) return "Todo o período";
    if (!range.from || !range.to) return "Selecione um período";
    
    const fromStr = format(range.from, "dd/MM/yyyy", { locale: ptBR });
    const toStr = format(range.to, "dd/MM/yyyy", { locale: ptBR });

    if (isSameDay(range.from, range.to)) {
      return fromStr;
    }
    if (isSameMonth(range.from, range.to) && isSameYear(range.from, range.to)) {
      return `${format(range.from, "dd", { locale: ptBR })} - ${toStr}`;
    }
    
    return `${fromStr} - ${toStr}`;
  };

  const displayRange1 = useMemo(() => formatDateRange(ranges.range1), [ranges.range1]);
  const displayRange2 = useMemo(() => ranges.range2.from ? formatDateRange(ranges.range2) : "Nenhuma Comparação", [ranges.range2]);

  const renderDateSelect = (type: 'from' | 'to') => {
    const date = type === 'from' ? customFrom : customTo;
    const setDate = type === 'from' ? setCustomFrom : setCustomTo;
    const monthValue = date ? date.getMonth().toString() : "";
    const yearValue = date ? date.getFullYear().toString() : "";

    const handleMonthChange = (value: string) => {
      const month = parseInt(value);
      const newDate = date ? new Date(date.getFullYear(), month, date.getDate()) : new Date(new Date().getFullYear(), month, 1);
      setDate(newDate);
    };

    const handleYearChange = (value: string) => {
      const year = parseInt(value);
      const newDate = date ? new Date(year, date.getMonth(), date.getDate()) : new Date(year, new Date().getMonth(), 1);
      setDate(newDate);
    };

    return (
      <div className="space-y-2">
        <label className="block text-xs font-medium text-muted-foreground">
          {type === 'from' ? 'Data Inicial' : 'Data Final'}
        </label>
        <div className="flex gap-2">
          <Select value={monthValue} onValueChange={handleMonthChange}>
            <SelectTrigger className="flex-1 bg-muted border-border h-9 text-sm">
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
          <Select value={yearValue} onValueChange={handleYearChange}>
            <SelectTrigger className="w-24 bg-muted border-border h-9 text-sm">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  // Define o título do popover e o range atual para edição
  const popoverTitle = editingRange === 'range1' ? 'Período Principal (1)' : 'Período de Comparação (2)';
  const currentRangeToEdit = editingRange === 'range1' ? ranges.range1 : ranges.range2;

  // Atualiza o estado customFrom/customTo quando o range de edição muda
  useEffect(() => {
    const range = editingRange === 'range1' ? ranges.range1 : ranges.range2;
    setCustomFrom(range.from);
    setCustomTo(range.to);
  }, [editingRange, ranges]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[320px] justify-start text-left font-normal bg-muted border-border h-12", // Aumentado h-9 para h-12
            (!ranges.range1.from && !ranges.range1.to) && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <div className="flex flex-col items-start text-xs flex-1 min-w-0">
            <span className="font-medium text-foreground truncate w-full">P1: {displayRange1}</span>
            <span className="text-muted-foreground truncate w-full">P2: {displayRange2}</span>
          </div>
          <ChevronDown className="ml-auto h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[650px] p-0 bg-card border-border" align="end">
        <div className="grid grid-cols-5 gap-4 p-4">
          {/* Coluna 1: Presets Período 1 */}
          <div className="col-span-1 space-y-2 border-r border-border pr-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Período 1 (Principal)
            </p>
            {presets.map((preset) => (
              <Button
                key={preset.id}
                variant={selectedPreset1 === preset.id ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start text-sm h-8"
                onClick={() => handlePreset1Click(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
            <Button
              variant={selectedPreset1 === 'custom' ? "default" : "outline"}
              size="sm"
              className="w-full justify-start text-sm h-8 mt-2"
              onClick={() => {
                setSelectedPreset1('custom');
                setEditingRange('range1');
              }}
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              Personalizar P1
            </Button>
          </div>

          {/* Coluna 2: Presets Período 2 */}
          <div className="col-span-1 space-y-2 border-r border-border pr-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Período 2 (Comparação)
            </p>
            {comparisonPresets.map((preset) => (
              <Button
                key={preset.id}
                variant={selectedPreset2 === preset.id ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start text-sm h-8"
                onClick={() => handlePreset2Change(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
            {selectedPreset2 === 'custom' && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-sm h-8 mt-2"
                onClick={() => setEditingRange('range2')}
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                Personalizar P2
              </Button>
            )}
          </div>

          {/* Coluna 3, 4, 5: Seleção Manual */}
          <div className="col-span-3 space-y-4">
            <p className="text-xs font-medium text-primary mb-2 flex items-center gap-2">
              <Equal className="w-4 h-4" />
              {popoverTitle}
            </p>
            
            {/* Seletores de Mês/Ano */}
            <div className="grid grid-cols-2 gap-4">
              {renderDateSelect('from')}
              {renderDateSelect('to')}
            </div>

            {/* Calendário */}
            <div className="flex justify-center">
              <Calendar
                mode="range"
                selected={{ from: customFrom, to: customTo }}
                onSelect={(range) => {
                  setCustomFrom(range?.from);
                  setCustomTo(range?.to);
                }}
                numberOfMonths={2} // Aumentado para 2 meses para melhor visualização
                locale={ptBR}
                initialFocus
              />
            </div>

            {/* Ações */}
            <div className="flex justify-between pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4 mr-1" />
                Limpar Tudo
              </Button>
              <Button
                onClick={handleCustomApply}
                className="bg-primary hover:bg-primary/90 gap-2"
                disabled={!customFrom && !customTo}
              >
                <CalendarIcon className="w-4 h-4" />
                Aplicar {editingRange === 'range1' ? 'P1' : 'P2'}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}