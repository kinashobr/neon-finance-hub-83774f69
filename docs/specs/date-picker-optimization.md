# Especificação: Otimização do Seletor de Datas Global

## 1. Visão Geral

### 1.1 Objetivo
Otimizar o seletor de datas para ser visualmente atraente, funcional e direto ao ponto, com consistência entre abas e integração com as opções de período existentes.

### 1.2 Escopo
- Redesenho do componente de seleção de datas com controles separados por mês/ano
- Implementação de seleção de intervalo (início-fim)
- Otimização dos presets existentes
- Compatibilidade com todas as abas do sistema
- Manutenção da experiência do usuário desktop

## 2. Requisitos Funcionais

### 2.1 Seleção de Intervalo de Datas
- **RF-001**: Permitir seleção de mês e ano de início
- **RF-002**: Permitir seleção de mês e ano de fim
- **RF-003**: Validar que período de início seja menor ou igual ao período de fim
- **RF-004**: Aplicar automaticamente o filtro ao selecionar todos os campos
- **RF-005**: Mostrar visualmente o intervalo selecionado

### 2.2 Presets de Data Otimizados
- **RF-006**: Substituir presets redundantes por opções mais úteis:
  - Hoje
  - Últimos 7 dias
  - Últimos 30 dias
  - Este mês
  - Mês passado
  - Últimos 3 meses
  - Este ano
  - Todo o período

### 2.3 Comportamento por Aba
- **RF-007**: Cada aba mantém seu próprio estado de seleção de datas
- **RF-008**: Estado é persistido ao navegar entre abas
- **RF-009**: Resetar para padrão ao recarregar a aplicação

### 2.4 Feedback Visual
- **RF-010**: Indicar visualmente quando um filtro de data está ativo
- **RF-011**: Mostrar períodos selecionados de forma clara
- **RF-012**: Feedback imediato ao aplicar filtros

## 3. Requisitos Não-Funcionais

### 3.1 Usabilidade
- **RNF-001**: Interface intuitiva seguindo padrões comuns de seletores
- **RNF-002**: Navegação por teclado totalmente suportada
- **RNF-003**: Tempo de resposta inferior a 100ms para aplicação de filtros

### 3.2 Acessibilidade
- **RNF-004**: Compatível com leitores de tela (ARIA labels)
- **RNF-005**: Contraste mínimo de 4.5:1 para texto
- **RNF-006**: Foco visível em elementos interativos

### 3.3 Internacionalização
- **RNF-007**: Formato de data em português (mm/yyyy)
- **RNF-008**: Textos localizados em português brasileiro

## 4. Critérios de Aceitação

### 4.1 Funcionalidade Básica
- [ ] Usuário consegue selecionar mês e ano de início e fim
- [ ] Validação impede períodos inválidos (início > fim)
- [ ] Filtros são aplicados automaticamente
- [ ] Estado é mantido ao navegar entre abas

### 4.2 Presets
- [ ] Todos os presets listados estão funcionando
- [ ] Presets redundantes foram removidos
- [ ] Seleção de preset aplica filtro imediatamente

### 4.3 Acessibilidade
- [ ] Navegação por teclado funciona corretamente
- [ ] Leitor de tela consegue interpretar o componente
- [ ] Contraste atende aos requisitos mínimos

## 5. Wireframes de Interface

### 5.1 Componente Principal Fechado
```
┌─────────────┬─────────────┐   ┌─────────────┬─────────────┐   ┌─────┐
│  [Mês Ini]  │  [Ano Ini]  │ - │  [Mês Fim]  │  [Ano Fim]  │ [ ▼ ]
└─────────────┴─────────────┘   └─────────────┴─────────────┘   └─────┘
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
│ Hoje (06/2024)                                             │
│ Últimos 7 dias (25/05/2024 - 01/06/2024)                  │
│ Últimos 30 dias (03/05/2024 - 01/06/2024)                 │
│ Este mês (06/2024)                                        │
│ Mês passado (05/2024)                                    │
│ Últimos 3 meses (03/2024 - 05/2024)                      │
│ Este ano (01/2024 - 12/2024)                             │
│ Todo o período (01/2020 - 12/2024)                        │
└─────────────────────────────────────────────────────────────┘
```

## 6. Regras de Validação

### 6.1 Validação de Intervalo
- Mês/Ano Início deve ser menor ou igual a Mês/Ano Fim
- Todos os campos devem ser preenchidos para aplicar filtro

### 6.2 Mensagens de Erro
- "Período inicial não pode ser posterior ao período final"
- "Selecione todos os campos para aplicar o filtro"

## 7. Fluxos de Usuário

### 7.1 Seleção Básica de Intervalo
1. Usuário clica no seletor de datas
2. Seleciona mês de início
3. Seleciona ano de início
4. Seleciona mês de fim
5. Seleciona ano de fim
6. Filtros são aplicados automaticamente

### 7.2 Uso de Presets
1. Usuário clica no seletor de datas
2. Seleciona um preset (ex: "Últimos 30 dias")
3. Filtros são aplicados automaticamente

### 7.3 Navegação entre Abas
1. Usuário seleciona um intervalo na aba A
2. Navega para aba B
3. Aba B mantém seu próprio intervalo
4. Usuário retorna para aba A
5. Aba A mantém o intervalo anterior

## 8. Considerações Técnicas

### 8.1 Persistência de Estado
- Utilizar localStorage para manter estado por aba
- Chave: `periodState-{tabName}`

### 8.2 Performance
- Debounce de 300ms para aplicação de filtros
- Memoização de cálculos baseados em períodos

### 8.3 Compatibilidade
- Otimizado para desktop
- Suporte a navegadores modernos (Chrome, Firefox, Edge, Safari)

## 9. Plano de Testes

### 9.1 Testes Funcionais
- Seleção de períodos individuais
- Aplicação de presets
- Validação de intervalos
- Navegação entre abas

### 9.2 Testes de Acessibilidade
- Navegação por teclado
- Compatibilidade com leitores de tela
- Contraste de cores

### 9.3 Testes de Usabilidade
- Tempo para completar tarefas comuns
- Taxa de sucesso em cenários de uso
- Feedback de usuários beta

## 10. Métricas de Sucesso

- Tempo médio para aplicar filtro de datas: < 5 segundos
- Taxa de sucesso em primeira tentativa: > 95%
- Satisfação do usuário com o componente: > 4/5
- Tempo de resposta do filtro: < 100ms