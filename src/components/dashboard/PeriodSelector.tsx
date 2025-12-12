import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronDown, Calendar as CalendarIcon, X, Equal, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subDays, isSameDay, isSameMonth, isSameYear, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

// Presets para o Período Principal
const presets = [
  { id: "thisMonth", label: "Este mês" },
  { id: "lastMonth", label: "Mês passado" },
  { id: "last3Months", label: "Últimos 3 meses" },
  { id: "thisYear", label: "Este ano" },
  { id: "all", label: "Todo o período" },
];

// Presets para o Período de Comparação
const comparisonPresets = [
  { id: "previousPeriod", label: "Período Anterior" },
  { id: "previousYear", label: "Ano Anterior" },
];

export function PeriodSelector({
  onDateRangeChange,
  initialRanges,
  className,
}: PeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [ranges, setRanges] = useState<ComparisonDateRanges>(initialRanges);
  
  // Estado de edição: qual range está sendo configurado no calendário
  const [editingRange, setEditingRange] = useState<'range1' | 'range2'>('range1');
  
  // Estado temporário para o calendário
  const [tempRange, setTempRange] = useState<DateRange>(initialRanges.range1);
  
  // Estado de presets
  const [selectedPreset1, setSelectedPreset1] = useState<string>('custom');
  const [selectedPreset2, setSelectedPreset2] = useState<string>('none');
  
  // Estado do toggle de comparação
  const [isComparisonEnabled, setIsComparisonEnabled] = useState(!!initialRanges.range2.from);

  // Função auxiliar para calcular ranges
  const calculateRangeFromPreset = useCallback((presetId: string, baseRange?: DateRange): DateRange => {
    const today = new Date();
    
    if (baseRange && (presetId === 'previousPeriod' || presetId === 'previousYear')) {
      if (!baseRange.from || !baseRange.to) return { from: undefined, to: undefined };
      
      if (presetId === 'previousPeriod') {
        const diffInDays = Math.ceil((baseRange.to.getTime() - baseRange.from.getTime()) / (1000 * 60 * 60 * 24));
        const prevTo = subDays(baseRange.from, 1);
        const prevFrom = subDays(prevTo, diffInDays);
        return { from: startOfDay(prevFrom), to: endOfDay(prevTo) };
      }
      
      if (presetId === 'previousYear') {
        const prevFrom = subMonths(baseRange.from, 12);
        const prevTo = subMonths(baseRange.to, 12);
        return { from: startOfDay(prevFrom), to: endOfDay(prevTo) };
      }
    }

    switch (presetId) {
      case "thisMonth":
        return { from: startOfMonth(today), to: endOfMonth(today) };
      case "lastMonth":
        const lastMonth = subMonths(today, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case "last3Months":
        const last3Months = subMonths(today, 2);
        return { from: startOfMonth(last3Months), to: endOfMonth(today) };
      case "thisYear":
        return { from: startOfYear(today), to: endOfYear(today) };
      case "all":
        return { from: undefined, to: undefined };
      case "custom":
      case "none":
      default:
        return { from: undefined, to: undefined };
    }
  }, []);

  // Função auxiliar para determinar o preset ativo
  const getActivePresetId = useCallback((currentRange: DateRange, isRange1: boolean): string => {
    if (!currentRange.from && !currentRange.to) return "all";
    if (!currentRange.from || !currentRange.to) return "custom";

    const checkPresets = isRange1 ? presets : comparisonPresets;
    
    for (const preset of checkPresets) {
      const calculatedRange = isRange1 
        ? calculateRangeFromPreset(preset.id)
        : calculateRangeFromPreset(preset.id, ranges.range1);
        
      if (calculatedRange.from && calculatedRange.to && 
          isSameDay(currentRange.from, calculatedRange.from) && 
          isSameDay(currentRange.to, calculatedRange.to)) {
        return preset.id;
      }
    }
    
    if (!isRange1) {
      if (!isComparisonEnabled) return "none";
      // Verifica presets de comparação
      for (const preset of comparisonPresets) {
        const calculatedRange = calculateRangeFromPreset(preset.id, ranges.range1);
        if (calculatedRange.from && calculatedRange.to && 
            isSameDay(currentRange.from, calculatedRange.from) && 
            isSameDay(currentRange.to, calculatedRange.to)) {
          return preset.id;
        }
      }
    }

    return "custom";
  }, [calculateRangeFromPreset, ranges.range1, isComparisonEnabled]);

  // Sincroniza o estado interno com o prop initialRanges
  useEffect(() => {
    setRanges(initialRanges);
    setIsComparisonEnabled(!!initialRanges.range2.from);
    
    setSelectedPreset1(getActivePresetId(initialRanges.range1, true));
    setSelectedPreset2(getActivePresetId(initialRanges.range2, false));
  }, [initialRanges, getActivePresetId]);

  // Sincroniza o range temporário ao abrir ou mudar o range de edição
  useEffect(() => {
    if (isOpen) {
      const rangeToEdit = editingRange === 'range1' ? ranges.range1 : ranges.range2;
      setTempRange(rangeToEdit);
    }
  }, [isOpen, editingRange, ranges]);

  // Aplica as mudanças e emite o evento
  const handleApply = useCallback((newRanges: ComparisonDateRanges) => {
    const finalRanges: ComparisonDateRanges = {
      range1: newRanges.range1.from ? normalizeRange(newRanges.range1) : { from: undefined, to: undefined },
      range2: newRanges.range2.from ? normalizeRange(newRanges.range2) : { from: undefined, to: undefined },
    };
    
    setRanges(finalRanges);
    onDateRangeChange(finalRanges);
  }, [onDateRangeChange]);
  
  // Lógica de seleção de preset (Range 1)
  const handleSelectPreset1 = (presetId: string) => {
    setSelectedPreset1(presetId);
    
    if (presetId === 'custom') {
      setEditingRange('range1');
      setTempRange(ranges.range1);
      return;
    }
    
    const newRange1 = calculateRangeFromPreset(presetId);
    
    // Atualiza o Período 2 automaticamente se estiver em modo automático
    let newRange2 = ranges.range2;
    if (selectedPreset2 === 'previousPeriod' || selectedPreset2 === 'previousYear') {
      newRange2 = calculateRangeFromPreset(selectedPreset2, newRange1);
    } else if (selectedPreset2 === 'none' || !isComparisonEnabled) {
      newRange2 = { from: undefined, to: undefined };
    }

    handleApply({ range1: newRange1, range2: newRange2 });
  };

  // Lógica de seleção de preset (Range 2)
  const handleSelectPreset2 = (presetId: string) => {
    setSelectedPreset2(presetId);
    
    if (presetId === 'custom') {
      setEditingRange('range2');
      setTempRange(ranges.range2);
      return;
    }
    
    let newRange2: DateRange = { from: undefined, to: undefined };
    if (presetId === 'previousPeriod' || presetId === 'previousYear') {
      newRange2 = calculateRangeFromPreset(presetId, ranges.range1);
    } else if (presetId === 'none') {
      newRange2 = { from: undefined, to: undefined };
    }

    handleApply({ range1: ranges.range1, range2: newRange2 });
  };
  
  // Aplica o intervalo temporário (do calendário) ao range de edição
  const handleCalendarApply = () => {
    if (!tempRange.from && !tempRange.to) return;
    
    const newRange: DateRange = (tempRange.from && tempRange.to && tempRange.from > tempRange.to)
      ? { from: tempRange.to, to: tempRange.from }
      : { from: tempRange.from, to: tempRange.to };

    let newRanges = { ...ranges };
    
    if (editingRange === 'range1') {
      newRanges.range1 = newRange;
      setSelectedPreset1('custom');
      
      // Recalcula o Período 2 se estiver em modo automático
      if (selectedPreset2 === 'previousPeriod' || selectedPreset2 === 'previousYear') {
        newRanges.range2 = calculateRangeFromPreset(selectedPreset2, newRange);
      } else if (selectedPreset2 === 'none' || !isComparisonEnabled) {
        newRanges.range2 = { from: undefined, to: undefined };
      }
    } else {
      newRanges.range2 = newRange;
      setSelectedPreset2('custom');
    }
    
    handleApply(newRanges);
    setEditingRange('range1'); // Volta para o P1 após aplicar
  };

  const handleClearAll = () => {
    handleApply({ range1: { from: undefined, to: undefined }, range2: { from: undefined, to: undefined } });
    setSelectedPreset1('all');
    setSelectedPreset2('none');
    setIsComparisonEnabled(false);
    setEditingRange('range1');
  };

  const normalizeRange = (range: DateRange): DateRange => ({
    from: range.from ? startOfDay(range.from) : undefined,
    to: range.to ? endOfDay(range.to) : undefined,
  });

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
  
  const isCustomMode = selectedPreset1 === 'custom' || (isComparisonEnabled && selectedPreset2 === 'custom');
  
  // Determina o valor de exibição no Select do P1
  const displayPreset1 = useMemo(() => {
    if (selectedPreset1 === 'custom') {
      return 'Personalizado';
    }
    return presets.find(p => p.id === selectedPreset1)?.label || 'Personalizado';
  }, [selectedPreset1]);

  // Determina o valor de exibição no Select do P2
  const displayPreset2 = useMemo(() => {
    if (selectedPreset2 === 'custom') {
      return 'Personalizado';
    }
    return comparisonPresets.find(p => p.id === selectedPreset2)?.label || 'Nenhuma Comparação';
  }, [selectedPreset2]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[320px] justify-start text-left font-normal bg-muted border-border h-12",
            (!ranges.range1.from && !ranges.range1.to) && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <div className="flex flex-col items-start text-xs flex-1 min-w-0">
            <span className="font-medium text-foreground truncate w-full">
              {displayRange1}
            </span>
            {isComparisonEnabled && (
              <span className="text-muted-foreground truncate w-full">
                vs {displayRange2}
              </span>
            )}
          </div>
          <ChevronDown className="ml-auto h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      
      {/* Popover Content - Layout de coluna única e compacto */}
      <PopoverContent className={cn("w-full p-4 bg-card border-border", isCustomMode ? "max-w-[650px]" : "max-w-[350px]")} align="end">
        <div className="space-y-6">
          
          {/* 1) Período Principal - Select */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Período Principal</Label>
            <Select value={selectedPreset1} onValueChange={handleSelectPreset1}>
              <SelectTrigger className="w-full h-10 bg-muted border-border">
                <SelectValue placeholder={displayPreset1} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Opções Rápidas</SelectLabel>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Avançado</SelectLabel>
                  <SelectItem value="custom">Personalizado...</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          {/* 2) Período de Comparação (Opcional) */}
          <div className="space-y-3 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Equal className="w-4 h-4 text-accent" />
                Comparar Período
              </Label>
              <Switch
                checked={isComparisonEnabled}
                onCheckedChange={handleComparisonToggle}
              />
            </div>
            
            {isComparisonEnabled && (
              <div className="space-y-2">
                <Select value={selectedPreset2} onValueChange={handleSelectPreset2}>
                  <SelectTrigger className="w-full h-10 bg-muted border-border">
                    <SelectValue placeholder={displayPreset2} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Comparação Automática</SelectLabel>
                      {comparisonPresets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Opções</SelectLabel>
                      <SelectItem value="custom">Personalizado...</SelectItem>
                      <SelectItem value="none">Nenhuma Comparação</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          {/* Calendário para Personalizado (Aparece se P1 ou P2 for 'custom') */}
          {isCustomMode && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs font-medium text-muted-foreground">
                {editingRange === 'range1' ? 'Selecione o Período Principal' : 'Selecione o Período de Comparação'}
              </p>
              <div className="flex justify-center overflow-x-auto">
                <Calendar
                  mode="range"
                  selected={{ from: tempRange.from, to: tempRange.to }}
                  onSelect={(range) => setTempRange(range as DateRange)}
                  numberOfMonths={2}
                  locale={ptBR}
                  initialFocus
                  className="max-w-full" 
                />
              </div>
              <Button 
                onClick={handleCalendarApply} 
                className="w-full h-10 gap-2"
                disabled={!tempRange.from || !tempRange.to}
              >
                <Check className="w-4 h-4" />
                Aplicar Seleção
              </Button>
            </div>
          )}
          
          {/* Ações Finais */}
          <div className="flex justify-end pt-4 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-destructive hover:text-destructive gap-1"
            >
              <X className="w-4 h-4" />
              Limpar Tudo
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}