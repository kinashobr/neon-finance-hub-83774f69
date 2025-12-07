import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, Search, X, Tag, TrendingUp, TrendingDown, Repeat, Circle, DollarSign, Calculator, Percent, Calendar, Clock, Target, Award, Zap } from "lucide-react";
import { useFinance, Transacao } from "@/contexts/FinanceContext";
import { EditableCell } from "@/components/EditableCell";
import { EnhancedStatCards } from "@/components/transactions/EnhancedStatCards";
import { SmartSummaryPanel } from "@/components/transactions/SmartSummaryPanel";
import { CashFlowProjection } from "@/components/transactions/CashFlowProjection";
import { EnhancedFilters } from "@/components/transactions/EnhancedFilters";
import { EnhancedCharts } from "@/components/transactions/EnhancedCharts";
import { PeriodSelector, PeriodRange, periodToDateRange } from "@/components/dashboard/PeriodSelector";
import { cn } from "@/lib/utils";

// Categorias consideradas como despesas fixas
const CATEGORIAS_FIXAS = ["Moradia", "Saúde", "Transporte", "Salário"];

// Ícones por categoria
const CATEGORIA_ICONS: Record<string, string> = {
  "Alimentação": "🍽️",
  "Transporte": "🚗",
  "Lazer": "🎮",
  "Saúde": "💊",
  "Moradia": "🏠",
  "Salário": "💰",
  "Freelance": "💻",
  "Outros": "📦",
};

const ReceitasDespesas = () => {
  const { transacoes, addTransacao, updateTransacao, deleteTransacao, categorias, addCategoria, removeCategoria, getTotalReceitas, getTotalDespesas } = useFinance();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("");
  const [showCategoriaManager, setShowCategoriaManager] = useState(false);
  const [periodRange, setPeriodRange] = useState<PeriodRange>({
    startMonth: null,
    startYear: null,
    endMonth: null,
    endYear: null,
  });

  // Novos filtros
  const [filterValorMin, setFilterValorMin] = useState("");
  const [filterValorMax, setFilterValorMax] = useState("");
  const [filterMes, setFilterMes] = useState("all");
  const [sortBy, setSortBy] = useState("recente");
  const [tiposAtivos, setTiposAtivos] = useState<string[]>(["receita", "despesa"]);

  // Form state
  const [formData, setFormData] = useState({
    data: "",
    descricao: "",
    valor: "",
    categoria: "",
    tipo: "receita" as "receita" | "despesa",
  });

  const handlePeriodChange = useCallback((period: PeriodRange) => {
    setPeriodRange(period);
  }, []);

  // Converte PeriodRange para DateRange
  const dateRange = useMemo(() => periodToDateRange(periodRange), [periodRange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.data || !formData.descricao || !formData.valor || !formData.categoria) return;

    addTransacao({
      data: formData.data,
      descricao: formData.descricao,
      valor: Number(formData.valor),
      categoria: formData.categoria,
      tipo: formData.tipo,
    });

    setFormData({
      data: "",
      descricao: "",
      valor: "",
      categoria: "",
      tipo: "receita"
    });
  };

  const handleAddCategoria = () => {
    if (novaCategoria.trim()) {
      addCategoria(novaCategoria.trim());
      setNovaCategoria("");
    }
  };

  // Filter transactions by date range
  const filteredTransacoesByDate = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return transacoes;
    
    return transacoes.filter(t => {
      const transactionDate = new Date(t.data);
      return transactionDate >= dateRange.from! && transactionDate <= dateRange.to!;
    });
  }, [transacoes, dateRange]);

  // Filter and sort transactions
  const filteredTransacoes = useMemo(() => {
    let result = filteredTransacoesByDate.filter(t => {
      const matchSearch = t.descricao.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategoria = filterCategoria === "all" || t.categoria === filterCategoria;
      const matchTipo = tiposAtivos.includes(t.tipo);
      const matchDataInicio = !filterDataInicio || t.data >= filterDataInicio;
      const matchDataFim = !filterDataFim || t.data <= filterDataFim;
      const matchValorMin = !filterValorMin || t.valor >= Number(filterValorMin);
      const matchValorMax = !filterValorMax || t.valor <= Number(filterValorMax);
      const matchMes = filterMes === "all" || t.data.split("-")[1] === filterMes;

      return matchSearch && matchCategoria && matchTipo && matchDataInicio && matchDataFim && matchValorMin && matchValorMax && matchMes;
    });

    // Ordenação
    switch (sortBy) {
      case "recente":
        result.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        break;
      case "antigo":
        result.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
        break;
      case "maior":
        result.sort((a, b) => b.valor - a.valor);
        break;
      case "menor":
        result.sort((a, b) => a.valor - b.valor);
        break;
    }

    return result;
  }, [filteredTransacoesByDate, searchTerm, filterCategoria, tiposAtivos, filterDataInicio, filterDataFim, filterValorMin, filterValorMax, filterMes, sortBy]);

  // Cálculos corrigidos
  const totalReceitas = useMemo(() => {
    return filteredTransacoes.filter(t => t.tipo === "receita").reduce((acc, t) => acc + t.valor, 0);
  }, [filteredTransacoes]);

  const totalDespesas = useMemo(() => {
    return filteredTransacoes.filter(t => t.tipo === "despesa").reduce((acc, t) => acc + t.valor, 0);
  }, [filteredTransacoes]);

  const saldo = useMemo(() => {
    return totalReceitas - totalDespesas;
  }, [totalReceitas, totalDespesas]);

  // Cálculos por período (mês atual)
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const transacoesMesAtual = useMemo(() => {
    return filteredTransacoes.filter(t => {
      const date = new Date(t.data);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
  }, [filteredTransacoes, currentMonth, currentYear]);

  const receitasMesAtual = useMemo(() => {
    return transacoesMesAtual.filter(t => t.tipo === "receita").reduce((acc, t) => acc + t.valor, 0);
  }, [transacoesMesAtual]);

  const despesasMesAtual = useMemo(() => {
    return transacoesMesAtual.filter(t => t.tipo === "despesa").reduce((acc, t) => acc + t.valor, 0);
  }, [transacoesMesAtual]);

  const saldoMesAtual = useMemo(() => {
    return receitasMesAtual - despesasMesAtual;
  }, [receitasMesAtual, despesasMesAtual]);

  // Cálculos avançados
  const despesasFixas = useMemo(() => {
    return filteredTransacoes
      .filter(t => t.tipo === "despesa" && CATEGORIAS_FIXAS.includes(t.categoria))
      .reduce((acc, t) => acc + t.valor, 0);
  }, [filteredTransacoes]);

  const despesasVariaveis = useMemo(() => {
    return totalDespesas - despesasFixas;
  }, [totalDespesas, despesasFixas]);

  const ticketMedioReceitas = useMemo(() => {
    const receitasCount = filteredTransacoes.filter(t => t.tipo === "receita").length;
    return receitasCount > 0 ? totalReceitas / receitasCount : 0;
  }, [filteredTransacoes, totalReceitas]);

  const ticketMedioDespesas = useMemo(() => {
    const despesasCount = filteredTransacoes.filter(t => t.tipo === "despesa").length;
    return despesasCount > 0 ? totalDespesas / despesasCount : 0;
  }, [filteredTransacoes, totalDespesas]);

  // Categorias de gasto
  const despesasPorCategoria = useMemo(() => {
    const despesas = filteredTransacoes.filter(t => t.tipo === "despesa");
    const categorias = despesas.reduce((acc, t) => {
      acc[t.categoria] = (acc[t.categoria] || 0) + t.valor;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categorias)
      .sort(([,a], [,b]) => b - a)
      .map(([categoria, valor]) => ({
        categoria,
        valor,
        percentual: totalDespesas > 0 ? (valor / totalDespesas) * 100 : 0
      }));
  }, [filteredTransacoes, totalDespesas]);

  const categoriaMaiorGasto = despesasPorCategoria[0];

  // Receitas por categoria
  const receitasPorCategoria = useMemo(() => {
    const receitas = filteredTransacoes.filter(t => t.tipo === "receita");
    const categorias = receitas.reduce((acc, t) => {
      acc[t.categoria] = (acc[t.categoria] || 0) + t.valor;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categorias)
      .sort(([,a], [,b]) => b - a)
      .map(([categoria, valor]) => ({
        categoria,
        valor,
        percentual: totalReceitas > 0 ? (valor / totalReceitas) * 100 : 0
      }));
  }, [filteredTransacoes, totalReceitas]);

  const principalFonteReceita = receitasPorCategoria[0];

  // Comparação com período anterior
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const transacoesMesAnterior = useMemo(() => {
    return transacoes.filter(t => {
      const date = new Date(t.data);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });
  }, [transacoes, lastMonth, lastMonthYear]);

  const receitasMesAnterior = useMemo(() => {
    return transacoesMesAnterior.filter(t => t.tipo === "receita").reduce((acc, t) => acc + t.valor, 0);
  }, [transacoesMesAnterior]);

  const despesasMesAnterior = useMemo(() => {
    return transacoesMesAnterior.filter(t => t.tipo === "despesa").reduce((acc, t) => acc + t.valor, 0);
  }, [transacoesMesAnterior]);

  const variacaoReceitas = useMemo(() => {
    if (receitasMesAnterior === 0) return 0;
    return ((receitasMesAtual - receitasMesAnterior) / receitasMesAnterior) * 100;
  }, [receitasMesAtual, receitasMesAnterior]);

  const variacaoDespesas = useMemo(() => {
    if (despesasMesAnterior === 0) return 0;
    return ((despesasMesAtual - despesasMesAnterior) / despesasMesAnterior) * 100;
  }, [despesasMesAtual, despesasMesAnterior]);

  // Indicadores de eficiência
  const margemPoupanca = useMemo(() => {
    if (receitasMesAtual === 0) return 0;
    return (saldoMesAtual / receitasMesAtual) * 100;
  }, [saldoMesAtual, receitasMesAtual]);

  const indiceEndividamento = useMemo(() => {
    if (receitasMesAtual === 0) return 0;
    return (despesasMesAtual / receitasMesAtual) * 100;
  }, [despesasMesAtual, receitasMesAtual]);

  const indiceCobertura = useMemo(() => {
    if (despesasFixas === 0) return 0;
    return (receitasMesAtual / despesasFixas) * 100;
  }, [receitasMesAtual, despesasFixas]);

  // Projeção de saldo
  const projecaoSaldo = useMemo(() => {
    const diasNoMes = new Date(currentYear, currentMonth + 1, 0).getDate();
    const diaAtual = currentDate.getDate();
    
    if (diaAtual === 0) return saldoMesAtual;
    
    const mediaDiaria = saldoMesAtual / diaAtual;
    const diasRestantes = diasNoMes - diaAtual;
    
    return saldoMesAtual + (mediaDiaria * diasRestantes);
  }, [saldoMesAtual, currentYear, currentMonth, currentDate]);

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const calcularVariacao = () => {
    // Simplificado: compara com média geral
    const totalReceitasGeral = getTotalReceitas();
    const totalDespesasGeral = getTotalDespesas();
    const mediaReceitas = totalReceitasGeral / Math.max(1, new Set(transacoes.filter(t => t.tipo === "receita").map(t => t.data.substring(0, 7))).size);
    const mediaDespesas = totalDespesasGeral / Math.max(1, new Set(transacoes.filter(t => t.tipo === "despesa").map(t => t.data.substring(0, 7))).size);

    const variacaoReceitas = mediaReceitas > 0 ? ((totalReceitas - mediaReceitas) / mediaReceitas) * 100 : 0;
    const variacaoDespesas = mediaDespesas > 0 ? ((totalDespesas - mediaDespesas) / mediaDespesas) * 100 : 0;

    return { variacaoReceitas, variacaoDespesas };
  };

  const { variacaoReceitas: variacaoGeralReceitas, variacaoDespesas: variacaoGeralDespesas } = calcularVariacao();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Receitas e Despesas</h1>
            <p className="text-muted-foreground mt-1">Gerencie suas transações financeiras</p>
          </div>
          <div className="flex items-center gap-3">
            <PeriodSelector 
              tabId="receitas-despesas" 
              onPeriodChange={handlePeriodChange} 
            />
            <Button 
              variant="outline" 
              className="gap-2 border-border" 
              onClick={() => setShowCategoriaManager(!showCategoriaManager)}
            >
              <Tag className="w-4 h-4" /> Gerenciar Categorias
            </Button>
          </div>
        </div>

        {/* Enhanced Stat Cards */}
        <EnhancedStatCards 
          transacoes={filteredTransacoes} 
          totalReceitas={totalReceitas} 
          totalDespesas={totalDespesas} 
        />

        {/* Smart Summary Panel */}
        <SmartSummaryPanel transacoes={filteredTransacoes} />

        {/* Cash Flow Projection */}
        <CashFlowProjection transacoes={filteredTransacoes} />

        {/* Charts */}
        <EnhancedCharts transacoes={filteredTransacoes} categorias={categorias} />

        {/* Category Manager */}
        {showCategoriaManager && (
          <div className="glass-card p-5 animate-fade-in">
            <h3 className="text-lg font-semibold text-foreground mb-4">Gerenciar Categorias</h3>
            <div className="flex gap-2 mb-4">
              <Input
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                placeholder="Nova categoria..."
                className="bg-muted border-border"
                onKeyDown={(e) => e.key === "Enter" && handleAddCategoria()}
              />
              <Button onClick={handleAddCategoria} className="bg-primary">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categorias.map((cat) => (
                <div key={cat} className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-sm">
                  <span>{CATEGORIA_ICONS[cat] || "📌"}</span>
                  <span>{cat}</span>
                  <button onClick={() => removeCategoria(cat)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Nova Transação</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.tipo === "receita" ? "default" : "outline"}
                  className={formData.tipo === "receita" ? "bg-success flex-1" : "border-border flex-1"}
                  onClick={() => setFormData({ ...formData, tipo: "receita" })}
                >
                  Receita
                </Button>
                <Button
                  type="button"
                  variant={formData.tipo === "despesa" ? "default" : "outline"}
                  className={formData.tipo === "despesa" ? "bg-destructive flex-1" : "border-border flex-1"}
                  onClick={() => setFormData({ ...formData, tipo: "despesa" })}
                >
                  Despesa
                </Button>
              </div>
              <div>
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="mt-1.5 bg-muted border-border"
                />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição da transação..."
                  className="mt-1.5 bg-muted border-border"
                />
              </div>
              <div>
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  placeholder="0,00"
                  className="mt-1.5 bg-muted border-border"
                />
              </div>
              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                  <SelectTrigger className="mt-1.5 bg-muted border-border">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        <span className="flex items-center gap-2">
                          <span>{CATEGORIA_ICONS[cat] || "📌"}</span>
                          {cat}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-neon-gradient hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" /> Adicionar
              </Button>
            </form>
          </div>

          {/* Detalhes de Categorias */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-5 animate-fade-in-up">
              <h3 className="text-lg font-semibold text-foreground mb-4">Maior Gasto por Categoria</h3>
              <div className="space-y-3">
                {despesasPorCategoria.slice(0, 5).map((cat, index) => (
                  <div key={cat.categoria} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{cat.categoria}</p>
                        <p className="text-xs text-muted-foreground">{cat.percentual.toFixed(1)}% do total</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">{formatCurrency(cat.valor)}</p>
                      <p className="text-xs text-muted-foreground">
                        {categoriaMaiorGasto && categoriaMaiorGasto.categoria === cat.categoria ? "Maior gasto" : ""}
                      </p>
                    </div>
                  </div>
                ))}
                {despesasPorCategoria.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">Nenhuma despesa registrada</p>
                )}
              </div>
            </div>

            <div className="glass-card p-5 animate-fade-in-up">
              <h3 className="text-lg font-semibold text-foreground mb-4">Principais Fontes de Receita</h3>
              <div className="space-y-3">
                {receitasPorCategoria.slice(0, 5).map((cat, index) => (
                  <div key={cat.categoria} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{cat.categoria}</p>
                        <p className="text-xs text-muted-foreground">{cat.percentual.toFixed(1)}% do total</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">{formatCurrency(cat.valor)}</p>
                      <p className="text-xs text-muted-foreground">
                        {principalFonteReceita && principalFonteReceita.categoria === cat.categoria ? "Principal fonte" : ""}
                      </p>
                    </div>
                  </div>
                ))}
                {receitasPorCategoria.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">Nenhuma receita registrada</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Table */}
        <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-foreground">Histórico de Transações</h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-48 bg-muted border-border"
                />
              </div>
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger className="w-36 bg-muted border-border">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categorias.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={filterDataInicio}
                onChange={(e) => setFilterDataInicio(e.target.value)}
                className="w-36 bg-muted border-border"
                placeholder="Data início"
              />
              <Input
                type="date"
                value={filterDataFim}
                onChange={(e) => setFilterDataFim(e.target.value)}
                className="w-36 bg-muted border-border"
                placeholder="Data fim"
              />

              {/* Enhanced Filters */}
              <EnhancedFilters
                filterValorMin={filterValorMin}
                setFilterValorMin={setFilterValorMin}
                filterValorMax={filterValorMax}
                setFilterValorMax={setFilterValorMax}
                filterMes={filterMes}
                setFilterMes={setFilterMes}
                sortBy={sortBy}
                setSortBy={setSortBy}
                tiposAtivos={tiposAtivos}
                setTiposAtivos={setTiposAtivos}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Data</TableHead>
                    <TableHead className="text-muted-foreground">Descrição</TableHead>
                    <TableHead className="text-muted-foreground">Categoria</TableHead>
                    <TableHead className="text-muted-foreground">Valor</TableHead>
                    <TableHead className="text-muted-foreground">Tipo</TableHead>
                    <TableHead className="text-muted-foreground">Info</TableHead>
                    <TableHead className="text-muted-foreground w-16">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransacoes.map((item) => {
                    const isFixa = CATEGORIAS_FIXAS.includes(item.categoria);
                    return (
                      <TableRow key={item.id} className="border-border hover:bg-muted/30 transition-colors">
                        <TableCell className="text-muted-foreground">
                          <EditableCell
                            value={item.data}
                            type="date"
                            onSave={(v) => updateTransacao(item.id, { data: String(v) })}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={item.descricao}
                            onSave={(v) => updateTransacao(item.id, { descricao: String(v) })}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{CATEGORIA_ICONS[item.categoria] || "📌"}</span>
                            <EditableCell
                              value={item.categoria}
                              onSave={(v) => updateTransacao(item.id, { categoria: String(v) })}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={item.valor}
                            type="currency"
                            onSave={(v) => updateTransacao(item.id, { valor: Number(v) })}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.tipo === "receita" ? "default" : "destructive"} className={cn(
                            "capitalize",
                            item.tipo === "receita" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                          )}>
                            {item.tipo === "receita" ? (
                              <TrendingUp className="w-3 h-3 mr-1" />
                            ) : (
                              <TrendingDown className="w-3 h-3 mr-1" />
                            )}
                            {item.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {isFixa && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Repeat className="w-4 h-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Despesa/Receita Fixa</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTransacao(item.id)}
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredTransacoes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        Nenhuma transação encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ReceitasDespesas;