# Backend da Tela de Receitas e Despesas

## Visão Geral

O backend da tela de Receitas e Despesas é construído sobre o `FinanceContext` que gerencia todo o estado da aplicação financeira. Cada componente tem uma lógica específica de processamento e cálculo.

## Estrutura de Dados

### Transação (Transacao)
```typescript
interface Transacao {
  id: number;           // Identificador único
  data: string;         // Data no formato "YYYY-MM-DD"
  descricao: string;    // Descrição da transação
  valor: number;        // Valor numérico
  categoria: string;    // Categoria (Alimentação, Transporte, etc)
  tipo: "receita" | "despesa";  // Tipo da transação
}
```

## Componentes e seu Backend

### 1. EnhancedStatCards

**Função**: Exibe métricas resumidas do mês atual

**Lógica de Cálculo**:
```typescript
// Filtra transações do mês atual
const transacoesMes = transacoes.filter(t => {
  const date = new Date(t.data);
  return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
});

// Calcula receitas e despesas do mês
const receitasMes = transacoesMes
  .filter(t => t.tipo === "receita")
  .reduce((acc, t) => acc + t.valor, 0);

const despesasMes = transacoesMes
  .filter(t => t.tipo === "despesa")
  .reduce((acc, t) => acc + t.valor, 0);

// Ticket médio
const ticketMedioReceitas = receitasCount > 0 ? receitasMes / receitasCount : 0;

// Variações percentuais
const variacaoReceitas = receitasMesAnterior > 0 
  ? ((receitasMes - receitasMesAnterior) / receitasMesAnterior) * 100 
  : 0;
```

**Categorias Fixas**:
```typescript
const CATEGORIAS_FIXAS = ["Moradia", "Saúde", "Transporte", "Salário"];
const despesasFixas = transacoesMes
  .filter(t => t.tipo === "despesa" && CATEGORIAS_FIXAS.includes(t.categoria))
  .reduce((acc, t) => acc + t.valor, 0);
```

### 2. SmartSummaryPanel

**Função**: Painel inteligente com insights e análises avançadas

**Lógica de Insights**:
```typescript
// Categoria que mais cresceu
const gastosPorCategoriaMes = transacoesMes
  .filter(t => t.tipo === "despesa")
  .reduce((acc, t) => {
    acc[t.categoria] = (acc[t.categoria] || 0) + t.valor;
    return acc;
  }, {} as Record<string, number>);

// Variação percentual por categoria
const variacoesCategorias = Object.keys(gastosPorCategoriaMes).map(cat => ({
  categoria: cat,
  atual: gastosPorCategoriaMes[cat] || 0,
  anterior: gastosPorCategoriaMesAnterior[cat] || 0,
  variacao: gastosPorCategoriaMesAnterior[cat] 
    ? ((gastosPorCategoriaMes[cat] - gastosPorCategoriaMesAnterior[cat]) / gastosPorCategoriaMesAnterior[cat]) * 100
    : 100,
}));

// Transações incomuns (acima de 1 desvio padrão)
const mediaDespesas = despesas.length > 0 
  ? despesas.reduce((acc, t) => acc + t.valor, 0) / despesas.length 
  : 0;
const desvioPadrao = Math.sqrt(
  despesas.reduce((acc, t) => acc + Math.pow(t.valor - mediaDespesas, 2), 0) / (despesas.length || 1)
);
const transacoesIncomuns = despesas.filter(t => t.valor > mediaDespesas + desvioPadrao).length;
```

**Indicadores de Eficiência**:
```typescript
// Margem de poupança
const margemPoupanca = receitasMes > 0 ? (saldoMes / receitasMes) * 100 : 0;

// Índice de endividamento
const indiceEndividamento = receitasMes > 0 ? (despesasMes / receitasMes) * 100 : 0;

// Classificação de desempenho
const performance = (() => {
  if (variacaoReceitas >= 5 && variacaoDespesas <= 0) return { nivel: "Excelente", cor: "success" };
  if (variacaoReceitas >= 0 && variacaoDespesas <= 5) return { nivel: "Bom", cor: "success" };
  if (variacaoReceitas < 0 && variacaoDespesas > 0) return { nivel: "Preocupante", cor: "warning" };
  return { nivel: "Regular", cor: "warning" };
})();
```

### 3. CashFlowProjection

**Função**: Projeção de fluxo de caixa futuro

**Lógica de Projeção**:
```typescript
// Média dos últimos 3 meses
const ultimos3Meses = [];
for (let i = 0; i < 3; i++) {
  const month = (currentMonth - i - 1 + 12) % 12;
  const year = currentMonth - i - 1 < 0 ? currentYear - 1 : currentYear;
  // ... cálculo das transações de cada mês
}
const mediaSaldo = mediaReceitas - mediaDespesas;

// Projeção ponderada (60% baseado no comportamento atual, 40% baseado na média histórica)
const fatorDias = diasNoMes / Math.max(diaAtual, 1);
const projecaoReceitas = (receitasAteAgora * fatorDias * 0.6) + (mediaReceitas * 0.4);
const projecaoDespesas = (despesasAteAgora * fatorDias * 0.6) + (mediaDespesas * 0.4);
const projecaoSaldoFimMes = projecaoReceitas - projecaoDespesas;

// Projeções futuras (baseadas apenas na média histórica)
const saldo30dias = saldoAtual + mediaSaldo;
const saldo60dias = saldoAtual + (mediaSaldo * 2);
const saldo90dias = saldoAtual + (mediaSaldo * 3);
```

### 4. EnhancedCharts

**Função**: Visualização gráfica de tendências e distribuições

**Lógica de Gráficos**:
```typescript
// Tendência mensal com projeção
const tendenciaData = [];
for (let i = chartPeriod - 1; i >= -1; i--) {
  // ... cálculo de receitas, despesas e saldo para cada mês
  // Último item é a projeção baseada na média dos 3 meses anteriores
}

// Distribuição por categoria
const despesasPorCategoria = categorias.map(cat => {
  const valor = transacoes
    .filter(t => t.tipo === "despesa" && t.categoria === cat)
    .reduce((acc, t) => acc + t.valor, 0);
  return { categoria: cat, valor };
}).filter(d => d.valor > 0).sort((a, b) => b.valor - a.valor);
```

### 5. EnhancedFilters

**Função**: Sistema avançado de filtragem e ordenação

**Lógica de Filtros**:
```typescript
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
    
    return matchSearch && matchCategoria && matchTipo && 
           matchDataInicio && matchDataFim && 
           matchValorMin && matchValorMax && matchMes;
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
```

### 6. Formulário de Nova Transação

**Função**: Cadastro de novas transações

**Lógica de Inserção**:
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!formData.data || !formData.descricao || !formData.valor || !formData.categoria) return;

  addTransacao({
    id: Math.max(0, ...transacoes.map(t => t.id)) + 1, // Geração de ID sequencial
    data: formData.data,
    descricao: formData.descricao,
    valor: Number(formData.valor),
    categoria: formData.categoria,
    tipo: formData.tipo,
  });

  // Limpa o formulário
  setFormData({
    data: "",
    descricao: "",
    valor: "",
    categoria: "",
    tipo: "receita"
  });
};
```

### 7. Tabela de Histórico de Transações

**Função**: Exibição e edição das transações cadastradas

**Lógica de Edição**:
```typescript
// Componente EditableCell permite edição inline
const handleSave = () => {
  setIsEditing(false);
  if (editValue !== value) {
    onSave(type === "number" || type === "currency" ? Number(editValue) : editValue);
  }
};

// Atualização de transação
const updateTransacao = (id: number, updates: Partial<Transacao>) => {
  setTransacoes(transacoes.map(t => t.id === id ? { ...t, ...updates } : t));
};

// Exclusão de transação
const deleteTransacao = (id: number) => {
  setTransacoes(transacoes.filter(t => t.id !== id));
};
```

### 8. CategoryDetailModal

**Função**: Detalhamento específico de uma categoria de despesa

**Lógica de Detalhamento**:
```typescript
// Filtra transações da categoria
const transacoesCategoria = transacoes
  .filter(t => t.categoria === categoria && t.tipo === "despesa")
  .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

// Agrupa por mês para o gráfico
const gastosPorMes: Record<string, number> = {};
transacoesCategoria.forEach(t => {
  const mes = t.data.substring(0, 7); // YYYY-MM
  gastosPorMes[mes] = (gastosPorMes[mes] || 0) + t.valor;
});

// Calcula variação mensal
const valores = Object.entries(gastosPorMes).sort(([a], [b]) => a.localeCompare(b));
const ultimoMes = valores[valores.length - 1]?.[1] || 0;
const penultimoMes = valores[valores.length - 2]?.[1] || 0;
const variacao = penultimoMes > 0 ? ((ultimoMes - penultimoMes) / penultimoMes) * 100 : 0;
```

## Persistência de Dados

### LocalStorage
```typescript
// Salvamento automático
useEffect(() => {
  saveToStorage(STORAGE_KEYS.TRANSACOES, transacoes);
}, [transacoes]);

// Carregamento inicial
const [transacoes, setTransacoes] = useState<Transacao[]>(() => 
  loadFromStorage(STORAGE_KEYS.TRANSACOES, initialTransacoes)
);
```

## Cálculos Financeiros Avançados

### Indicadores Personalizados
```typescript
// Margem de poupança ideal (> 20%)
const margemPoupanca = receitasMes > 0 ? (saldoMes / receitasMes) * 100 : 0;

// Índice de endividamento ideal (< 30%)
const indiceEndividamento = receitasMes > 0 ? (despesasMes / receitasMes) * 100 : 0;

// Cobertura de despesas fixas (> 2x)
const indiceCobertura = despesasFixas > 0 ? (receitasMes / despesasFixas) * 100 : 0;
```

### Projeções com Suavização
```typescript
// Projeção ponderada: 60% comportamento atual + 40% média histórica
const projecaoReceitas = (receitasAteAgora * fatorDias * 0.6) + (mediaReceitas * 0.4);
const projecaoDespesas = (despesasAteAgora * fatorDias * 0.6) + (mediaDespesas * 0.4);
```

## Performance

### Memoização Estratégica
```typescript
// Cálculos pesados são memoizados
const filteredTransacoes = useMemo(() => {
  // ... lógica de filtragem
}, [deps]); // Apenas recalcula quando dependências mudam

// Cálculos de estatísticas
const totalReceitas = useMemo(() => {
  return filteredTransacoes.filter(t => t.tipo === "receita").reduce((acc, t) => acc + t.valor, 0);
}, [filteredTransacoes]);
```

## Resumo da Arquitetura

1. **FinanceContext**: Camada de gerenciamento de estado
2. **Componentes**: Camada de UI com lógica de negócios específica
3. **Cálculos**: Memoizados para performance
4. **Persistência**: LocalStorage com salvamento automático
5. **Filtros**: Sistema avançado com múltiplos critérios
6. **Projeções**: Algoritmos de previsão com suavização
7. **Insights**: Análise automática de padrões e anomalias

Esta arquitetura permite uma aplicação financeira completa, performática e com insights inteligentes para auxiliar na gestão financeira pessoal.