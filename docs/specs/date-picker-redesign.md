# Especificação: Redesign do Seletor de Períodos

## 1. Visão Geral

### 1.1 Objetivo
Redesenhar o seletor de períodos para ter controles separados de mês e ano, proporcionando uma experiência mais direta e eficiente para seleção de intervalos de datas.

### 1.2 Novo Layout do Seletor
```
+---------------------------------------------------------------+
| [Mês Início ▼] [Ano Início ▼]  -  [Mês Fim ▼] [Ano Fim ▼] [▼] |
+---------------------------------------------------------------+
| Presets rápidos (Hoje, Últimos 30 dias, etc.)                |
+---------------------------------------------------------------+
```

## 2. Componentes do Novo Seletor

### 2.1 Seletores Individuais
- **Mês Início**: Dropdown com meses (Janeiro a Dezembro)
- **Ano Início**: Dropdown com anos disponíveis (2020-2025)
- **Mês Fim**: Dropdown com meses (Janeiro a Dezembro)
- **Ano Fim**: Dropdown com anos disponíveis (2020-2025)

### 2.2 Validação de Intervalo
- **Regra**: Mês/Ano Início deve ser menor ou igual a Mês/Ano Fim
- **Feedback Visual**: Bordas vermelhas em datas inválidas
- **Mensagem de Erro**: "Período inicial não pode ser posterior ao período final"

## 3. Comportamento Interativo

### 3.1 Seleção de Período
1. Usuário seleciona Mês Início
2. Usuário seleciona Ano Início
3. Usuário seleciona Mês Fim
4. Usuário seleciona Ano Fim
5. Sistema valida automaticamente o intervalo
6. Filtros são aplicados imediatamente após validação bem-sucedida

### 3.2 Presets Rápidos (Dropdown)
Ao clicar na seta final [▼]:
```
+---------------------------------------------------------------+
| Hoje (01/06/2024)                                             |
| Últimos 7 dias (25/05/2024 - 01/06/2024)                      |
| Últimos 30 dias (03/05/2024 - 01/06/2024)                     |
| Este mês (01/06/2024 - 30/06/2024)                           |
| Mês passado (01/05/2024 - 31/05/2024)                        |
| Últimos 3 meses (01/03/2024 - 31/05/2024)                    |
| Este ano (01/01/2024 - 31/12/2024)                           |
| Todo o período (01/01/2020 - 31/12/2024)                     |
+---------------------------------------------------------------+
```

## 4. Estados do Componente

### 4.1 Estado Padrão
```
[Junho ▼] [2024 ▼] - [Junho ▼] [2024 ▼] [▼]
```

### 4.2 Estado com Intervalo Selecionado
```
[Janeiro ▼] [2024 ▼] - [Março ▼] [2024 ▼] [▼]
```
*Indicador visual: bordas azuis para mostrar período ativo*

### 4.3 Estado com Erro de Validação
```
[Dezembro ▼] [2024 ▼] - [Janeiro ▼] [2024 ▼] [▼]
```
*Indicador visual: bordas vermelhas nos campos inválidos*
*Mensagem: "Período inicial não pode ser posterior ao período final"*

## 5. Wireframes Detalhados

### 5.1 Componente Principal Fechado
```
┌─────────────┬─────────────┐   ┌─────────────┬─────────────┐
│  [Mês Ini]  │  [Ano Ini]  │ - │  [Mês Fim]  │  [Ano Fim]  │ [▼]
└─────────────┴─────────────┘   └─────────────┴─────────────┘
```

### 5.2 Dropdown de Mês
```
┌─────────────┐
│ Janeiro     │
│ Fevereiro   │
│ Março       │
│ Abril       │
│ Maio        │
│ Junho       │ ← Selecionado
│ Julho       │
│ Agosto      │
│ Setembro    │
│ Outubro     │
│ Novembro    │
│ Dezembro    │
└─────────────┘
```

### 5.3 Dropdown de Ano
```
┌─────────────┐
│ 2020        │
│ 2021        │
│ 2022        │
│ 2023        │
│ 2024        │ ← Selecionado
│ 2025        │
└─────────────┘
```

### 5.4 Dropdown de Presets
```
┌─────────────────────────────────────────────────────────────┐
│ Hoje (01/06/2024)                                          │
│ Últimos 7 dias (25/05/2024 - 01/06/2024)                   │
│ Últimos 30 dias (03/05/2024 - 01/06/2024)                  │
│ Este mês (01/06/2024 - 30/06/2024)                        │
│ Mês passado (01/05/2024 - 31/05/2024)                     │
│ Últimos 3 meses (01/03/2024 - 31/05/2024)                 │
│ Este ano (01/01/2024 - 31/12/2024)                        │
│ Todo o período (01/01/2020 - 31/12/2024)                  │
└─────────────────────────────────────────────────────────────┘
```

## 6. Regras de Negócio

### 6.1 Validação de Intervalo
- Mês/Ano Início ≤ Mês/Ano Fim
- Todos os campos devem ser preenchidos para aplicar filtro
- Anos devem estar dentro do range disponível (2020-2025)

### 6.2 Feedback Visual
- **Estado Normal**: Bordas cinzas suaves
- **Foco**: Bordas azuis com sombra
- **Erro**: Bordas vermelhas com ícone de alerta
- **Sucesso**: Bordas verdes suaves

### 6.3 Persistência
- Cada aba mantém seu próprio estado de seleção
- Estado persistido em localStorage por aba
- Carregamento automático ao retornar à aba

## 7. Acessibilidade

### 7.1 Navegação por Teclado
- **Tab**: Navegar entre os 5 campos (Mês Ini, Ano Ini, Mês Fim, Ano Fim, Dropdown)
- **Setas**: Navegar dentro dos dropdowns
- **Enter/Space**: Selecionar item
- **Escape**: Fechar dropdown

### 7.2 ARIA Labels
```html
<!-- Mês Início -->
<select aria-label="Mês de início do período">
<!-- Ano Início -->
<select aria-label="Ano de início do período">
<!-- Mês Fim -->
<select aria-label="Mês de fim do período">
<!-- Ano Fim -->
<select aria-label="Ano de fim do período">
```

## 8. Responsividade

### 8.1 Desktop (1200px+)
```
[Janeiro ▼] [2024 ▼] - [Março ▼] [2024 ▼] [▼]
```

### 8.2 Tablet (768px-1199px)
```
[Jan ▼] [2024 ▼] - [Mar ▼] [2024 ▼] [▼]
```

### 8.3 Mobile (<768px)
```
[Mês/Ano Início ▼] - [Mês/Ano Fim ▼] [▼]
```

## 9. Integração com Sistema

### 9.1 Eventos Disponibilizados
```typescript
interface PeriodSelectorEvents {
  onPeriodChange: (period: PeriodRange) => void;
  onPresetSelect: (preset: PresetOption) => void;
  onError: (error: ValidationError) => void;
}

interface PeriodRange {
  startMonth: number; // 0-11
  startYear: number;  // 2020-2025
  endMonth: number;    // 0-11
  endYear: number;    // 2020-2025
}
```

### 9.2 Estado Compartilhado
```typescript
// Por aba - exemplo para aba "dashboard"
localStorage.setItem('periodState-dashboard', JSON.stringify({
  startMonth: 0,  // Janeiro
  startYear: 2024,
  endMonth: 2,    // Março
  endYear: 2024
}));
```

## 10. Critérios de Aceitação

### 10.1 Funcionalidade
- [ ] Usuário consegue selecionar mês e ano de início
- [ ] Usuário consegue selecionar mês e ano de fim
- [ ] Validação impede períodos inválidos
- [ ] Filtros são aplicados automaticamente após seleção válida
- [ ] Presets aplicam intervalos pré-definidos corretamente

### 10.2 Acessibilidade
- [ ] Navegação por teclado funciona em todos os elementos
- [ ] Leitor de tela anuncia corretamente os componentes
- [ ] Contraste mínimo de 4.5:1 em todos os textos
- [ ] Estados de foco são claramente visíveis

### 10.3 Responsividade
- [ ] Layout se adapta corretamente em telas de diferentes tamanhos
- [ ] Dropdowns permanecem usáveis em dispositivos móveis
- [ ] Textos não ficam cortados ou sobrepostos