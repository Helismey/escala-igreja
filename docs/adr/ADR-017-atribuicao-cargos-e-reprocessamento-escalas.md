# ADR-017: Atribuição Hierárquica de Cargos, Gestão Departamental e Reprocessamento de Escalas

## Status
Aceito

## Contexto
No sistema multi-igreja eclesiástico, voluntários e líderes necessitam ter seus cadastros atualizados de forma contínua sem que haja quebra de credenciais de login ou perda de histórico de escalas passadas.

Além disso, foram estabelecidas duas regras eclesiásticas e operacionais cruciais:
1. **Regra de Atribuição de Cargos**:
   - `ADMIN_MASTER` pode atribuir qualquer cargo (`ADMIN_MASTER`, `PASTOR`, `ELDER`, `USER`).
   - `PASTOR` pode definir todos os cargos de seu nível para baixo (pode nomear outro `PASTOR`, `ELDER` ou `USER`).
   - `ELDER` (Ancião) só pode atribuir cargos para os níveis estritamente abaixo do seu (nível `USER` e cargos departamentais). Não pode nomear outro Ancião nem cargos superiores.
   - `LÍDER DE DEPARTAMENTO` pode visualizar os voluntários do seu departamento e gerenciar sua participação/inativação no departamento.
2. **Reprocessamento Autônomo de Escalas**:
   - Ao desvincular um membro de um departamento (por um Ancião, Pastor ou Líder), o sistema não deve exigir caça manual de escalas em cada culto futuro.
   - Todas as escalas futuras ativas do membro naquele departamento são localizadas e submetidas ao motor de substituição automática (`findBestSubstituteCandidate`). Se houver substituto elegível no departamento, a escala é atribuída ao substituto (`SUBSTITUTED`); caso contrário, é marcada como `DECLINED`, abrindo vaga imediata no painel de Vagas Abertas.

## Decisão
1. **Domínio e RBAC (`can.ts`)**:
   - Refinamos `can()` para garantir que `PASTOR` possa promover membros a `PASTOR`, `ELDER` e `USER`.
   - Garantimos que `ELDER` seja estritamente impedido de promover membros a `ELDER` ou níveis acima.
   - Concedemos ao `LÍDER DE DEPARTAMENTO` permissão para visualizar detalhes e gerenciar vínculos dos membros em seus departamentos.
2. **Contratos Zod (`member.schema.ts`)**:
   - Criamos `adminUpdateMemberSchema` contemplando dados cadastrais, `globalRole`, status e `departmentUpdates`.
3. **Transações Atômicas no Banco (`transactions.ts`)**:
   - Aprimoramos `removeDepartmentMemberWithAudit` para buscar escalas futuras do membro no departamento e executar o reprocessamento autônomo.
   - Criamos `adminUpdateMemberWithAudit` para atualização atômica de dados cadastrais, garantindo que `passwordHash` e escalas vinculadas permaneçam íntegras.
4. **Interface do Usuário com Abas (`MembrosClient.tsx`)**:
   - Modal moderno com abas:
     - Aba 1: Dados Pessoais e Papel Eclesiástico (com seletor condicionado às permissões do usuário logado).
     - Aba 2: Cargos e Departamentos Vinculados (com lista de departamentos, funções e botão de desvinculação com reprocessamento automático).

## Consequências
- **Positivas**:
  - Elimina trabalho manual exaustivo de líderes ao desvincular voluntários.
  - Segurança estrita contra elevação indevida de privilégios.
  - Preservação total de credenciais de login e histórico de escalas passadas.
- **Negativas / Atenção**:
  - A desvinculação de membros de departamentos dispara reprocessamento assíncrono/transacional que deve ser protegido com lock no banco para evitar condições de corrida.
