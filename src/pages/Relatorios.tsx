import { useState, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BalancoTab } from "@/components/reports/BalancoTab";
import { DRETab } from "@/components/reports/DRETab";
import { IndicadoresTab } from "@/components/reports/IndicadoresTab";
import { Scale, Receipt, Activity } from "lucide-react";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { DateRange, ComparisonDateRanges } from "@/types/finance";
import { startOfMonth, endOfMonth, subDays, format } from "date-fns"; // Import format
import { ptBR } from "date-fns/locale"; // Import ptBR locale
import { useFinance } from "@/contexts/FinanceContext";

const Relatorios = () => {
  const { dateRanges, setDateRanges } = useFinance();

  const handlePeriodChange = useCallback((ranges: ComparisonDateRanges) => {
    setDateRanges(ranges);
  }, [setDateRanges]);

  const formatRange = (range: DateRange) => {
    if (!range.from && !range.to) return "Todo o período";
    if (!range.from || !range.to) return "Período incompleto";
    
    const from = format(range.from, 'dd/MM/yyyy', { locale: ptBR });
    const to = format(range.to, 'dd/MM/yyyy', { locale: ptBR });
    
    if (from === to) return from;
    return `${from} - ${to}`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <header className="glass-card md-elevated p-4 md:p-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between animate-fade-in">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">
              Relatórios Financeiros
            </h1>
            <p className="text-xs md:text-base text-muted-foreground mt-1">
              Análise contábil profissional • Balanço, DRE e Indicadores
            </p>
            <p className="text-xs md:text-sm text-muted-foreground mt-2">
              Período Principal: {" "}
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">
                {formatRange(dateRanges.range1)}
              </span>
              {dateRanges.range2.from && (
                <>
                  <span className="mx-2 hidden md:inline">|</span>
                  <br className="md:hidden" />
                  Período Comparativo: {" "}
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 text-secondary px-2 py-0.5 font-medium">
                    {formatRange(dateRanges.range2)}
                  </span>
                </>
              )}
            </p>
          </div>
          <PeriodSelector
            initialRanges={dateRanges}
            onDateRangeChange={handlePeriodChange}
          />
        </header>

        {/* Navigation Tabs */}
        <Tabs defaultValue="balanco" className="space-y-6">
          <TabsList className="bg-muted/40 rounded-full p-1.5 h-auto flex-wrap">
            <TabsTrigger
              value="balanco"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full gap-2 py-2.5 px-4 text-xs sm:text-sm"
            >
              <Scale className="w-4 h-4" />
              <span className="hidden sm:inline">Balanço Patrimonial</span>
              <span className="sm:hidden">Balanço</span>
            </TabsTrigger>
            <TabsTrigger
              value="dre"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full gap-2 py-2.5 px-4 text-xs sm:text-sm"
            >
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">Demonstração do Resultado</span>
              <span className="sm:hidden">DRE</span>
            </TabsTrigger>
            <TabsTrigger
              value="indicadores"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full gap-2 py-2.5 px-4 text-xs sm:text-sm"
            >
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Indicadores Avançados</span>
              <span className="sm:hidden">Indicadores</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="balanco" className="mt-6">
            <BalancoTab dateRanges={dateRanges} />
          </TabsContent>
          <TabsContent value="dre" className="mt-6">
            <DRETab dateRanges={dateRanges} />
          </TabsContent>
          <TabsContent value="indicadores" className="mt-6">
            <IndicadoresTab dateRanges={dateRanges} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Relatorios;