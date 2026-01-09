"use client";

import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2, TrendingUp, Wallet, Target, Shield, Bitcoin, DollarSign, ArrowUpRight, ArrowDownRight, Coins, CircleDollarSign, Landmark, History, Calendar } from "lucide-react";
import { cn, parseDateLocal } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { EditableCell } from "@/components/EditableCell";
import { toast } from "sonner";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { DateRange, ComparisonDateRanges } from "@/types/finance";
import { startOfMonth, endOfMonth, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ContaCorrente, TransacaoCompleta } from "@/types/finance";
import { InvestmentEvolutionChart } from "@/components/investments/InvestmentEvolutionChart";

// Custom label component for PieChart to prevent truncation
const CustomPieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius * 1.1; // Position label slightly outside
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  return (
    <text 
      x={x} 
      y={y} 
      fill="hsl(var(--foreground))" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
    >
      {`${name} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

const pieColors = [
  "hsl(142, 76%, 36%)",
  "hsl(199, 89%, 48%)",
  "hsl(270, 100%, 65%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
];

const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// List of stablecoin identifiers
const STABLECOIN_NAMES = ['usdt', 'usdc', 'dai', 'busd', 'tusd', 'usdp', 'gusd', 'frax', 'lusd', 'susd'];

const isStablecoin = (name: string): boolean => {
  return STABLECOIN_NAMES.some(s => name.toLowerCase().includes(s));
};

const Investimentos = () => {
  const { 
    contasMovimento,
    transacoesV2,
    getValorFipeTotal,
    getTotalReceitas,
    getTotalDespesas,
    categoriasV2,
    addTransacaoV2,
    calculateBalanceUpToDate,
    dateRanges,
    setDateRanges,
    calculateTotalInvestmentBalanceAtDate,
  } = useFinance();
  
  const [activeTab, setActiveTab] = useState("carteira");
  
  // --- ESTADOS FALTANTES ---
  const [showAddRendimento, setShowAddRendimento] = useState<string | null>(null);
  const [formRendimento, setFormRendimento] = useState({
    data: new Date().toISOString().split('T')[0],
    valor: "",
    descricao: "",
  });
  // -------------------------

  const handlePeriodChange = useCallback((ranges: ComparisonDateRanges) => {
    setDateRanges(ranges);
  }, [setDateRanges]);

  // Helper para filtrar transações por um range específico
  const filterTransactionsByRange = useCallback((range: DateRange) => {
    if (!range.from || !range.to) return transacoesV2;
    
    // Normaliza os limites do período para garantir que o dia inteiro seja incluído
    const rangeFrom = startOfDay(range.from);
    const rangeTo = endOfDay(range.to);
    
    return transacoesV2.filter(t => {
      const transactionDate = parseDateLocal(t.date);
      return isWithinInterval(transactionDate, { start: rangeFrom, end: rangeTo });
    });
  }, [transacoesV2]);

  // Transações do Período 1 (Principal)
  const transacoesPeriodo1 = useMemo(() => filterTransactionsByRange(dateRanges.range1), [filterTransactionsByRange, dateRanges.range1]);

  // Helper para calcular saldo atual de uma conta (usando a data final do período P1)
  const calculateAccountBalance = useCallback((accountId: string, targetDate: Date | undefined): number => {
    return calculateBalanceUpToDate(accountId, targetDate, transacoesV2, contasMovimento);
  }, [calculateBalanceUpToDate, transacoesV2, contasMovimento]);

  // Separate accounts by type for tab filtering
  const investmentAccounts = useMemo(() => {
    return contasMovimento.filter(c => 
      c.accountType === 'renda_fixa' || 
      c.accountType === 'poupanca' ||
      c.accountType === 'cripto' ||
      c.accountType === 'reserva' ||
      c.accountType === 'objetivo'
    );
  }, [contasMovimento]);

  const rfAccounts = useMemo(() => {
    return investmentAccounts.filter(c => 
      c.accountType === 'renda_fixa' || c.accountType === 'poupanca'
    );
  }, [investmentAccounts]);

  const cryptoAccounts = useMemo(() => {
    return investmentAccounts.filter(c => 
      c.accountType === 'cripto' && !isStablecoin(c.name)
    );
  }, [investmentAccounts]);

  const stablecoinAccounts = useMemo(() => {
    return investmentAccounts.filter(c => 
      c.accountType === 'cripto' && isStablecoin(c.name)
    );
  }, [investmentAccounts]);

  const objetivosAccounts = useMemo(() => {
    return investmentAccounts.filter(c => 
      c.accountType === 'objetivo' || c.accountType === 'reserva'
    );
  }, [investmentAccounts]);

  // Cálculos padronizados
  const calculosPatrimonio = useMemo(() => {
    const targetDate = dateRanges.range1.to;
    const periodStart = dateRanges.range1.from;

    // Totais das Contas Movimento (V2)
    const totalRF = rfAccounts.reduce((acc, c) => acc + calculateAccountBalance(c.id, targetDate), 0);
    const totalCripto = cryptoAccounts.reduce((acc, c) => acc + calculateAccountBalance(c.id, targetDate), 0);
    const totalStables = stablecoinAccounts.reduce((acc, c) => acc + calculateAccountBalance(c.id, targetDate), 0);
    const totalObjetivos = objetivosAccounts.reduce((acc, c) => acc + calculateAccountBalance(c.id, targetDate), 0);

    const valorVeiculos = getValorFipeTotal(targetDate);
    
    const patrimonioInvestimentos = totalRF + totalCripto + totalStables + totalObjetivos;
    const patrimonioTotal = patrimonioInvestimentos + valorVeiculos;
    
    const exposicaoCripto = patrimonioInvestimentos > 0 ? (totalCripto / patrimonioInvestimentos) * 100 : 0;
    
    // 1. Calcular Rendimentos no Período 1
    const totalRendimentosPeriodo1 = transacoesPeriodo1
        .filter(t => t.operationType === 'rendimento')
        .reduce((acc, t) => acc + t.amount, 0);
        
    // 2. Calcular Patrimônio Inicial Investido (dia anterior ao início do período)
    let patrimonioInicialInvestido = 0;
    if (periodStart) {
        const dayBeforeStart = subDays(periodStart, 1);
        patrimonioInicialInvestido = calculateTotalInvestmentBalanceAtDate(dayBeforeStart);
    }
    
    // 3. Calcular Rentabilidade Média (simplificada: Rendimentos / Saldo Inicial)
    let rentabilidadeMedia = 0;
    if (patrimonioInicialInvestido > 0) {
        rentabilidadeMedia = (totalRendimentosPeriodo1 / patrimonioInicialInvestido) * 100;
    } else if (patrimonioInvestimentos > 0 && totalRendimentosPeriodo1 > 0) {
        // Fallback: Se o saldo inicial for zero, mas houver rendimentos e saldo final, usa o saldo final como proxy.
        rentabilidadeMedia = (totalRendimentosPeriodo1 / patrimonioInvestimentos) * 100;
    }
    
    // Nota: getTotalReceitas e getTotalDespesas não são period-aware por padrão, mas são usados aqui
    // para métricas mensais. Se o PeriodSelector for usado para filtrar o mês, eles devem ser ajustados.
    const receitasMes = getTotalReceitas();
    const despesasMes = getTotalDespesas();
    const variacaoMensal = receitasMes > 0 ? ((receitasMes - despesasMes) / receitasMes) * 100 : 0;
    
    return {
      patrimonioTotal,
      totalRF,
      totalCripto,
      totalStables,
      totalObjetivos,
      valorVeiculos,
      exposicaoCripto,
      rentabilidadeMedia,
      variacaoMensal,
      patrimonioInvestimentos,
    };
  }, [contasMovimento, transacoesV2, rfAccounts, cryptoAccounts, stablecoinAccounts, objetivosAccounts, calculateAccountBalance, getValorFipeTotal, getTotalReceitas, getTotalDespesas, dateRanges.range1.to, dateRanges.range1.from, transacoesPeriodo1, calculateTotalInvestmentBalanceAtDate]);

  const distribuicaoCarteira = useMemo(() => [
    { name: "Renda Fixa", value: calculosPatrimonio.totalRF },
    { name: "Criptomoedas", value: calculosPatrimonio.totalCripto },
    { name: "Stablecoins", value: calculosPatrimonio.totalStables },
    { name: "Objetivos", value: calculosPatrimonio.totalObjetivos },
  ], [calculosPatrimonio]);

  const handleAddRendimento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRendimento.data || !formRendimento.valor || !showAddRendimento) return;
    
    // Simular a adição de rendimento como uma transação de 'rendimento' na conta de investimento
    const accountId = showAddRendimento;
    const parsedAmount = Number(formRendimento.valor);

    const transaction: TransacaoCompleta = {
      id: `tx_${Date.now()}`,
      date: formRendimento.data,
      accountId,
      flow: 'in',
      operationType: 'rendimento',
      domain: 'investment',
      amount: parsedAmount,
      categoryId: categoriasV2.find(c => c.label === 'Rendimentos sobre Investimentos')?.id || null,
      description: formRendimento.descricao || "Rendimento de Aplicação",
      links: {
        investmentId: accountId,
        loanId: null,
        transferGroupId: null,
        parcelaId: null,
        vehicleTransactionId: null,
      },
      conciliated: false,
      attachments: [],
      meta: {
        createdBy: 'user',
        source: 'manual',
        createdAt: new Date().toISOString(),
      }
    };
    
    // Adicionar transação (o contexto se encarrega de atualizar o saldo)
    addTransacaoV2(transaction);
    
    setFormRendimento({ data: new Date().toISOString().split('T')[0], valor: "", descricao: "" });
    setShowAddRendimento(null);
    toast.success("Rendimento registrado!");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <header className="glass-card md-elevated p-4 md:p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between animate-fade-in">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">
              Investimentos & Patrimônio
            </h1>
            <p className="text-xs md:text-base text-muted-foreground mt-1">
              Visão consolidada da sua carteira de ativos
            </p>
          </div>
          <PeriodSelector
            initialRanges={dateRanges}
            onDateRangeChange={handlePeriodChange}
          />
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card stat-card-positive animate-fade-in-up">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Patrimônio Total</p>
                  <p className="text-2xl font-bold text-success mt-1">
                    {formatCurrency(calculosPatrimonio.patrimonioTotal)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-success/10 text-success">
                  <CircleDollarSign className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card stat-card-neutral animate-fade-in-up" style={{ animationDelay: "50ms" }}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Investido</p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {formatCurrency(calculosPatrimonio.patrimonioInvestimentos)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Landmark className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card stat-card-positive animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Rentabilidade Média</p>
                  <p className="text-2xl font-bold text-success mt-1">
                    {calculosPatrimonio.rentabilidadeMedia.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-success/10 text-success">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card stat-card-warning animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Exposição Cripto</p>
                  <p className="text-2xl font-bold text-warning mt-1">
                    {calculosPatrimonio.exposicaoCripto.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-warning/10 text-warning">
                  <Bitcoin className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/40 rounded-full h-auto flex flex-wrap gap-1 p-1.5">
            <TabsTrigger
              value="carteira"
              className="flex-1 min-w-[48%] sm:min-w-0 sm:flex-none text-xs sm:text-sm h-9 sm:h-10 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Carteira Geral
            </TabsTrigger>
            <TabsTrigger
              value="rf"
              className="flex-1 min-w-[48%] sm:min-w-0 sm:flex-none text-xs sm:text-sm h-9 sm:h-10 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Renda Fixa
            </TabsTrigger>
            <TabsTrigger
              value="cripto"
              className="flex-1 min-w-[48%] sm:min-w-0 sm:flex-none text-xs sm:text-sm h-9 sm:h-10 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Criptoativos
            </TabsTrigger>
            <TabsTrigger
              value="objetivos"
              className="flex-1 min-w-[48%] sm:min-w-0 sm:flex-none text-xs sm:text-sm h-9 sm:h-10 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Reserva
            </TabsTrigger>
          </TabsList>

          {/* Tab Carteira Geral */}
          <TabsContent value="carteira" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Distribuição */}
              <Card className="lg:col-span-1 glass-card">
                <CardHeader>
                  <CardTitle>Distribuição da Carteira</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distribuicaoCarteira.filter(d => d.value > 0)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          label={CustomPieLabel} // Use CustomPieLabel for better positioning
                          labelLine
                        >
                          {distribuicaoCarteira.filter(d => d.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatCurrency(value), "Valor"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Evolução */}
              <Card className="lg:col-span-2 glass-card">
                <CardHeader>
                  <CardTitle>Evolução Patrimonial (Últimos 12 meses)</CardTitle>
                </CardHeader>
                <CardContent>
                  <InvestmentEvolutionChart />
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Ativos */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Ativos por Conta</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conta</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Saldo Atual</TableHead>
                      <TableHead className="text-right">Rentabilidade (Mês)</TableHead>
                      <TableHead className="w-32">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investmentAccounts.map((account) => {
                      const saldo = calculateAccountBalance(account.id, dateRanges.range1.to);
                      const isPositive = saldo >= 0;
                      
                      return (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{account.accountType}</Badge>
                          </TableCell>
                          <TableCell className={cn("text-right font-semibold", isPositive ? "text-success" : "text-destructive")}>
                            {formatCurrency(saldo)}
                          </TableCell>
                          <TableCell className="text-right text-success">
                            +0.5%
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-2"
                                onClick={() => setShowAddRendimento(account.id)}
                              >
                                <DollarSign className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <History className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Renda Fixa */}
          <TabsContent value="rf" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-primary" />
                  Renda Fixa & Poupança
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conta</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead className="text-right">Rentabilidade (Mês)</TableHead>
                      <TableHead className="w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rfAccounts.map((account) => {
                      const saldo = calculateAccountBalance(account.id, dateRanges.range1.to);
                      return (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{account.accountType === 'poupanca' ? 'Poupança' : 'Renda Fixa'}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-success">
                            {formatCurrency(saldo)}
                          </TableCell>
                          <TableCell className="text-right text-success">
                            +0.5%
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 px-2"
                              onClick={() => setShowAddRendimento(account.id)}
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Criptoativos */}
          <TabsContent value="cripto" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bitcoin className="w-5 h-5 text-warning" />
                  Criptoativos & Stablecoins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conta</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead className="text-right">Variação (24h)</TableHead>
                      <TableHead className="w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cryptoAccounts.map((account) => {
                      const saldo = calculateAccountBalance(account.id, dateRanges.range1.to);
                      return (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">Cripto</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-warning">
                            {formatCurrency(saldo)}
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            -2.5%
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 px-2"
                              onClick={() => setShowAddRendimento(account.id)}
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {stablecoinAccounts.map((account) => {
                      const saldo = calculateAccountBalance(account.id, dateRanges.range1.to);
                      return (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-success text-success">Stablecoin</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-success">
                            {formatCurrency(saldo)}
                          </TableCell>
                          <TableCell className="text-right text-success">
                            +0.0%
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 px-2"
                              onClick={() => setShowAddRendimento(account.id)}
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Objetivos */}
          <TabsContent value="objetivos" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-accent" />
                  Reserva de Emergência & Objetivos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conta</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Saldo Atual</TableHead>
                      <TableHead className="text-right">Meta</TableHead>
                      <TableHead className="text-right">Progresso</TableHead>
                      <TableHead className="w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {objetivosAccounts.map((account) => {
                      const saldo = calculateAccountBalance(account.id, dateRanges.range1.to);
                      const meta = 10000; // Placeholder
                      const progresso = (saldo / meta) * 100;
                      
                      return (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{account.accountType === 'reserva' ? 'Reserva' : 'Objetivo'}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-success">
                            {formatCurrency(saldo)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(meta)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className={cn(progresso >= 100 && "border-success text-success")}>
                              {Math.min(100, progresso).toFixed(0)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 px-2"
                              onClick={() => setShowAddRendimento(account.id)}
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Adicionar Rendimento */}
      <Dialog open={!!showAddRendimento} onOpenChange={() => setShowAddRendimento(null)}>
        <DialogContent className="max-w-[min(95vw,28rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-success" />
              Registrar Rendimento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRendimento} className="space-y-4">
            <div className="space-y-2">
              <Label>Conta</Label>
              <Input 
                value={contasMovimento.find(c => c.id === showAddRendimento)?.name || ''} 
                disabled 
                className="bg-muted"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data">Data *</Label>
                <Input
                  id="data"
                  type="date"
                  value={formRendimento.data}
                  onChange={(e) => setFormRendimento(prev => ({ ...prev, data: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor">Valor (R$) *</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formRendimento.valor}
                  onChange={(e) => setFormRendimento(prev => ({ ...prev, valor: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (Opcional)</Label>
              <Input
                id="descricao"
                placeholder="Ex: Juros recebidos"
                value={formRendimento.descricao}
                onChange={(e) => setFormRendimento(prev => ({ ...prev, descricao: e.target.value }))}
              />
            </div>
            <Button type="submit" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Registrar Rendimento
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Investimentos;