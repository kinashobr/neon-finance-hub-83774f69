import { useState, useEffect, useCallback } from "react";
import { ChevronDown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Interface padronizada para range de período
export interface PeriodRange {
  startMonth: number | null;
  startYear: number | null;
  endMonth: number | null;
  endYear: number | null;
}

// Interface para Date range (usado em componentes que esperam Date)
export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface PeriodSelectorProps {
  onPeriodChange: (period: PeriodRange) => void;
  initialPeriod?: PeriodRange;
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

const years = Array.from({ length: 10 }, (_, i) => 2020 + i);

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

// Função utilitária para converter PeriodRange para DateRange
export function periodToDateRange(period: PeriodRange): DateRange {
  if (
    period.startMonth === null ||
    period.startYear === null ||
    period.endMonth === null ||
    period.endYear === null
  ) {
    return { from: undefined, to: undefined };
  }

  const from = new Date(period.startYear, period.startMonth, 1);
  const to = new Date(period.endYear, period.endMonth + 1, 0); // Last day of month

  return { from, to };
}

// Função utilitária para converter DateRange para PeriodRange
export function dateRangeToPeriod(dateRange: DateRange): PeriodRange {
  if (!dateRange.from || !dateRange.to) {
    return {
      startMonth: null,
      startYear: null,
      endMonth: null,
      endYear: null,
    };
  }

  return {
    startMonth: dateRange.from.getMonth(),
    startYear: dateRange.from.getFullYear(),
    endMonth: dateRange.to.getMonth(),
    endYear: dateRange.to.getFullYear(),
  };
}

export function PeriodSelector({
  onPeriodChange,
  initialPeriod,
  tabId,
  className,
}: PeriodSelectorProps) {
  const [period, setPeriod] = useState<PeriodRange>(
    initialPeriod || {
      startMonth: null,
      startYear: null,
      endMonth: null,
      endYear: null,
    }
  );
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persistência de estado
  useEffect(() => {
    const savedPeriod = localStorage.getItem(`periodState-${tabId}`);
    if (savedPeriod) {
      try {
        const parsed = JSON.parse(savedPeriod);
        setPeriod(parsed);
        onPeriodChange(parsed);
      } catch (e) {
        console.error("Erro ao carregar período salvo:", e);
      }
    }
  }, [tabId]);

  const savePeriod = useCallback(
    (newPeriod: PeriodRange) => {
      setPeriod(newPeriod);
      localStorage.setItem(`periodState-${tabId}`, JSON.stringify(newPeriod));

      // Validar período
      if (
        newPeriod.startMonth !== null &&
        newPeriod.startYear !== null &&
        newPeriod.endMonth !== null &&
        newPeriod.endYear !== null
      ) {
        const startDate = new Date(newPeriod.startYear, newPeriod.startMonth);
        const endDate = new Date(newPeriod.endYear, newPeriod.endMonth);

        if (startDate > endDate) {
          setError("Período inicial não pode ser posterior ao período final");
          return;
        }

        setError(null);
        onPeriodChange(newPeriod);
      } else {
        // Se qualquer campo estiver vazio, notifica com valores nulos
        onPeriodChange(newPeriod);
      }
    },
    [onPeriodChange, tabId]
  );

  const handleMonthChange = (type: "start" | "end", value: string) => {
    const newPeriod = {
      ...period,
      [`${type}Month`]: value ? parseInt(value) : null,
    };
    savePeriod(newPeriod);
  };

  const handleYearChange = (type: "start" | "end", value: string) => {
    const newPeriod = {
      ...period,
      [`${type}Year`]: value ? parseInt(value) : null,
    };
    savePeriod(newPeriod);
  };

  const applyPreset = (presetId: string) => {
    const today = new Date();
    let newPeriod: PeriodRange;

    switch (presetId) {
      case "today":
        newPeriod = {
          startMonth: today.getMonth(),
          startYear: today.getFullYear(),
          endMonth: today.getMonth(),
          endYear: today.getFullYear(),
        };
        break;
      case "last7":
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        newPeriod = {
          startMonth: last7.getMonth(),
          startYear: last7.getFullYear(),
          endMonth: today.getMonth(),
          endYear: today.getFullYear(),
        };
        break;
      case "last30":
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        newPeriod = {
          startMonth: last30.getMonth(),
          startYear: last30.getFullYear(),
          endMonth: today.getMonth(),
          endYear: today.getFullYear(),
        };
        break;
      case "thisMonth":
        newPeriod = {
          startMonth: today.getMonth(),
          startYear: today.getFullYear(),
          endMonth: today.getMonth(),
          endYear: today.getFullYear(),
        };
        break;
      case "lastMonth":
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        newPeriod = {
          startMonth: lastMonth.getMonth(),
          startYear: lastMonth.getFullYear(),
          endMonth: lastMonth.getMonth(),
          endYear: lastMonth.getFullYear(),
        };
        break;
      case "last3Months":
        const last3Months = new Date(today);
        last3Months.setMonth(last3Months.getMonth() - 3);
        newPeriod = {
          startMonth: last3Months.getMonth(),
          startYear: last3Months.getFullYear(),
          endMonth: today.getMonth(),
          endYear: today.getFullYear(),
        };
        break;
      case "thisYear":
        newPeriod = {
          startMonth: 0,
          startYear: today.getFullYear(),
          endMonth: 11,
          endYear: today.getFullYear(),
        };
        break;
      case "all":
        newPeriod = {
          startMonth: 0,
          startYear: 2020,
          endMonth: 11,
          endYear: 2030,
        };
        break;
      default:
        return;
    }

    savePeriod(newPeriod);
    setIsOpen(false);
  };

  const formatPeriod = () => {
    if (
      period.startMonth === null ||
      period.startYear === null ||
      period.endMonth === null ||
      period.endYear === null
    ) {
      return "Selecione um período";
    }

    const startMonth =
      months.find((m) => m.value === period.startMonth)?.label || "";
    const endMonth =
      months.find((m) => m.value === period.endMonth)?.label || "";

    if (
      period.startMonth === period.endMonth &&
      period.startYear === period.endYear
    ) {
      return `${startMonth} ${period.startYear}`;
    }

    return `${startMonth} ${period.startYear} - ${endMonth} ${period.endYear}`;
  };

  const clearPeriod = () => {
    const emptyPeriod: PeriodRange = {
      startMonth: null,
      startYear: null,
      endMonth: null,
      endYear: null,
    };
    savePeriod(emptyPeriod);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className={cn(
            "flex items-center gap-2 bg-muted border-border h-9 px-3 py-2 text-sm",
            error && "border-destructive"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Calendar className="w-4 h-4" />
          <span>{formatPeriod()}</span>
          <ChevronDown
            className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")}
          />
        </Button>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[500px] z-50 bg-card border border-border rounded-lg shadow-lg p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Período Inicial
              </label>
              <div className="flex gap-2">
                <select
                  value={period.startMonth ?? ""}
                  onChange={(e) => handleMonthChange("start", e.target.value)}
                  className="flex-1 bg-muted border border-border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Mês</option>
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <select
                  value={period.startYear ?? ""}
                  onChange={(e) => handleYearChange("start", e.target.value)}
                  className="flex-1 bg-muted border border-border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Ano</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Período Final
              </label>
              <div className="flex gap-2">
                <select
                  value={period.endMonth ?? ""}
                  onChange={(e) => handleMonthChange("end", e.target.value)}
                  className="flex-1 bg-muted border border-border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Mês</option>
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <select
                  value={period.endYear ?? ""}
                  onChange={(e) => handleYearChange("end", e.target.value)}
                  className="flex-1 bg-muted border border-border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Ano</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-2 bg-destructive/10 text-destructive text-xs rounded">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Períodos Pré-definidos
            </label>
            <div className="grid grid-cols-4 gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => applyPreset(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearPeriod}
              className="text-xs"
            >
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
      )}
    </div>
  );
}
