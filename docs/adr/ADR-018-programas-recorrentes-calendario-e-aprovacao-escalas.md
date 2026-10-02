# ADR-018: Programas Recorrentes, Visão em Calendário Mensal e Aprovação de Escalas pela Liderança Departamental

## Status
Proposto (Aguardando aprovação do plano pelo usuário)

## Contexto
O processo de gestão de cultos e escalas de voluntários apresenta 4 necessidades operacionais críticas identificadas pela liderança da igreja:
1. **Criação em Massa e Recorrência de Programas**:
   - Cultos regulares ocorrem em dias fixos da semana (ex.: todos os sábados e domingos) ou em períodos contínuos (ex.: semana de oração, conferências, evangelismos de segunda a domingo).
   - Cadastrar programas individualmente, culto a culto, é ineficiente e propenso a erros.
   - O gestor deve ser capaz de esquematizar um "modelo de programa" (definindo quais departamentos participam e quantas pessoas/funções são necessárias em cada um) e aplicar uma regra de repetição por período.
2. **Visão Mensal em Formato de Calendário (Compromissos / Agenda)**:
   - Os departamentos precisam de uma visão mensal consolidada do calendário de programações e cultos para planejamento com filtros por departamento.
   - Os voluntários precisam de uma visão mensal dos seus compromissos (em quais dias e horários estão escalados no mês, estilo agenda/calendário).
3. **Notificação e Convocação dos Líderes Departamentais**:
   - Assim que os programas forem criados em massa com suas necessidades de voluntários, os líderes dos departamentos envolvidos devem receber alertas para montar o cronograma de suas equipes.
4. **Respeito à Hierarquia e Autonomia Departamental na Geração Automática de Escalas**:
   - Quando um **Líder de Departamento** aciona a ferramenta de geração automática de escalas, ela deve apresentar **apenas o(s) departamento(s) que ele lidera**, sem interferir em outras equipes.
   - Quando um **Pastor** ou **Ancião** aciona a geração automática de escala geral, o sistema não deve direcionar imediatamente a convocação ao voluntário final. Em vez disso, deve ser criada uma **pendência de aprovação** para o Líder do Departamento correspondente revisar, ajustar se necessário e aprovar a escala da sua equipe antes do envio ao voluntário.

## Decisão

1. **Extensão do Ciclo de Vida da Escala (`AssignmentStatus.PENDING_APPROVAL`)**:
   - Adicionamos o estado `PENDING_APPROVAL` ao enum `AssignmentStatus`.
   - Escalas geradas automaticamente por Pastores ou Anciãos são gravadas com `status: 'PENDING_APPROVAL'`.
   - Escalas nesse estado **não** notificam o voluntário nem aparecem como ativas na agenda dele até que o Líder do Departamento aprove.
   - Escalas geradas pelo próprio Líder de Departamento são criadas diretamente em `PENDING`, pois já contam com o aval de seu gestor operacional.

2. **Cálculo Puro de Recorrência e Contratos Zod (`@escala-igreja/domain` e `@escala-igreja/contracts`)**:
   - Criação de `createBatchProgramsSchema` com esquematização de vagas por departamento/função e regras de repetição (`WEEKLY_DAYS` ou `DAILY_RANGE`).
   - Função pura de domínio `generateRecurrenceDates` com limite de segurança de até 100 ocorrências por operação em lote para prevenir DoS acidental.

3. **Transação Atômica de Criação em Massa e Notificação (`@escala-igreja/db`)**:
   - Função `createBatchProgramsWithAudit` que gera todos os `Program`, `ProgramDepartment` e `ProgramSlot` com horários ajustados em uma transação única.
   - Identifica os gestores dos departamentos envolvidos e registra notificação/auditoria para convocação de montagem de escala.

4. **Componente de Calendário Mensal Responsivo (`apps/web`)**:
   - Em `/programas`: Alternância entre **Visão em Lista** e **Visão em Calendário Mensal**, com seletor de mês/ano e filtro departamental para visualizar a programação geral.
   - Em `/minha-escala`: Alternância entre **Minhas Escalas** e **Calendário de Compromissos do Mês**, destacando as atuações do voluntário logado com cores de status.

5. **Tela de Aprovações com Abas (`/aprovacoes`)**:
   - **Aba 1: Novos Cadastros** (aprovação de novos voluntários).
   - **Aba 2: Escalas Pendentes de Aprovação**:
     - Filtra escalas sugeridas pela liderança eclesiástica (`PENDING_APPROVAL`) para os departamentos liderados pelo usuário logado.
     - Permite aprovar individualmente, aprovar todo o culto em lote, ajustar o voluntário sugerido ou rejeitar o slot.

6. **Restrição de Escopo na Geração Automática (`/escalas`)**:
   - Restrição automática no front-end e validação anti-IDOR nas rotas `/api/escalas/gerar-preview` e `/api/escalas/aplicar-geracao`, garantindo que Líderes de Departamento só gerem para seus próprios departamentos.

## Consequências
- **Positivas**:
  - Economia massiva de tempo no planejamento trimestral e mensal de cultos e eventos.
  - Clareza total de agenda para membros e departamentos através da visão em calendário.
  - Harmonia entre a liderança eclesiástica (visão macro) e a liderança departamental (gestão operacional da equipe).
  - Segurança e conformidade rigorosa contra quebra de escopo entre congregações e departamentos.
- **Atenção / Mitigações**:
  - A geração em lote exige controle estrito de transação e rollback caso alguma validação falhe.
  - O calendário mobile deve priorizar leitura rápida com indicadores táteis e acessíveis (WCAG AA).
