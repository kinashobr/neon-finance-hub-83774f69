import { useState, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BalancoTab } from "@/components/reports/BalancoTab";
import { DRETab } from "@/components/reports/DRETab";
import { IndicadoresTab } from "@/components/reports/IndicadoresTab";
import { Scale, Receipt, Activity } from "lucide-react";
import { PeriodSelector, PeriodRange } from "@/components/dashboard/PeriodSelector";

const Relatorios = () => {
  const [periodRange, setPeriodRange] = useState<PeriodRange>({
    startMonth: null,
    startYear: null,
    endMonth: null,
    endYear: null,
  });

  const handlePeriodChange = useCallback((period: PeriodRange) => {
    setPeriodRange(period);
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Relatórios Financeiros
            </h1>
            <p className="text-muted-foreground mt-1">
              Análise contábil profissional • Balanço, DRE e Indicadores
            </p>
          </div>
          <PeriodSelector 
            onPeriodChange={handlePeriodChange} 
            tabId="relatorios" 
          />
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="balanco" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
            <TabsTrigger
              value="balanco"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 py-2.5 px-4"
            >
              <Scale className="w-4 h-4" />
              <span className="hidden sm:inline">Balanço Patrimonial</span>
              <span className="sm:hidden">Balanço</span>
            </TabsTrigger>
            <TabsTrigger
              value="dre"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 py-2.5 px-4"
            >
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">Demonstração do Resultado</span>
              <span className="sm:hidden">DRE</span>
            </TabsTrigger>
            <TabsTrigger
              value="indicadores"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 py-2.5 px-4"
            >
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Indicadores Avançados</span>
              <span className="sm:hidden">Indicadores</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="balanco" className="mt-6">
            <BalancoTab />
          </TabsContent>
          <TabsContent value="dre" className="mt-6">
            <DRETab />
          </TabsContent>
          <TabsContent value="indicadores" className="mt-6">
            <IndicadoresTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Relatorios;
