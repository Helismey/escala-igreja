# Plano de Implementação Revisado — Edição de Voluntários, Gestão de Cargos e Reprocessamento de Escalas

## 1. Visão Geral e Novos Requisitos
Com base nas orientações de gestão eclesiástica, aprimoramos o plano de edição de voluntários para incluir:
1. **Regra de Nomeação e Atribuição de Cargos Refinada**:
   - `ADMIN_MASTER` (Nível 4): pode nomear e definir qualquer cargo (`ADMIN_MASTER`, `PASTOR`, `ELDER`, `USER`).
   - `PASTOR` (Nível 3): pode nomear e definir todos os cargos de seu nível para baixo (**pode nomear outro PASTOR**, `ELDER` e `USER`).
   - `ELDER` (Ancião - Nível 2): **só pode atribuir cargos para os níveis estritamente abaixo do seu** (nível `USER` / Voluntário e cargos departamentais). **Não pode nomear outro Ancião**, nem Pastor, nem Admin.
   - `LÍDER DE DEPARTAMENTO` (Nível 1 + Gestor): pode acessar a tela de detalhes dos voluntários do seu departamento e gerenciar a participação/inativação deles no departamento.
2. **Modal com Abas**:
   - **Aba 1: Dados Cadastrais & Papel Eclesiástico**: Nome, e-mail, telefones, status geral (`ACTIVE`, `PENDING`, `INACTIVE`), menor de idade/responsável, notas e seletor de papel eclesiástico (`globalRole`) conforme a matriz hierárquica.
   - **Aba 2: Cargos e Departamentos Vinculados**: Visualização clara de todos os departamentos onde o membro atua, funções exercidas, papel departamental (`Membro` ou `Líder/Gestor`) e botão para desvincular ou adicionar novos departamentos.
3. **Reprocessamento Automático de Escalas na Desvinculação**:
   - Quando um membro for desvinculado de um departamento (por um Ancião, Pastor ou Líder), o sistema **não exige que o usuário vá manualmente de culto em culto**:
   - Todas as escalas futuras ativas do membro naquele departamento (`status in ['PENDING', 'CONFIRMED']` com data `>= hoje`) são imediatamente reprocessadas:
     - O sistema aciona o motor de substituição automática (`findBestSubstituteCandidate`), buscando outro voluntário elegível no departamento.
     - Se encontrar, gera o novo `Assignment` para o substituto e marca a escala original como `SUBSTITUTED` (motivo: *Desvinculado do departamento*).
     - Se não houver substituto disponível no momento, marca como `DECLINED`, abrindo a vaga automaticamente no painel de **Vagas Abertas** (`/slots-abertos`).
4. **Integridade de Credenciais e Histórico**:
   - Senha de login (`passwordHash`) mantida 100% íntegra e sem alteração.
   - Escalas passadas mantidas intactas para fins de histórico e auditoria.

---

## 2. Matriz Hierárquica de Nomeação de Cargos

| Papel do Ator | Pode Nomear `ADMIN_MASTER`? | Pode Nomear `PASTOR`? | Pode Nomear `ELDER` (Ancião)? | Pode Nomear `USER` (Voluntário)? | Pode Gerenciar Deptos? |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`ADMIN_MASTER`** | **Sim** | **Sim** | **Sim** | **Sim** | Todas as congregações |
| **`PASTOR`** | **Não** | **Sim** (Pode nomear outro Pastor) | **Sim** (Pode nomear Ancião) | **Sim** | Suas congregações |
| **`ELDER`** | **Não** | **Não** | **Não** (Não pode nomear outro Ancião) | **Sim** | Sua congregação |
| **`LÍDER DEPTO`** | **Não** | **Não** | **Não** | Não altera papel global | Seus departamentos |

---

## 3. Fases de Execução

### Fase 1: Domínio e Contratos (`packages/domain` e `packages/contracts`)
1. **Ajustar `can.ts` no Domínio**:
   - Atualizar regra de `profile:update:other`:
     - `PASTOR`: pode atribuir `newRole` para `PASTOR`, `ELDER` ou `USER` (bloqueado apenas para `ADMIN_MASTER` e auto-rebaixamento).
     - `ELDER`: pode gerenciar voluntários de nível `USER`, mas se fornecer `newRole >= ELDER`, retorna `false` (Ancião só pode atribuir para níveis estritamente abaixo do seu).
     - `DEPARTMENT_LEADER`: pode visualizar detalhes (`profile:view:other`) e gerenciar membros dos seus departamentos (`department:member:update`, `department:member:remove`).
2. **Atualizar `member.schema.ts`**:
   - `adminUpdateMemberSchema`:
     - `userId`: string
     - `name`, `email`, `phonePrimary`, `whatsapp`, `birthDate`, `notes`, `isMinor`, `guardianName`, `guardianPhone`
     - `status`: `'ACTIVE' | 'PENDING' | 'INACTIVE'`
     - `globalRole`: `'USER' | 'ELDER' | 'PASTOR'` (opcional)
     - `departmentUpdates`: array com `{ departmentId, action: 'ADD' | 'REMOVE' | 'UPDATE_FUNCTIONS', functionIds?, role? }`
3. **Recompilar pacotes**: `pnpm --filter @revezo/domain build` e `pnpm --filter @revezo/contracts build`.

---

### Fase 2: Transações no Banco com Reprocessamento de Escalas (`packages/db`)
1. **Aprimorar `removeDepartmentMemberWithAudit` e criar `adminUpdateMemberWithAudit`**:
   - Na desvinculação de um membro de um departamento:
     1. Remove funções e vínculo na tabela `DepartmentMember`.
     2. Localiza todas as escalas futuras do membro no departamento (`Assignment` onde `slot.departmentId === departmentId` e `slot.program.date >= now`).
     3. Para cada escala futura:
        - Tenta substituição automática com voluntário elegível do departamento via `findBestSubstituteCandidate`.
        - Se encontrar substituto: atualiza para `SUBSTITUTED` e cria novo `Assignment` para o substituto.
        - Se não encontrar: atualiza para `DECLINED`, abrindo o slot para preenchimento.
     4. Registra `AuditLog` detalhado com `DEPARTMENT_MEMBER_REMOVED` e `ASSIGNMENT_AUTO_REPROCESSED`.
   - Na atualização de dados cadastrais:
     - Validação atômica de e-mail e preservação total de `passwordHash`.
     - Atualização de status e papel conforme permissões validadas.
2. **Recompilar pacote de banco**: `pnpm --filter @revezo/db build`.

---

### Fase 3: Rotas de API Backend (`apps/web/src/app/api/membros`)
1. **Implementar `PUT /api/membros`**:
   - Protegido por `getCurrentUserContext()`.
   - Valida payload com `adminUpdateMemberSchema`.
   - Valida regras hierárquicas e escopo da congregação.
   - Executa a transação atômica e retorna os dados atualizados com o status das escalas reprocessadas.
2. **Endpoint auxiliar ou ação para desvinculação direta de departamento**:
   - Permite chamar a desvinculação diretamente pela aba de departamentos do modal.

---

### Fase 4: Interface do Usuário na Tela de Membros (`apps/web`)
1. **Acesso do Líder de Departamento**:
   - Líder visualiza os membros que pertencem ao seu departamento, com botão "Detalhes / Editar".
2. **Modal com Abas em `MembrosClient.tsx`**:
   - **Cabeçalho**: Foto/Avatar, Nome, E-mail e badges de status e papel atual.
   - **Aba 1 — Dados Pessoais & Papel**:
     - Campos: Nome, E-mail, Telefones, Status (`Ativo`, `Pendente`, `Inativo`).
     - Seletor de Papel Eclesiástico:
       - Para Pastor: opções `Pastor`, `Ancião`, `Voluntário`.
       - Para Admin: todas as opções.
       - Para Ancião: campo desabilitado com aviso explicativo *"Anciãos só podem alterar dados de voluntários e níveis departamentais"*.
     - Seção menor de idade (nome e telefone do responsável).
     - Notas / Observações.
   - **Aba 2 — Cargos e Departamentos Vinculados**:
     - Lista dos departamentos vinculados com as funções atribuídas.
     - Indicador se é Membro ou Gestor/Líder no departamento.
     - Botão de ação rápida: **"❌ Desvincular do Departamento"**.
     - Modal de confirmação alertando sobre o reprocessamento automático das escalas futuras.
     - Opção de vincular novo departamento com funções.
3. **Feedback e UX**:
   - Notificação com `AlertBanner` informando as alterações e quantas escalas futuras foram reprocessadas/substituídas.

---

### Fase 5: Testes Automatizados e Build
1. **Testes Unitários de Domínio**:
   - Testar que Pastor pode nomear Pastor, Ancião e Voluntário.
   - Testar que Ancião NÃO pode nomear Ancião nem Pastor (apenas Voluntário).
   - Testar regras de autorização do Líder de Departamento.
2. **Testes de Integração de Reprocessamento de Escalas**:
   - Testar que desvincular um membro de um departamento reprocessa suas escalas futuras automaticamente sem apagar escalas passadas.
3. **Execução de Testes e Build**:
   - `pnpm test`
   - `pnpm --filter @revezo/web build`

---

## 4. Checklist de Aceitação
- [ ] Pastor pode nomear outro Pastor, Ancião ou Voluntário.
- [ ] Ancião só pode atribuir cargos para níveis abaixo do seu (não pode nomear outro Ancião).
- [ ] Líder de departamento tem acesso aos detalhes e inativação de voluntários do seu departamento.
- [ ] Modal de edição possui aba dedicada de "Cargos e Departamentos Vinculados".
- [ ] Desvincular voluntário de um departamento reprocessa automaticamente suas escalas futuras (busca substituto ou abre vaga).
- [ ] Credenciais de login (`passwordHash`) permanecem 100% intocadas.
- [ ] Histórico de escalas passadas permanece íntegro.
- [ ] 100% dos testes passando e compilação Next.js com status 0.
