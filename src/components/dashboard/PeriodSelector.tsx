import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronDown, Calendar as CalendarIcon, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, isSameDay, isSameMonth, isSameYear, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Label } from "@/components/ui/label";

// Interface padronizada para range de data (usando Date)
export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

// Mantendo a interface de comparação para evitar quebras em outros arquivos, mas focando apenas no range1
export interface ComparisonDateRanges {
  range1: DateRange;
  range2: DateRange; // Será sempre undefined/null
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

export function PeriodSelector({
  onDateRangeChange,
  initialRanges,
  className,
}: PeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(initialRanges.range1);
  const [tempRange, setTempRange] = useState<DateRange>(initialRanges.range1);
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');

  const calculateRangeFromPreset = useCallback((presetId: string): DateRange => {
    const today = new Date();
    
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
      default:
        return { from: undefined, to: undefined };
    }
  }, []);

  const getActivePresetId = useCallback((currentRange: DateRange): string => {
    if (!currentRange.from && !currentRange.to) return "all";
    if (!currentRange.from || !currentRange.to) return "custom";

    for (const preset of presets) {
      const calculatedRange = calculateRangeFromPreset(preset.id);
        
      if (calculatedRange.from && calculatedRange.to && 
          isSameDay(currentRange.from, calculatedRange.from) && 
          isSameDay(currentRange.to, calculatedRange.to)) {
        return preset.id;
      }
    }
    return "custom";
  }, [calculateRangeFromPreset]);

  useEffect(() => {
    setRange(initialRanges.range1);
    setSelectedPreset(getActivePresetId(initialRanges.range1));
  }, [initialRanges, getActivePresetId]);

  useEffect(() => {
    if (isOpen) {
      setTempRange(range);
    }
  }, [isOpen, range]);

  const handleApply = useCallback((newRange: DateRange) => {
    const finalRange: DateRange = newRange.from ? normalizeRange(newRange) : { from: undefined, to: undefined };
    
    setRange(finalRange);
    onDateRangeChange({ range1: finalRange, range2: { from: undefined, to: undefined } });
  }, [onDateRangeChange]);
  
  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    
    if (presetId === 'custom') {
      return;
    }
    
    const newRange = calculateRangeFromPreset(presetId);
    handleApply(newRange);
    setIsOpen(false);
  };

  const handleCalendarApply = () => {
    if (!tempRange.from && !tempRange.to) return;
    
    const newRange: DateRange = (tempRange.from && tempRange.to && tempRange.from > tempRange.to)
      ? { from: tempRange.to, to: tempRange.from }
      : { from: tempRange.from, to: tempRange.to };

    setSelectedPreset('custom');
    handleApply(newRange);
    setIsOpen(false);
  };

  const handleClearAll = () => {
    handleApply({ from: undefined, to: undefined });
    setSelectedPreset('all');
    setIsOpen(false);
  };

  const normalizeRange = (r: DateRange): DateRange => ({
    from: r.from ? startOfDay(r.from) : undefined,
    to: r.to ? endOfDay(r.to) : undefined,
  });

  const formatDateRange = (r: DateRange) => {
    if (!r.from && !r.to) return "Todo o período";
    if (!r.from || !r.to) return "Selecione um período";
    
    const fromStr = format(r.from, "dd/MM/yyyy", { locale: ptBR });
    const toStr = format(r.to, "dd/MM/yyyy", { locale: ptBR });

    if (isSameDay(r.from, r.to)) {
      return fromStr;
    }
    if (isSameMonth(r.from, r.to) && isSameYear(r.from, r.to)) {
      return `${format(r.from, "dd", { locale: ptBR })} - ${toStr}`;
    }
    
    return `${fromStr} - ${toStr}`;
  };

  const displayRange = useMemo(() => formatDateRange(range), [range]);
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[200px] justify-start text-left font-normal h-9 border-border shadow-sm hover:bg-muted/50 transition-colors",
            (!range.from && !range.to) && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm font-medium truncate flex-1">
            {displayRange}
          </span>
          <ChevronDown className="ml-auto h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="p-3 bg-card border-border w-auto max-w-none"
        side="bottom"
        align="start"
      >
        <div className="flex gap-3">
          
          {/* Coluna Presets */}
          <div className="w-[140px] shrink-0 space-y-1">
            <Label className="text-xs font-medium text-muted-foreground px-1">Presets</Label>
            <div className="flex flex-col gap-1">
              {presets.map((preset) => (
                <Button
                  key={preset.id}
                  variant={selectedPreset === preset.id ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start text-xs h-7 px-2"
                  onClick={() => handleSelectPreset(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}

              <Button
                variant={selectedPreset === "custom" ? "default" : "outline"}
                size="sm"
                className="w-full justify-start text-xs h-7 px-2"
                onClick={() => setSelectedPreset("custom")}
              >
                Personalizado
              </Button>
            </div>
          </div>

          {/* Coluna Calendário Compacta */}
          <div className="space-y-2 min-w-[560px] max-w-[560px]">
            <Calendar
              mode="range"
              selected={{ from: tempRange.from, to: tempRange.to }}
              onSelect={(r) => setTempRange(r as DateRange)}
              numberOfMonths={2}
              locale={ptBR}
              initialFocus
            />

            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
              <Button 
                onClick={handleCalendarApply} 
                className="flex-1 h-7 gap-1 text-xs"
                disabled={!tempRange.from || !tempRange.to}
              >
                <Check className="w-3 h-3" />
                Aplicar Datas
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
              >
                <X className="w-3 h-3" />
                Limpar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}