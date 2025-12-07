# Histórias de Usuário: Otimização do Seletor de Datas

## Épico: Melhoria da Experiência de Seleção de Datas

### História 1: Seleção Básica de Intervalo
**Como** um usuário do sistema financeiro
**Quero** selecionar um intervalo de períodos (início e fim)
**Para que** eu possa filtrar os dados exibidos em cada aba

**Critérios de Aceitação:**
- Dado que estou em qualquer aba do sistema
- Quando clico no seletor de datas
- Então posso selecionar um mês e ano de início e um mês e ano de fim
- E o filtro é aplicado automaticamente após selecionar todos os campos

### História 2: Uso de Presets Otimizados
**Como** um usuário frequente
**Quero** utilizar presets de datas otimizados
**Para que** eu possa aplicar filtros comuns rapidamente

**Critérios de Aceitação:**
- Dado que estou em qualquer aba do sistema
- Quando clico no seletor de datas
- Então vejo uma lista de presets úteis (Hoje, Últimos 7 dias, etc.)
- E ao selecionar um preset, o filtro é aplicado imediatamente

### História 3: Persistência de Estado por Aba
**Como** um usuário que navega entre abas
**Quero** que cada aba mantenha seu próprio intervalo de datas
**Para que** eu possa comparar diferentes períodos em abas diferentes

**Critérios de Aceitação:**
- Dado que selecionei um intervalo na aba "Dashboard"
- Quando navego para a aba "Relatórios"
- E seleciono um intervalo diferente
- E retorno para a aba "Dashboard"
- Então vejo o intervalo que havia selecionado anteriormente

### História 4: Validação de Intervalo
**Como** um usuário selecionando datas
**Quero** receber feedback imediato sobre erros de intervalo
**Para que** eu possa corrigir períodos inválidos rapidamente

**Critérios de Aceitação:**
- Dado que selecionei um período de início posterior ao período de fim
- Quando tento aplicar o filtro
- Então vejo uma mensagem de erro clara
- E o intervalo não é aplicado

### História 5: Acessibilidade do Seletor
**Como** um usuário com deficiência visual
**Quero** utilizar o seletor de datas com leitor de tela
**Para que** eu possa filtrar dados de forma independente

**Critérios de Aceitação:**
- Dado que estou utilizando um leitor de tela
- Quando navego pelo seletor de datas
- Então todos os elementos são anunciados corretamente
- E posso selecionar períodos e aplicar filtros usando apenas o teclado

## Cenários de Teste Detalhados

### Cenário 1: Seleção de Intervalo Básico
**Dado** que estou na aba "Dashboard"
**E** o seletor de datas está visível
**Quando** seleciono "Janeiro" e "2024" como início
**E** seleciono "Março" e "2024" como fim
**Então** os dados da aba devem ser filtrados para esse período
**E** o seletor deve mostrar "Janeiro 2024 - Março 2024"

### Cenário 2: Uso de Preset "Últimos 3 meses"
**Dado** que estou na aba "Transações"
**Quando** clico no seletor de datas
**E** seleciono o preset "Últimos 3 meses"
**Então** o filtro deve ser aplicado automaticamente
**E** os dados devem mostrar transações dos últimos 3 meses

### Cenário 3: Navegação entre Abas com Estados Diferentes
**Dado** que estou na aba "Investimentos" com intervalo "Janeiro 2024 - Março 2024"
**Quando** navego para a aba "Empréstimos"
**E** seleciono o intervalo "Abril 2024 - Junho 2024"
**E** retorno para a aba "Investimentos"
**Então** o intervalo da aba "Investimentos" deve permanecer "Janeiro 2024 - Março 2024"

### Cenário 4: Validação de Intervalo Inválido
**Dado** que estou selecionando períodos
**Quando** escolho "Dezembro 2024" como início
**E** escolho "Janeiro 2024" como fim
**Então** devo ver uma mensagem de erro "Período inicial não pode ser posterior ao período final"
**E** o intervalo não deve ser aplicado

### Cenário 5: Acessibilidade com Navegação por Teclado
**Dado** que estou na aba "Relatórios" usando apenas o teclado
**Quando** pressiono Tab até o seletor de datas
**E** pressiono Enter para abrir o dropdown de mês início
**E** navego pelas opções usando as setas
**E** seleciono "Janeiro" com Enter
**E** pressiono Tab para o dropdown de ano início
**E** seleciono "2024"
**E** pressiono Tab para o dropdown de mês fim
**E** seleciono "Março"
**E** pressiono Tab para o dropdown de ano fim
**E** seleciono "2024"
**Então** o filtro deve ser aplicado automaticamente