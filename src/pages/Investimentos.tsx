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
import { PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2, Search, TrendingUp, Wallet, Target, Shield, Bitcoin, DollarSign, ArrowUpRight, ArrowDownRight, Settings, Coins, LineChartIcon, BarChart3, CircleDollarSign, Landmark, RefreshCw } from "lucide-react";
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
    updateMovimentacaoInvestimento, 
    deleteMovimentacaoInvestimento,
    getValorFipeTotal,
    getTotalReceitas,
    getTotalDespesas
  } = useFinance();
  
  const [filterInstituicao, setFilterInstituicao] = useState("all");
  const [filterTipoRF, setFilterTipoRF] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipoMov, setFilterTipoMov] = useState("all");
  const [filterCategoriaMov, setFilterCategoriaMov] = useState("all");
  const [periodRange, setPeriodRange] = useState<PeriodRange>({
    startMonth: null,
    startYear: null,
    endMonth: null,
    endYear: null,
  });

  // Dialogs
  const [showAddRF, setShowAddRF] = useState(false);
  const [showAddCripto, setShowAddCripto] = useState(false);
  const [showAddStable, setShowAddStable] = useState(false);
  const [showAddObjetivo, setShowAddObjetivo] = useState(false);
  const [showAddMov, setShowAddMov] = useState(false);

  // Forms
  const [formRF, setFormRF] = useState({
    aplicacao: "",
    instituicao: "",
    tipo: "CDB",
    valor: "",
    dataAplicacao: "",
  });

  const [formCripto, setFormCripto] = useState({
    nome: "",
    simbolo: "",
    quantidade: "",
    valorBRL: ""
  });

  const [formStable, setFormStable] = useState({
    nome: "",
    quantidade: "",
    valorBRL: "",
    cotacao: "5.0"
  });

  const [formObjetivo, setFormObjetivo] = useState({
    nome: "",
    atual: "",
    meta: "",
    rentabilidade: "",
    cor: "hsl(142, 76%, 36%)"
  });

  const [formMov, setFormMov] = useState({
    data: "",
    tipo: "Aporte",
    categoria: "Renda Fixa",
    ativo: "",
    descricao: "",
    valor: ""
  });

  const handlePeriodChange = useCallback((period: PeriodRange) => {
    setPeriodRange(period);
  }, []);

  // Converte PeriodRange para DateRange
  const dateRange = useMemo(() => periodToDateRange(periodRange), [periodRange]);

  // Filter investments by date range
  const filteredInvestimentosRF = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return investimentosRF;
    
    return investimentosRF;
  }, [investimentosRF, dateRange]);

  const filteredCriptomoedas = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return criptomoedas;
    
    return criptomoedas;
  }, [criptomoedas, dateRange]);

  const filteredStablecoins = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return stablecoins;
    
    return stablecoins;
  }, [stablecoins, dateRange]);

  const filteredObjetivos = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return objetivos;
    
    return objetivos;
  }, [objetivos, dateRange]);

  const filteredMovimentacoes = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return movimentacoesInvestimento;
    
    return movimentacoesInvestimento.filter(mov => {
      const movDate = new Date(mov.data);
      return movDate >= dateRange.from! && movDate <= dateRange.to!;
    });
  }, [movimentacoesInvestimento, dateRange]);

  // Cálculos padronizados e reais
  const calculosPatrimonio = useMemo(() => {
    // Valores reais dos investimentos
    const totalRF = filteredInvestimentosRF.reduce((acc, i) => acc + i.valor, 0);
    const totalCripto = filteredCriptomoedas.reduce((acc, c) => acc + c.valorBRL, 0);
    const totalStables = filteredStablecoins.reduce((acc, s) => acc + s.valorBRL, 0);
    const totalObjetivos = filteredObjetivos.reduce((acc, o) => acc + o.atual, 0);
    const valorVeiculos = getValorFipeTotal();
    
    // Patrimônio Total: RF + Cripto + Stables + Objetivos + Veículos (FIPE)
    const patrimonioTotal = totalRF + totalCripto + totalStables + totalObjetivos + valorVeiculos;
    
    // Reserva de Emergência - busca objetivo específico
    const reservaEmergencia = filteredObjetivos.find(o => 
      o.nome.toLowerCase().includes("reserva") || 
      o.nome.toLowerCase().includes("emergência") ||
      o.nome.toLowerCase().includes("reserva de emergencia")
    );
    
    // Exposição em Cripto
    const patrimonioInvestimentos = totalRF + totalCripto + totalStables + totalObjetivos;
    const exposicaoCripto = patrimonioInvestimentos > 0 ? (totalCripto / patrimonioInvestimentos) * 100 : 0;
    
    // Rentabilidade média ponderada
    const rentabilidadeRF = filteredInvestimentosRF.length > 0 
      ? filteredInvestimentosRF.reduce((acc, i) => acc + (i.rentabilidade * i.valor), 0) / totalRF 
      : 0;
    const rentabilidadeCripto = filteredCriptomoedas.length > 0 
      ? filteredCriptomoedas.reduce((acc, c) => acc + (c.percentual * c.valorBRL), 0) / totalCripto 
      : 0;
    const rentabilidadeObjetivos = filteredObjetivos.length > 0 
      ? filteredObjetivos.reduce((acc, o) => acc + (o.rentabilidade * o.atual), 0) / totalObjetivos 
      : 0;
    
    const rentabilidadeMedia = patrimonioInvestimentos > 0 
      ? ((rentabilidadeRF * totalRF) + (rentabilidadeCripto * totalCripto) + (rentabilidadeObjetivos * totalObjetivos)) / patrimonioInvestimentos 
      : 0;
    
    // Variação mensal (simulação baseada em fluxo de caixa)
    const receitasMes = getTotalReceitas();
    const despesasMes = getTotalDespesas();
    const variacaoMensal = ((receitasMes - despesasMes) / Math.max(receitasMes, 1)) * 100;
    
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
  }, [filteredInvestimentosRF, filteredCriptomoedas, filteredStablecoins, filteredObjetivos, getValorFipeTotal, getTotalReceitas, getTotalDespesas]);

  const distribuicaoCarteira = useMemo(() => [
    { name: "Renda Fixa", value: calculosPatrimonio.totalRF },
    { name: "Criptomoedas", value: calculosPatrimonio.totalCripto },
    { name: "Stablecoins", value: calculosPatrimonio.totalStables },
  ], [calculosPatrimonio]);

  const carteiraConsolidada = useMemo(() => [
    {
      categoria: "Renda Fixa",
      valor: calculosPatrimonio.totalRF,
      percentual: calculosPatrimonio.patrimonioTotal > 0 ? (calculosPatrimonio.totalRF / calculosPatrimonio.patrimonioTotal) * 100 : 0,
      rentabilidade: filteredInvestimentosRF.length > 0 
        ? filteredInvestimentosRF.reduce((acc, i) => acc + (i.rentabilidade * i.valor), 0) / calculosPatrimonio.totalRF 
        : 0,
      volatilidade: "Baixa",
      risco: "A"
    },
    {
      categoria: "Criptomoedas",
      valor: calculosPatrimonio.totalCripto,
      percentual: calculosPatrimonio.patrimonioTotal > 0 ? (calculosPatrimonio.totalCripto / calculosPatrimonio.patrimonioTotal) * 100 : 0,
      rentabilidade: filteredCriptomoedas.length > 0 
        ? filteredCriptomoedas.reduce((acc, c) => acc + (c.percentual * c.valorBRL), 0) / calculosPatrimonio.totalCripto 
        : 0,
      volatilidade: "Alta",
      risco: "C"
    },
    {
      categoria: "Stablecoins",
      valor: calculosPatrimonio.totalStables,
      percentual: calculosPatrimonio.patrimonioTotal > 0 ? (calculosPatrimonio.totalStables / calculosPatrimonio.patrimonioTotal) * 100 : 0,
      rentabilidade: 0,
      volatilidade: "Baixa",
      risco: "A"
    },
    {
      categoria: "Objetivos",
      valor: calculosPatrimonio.totalObjetivos,
      percentual: calculosPatrimonio.patrimonioTotal > 0 ? (calculosPatrimonio.totalObjetivos / calculosPatrimonio.patrimonioTotal) * 100 : 0,
      rentabilidade: filteredObjetivos.length > 0 
        ? filteredObjetivos.reduce((acc, o) => acc + (o.rentabilidade * o.atual), 0) / calculosPatrimonio.totalObjetivos 
        : 0,
      volatilidade: "Baixa",
      risco: "B"
    },
  ], [calculosPatrimonio, filteredInvestimentosRF, filteredCriptomoedas, filteredObjetivos]);

  // Handlers
  const handleAddRF = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRF.aplicacao || !formRF.valor || !formRF.dataAplicacao) return;
    addInvestimentoRF({
      aplicacao: formRF.aplicacao,
      instituicao: formRF.instituicao,
      tipo: formRF.tipo,
      valor: Number(formRF.valor),
      cdi: 100, // Valor padrão
      rentabilidade: 0, // Valor padrão
      vencimento: formRF.dataAplicacao, // Usando data de aplicação como vencimento padrão
      risco: "Baixo" // Valor padrão
    });
    setFormRF({
      aplicacao: "",
      instituicao: "",
      tipo: "CDB",
      valor: "",
      dataAplicacao: "",
    });
    setShowAddRF(false);
    toast({ title: "Investimento adicionado!" });
  };

  const handleAddCripto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCripto.nome || !formCripto.valorBRL) return;
    addCriptomoeda({
      nome: formCripto.nome,
      simbolo: formCripto.simbolo.toUpperCase(),
      quantidade: Number(formCripto.quantidade) || 0,
      valorBRL: Number(formCripto.valorBRL),
      percentual: 0,
      sparkline: [100, 105, 98, 110, 108, 115, 112],
    });
    setFormCripto({
      nome: "",
      simbolo: "",
      quantidade: "",
      valorBRL: ""
    });
    setShowAddCripto(false);
    toast({ title: "Criptomoeda adicionada!" });
  };

  const handleAddStable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStable.nome || !formStable.valorBRL) return;
    addStablecoin({
      nome: formStable.nome,
      quantidade: Number(formStable.quantidade) || 0,
      valorBRL: Number(formStable.valorBRL),
      cotacao: Number(formStable.cotacao) || 5.0,
    });
    setFormStable({
      nome: "",
      quantidade: "",
      valorBRL: "",
      cotacao: "5.0"
    });
    setShowAddStable(false);
    toast({ title: "Stablecoin adicionada!" });
  };

  const handleAddObjetivo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formObjetivo.nome || !formObjetivo.meta) return;
    addObjetivo({
      nome: formObjetivo.nome,
      atual: Number(formObjetivo.atual) || 0,
      meta: Number(formObjetivo.meta),
      rentabilidade: Number(formObjetivo.rentabilidade) || 0,
      cor: formObjetivo.cor,
    });
    setFormObjetivo({
      nome: "",
      atual: "",
      meta: "",
      rentabilidade: "",
      cor: "hsl(142, 76%, 36%)"
    });
    setShowAddObjetivo(false);
    toast({ title: "Objetivo adicionado!" });
  };

  const handleAddMov = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMov.data || !formMov.valor) return;
    addMovimentacaoInvestimento({
      data: formMov.data,
      tipo: formMov.tipo,
      categoria: formMov.categoria,
      ativo: formMov.ativo,
      descricao: formMov.descricao,
      valor: Number(formMov.valor),
    });
    setFormMov({
      data: "",
      tipo: "Aporte",
      categoria: "Renda Fixa",
      ativo: "",
      descricao: "",
      valor: ""
    });
    setShowAddMov(false);
    toast({ title: "Movimentação registrada!" });
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
            <Dialog open={showAddRF} onOpenChange={setShowAddRF}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-primary">
                  <Plus className="w-4 h-4" /> Novo Investimento RF
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Novo Investimento em Renda Fixa</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddRF} className="space-y-4">
                  <div>
                    <Label>Nome da Aplicação</Label>
                    <Input
                      value={formRF.aplicacao}
                      onChange={(e) => setFormRF({ ...formRF, aplicacao: e.target.value })}
                      className="mt-1 bg-muted border-border"
                      placeholder="Ex: CDB Banco Inter"
                    />
                  </div>
                  <div>
                    <Label>Instituição</Label>
                    <Input
                      value={formRF.instituicao}
                      onChange={(e) => setFormRF({ ...formRF, instituicao: e.target.value })}
                      className="mt-1 bg-muted border-border"
                      placeholder="Ex: Banco Inter"
                    />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={formRF.tipo} onValueChange={(v) => setFormRF({ ...formRF, tipo: v })}>
                      <SelectTrigger className="mt-1 bg-muted border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CDB">CDB</SelectItem>
                        <SelectItem value="RDB">RDB</SelectItem>
                        <SelectItem value="Renda Fixa">Renda Fixa</SelectItem>
                        <SelectItem value="Poupança">Poupança</SelectItem>
                        <SelectItem value="LCI">LCI</SelectItem>
                        <SelectItem value="LCA">LCA</SelectItem>
                        <SelectItem value="Tesouro">Tesouro</SelectItem>
                        <SelectItem value="Debênture">Debênture</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formRF.valor}
                        onChange={(e) => setFormRF({ ...formRF, valor: e.target.value })}
                        className="mt-1 bg-muted border-border"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label>Data de Aplicação</Label>
                      <Input
                        type="date"
                        value={formRF.dataAplicacao}
                        onChange={(e) => setFormRF({ ...formRF, dataAplicacao: e.target.value })}
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-primary">Adicionar</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Cards Resumo Padronizados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="glass-card border-l-4 border-l-primary animate-fade-in-up">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Patrimônio Total</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(calculosPatrimonio.patrimonioTotal)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={cn(
                      "text-xs font-medium",
                      calculosPatrimonio.variacaoMensal >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {calculosPatrimonio.variacaoMensal >= 0 ? "▲" : "▼"} {Math.abs(calculosPatrimonio.variacaoMensal).toFixed(1)}% vs mês anterior
                    </span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-l-4 border-l-accent animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Reserva Emergência</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {calculosPatrimonio.reservaEmergencia 
                      ? `${((calculosPatrimonio.reservaEmergencia.atual / calculosPatrimonio.reservaEmergencia.meta) * 100).toFixed(0)}%`
                      : "N/A"
                    }
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {calculosPatrimonio.reservaEmergencia 
                      ? `${formatCurrency(calculosPatrimonio.reservaEmergencia.atual)} / ${formatCurrency(calculosPatrimonio.reservaEmergencia.meta)}`
                      : "Sem objetivo definido"
                    }
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-accent/10">
                  <Shield className="w-5 h-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-l-4 border-l-warning animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Exposição Cripto</p>
                  <p className="text-2xl font-bold text-warning mt-1">
                    {calculosPatrimonio.exposicaoCripto.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(calculosPatrimonio.totalCripto)}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-warning/10">
                  <Bitcoin className="w-5 h-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Distribuição da Carteira */}
        <Card className="glass-card animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="w-5 h-5 text-primary" />
              Distribuição da Carteira
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={distribuicaoCarteira}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distribuicaoCarteira.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {distribuicaoCarteira.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {item.name}: {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Carteira Consolidada */}
        <Card className="glass-card animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Wallet className="w-5 h-5 text-primary" />
              Carteira Consolidada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Categoria</TableHead>
                  <TableHead className="text-muted-foreground text-right">Valor</TableHead>
                  <TableHead className="text-muted-foreground text-right">%</TableHead>
                  <TableHead className="text-muted-foreground text-right">Rent. YTD</TableHead>
                  <TableHead className="text-muted-foreground text-center">Volatilidade</TableHead>
                  <TableHead className="text-muted-foreground text-center">Risco</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carteiraConsolidada.map((item) => (
                  <TableRow key={item.categoria} className="border-border hover:bg-muted/30">
                    <TableCell className="font-medium">{item.categoria}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.valor)}</TableCell>
                    <TableCell className="text-right">{item.percentual.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "font-medium",
                        item.rentabilidade > 0 ? "text-success" : item.rentabilidade < 0 ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {item.rentabilidade > 0 ? "+" : ""}{item.rentabilidade.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={item.volatilidade === "Baixa" ? "default" : item.volatilidade === "Média" ? "secondary" : "destructive"}>
                        {item.volatilidade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn(
                        item.risco === "A" && "border-success text-success",
                        item.risco === "B" && "border-warning text-warning",
                        item.risco === "C" && "border-destructive text-destructive"
                      )}>
                        {item.risco}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Renda Fixa Section */}
        <Card className="glass-card animate-fade-in-up" style={{ animationDelay: "350ms" }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Landmark className="w-5 h-5 text-primary" />
              Renda Fixa
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-48 bg-muted border-border"
                />
              </div>
              <Select value={filterInstituicao} onValueChange={setFilterInstituicao}>
                <SelectTrigger className="w-32 bg-muted border-border">
                  <SelectValue placeholder="Instituição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Array.from(new Set(filteredInvestimentosRF.map(i => i.instituicao))).map(inst => (
                    <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterTipoRF} onValueChange={setFilterTipoRF}>
                <SelectTrigger className="w-32 bg-muted border-border">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="CDB">CDB</SelectItem>
                  <SelectItem value="RDB">RDB</SelectItem>
                  <SelectItem value="Renda Fixa">Renda Fixa</SelectItem>
                  <SelectItem value="Poupança">Poupança</SelectItem>
                  <SelectItem value="LCI">LCI</SelectItem>
                  <SelectItem value="LCA">LCA</SelectItem>
                  <SelectItem value="Tesouro">Tesouro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Aplicação</TableHead>
                  <TableHead className="text-muted-foreground">Instituição</TableHead>
                  <TableHead className="text-muted-foreground">Tipo</TableHead>
                  <TableHead className="text-muted-foreground text-right">Valor</TableHead>
                  <TableHead className="text-muted-foreground text-right">% CDI</TableHead>
                  <TableHead className="text-muted-foreground text-right">Rent.</TableHead>
                  <TableHead className="text-muted-foreground">Vencimento</TableHead>
                  <TableHead className="text-muted-foreground w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvestimentosRF
                  .filter(i => 
                    (filterInstituicao === "all" || i.instituicao === filterInstituicao) &&
                    (filterTipoRF === "all" || i.tipo === filterTipoRF) &&
                    (i.aplicacao.toLowerCase().includes(searchTerm.toLowerCase()) || 
                     i.instituicao.toLowerCase().includes(searchTerm.toLowerCase()))
                  )
                  .map((item) => (
                    <TableRow key={item.id} className="border-border hover:bg-muted/30">
                      <TableCell>
                        <EditableCell
                          value={item.aplicacao}
                          onSave={(v) => updateInvestimentoRF(item.id, { aplicacao: String(v) })}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          value={item.instituicao}
                          onSave={(v) => updateInvestimentoRF(item.id, { instituicao: String(v) })}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell
                          value={item.valor}
                          type="currency"
                          onSave={(v) => updateInvestimentoRF(item.id, { valor: Number(v) })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell
                          value={item.cdi}
                          type="number"
                          onSave={(v) => updateInvestimentoRF(item.id, { cdi: Number(v) })}
                        />%
                      </TableCell>
                      <TableCell className="text-right text-success">+{item.rentabilidade}%</TableCell>
                      <TableCell>{item.vencimento}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteInvestimentoRF(item.id)}
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Criptomoedas Section */}
        <Card className="glass-card animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Bitcoin className="w-5 h-5 text-warning" />
              Criptomoedas
            </CardTitle>
            <Dialog open={showAddCripto} onOpenChange={setShowAddCripto}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-border">
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Nova Criptomoeda</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddCripto} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Nome</Label>
                      <Input
                        value={formCripto.nome}
                        onChange={(e) => setFormCripto({ ...formCripto, nome: e.target.value })}
                        className="mt-1 bg-muted border-border"
                        placeholder="Bitcoin"
                      />
                    </div>
                    <div>
                      <Label>Símbolo</Label>
                      <Input
                        value={formCripto.simbolo}
                        onChange={(e) => setFormCripto({ ...formCripto, simbolo: e.target.value })}
                        className="mt-1 bg-muted border-border"
                        placeholder="BTC"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        step="any"
                        value={formCripto.quantidade}
                        onChange={(e) => setFormCripto({ ...formCripto, quantidade: e.target.value })}
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                    <div>
                      <Label>Valor (R$)</Label>
                      <Input
                        type="number"
                        value={formCripto.valorBRL}
                        onChange={(e) => setFormCripto({ ...formCripto, valorBRL: e.target.value })}
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-primary">Adicionar</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCriptomoedas.map((cripto) => (
                <div key={cripto.id} className="glass-card p-4 rounded-xl">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-warning/10">
                        <Bitcoin className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{cripto.nome}</h4>
                        <p className="text-sm text-muted-foreground">{cripto.simbolo}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCriptomoeda(cripto.id)}
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Quantidade</span>
                      <EditableCell
                        value={cripto.quantidade}
                        type="number"
                        onSave={(v) => updateCriptomoeda(cripto.id, { quantidade: Number(v) })}
                      />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Valor</span>
                      <EditableCell
                        value={cripto.valorBRL}
                        type="currency"
                        onSave={(v) => updateCriptomoeda(cripto.id, { valorBRL: Number(v) })}
                      />
                    </div>
                  </div>
                  <div className="mt-3 h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cripto.sparkline.map((v, i) => ({ value: v }))}>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(38, 92%, 50%)"
                          fill="hsl(38, 92%, 50%)"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stablecoins Section */}
        <Card className="glass-card animate-fade-in-up" style={{ animationDelay: "450ms" }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Coins className="w-5 h-5 text-success" />
              Stablecoins
            </CardTitle>
            <Dialog open={showAddStable} onOpenChange={setShowAddStable}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-border">
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Nova Stablecoin</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddStable} className="space-y-4">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={formStable.nome}
                      onChange={(e) => setFormStable({ ...formStable, nome: e.target.value })}
                      className="mt-1 bg-muted border-border"
                      placeholder="USDC"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        value={formStable.quantidade}
                        onChange={(e) => setFormStable({ ...formStable, quantidade: e.target.value })}
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                    <div>
                      <Label>Valor (R$)</Label>
                      <Input
                        type="number"
                        value={formStable.valorBRL}
                        onChange={(e) => setFormStable({ ...formStable, valorBRL: e.target.value })}
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Cotação USD</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formStable.cotacao}
                      onChange={(e) => setFormStable({ ...formStable, cotacao: e.target.value })}
                      className="mt-1 bg-muted border-border"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-primary">Adicionar</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-muted-foreground text-right">Quantidade</TableHead>
                  <TableHead className="text-muted-foreground text-right">Valor BRL</TableHead>
                  <TableHead className="text-muted-foreground text-right">Cotação USD</TableHead>
                  <TableHead className="text-muted-foreground w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStablecoins.map((item) => (
                  <TableRow key={item.id} className="border-border hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-success" />
                        <EditableCell
                          value={item.nome}
                          onSave={(v) => updateStablecoin(item.id, { nome: String(v) })}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <EditableCell
                        value={item.quantidade}
                        type="number"
                        onSave={(v) => updateStablecoin(item.id, { quantidade: Number(v) })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <EditableCell
                        value={item.valorBRL}
                        type="currency"
                        onSave={(v) => updateStablecoin(item.id, { valorBRL: Number(v) })}
                      />
                    </TableCell>
                    <TableCell className="text-right">R$ {item.cotacao.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteStablecoin(item.id)}
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Objetivos Financeiros Section */}
        <Card className="glass-card animate-fade-in-up" style={{ animationDelay: "500ms" }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Target className="w-5 h-5 text-accent" />
              Objetivos Financeiros
            </CardTitle>
            <Dialog open={showAddObjetivo} onOpenChange={setShowAddObjetivo}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-border">
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Novo Objetivo Financeiro</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddObjetivo} className="space-y-4">
                  <div>
                    <Label>Nome do Objetivo</Label>
                    <Input
                      value={formObjetivo.nome}
                      onChange={(e) => setFormObjetivo({ ...formObjetivo, nome: e.target.value })}
                      className="mt-1 bg-muted border-border"
                      placeholder="Reserva de Emergência"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Valor Atual (R$)</Label>
                      <Input
                        type="number"
                        value={formObjetivo.atual}
                        onChange={(e) => setFormObjetivo({ ...formObjetivo, atual: e.target.value })}
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                    <div>
                      <Label>Meta (R$)</Label>
                      <Input
                        type="number"
                        value={formObjetivo.meta}
                        onChange={(e) => setFormObjetivo({ ...formObjetivo, meta: e.target.value })}
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-primary">Adicionar</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredObjetivos.map((obj) => {
                const progresso = (obj.atual / obj.meta) * 100;
                return (
                  <div key={obj.id} className="glass-card p-4 rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground">{obj.nome}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(obj.atual)} / {formatCurrency(obj.meta)}
                        </p>
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
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium" style={{ color: obj.cor }}>{progresso.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(progresso, 100)}%`, backgroundColor: obj.cor }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Movimentações Section */}
        <Card className="glass-card animate-fade-in-up" style={{ animationDelay: "550ms" }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <RefreshCw className="w-5 h-5 text-primary" />
              Histórico de Movimentações
            </CardTitle>
            <div className="flex items-center gap-3">
              <Select value={filterTipoMov} onValueChange={setFilterTipoMov}>
                <SelectTrigger className="w-32 bg-muted border-border">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Aporte">Aporte</SelectItem>
                  <SelectItem value="Resgate">Resgate</SelectItem>
                  <SelectItem value="Compra">Compra</SelectItem>
                  <SelectItem value="Venda">Venda</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategoriaMov} onValueChange={setFilterCategoriaMov}>
                <SelectTrigger className="w-32 bg-muted border-border">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Renda Fixa">Renda Fixa</SelectItem>
                  <SelectItem value="Cripto">Cripto</SelectItem>
                  <SelectItem value="Stablecoin">Stablecoin</SelectItem>
                  <SelectItem value="Objetivo">Objetivo</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={showAddMov} onOpenChange={setShowAddMov}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 border-border">
                    <Plus className="w-4 h-4" /> Nova Movimentação
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle>Nova Movimentação</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddMov} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Data</Label>
                        <Input
                          type="date"
                          value={formMov.data}
                          onChange={(e) => setFormMov({ ...formMov, data: e.target.value })}
                          className="mt-1 bg-muted border-border"
                        />
                      </div>
                      <div>
                        <Label>Tipo</Label>
                        <Select value={formMov.tipo} onValueChange={(v) => setFormMov({ ...formMov, tipo: v })}>
                          <SelectTrigger className="mt-1 bg-muted border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Aporte">Aporte</SelectItem>
                            <SelectItem value="Resgate">Resgate</SelectItem>
                            <SelectItem value="Compra">Compra</SelectItem>
                            <SelectItem value="Venda">Venda</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Categoria</Label>
                        <Select value={formMov.categoria} onValueChange={(v) => setFormMov({ ...formMov, categoria: v })}>
                          <SelectTrigger className="mt-1 bg-muted border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Renda Fixa">Renda Fixa</SelectItem>
                            <SelectItem value="Cripto">Cripto</SelectItem>
                            <SelectItem value="Stablecoin">Stablecoin</SelectItem>
                            <SelectItem value="Objetivo">Objetivo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Ativo</Label>
                        <Input
                          value={formMov.ativo}
                          onChange={(e) => setFormMov({ ...formMov, ativo: e.target.value })}
                          className="mt-1 bg-muted border-border"
                          placeholder="BTC, CDB..."
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input
                        value={formMov.descricao}
                        onChange={(e) => setFormMov({ ...formMov, descricao: e.target.value })}
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                    <div>
                      <Label>Valor (R$)</Label>
                      <Input
                        type="number"
                        value={formMov.valor}
                        onChange={(e) => setFormMov({ ...formMov, valor: e.target.value })}
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-primary">Registrar</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Data</TableHead>
                  <TableHead className="text-muted-foreground">Tipo</TableHead>
                  <TableHead className="text-muted-foreground">Categoria</TableHead>
                  <TableHead className="text-muted-foreground">Ativo</TableHead>
                  <TableHead className="text-muted-foreground">Descrição</TableHead>
                  <TableHead className="text-muted-foreground text-right">Valor</TableHead>
                  <TableHead className="text-muted-foreground w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovimentacoes
                  .filter(m => 
                    (filterTipoMov === "all" || m.tipo === filterTipoMov) &&
                    (filterCategoriaMov === "all" || m.categoria === filterCategoriaMov)
                  )
                  .map((mov) => (
                    <TableRow key={mov.id} className="border-border hover:bg-muted/30">
                      <TableCell>{mov.data}</TableCell>
                      <TableCell>
                        <Badge variant={mov.tipo === "Aporte" || mov.tipo === "Compra" ? "default" : "secondary"}>
                          {mov.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>{mov.categoria}</TableCell>
                      <TableCell>{mov.ativo}</TableCell>
                      <TableCell>{mov.descricao}</TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        mov.tipo === "Aporte" || mov.tipo === "Compra" ? "text-success" : "text-destructive"
                      )}>
                        {mov.tipo === "Aporte" || mov.tipo === "Compra" ? "+" : "-"}{formatCurrency(mov.valor)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMovimentacaoInvestimento(mov.id)}
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Investimentos;