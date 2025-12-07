# Especificação Técnica: Seletor de Datas Otimizado

## 1. Arquitetura do Componente

### 1.1 Estrutura de Componentes
```
PeriodSelector/
├── PeriodSelector.tsx       # Componente principal
├── MonthYearPicker.tsx     # Seletor de mês/ano
├── PresetSelector.tsx      # Seletor de presets
├── PeriodInput.tsx         # Campo de entrada de período
└── utils/
    ├── periodValidation.ts # Funções de validação
    ├── periodFormatting.ts # Formatação de períodos
    └── persistence.ts      # Persistência de estado
```

### 1.2 Estado do Componente
```typescript
interface PeriodRange {
  startMonth: number | null; // 0-11
  startYear: number | null;  // 2020-2025
  endMonth: number | null;   // 0-11
  endYear: number | null;    // 2020-2025
}

interface PeriodSelectorState {
  isOpen: boolean;
  selectedPeriod: PeriodRange;
  tempPeriod: PeriodRange; // Para seleção em andamento
  presets: PeriodPreset[];
  error: string | null;
}
```

## 2. Interfaces e Tipos

### 2.1 Props do Componente Principal
```typescript
interface PeriodSelectorProps {
  onPeriodChange: (period: PeriodRange) => void;
  initialPeriod?: PeriodRange;
  tabId: string; // Para persistência por aba
  className?: string;
}
```

### 2.2 Estrutura de Presets
```typescript
interface PeriodPreset {
  id: string;
  label: string;
  getPeriod: () => PeriodRange;
  icon?: ReactNode;
}
```

## 3. Persistência de Estado

### 3.1 Estratégia de Armazenamento
- **Mecanismo**: localStorage
- **Chave**: `periodState-${tabId}`
- **Conteúdo**: Objeto JSON com os períodos selecionados

### 3.2 Funções de Persistência
```typescript
// Salvar estado
const savePeriodState = (tabId: string, period: PeriodRange) => {
  localStorage.setItem(`periodState-${tabId}`, JSON.stringify(period));
};

// Carregar estado
const loadPeriodState = (tabId: string): PeriodRange | null => {
  const saved = localStorage.getItem(`periodState-${tabId}`);
  return saved ? JSON.parse(saved) : null;
};
```

## 4. Validação de Períodos

### 4.1 Funções de Validação
```typescript
// Validar intervalo de períodos
const validatePeriodRange = (period: PeriodRange): string | null => {
  // Verificar se todos os campos estão preenchidos
  if (period.startMonth === null || period.startYear === null || 
      period.endMonth === null || period.endYear === null) {
    return "Selecione todos os campos para aplicar o filtro";
  }
  
  // Validar intervalo
  const startDate = new Date(period.startYear, period.startMonth);
  const endDate = new Date(period.endYear, period.endMonth);
  
  if (startDate > endDate) {
    return "Período inicial não pode ser posterior ao período final";
  }
  
  return null;
};

// Validar ano
const validateYear = (year: number): boolean => {
  return year >= 2020 && year <= 2025;
};
```

## 5. Formatação e Localização

### 5.1 Formatação de Períodos (pt-BR)
```typescript
// Formatar período para exibição
const formatPeriod = (month: number, year: number): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${months[month]} ${year}`;
};

// Formatar intervalo para exibição
const formatPeriodRange = (period: PeriodRange): string => {
  if (period.startMonth === null || period.startYear === null || 
      period.endMonth === null || period.endYear === null) {
    return "Selecione um período";
  }
  
  const start = formatPeriod(period.startMonth, period.startYear);
  const end = formatPeriod(period.endMonth, period.endYear);
  return `${start} - ${end}`;
};
```

## 6. Acessibilidade

### 6.1 Atributos ARIA
```html
<!-- Container principal -->
<div 
  role="group" 
  aria-label="Seletor de intervalo de períodos"
  class="period-selector-container"
>

<!-- Dropdown de mês início -->
<select
  aria-label="Mês de início do período"
  class="period-month-select"
>

<!-- Dropdown de ano início -->
<select
  aria-label="Ano de início do período"
  class="period-year-select"
>

<!-- Dropdown de mês fim -->
<select
  aria-label="Mês de fim do período"
  class="period-month-select"
>

<!-- Dropdown de ano fim -->
<select
  aria-label="Ano de fim do período"
  class="period-year-select"
>
```

### 6.2 Navegação por Teclado
- **Tab**: Navegar entre os 5 campos (Mês Ini, Ano Ini, Mês Fim, Ano Fim, Dropdown)
- **Setas**: Navegar dentro dos dropdowns
- **Enter/Space**: Selecionar item
- **Escape**: Fechar dropdown

## 7. Performance

### 7.1 Otimizações
- **Debounce**: 300ms para aplicação de filtros
- **Memoização**: Cálculos baseados em períodos
- **Lazy loading**: Carregar opções de dropdown apenas quando necessário

### 7.2 Estratégias de Renderização
```typescript
// Memoizar cálculos pesados
const filteredData = useMemo(() => {
  if (!period.startMonth || !period.startYear || 
      !period.endMonth || !period.endYear) return data;
  
  return data.filter(item => {
    const itemDate = new Date(item.date);
    const startDate = new Date(period.startYear!, period.startMonth!);
    const endDate = new Date(period.endYear!, period.endMonth! + 1, 0); // Último dia do mês
    
    return itemDate >= startDate && itemDate <= endDate;
  });
}, [data, period]);

// Debounce para aplicação de filtros
const debouncedApplyFilter = useCallback(
  debounce((period: PeriodRange) => {
    onPeriodChange(period);
  }, 300),
  [onPeriodChange]
);
```

## 8. Integração com Contexto da Aplicação

### 8.1 Hook Personalizado
```typescript
// usePeriod hook
const usePeriod = (tabId: string) => {
  const [period, setPeriod] = useState<PeriodRange>(() => {
    return loadPeriodState(tabId) || getDefaultPeriod();
  });
  
  const updatePeriod = useCallback((newPeriod: PeriodRange) => {
    setPeriod(newPeriod);
    savePeriodState(tabId, newPeriod);
    
    // Notificar contexto da aplicação
    notifyPeriodChange(tabId, newPeriod);
  }, [tabId]);
  
  return {
    period,
    updatePeriod
  };
};
```

### 8.2 Integração com Contexto Financeiro
```typescript
// No componente de cada aba
const { period } = usePeriod(tabId);

// Filtrar dados com base no intervalo
const filteredTransactions = useMemo(() => {
  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    const startDate = new Date(period.startYear!, period.startMonth!);
    const endDate = new Date(period.endYear!, period.endMonth! + 1, 0); // Último dia do mês
    
    return (!period.startMonth || !period.startYear || transactionDate >= startDate) &&
           (!period.endMonth || !period.endYear || transactionDate <= endDate);
  });
}, [transactions, period]);
```

## 9. Testes

### 9.1 Testes Unitários
```typescript
// Teste de validação de intervalo
test('deve rejeitar intervalo inválido', () => {
  const period = { 
    startMonth: 11, // Dezembro
    startYear: 2024,
    endMonth: 0,    // Janeiro
    endYear: 2024
  };
  
  const error = validatePeriodRange(period);
  
  expect(error).toBe('Período inicial não pode ser posterior ao período final');
});

// Teste de formatação de período
test('deve formatar período corretamente', () => {
  expect(formatPeriod(0, 2024)).toBe('Janeiro 2024');
  expect(formatPeriod(11, 2024)).toBe('Dezembro 2024');
});
```

### 9.2 Testes de Integração
```typescript
// Teste de persistência de estado
test('deve persistir e restaurar estado por aba', () => {
  const tabId = 'dashboard';
  const period = { 
    startMonth: 0,  // Janeiro
    startYear: 2024,
    endMonth: 2,    // Março
    endYear: 2024
  };
  
  savePeriodState(tabId, period);
  const restored = loadPeriodState(tabId);
  
  expect(restored).toEqual(period);
});
```

## 10. Considerações de Segurança

### 10.1 Validação de Entrada
- Sanitização de valores de mês e ano
- Validação de limites de períodos (mesmo que não haja limites definidos)
- Prevenção de XSS em mensagens de erro

### 10.2 Tratamento de Erros
```typescript
try {
  const isValid = validateYear(period.startYear!);
  if (!isValid) {
    throw new Error('Ano fora do intervalo permitido');
  }
  // Processar período válido
} catch (error) {
  // Tratar erro de forma segura
  setError('Período inválido. Selecione um ano entre 2020 e 2025');
}