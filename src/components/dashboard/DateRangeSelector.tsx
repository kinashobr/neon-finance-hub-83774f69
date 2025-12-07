import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfQuarter, endOfQuarter, addYears, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangeSelectorProps {
  onDateRangeChange: (range: DateRange) => void;
}

const getQuarter = (date: Date) => {
  return Math.floor(date.getMonth() / 3) + 1;
};

const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = 2020; year <= currentYear + 1; year++) {
    years.push(year);
  }
  return years;
};

export function DateRangeSelector({ onDateRangeChange }: DateRangeSelectorProps) {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("mes");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedQuarter, setSelectedQuarter] = useState(getQuarter(new Date()).toString());
  const [customRange, setCustomRange] = useState<DateRange>({ from: new Date(), to: new Date() });

  const months = [
    { value: "0", label: "Janeiro" },
    { value: "1", label: "Fevereiro" },
    { value: "2", label: "Março" },
    { value: "3", label: "Abril" },
    { value: "4", label: "Maio" },
    { value: "5", label: "Junho" },
    { value: "6", label: "Julho" },
    { value: "7", label: "Agosto" },
    { value: "8", label: "Setembro" },
    { value: "9", label: "Outubro" },
    { value: "10", label: "Novembro" },
    { value: "11", label: "Dezembro" },
  ];

  const quarters = [
    { value: "1", label: "1º Trimestre" },
    { value: "2", label: "2º Trimestre" },
    { value: "3", label: "3º Trimestre" },
    { value: "4", label: "4º Trimestre" },
  ];

  const presets = [
    { value: "mes", label: "Este mês" },
    { value: "trimestre", label: "Trimestre" },
    { value: "semestre", label: "Semestre" },
    { value: "ano", label: "Este ano" },
    { value: "all", label: "Todo período" },
    { value: "mes-specific", label: "Mês específico" },
    { value: "ano-specific", label: "Ano específico" },
    { value: "trimestre-specific", label: "Trimestre específico" },
    { value: "custom", label: "Intervalo personalizado" },
  ];

  // Apply date range when component mounts
  useEffect(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    setDateRange({ from: start, to: end });
    onDateRangeChange({ from: start, to: end });
  }, [onDateRangeChange]);

  const applyPreset = (preset: string) => {
    const now = new Date();
    let from: Date | undefined;
    let to: Date | undefined;

    switch (preset) {
      case "mes":
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case "trimestre":
        from = startOfQuarter(now);
        to = endOfQuarter(now);
        break;
      case "semestre":
        if (now.getMonth() < 6) {
          from = startOfYear(now);
          to = endOfMonth(new Date(now.getFullYear(), 5, 30));
        } else {
          from = startOfMonth(new Date(now.getFullYear(), 6, 1));
          to = endOfYear(now);
        }
        break;
      case "ano":
        from = startOfYear(now);
        to = endOfYear(now);
        break;
      case "all":
        from = undefined;
        to = undefined;
        break;
      case "mes-specific":
        const year = parseInt(selectedYear);
        const month = parseInt(selectedMonth);
        from = startOfMonth(new Date(year, month, 1));
        to = endOfMonth(new Date(year, month, 1));
        break;
      case "ano-specific":
        const selectedYearNum = parseInt(selectedYear);
        from = startOfYear(new Date(selectedYearNum, 0, 1));
        to = endOfYear(new Date(selectedYearNum, 11, 31));
        break;
      case "trimestre-specific":
        const yearTrimestre = parseInt(selectedYear);
        const quarter = parseInt(selectedQuarter);
        const quarterStartMonth = (quarter - 1) * 3;
        from = startOfQuarter(new Date(yearTrimestre, quarterStartMonth, 1));
        to = endOfQuarter(new Date(yearTrimestre, quarterStartMonth + 2, 1));
        break;
      case "custom":
        setShowCustomDialog(true);
        return;
    }

    setDateRange({ from, to });
    onDateRangeChange({ from, to });
    setIsOpen(false);
  };

  const handleCustomRangeApply = () => {
    setDateRange(customRange);
    onDateRangeChange(customRange);
    setShowCustomDialog(false);
    setIsOpen(false);
  };

  const formatDateRange = () => {
    if (!dateRange.from && !dateRange.to) return "Todo período";
    if (!dateRange.from || !dateRange.to) return "Selecione um período";
    
    if (dateRange.from.toDateString() === dateRange.to.toDateString()) {
      return format(dateRange.from, "dd MMM yyyy", { locale: ptBR });
    }
    
    return `${format(dateRange.from, "dd MMM yyyy", { locale: ptBR })} - ${format(dateRange.to, "dd MMM yyyy", { locale: ptBR })}`;
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[280px] justify-start text-left font-normal bg-muted border-border",
              !dateRange.from && !dateRange.to && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span>{formatDateRange()}</span>
            <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-card border-border" align="end">
          <div className="p-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Período pré-definido
              </label>
              <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                <SelectTrigger className="w-full bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPreset === "mes-specific" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Mês
                  </label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-full bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Ano
                  </label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-full bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableYears().map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {selectedPreset === "ano-specific" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Ano
                </label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-full bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableYears().map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedPreset === "trimestre-specific" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Trimestre
                  </label>
                  <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                    <SelectTrigger className="w-full bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {quarters.map((quarter) => (
                        <SelectItem key={quarter.value} value={quarter.value}>
                          {quarter.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Ano
                  </label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-full bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableYears().map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <Button
              onClick={() => applyPreset(selectedPreset)}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Aplicar filtro
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Intervalo personalizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data inicial</label>
                <Calendar
                  mode="single"
                  selected={customRange.from}
                  onSelect={(date) => setCustomRange({ ...customRange, from: date })}
                  initialFocus
                  className="rounded-md border border-border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data final</label>
                <Calendar
                  mode="single"
                  selected={customRange.to}
                  onSelect={(date) => setCustomRange({ ...customRange, to: date })}
                  className="rounded-md border border-border"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCustomDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCustomRangeApply}
                className="bg-primary hover:bg-primary/90"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}