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
import { PeriodSelector, PeriodRange, periodToDateRange } from "@/components/dashboard/PeriodSelector";

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
  } = useFinance();
  
  const [activeTab, setActiveTab] = useState("carteira");
  const [periodRange, setPeriodRange] = useState<PeriodRange>({
    startMonth: null,
    startYear: null,
    endMonth: null,
    endYear: null,
  });

  // Dialogs
  const [showAddRendimento, setShowAddRendimento] = useState<number | null>(null);

  // Forms
  const [formRendimento, setFormRendimento] = useState({
    data: "",
    valor: "",
    descricao: ""
  });

  const handlePeriodChange = useCallback((period: PeriodRange) => {
    setPeriodRange(period);
  }, []);

  const dateRange = useMemo(() => periodToDateRange(periodRange), [periodRange]);

  // Get investment accounts from ReceitasDespesas
  const investmentAccounts = useMemo(() => {
    return contasMovimento.filter(c => 
      c.accountType === 'aplicacao_renda_fixa' || 
      c.accountType === 'poupanca' ||
      c.accountType === 'criptoativos' ||
      c.accountType === 'reserva_emergencia' ||
      c.accountType === 'objetivos_financeiros'
    );
  }, [contasMovimento]);

  // Separate crypto accounts into regular crypto and stablecoins
  const cryptoAccounts = useMemo(() => {
    return contasMovimento.filter(c => 
      c.accountType === 'criptoativos' && !isStablecoin(c.name)
    );
  }, [contasMovimento]);

  const stablecoinAccounts = useMemo(() => {
    return contasMovimento.filter(c => 
      c.accountType === 'criptoativos' && isStablecoin(c.name)
    );
  }, [contasMovimento]);

  // RF accounts (aplicacao_renda_fixa + poupanca)
  const rfAccounts = useMemo(() => {
    return contasMovimento.filter(c => 
      c.accountType === 'aplicacao_renda_fixa' || c.accountType === 'poupanca'
    );
  }, [contasMovimento]);

  // Objetivos accounts (objetivos_financeiros + reserva_emergencia)
  const objetivosAccounts = useMemo(() => {
    return contasMovimento.filter(c => 
      c.accountType === 'objetivos_financeiros' || c.accountType === 'reserva_emergencia'
    );
  }, [contasMovimento]);

  // Cálculos padronizados
  const calculosPatrimonio = useMemo(() => {
    const totalRF = investimentosRF.reduce((acc, i) => acc + i.valor, 0);
    const totalCripto = criptomoedas.reduce((acc, c) => acc + c.valorBRL, 0);
    const totalStables = stablecoins.reduce((acc, s) => acc + s.valorBRL, 0);
    const totalObjetivos = objetivos.reduce((acc, o) => acc + o.atual, 0);
    const valorVeiculos = getValorFipeTotal();
    
    const patrimonioTotal = totalRF + totalCripto + totalStables + totalObjetivos + valorVeiculos;
    
    const reservaEmergencia = objetivos.find(o => 
      o.nome.toLowerCase().includes("reserva") || 
      o.nome.toLowerCase().includes("emergência")
    );
    
    const patrimonioInvestimentos = totalRF + totalCripto + totalStables + totalObjetivos;
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
      patrimonioInvestimentos
    };
  }, [investimentosRF, criptomoedas, stablecoins, objetivos, getValorFipeTotal, getTotalReceitas, getTotalDespesas]);

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
              onPeriodChange={handlePeriodChange} 
              tabId="investimentos" 
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
                <Badge variant="outline">{investimentosRF.length} aplicações</Badge>
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
                    {investimentosRF.length === 0 && (
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
                <Badge variant="outline">{criptomoedas.length} ativos</Badge>
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
                    {criptomoedas.length === 0 && (
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
                <Badge variant="outline">{stablecoins.length} ativos</Badge>
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
                    {stablecoins.length === 0 && (
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
              {objetivos.length === 0 && (
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
