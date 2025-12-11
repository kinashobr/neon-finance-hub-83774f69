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
import { cn } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext";
import { EditableCell } from "@/components/EditableCell";
import { useToast } from "@/hooks/use-toast";
import { PeriodSelector, DateRange } from "@/components/dashboard/PeriodSelector";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

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
  const { toast } = useToast();
  const { 
    investimentosRF, 
    addInvestimentoRF, 
    updateInvestimentoRF, 
    deleteInvestimentoRF, 
    criptomoedas, 
    addCriptomoeda, 
    updateCriptomoeda, 
    deleteCriptomoeda, 
    stablecoins, 
    addStablecoin, 
    updateStablecoin, 
    deleteStablecoin, 
    objetivos, 
    addObjetivo, 
    updateObjetivo, 
    deleteObjetivo, 
    movimentacoesInvestimento, 
    addMovimentacaoInvestimento,
    deleteMovimentacaoInvestimento,
    getValorFipeTotal,
    getTotalReceitas,
    getTotalDespesas,
    contasMovimento,
    transacoesV2,
  } = useFinance();
  
  const [activeTab, setActiveTab] = useState("carteira");
  
  // Inicializa o range para o mês atual
  const now = new Date();
  const initialRange: DateRange = { from: startOfMonth(now), to: endOfMonth(now) };
  const [dateRange, setDateRange] = useState<DateRange>(initialRange);

  // Dialogs
  const [showAddRendimento, setShowAddRendimento] = useState<number | null>(null);

  // Forms
  const [formRendimento, setFormRendimento] = useState({
    data: "",
    valor: "",
    descricao: ""
  });

  const handlePeriodChange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, []);

  // Helper para calcular saldo atual de uma conta (sem filtro de data)
  const calculateBalanceUpToDate = useCallback((accountId: string, allTransactions: typeof transacoesV2, accounts: typeof contasMovimento): number => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;

    let balance = account.startDate ? 0 : account.initialBalance; 
    
    const transactionsBeforeDate = allTransactions
        .filter(t => t.accountId === accountId)
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    transactionsBeforeDate.forEach(t => {
        const isCreditCard = account.accountType === 'cartao_credito';
        
        if (isCreditCard) {
          if (t.operationType === 'despesa') {
            balance -= t.amount;
          } else if (t.operationType === 'transferencia') {
            balance += t.amount;
          }
        } else {
          if (t.flow === 'in' || t.flow === 'transfer_in' || t.operationType === 'initial_balance') {
            balance += t.amount;
          } else {
            balance -= t.amount;
          }
        }
    });

    return balance;
  }, [contasMovimento, transacoesV2]);

  // Separate accounts by type for tab filtering
  const investmentAccounts = useMemo(() => {
    return contasMovimento.filter(c => 
      c.accountType === 'aplicacao_renda_fixa' || 
      c.accountType === 'poupanca' ||
      c.accountType === 'criptoativos' ||
      c.accountType === 'reserva_emergencia' ||
      c.accountType === 'objetivos_financeiros'
    );
  }, [contasMovimento]);

  const rfAccounts = useMemo(() => {
    return investmentAccounts.filter(c => 
      c.accountType === 'aplicacao_renda_fixa' || c.accountType === 'poupanca'
    );
  }, [investmentAccounts]);

  const cryptoAccounts = useMemo(() => {
    return investmentAccounts.filter(c => 
      c.accountType === 'criptoativos' && !isStablecoin(c.name)
    );
  }, [investmentAccounts]);

  const stablecoinAccounts = useMemo(() => {
    return investmentAccounts.filter(c => 
      c.accountType === 'criptoativos' && isStablecoin(c.name)
    );
  }, [investmentAccounts]);

  const objetivosAccounts = useMemo(() => {
    return investmentAccounts.filter(c => 
      c.accountType === 'objetivos_financeiros' || c.accountType === 'reserva_emergencia'
    );
  }, [investmentAccounts]);

  // Cálculos padronizados
  const calculosPatrimonio = useMemo(() => {
    // Totais legados
    const totalRF_legado = investimentosRF.reduce((acc, i) => acc + i.valor, 0);
    const totalCripto_legado = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0);
    const totalStables_legado = stablecoins.reduce((acc, s) => acc + s.valorBRL, 0);
    const totalObjetivos_legado = objetivos.reduce((acc, o) => acc + o.atual, 0);
    
    // Totais das Contas Movimento (V2)
    const totalRF_contas = rfAccounts.reduce((acc, c) => acc + calculateBalanceUpToDate(c.id, transacoesV2, contasMovimento), 0);
    const totalCripto_contas = cryptoAccounts.reduce((acc, c) => acc + calculateBalanceUpToDate(c.id, transacoesV2, contasMovimento), 0);
    const totalStables_contas = stablecoinAccounts.reduce((acc, c) => acc + calculateBalanceUpToDate(c.id, transacoesV2, contasMovimento), 0);
    const totalObjetivos_contas = objetivosAccounts.reduce((acc, c) => acc + calculateBalanceUpToDate(c.id, transacoesV2, contasMovimento), 0);

    // Totais Consolidados
    const totalRF = totalRF_legado + totalRF_contas;
    const totalCripto = totalCripto_legado + totalCripto_contas;
    const totalStables = totalStables_legado + totalStables_contas;
    const totalObjetivos = totalObjetivos_legado + totalObjetivos_contas;

    const valorVeiculos = getValorFipeTotal();
    
    const patrimonioInvestimentos = totalRF + totalCripto + totalStables + totalObjetivos;
    const patrimonioTotal = patrimonioInvestimentos + valorVeiculos;
    
    const reservaEmergencia = objetivos.find(o => 
      o.nome.toLowerCase().includes("reserva") || 
      o.nome.toLowerCase().includes("emergência")
    );
    
    const exposicaoCripto = patrimonioInvestimentos > 0 ? (totalCripto / patrimonioInvestimentos) * 100 : 0;
    
    const rentabilidadeRF = investimentosRF.length > 0 && totalRF > 0
      ? investimentosRF.reduce((acc, i) => acc + (i.rentabilidade * i.valor), 0) / totalRF 
      : 0;
    
    const rentabilidadeMedia = patrimonioInvestimentos > 0 
      ? ((rentabilidadeRF * totalRF) + (totalObjetivos * 10)) / patrimonioInvestimentos 
      : 0;
    
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
      reservaEmergencia,
      exposicaoCripto,
      rentabilidadeMedia,
      variacaoMensal,
      patrimonioInvestimentos,
      // Totais por fonte (para uso nas tabelas)
      totalRF_legado,
      totalRF_contas,
      totalCripto_legado,
      totalCripto_contas,
      totalStables_legado,
      totalStables_contas,
      totalObjetivos_legado,
      totalObjetivos_contas,
    };
  }, [investimentosRF, criptomoedas, stablecoins, objetivos, getValorFipeTotal, getTotalReceitas, getTotalDespesas, contasMovimento, transacoesV2, rfAccounts, cryptoAccounts, stablecoinAccounts, objetivosAccounts, calculateBalanceUpToDate]);

  const distribuicaoCarteira = useMemo(() => [
    { name: "Renda Fixa", value: calculosPatrimonio.totalRF },
    { name: "Criptomoedas", value: calculosPatrimonio.totalCripto },
    { name: "Stablecoins", value: calculosPatrimonio.totalStables },
    { name: "Objetivos", value: calculosPatrimonio.totalObjetivos },
  ], [calculosPatrimonio]);

  const handleAddRendimento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRendimento.data || !formRendimento.valor || !showAddRendimento) return;
    
    addMovimentacaoInvestimento({
      data: formRendimento.data,
      tipo: "Rendimento",
      categoria: "Renda Fixa",
      ativo: showAddRendimento.toString(),
      descricao: formRendimento.descricao || "Rendimento mensal",
      valor: Number(formRendimento.valor),
    });
    
    // Update investment value
    const inv = investimentosRF.find(i => i.id === showAddRendimento);
    if (inv) {
      updateInvestimentoRF(showAddRendimento, { 
        valor: inv.valor + Number(formRendimento.valor) 
      });
    }
    
    setFormRendimento({ data: "", valor: "", descricao: "" });
    setShowAddRendimento(null);
    toast({ title: "Rendimento registrado!" });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Investimentos & Patrimônio</h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe, organize e fortaleça sua riqueza de forma inteligente.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PeriodSelector 
              initialRange={initialRange}
              onDateRangeChange={handlePeriodChange} 
            />
          </div>
        </div>

        {/* Patrimônio Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Patrimônio Total</span>
              </div>
              <p className="text-xl font-bold">{formatCurrency(calculosPatrimonio.patrimonioTotal)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Landmark className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">Renda Fixa</span>
              </div>
              <p className="text-xl font-bold text-success">{formatCurrency(calculosPatrimonio.totalRF)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bitcoin className="w-4 h-4 text-warning" />
                <span className="text-xs text-muted-foreground">Criptomoedas</span>
              </div>
              <p className="text-xl font-bold text-warning">{formatCurrency(calculosPatrimonio.totalCripto)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-info" />
                <span className="text-xs text-muted-foreground">Stablecoins</span>
              </div>
              <p className="text-xl font-bold text-info">{formatCurrency(calculosPatrimonio.totalStables)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Objetivos</span>
              </div>
              <p className="text-xl font-bold">{formatCurrency(calculosPatrimonio.totalObjetivos)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">Rentabilidade</span>
              </div>
              <p className="text-xl font-bold text-success">{calculosPatrimonio.rentabilidadeMedia.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="carteira">Carteira Geral</TabsTrigger>
            <TabsTrigger value="renda-fixa">Renda Fixa</TabsTrigger>
            <TabsTrigger value="cripto">Criptomoedas</TabsTrigger>
            <TabsTrigger value="stablecoins">Stablecoins</TabsTrigger>
            <TabsTrigger value="objetivos">Objetivos</TabsTrigger>
          </TabsList>

          {/* Carteira Geral */}
          <TabsContent value="carteira" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Distribuição */}
              <Card className="glass-card lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição da Carteira</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distribuicaoCarteira.filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {distribuicaoCarteira.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-4">
                    {distribuicaoCarteira.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pieColors[index] }} />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Consolidado */}
              <Card className="glass-card lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Carteira Consolidada</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="text-right">Rentab.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="flex items-center gap-2">
                          <Landmark className="w-4 h-4 text-success" />
                          Renda Fixa
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(calculosPatrimonio.totalRF)}</TableCell>
                        <TableCell className="text-right">
                          {calculosPatrimonio.patrimonioInvestimentos > 0 
                            ? ((calculosPatrimonio.totalRF / calculosPatrimonio.patrimonioInvestimentos) * 100).toFixed(1) 
                            : 0}%
                        </TableCell>
                        <TableCell className="text-right text-success">
                          {investimentosRF.length > 0 
                            ? (investimentosRF.reduce((acc, i) => acc + i.rentabilidade, 0) / investimentosRF.length).toFixed(1)
                            : 0}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="flex items-center gap-2">
                          <Bitcoin className="w-4 h-4 text-warning" />
                          Criptomoedas
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(calculosPatrimonio.totalCripto)}</TableCell>
                        <TableCell className="text-right">
                          {calculosPatrimonio.patrimonioInvestimentos > 0 
                            ? ((calculosPatrimonio.totalCripto / calculosPatrimonio.patrimonioInvestimentos) * 100).toFixed(1) 
                            : 0}%
                        </TableCell>
                        <TableCell className="text-right text-warning">-</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-info" />
                          Stablecoins
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(calculosPatrimonio.totalStables)}</TableCell>
                        <TableCell className="text-right">
                          {calculosPatrimonio.patrimonioInvestimentos > 0 
                            ? ((calculosPatrimonio.totalStables / calculosPatrimonio.patrimonioInvestimentos) * 100).toFixed(1) 
                            : 0}%
                        </TableCell>
                        <TableCell className="text-right">0%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-primary" />
                          Objetivos
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(calculosPatrimonio.totalObjetivos)}</TableCell>
                        <TableCell className="text-right">
                          {calculosPatrimonio.patrimonioInvestimentos > 0 
                            ? ((calculosPatrimonio.totalObjetivos / calculosPatrimonio.patrimonioInvestimentos) * 100).toFixed(1) 
                            : 0}%
                        </TableCell>
                        <TableCell className="text-right text-success">
                          {objetivos.length > 0 
                            ? (objetivos.reduce((acc, o) => acc + o.rentabilidade, 0) / objetivos.length).toFixed(1)
                            : 0}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Renda Fixa */}
          <TabsContent value="renda-fixa" className="space-y-6">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Aplicações em Renda Fixa</CardTitle>
                <Badge variant="outline">{investimentosRF.length + rfAccounts.length} aplicações</Badge>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aplicação</TableHead>
                      <TableHead>Instituição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Rentab.</TableHead>
                      <TableHead className="text-right">Vencimento</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Contas Movimento RF */}
                    {rfAccounts.map((acc) => {
                      const valorAtual = calculateBalanceUpToDate(acc.id, transacoesV2, contasMovimento);
                      
                      return (
                        <TableRow key={acc.id} className="bg-primary/5">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Coins className="w-4 h-4 text-primary" />
                              <span className="font-medium">{acc.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{acc.institution || 'Conta Movimento'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{acc.accountType === 'poupanca' ? 'Poupança' : 'Renda Fixa'}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(valorAtual)}
                          </TableCell>
                          <TableCell className="text-right text-success">
                            {acc.accountType === 'poupanca' ? '0.5%' : '—'}
                          </TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell>
                            <Badge variant="secondary">Conta</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* Investimentos RF Legados */}
                    {investimentosRF.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <EditableCell
                            value={inv.aplicacao}
                            onSave={(v) => updateInvestimentoRF(inv.id, { aplicacao: String(v) })}
                          />
                        </TableCell>
                        <TableCell>{inv.instituicao}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{inv.tipo}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <EditableCell
                            value={inv.valor}
                            type="currency"
                            onSave={(v) => updateInvestimentoRF(inv.id, { valor: Number(v) })}
                          />
                        </TableCell>
                        <TableCell className="text-right text-success">
                          {inv.rentabilidade.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">{inv.vencimento}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowAddRendimento(inv.id)}
                              className="h-8 px-2 hover:bg-success/10 hover:text-success"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Rendimento
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteInvestimentoRF(inv.id)}
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {investimentosRF.length === 0 && rfAccounts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhuma aplicação em renda fixa. Adicione via "Movimentar Conta" em Receitas & Despesas.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Criptomoedas */}
          <TabsContent value="cripto" className="space-y-6">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Carteira de Criptomoedas</CardTitle>
                <Badge variant="outline">{criptomoedas.length + cryptoAccounts.length} ativos</Badge>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ativo</TableHead>
                      <TableHead>Símbolo</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Valor BRL</TableHead>
                      <TableHead className="text-right">Variação</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Contas Movimento Cripto */}
                    {cryptoAccounts.map((acc) => {
                      const valorAtual = calculateBalanceUpToDate(acc.id, transacoesV2, contasMovimento);
                      
                      return (
                        <TableRow key={acc.id} className="bg-primary/5">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Bitcoin className="w-4 h-4 text-warning" />
                              <span className="font-medium">{acc.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">BTC/ETH/Outro</Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            —
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(valorAtual)}
                          </TableCell>
                          <TableCell className="text-right text-warning">
                            —
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">Conta</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* Criptomoedas Legadas */}
                    {criptomoedas.map((cripto) => (
                      <TableRow key={cripto.id}>
                        <TableCell className="flex items-center gap-2">
                          <Bitcoin className="w-4 h-4 text-warning" />
                          <EditableCell
                            value={cripto.nome}
                            onSave={(v) => updateCriptomoeda(cripto.id, { nome: String(v) })}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{cripto.simbolo}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <EditableCell
                            value={cripto.quantidade}
                            type="number"
                            onSave={(v) => updateCriptomoeda(cripto.id, { quantidade: Number(v) })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <EditableCell
                            value={cripto.valorBRL}
                            type="currency"
                            onSave={(v) => updateCriptomoeda(cripto.id, { valorBRL: Number(v) })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-medium",
                            cripto.percentual >= 0 ? "text-success" : "text-destructive"
                          )}>
                            {cripto.percentual >= 0 ? "+" : ""}{cripto.percentual.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCriptomoeda(cripto.id)}
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {criptomoedas.length === 0 && cryptoAccounts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhuma criptomoeda. Adicione via "Movimentar Conta" em Receitas & Despesas.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stablecoins */}
          <TabsContent value="stablecoins" className="space-y-6">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Carteira de Stablecoins</CardTitle>
                <Badge variant="outline">{stablecoins.length + stablecoinAccounts.length} ativos</Badge>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ativo</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Valor BRL</TableHead>
                      <TableHead className="text-right">Cotação</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Contas Movimento Stablecoins */}
                    {stablecoinAccounts.map((acc) => {
                      const valorAtual = calculateBalanceUpToDate(acc.id, transacoesV2, contasMovimento);
                      
                      return (
                        <TableRow key={acc.id} className="bg-primary/5">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-info" />
                              <span className="font-medium">{acc.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            —
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(valorAtual)}
                          </TableCell>
                          <TableCell className="text-right">
                            R$ 1.00
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">Conta</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* Stablecoins Legadas */}
                    {stablecoins.map((stable) => (
                      <TableRow key={stable.id}>
                        <TableCell className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-info" />
                          <EditableCell
                            value={stable.nome}
                            onSave={(v) => updateStablecoin(stable.id, { nome: String(v) })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <EditableCell
                            value={stable.quantidade}
                            type="number"
                            onSave={(v) => updateStablecoin(stable.id, { quantidade: Number(v) })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <EditableCell
                            value={stable.valorBRL}
                            type="currency"
                            onSave={(v) => updateStablecoin(stable.id, { valorBRL: Number(v) })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {stable.cotacao.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteStablecoin(stable.id)}
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {stablecoins.length === 0 && stablecoinAccounts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma stablecoin. Adicione via "Movimentar Conta" em Receitas & Despesas.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Objetivos */}
          <TabsContent value="objetivos" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Contas Movimento Objetivos */}
              {objetivosAccounts.map((acc) => {
                const valorAtual = calculateBalanceUpToDate(acc.id, transacoesV2, contasMovimento);
                
                return (
                  <Card key={acc.id} className="glass-card bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-primary" />
                          <span className="font-medium">{acc.name}</span>
                        </div>
                        <Badge variant="secondary">Conta</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Atual</span>
                          <span className="font-bold">{formatCurrency(valorAtual)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Meta</span>
                          <span className="text-muted-foreground">—</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all"
                            style={{ 
                              width: `100%`,
                              backgroundColor: 'hsl(var(--primary))'
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progresso: {formatCurrency(valorAtual)}</span>
                          <span className="text-success">—</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Objetivos Legados */}
              {objetivos.map((obj) => {
                const progresso = obj.meta > 0 ? (obj.atual / obj.meta) * 100 : 0;
                return (
                  <Card key={obj.id} className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: obj.cor }}
                          />
                          <EditableCell
                            value={obj.nome}
                            onSave={(v) => updateObjetivo(obj.id, { nome: String(v) })}
                            className="font-medium"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteObjetivo(obj.id)}
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Atual</span>
                          <EditableCell
                            value={obj.atual}
                            type="currency"
                            onSave={(v) => updateObjetivo(obj.id, { atual: Number(v) })}
                            className="font-medium"
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Meta</span>
                          <EditableCell
                            value={obj.meta}
                            type="currency"
                            onSave={(v) => updateObjetivo(obj.id, { meta: Number(v) })}
                          />
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all"
                            style={{ 
                              width: `${Math.min(progresso, 100)}%`,
                              backgroundColor: obj.cor
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{progresso.toFixed(0)}% concluído</span>
                          <span className="text-success">{obj.rentabilidade.toFixed(1)}% a.a.</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {objetivos.length === 0 && objetivosAccounts.length === 0 && (
                <Card className="glass-card col-span-full">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Nenhum objetivo financeiro. Adicione via "Movimentar Conta" em Receitas & Despesas.
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog Adicionar Rendimento */}
        <Dialog open={!!showAddRendimento} onOpenChange={() => setShowAddRendimento(null)}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Adicionar Rendimento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddRendimento} className="space-y-4">
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formRendimento.data}
                  onChange={(e) => setFormRendimento(prev => ({ ...prev, data: e.target.value }))}
                  className="mt-1 bg-muted border-border"
                />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formRendimento.valor}
                  onChange={(e) => setFormRendimento(prev => ({ ...prev, valor: e.target.value }))}
                  placeholder="0,00"
                  className="mt-1 bg-muted border-border"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input
                  value={formRendimento.descricao}
                  onChange={(e) => setFormRendimento(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Rendimento mensal"
                  className="mt-1 bg-muted border-border"
                />
              </div>
              <Button type="submit" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Registrar Rendimento
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Investimentos;