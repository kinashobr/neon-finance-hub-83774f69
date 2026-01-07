"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronDown, Calendar as CalendarIcon, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, isSameDay, isSameMonth, isSameYear, startOfDay, endOfDay, differenceInDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { DateRange, ComparisonDateRanges } from "@/types/finance";

interface PeriodSelectorProps {
  onDateRangeChange: (ranges: ComparisonDateRanges) => void;
  initialRanges: ComparisonDateRanges;
  className?: string;
}

const presets = [
  { id: "thisMonth", label: "Este mês" },
  { id: "lastMonth", label: "Mês passado" },
  { id: "last3Months", label: "Últimos 3" },
  { id: "thisYear", label: "Este ano" },
  { id: "all", label: "Tudo" },
];

export function PeriodSelector({
  onDateRangeChange,
  initialRanges,
  className,
}: PeriodSelectorProps) {
  const safeInitialRange1 = initialRanges.range1 || { from: undefined, to: undefined };
  
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(safeInitialRange1);
  const [tempRange, setTempRange] = useState<DateRange>(safeInitialRange1);
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

  const calculateComparisonRange = useCallback((range1: DateRange): DateRange => {
    if (!range1.from || !range1.to) {
      return { from: undefined, to: undefined };
    }
    
    const isFullMonth = isSameDay(range1.from, startOfMonth(range1.from)) && 
                        isSameDay(range1.to, endOfMonth(range1.to));

    if (isFullMonth) {
      const prevMonth = subMonths(range1.from, 1);
      return { from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) };
    }
    
    const diffInDays = differenceInDays(range1.to, range1.from) + 1;
    const prevTo = subDays(range1.from, 1);
    const prevFrom = subDays(prevTo, diffInDays - 1);
    
    return { from: prevFrom, to: prevTo };
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
    const finalRange1: DateRange = newRange.from ? normalizeRange(newRange) : { from: undefined, to: undefined };
    const finalRange2 = calculateComparisonRange(finalRange1);
    
    setRange(finalRange1);
    onDateRangeChange({ range1: finalRange1, range2: finalRange2 });
  }, [onDateRangeChange, calculateComparisonRange]);
  
  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    if (presetId === 'custom') return;
    
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

  const formatDateRange = (r: DateRange | undefined) => {
    if (!r || (!r.from && !r.to)) return "Todo o período";
    if (!r.from || !r.to) return "Selecione...";
    
    const fromDate = r.from as Date;
    const toDate = r.to as Date;

    const fromStr = format(fromDate, "dd/MM/yy", { locale: ptBR });
    const toStr = format(toDate, "dd/MM/yy", { locale: ptBR });

    if (isSameDay(fromDate, toDate)) return fromStr;
    return `${fromStr} - ${toStr}`;
  };
  
  const handleCalendarSelect = (newSelection: DateRange | undefined) => {
    if (!newSelection) {
      setTempRange({ from: undefined, to: undefined });
      return;
    }
    const { from, to } = newSelection;
    if (from && tempRange.from && isSameDay(from, tempRange.from) && !to) {
      setTempRange({ from: undefined, to: undefined });
    } else {
      setTempRange(newSelection);
    }
  };

  const displayRange = useMemo(() => formatDateRange(range), [range]);
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full sm:w-[220px] justify-start text-left font-normal h-8 border-border shadow-sm hover:bg-muted/50 transition-colors px-2",
            (!range.from && !range.to) && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="text-xs font-medium truncate flex-1">
            {displayRange}
          </span>
          <ChevronDown className="ml-auto h-3.5 w-3.5 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="p-2 bg-card border-border w-auto shadow-2xl"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Presets Column */}
          <div className="sm:w-[110px] shrink-0 flex flex-col gap-1 border-b sm:border-b-0 sm:border-r border-border/50 pb-2 sm:pb-0 sm:pr-2">
            <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1 px-1">Atalhos</Label>
            <div className="grid grid-cols-3 sm:grid-cols-1 gap-1">
              {presets.map((preset) => (
                <Button
                  key={preset.id}
                  variant={selectedPreset === preset.id ? "default" : "ghost"}
                  size="sm"
                  className="justify-start text-[10px] h-7 px-2"
                  onClick={() => handleSelectPreset(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                variant={selectedPreset === "custom" ? "default" : "ghost"}
                size="sm"
                className="justify-start text-[10px] h-7 px-2"
                onClick={() => setSelectedPreset("custom")}
              >
                Custom
              </Button>
            </div>
          </div>

          {/* Calendar Area */}
          <div className="space-y-2 flex flex-col items-center">
            <Calendar
              mode="range"
              selected={{ from: tempRange.from, to: tempRange.to }}
              onSelect={handleCalendarSelect}
              numberOfMonths={1}
              locale={ptBR}
              initialFocus
              className="p-0"
              classNames={{
                months: "flex flex-col space-y-4",
                month: "space-y-2",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-xs font-bold",
                nav: "space-x-1 flex items-center",
                nav_button: cn(
                  "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100"
                ),
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-7 font-normal text-[10px]",
                row: "flex w-full mt-1",
                cell: "h-7 w-7 text-center text-xs p-0 relative focus-within:relative focus-within:z-20",
                day: cn(
                  "h-7 w-7 p-0 font-normal aria-selected:opacity-100 hover:bg-accent rounded-md transition-colors"
                ),
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_end: "day-range-end",
                day_hidden: "invisible",
              }}
            />
            
            <div className="flex items-center gap-2 w-full pt-2 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-7 px-2 text-[10px] text-destructive hover:bg-destructive/10"
              >
                Limpar
              </Button>
              <Button 
                onClick={handleCalendarApply} 
                className="flex-1 h-7 text-[10px] gap-1"
                disabled={!tempRange.from || !tempRange.to}
              >
                <Check className="w-3 h-3" />
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}