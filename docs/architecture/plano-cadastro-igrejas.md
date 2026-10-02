# Plano de Implementação — Tela de Cadastro e Gestão de Igrejas

## 1. Visão Geral e Contexto
O sistema possui arquitetura multi-igreja, onde os dados (membros, cronogramas, departamentos e escalas) são particionados por `churchId`. Atualmente, o provisionamento de novas igrejas era realizado apenas via migrations/seed do banco de dados. 

Este plano estabelece a implementação completa da **interface de cadastro e gestão de congregações**, permitindo que administradores autorizados criem e configurem congregações diretamente pela aplicação web com total observância às regras eclesiásticas de acesso.

---

## 2. Matriz de Regras de Acesso e Permissões

| Papel | Acesso à Tela `/igrejas` | Criar Nova Igreja (`church:create`) | Editar Configurações (`church:settings:update`) | Vinculação Pastoral |
| :--- | :---: | :---: | :---: | :---: |
| **`ADMIN_MASTER`** | **Permitido** (Visualiza todas) | **Sim** | **Sim** (Qualquer igreja) | Pode selecionar quais Pastores cuidarão da igreja |
| **`PASTOR`** | **Permitido** (Visualiza suas igrejas) | **Sim** | **Sim** (Apenas de suas igrejas vinculadas) | O Pastor criador é **automaticamente vinculado** à congregação |
| **`ELDER` (Ancião)** | **Negado** (HTTP 403 / Redirecionado) | **Não** | **Não** (Bloqueado) | Não tem acesso multi-igreja |
| **`USER` (Líder / Voluntário)**| **Negado** (HTTP 403 / Redirecionado) | **Não** | **Não** (Bloqueado) | Não tem acesso multi-igreja |

> [!IMPORTANT]
> **Anti-IDOR & Escopo Restrito**: O Ancião e o Voluntário pertencem a uma única igreja e não possuem permissão `church:create` nem `church:switch`. Se tentarem acessar `/igrejas` ou disparar requisições para a API de igrejas, o sistema retornará `403 Forbidden` e registrará log de segurança.

---

## 3. Fases de Execução

### Fase 1: Contratos e Schemas Zod (`packages/contracts`)
1. **Ajuste de `church.schema.ts`**:
   - Enriquecer `createChurchSchema` com:
     - `name`: string (3-100 caracteres)
     - `slug`: string (slug válido, minúsculas, hífens)
     - `phone`: telefone de contato
     - `primaryColor` & `secondaryColor`: validação regex hex
     - `address`: objeto opcional com `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf` (2 letras), `cep`
     - `pastorIds`: array de IDs de pastores a vincular (opcional, aplicável para `ADMIN_MASTER`)
   - Criar `updateChurchSchema` para edição de congregações existentes.
2. **Atualização do índice de contratos** e sincronização de tipos (`pnpm build`).

---

### Fase 2: Camada de Dados e Transações (`packages/db`)
1. **Transação `createChurchWithAudit`**:
   - Cria o registro na tabela `Church`.
   - Se o ator for `PASTOR`, vincula automaticamente o ator na tabela `PastorChurch`.
   - Se o ator for `ADMIN_MASTER` e foram fornecidos `pastorIds`, cria os registros em `PastorChurch` para cada pastor selecionado.
   - Cria o registro de auditoria (`AuditLog`) com `action: 'CHURCH_CREATE'`.
2. **Transação `updateChurchWithAudit`**:
   - Atualiza dados da congregação (`name`, `phone`, `primaryColor`, `secondaryColor`, `address`).
   - Se `ADMIN_MASTER`, permite atualizar o conjunto de pastores vinculados (`PastorChurch`).
   - Registra log de auditoria com `action: 'CHURCH_UPDATE'`.

---

### Fase 3: Rotas de API Backend (`apps/web/src/app/api/igrejas`)
1. **`GET /api/igrejas`**:
   - Protegida por `getCurrentUserContext()`.
   - Retorna congregações disponíveis:
     - Para `ADMIN_MASTER`: todas as congregações cadastradas com contagem de membros, departamentos e pastores vinculados.
     - Para `PASTOR`: congregações associadas ao pastor (`pastorChurchIds`).
     - Para outros perfis: `403 Forbidden`.
2. **`POST /api/igrejas`**:
   - Protegida por `can(userContext, 'church:create')`.
   - Valida payload com `createChurchSchema`.
   - Chama a transação de criação.
   - Retorna HTTP 201 com dados da congregação criada.
3. **`PUT /api/igrejas`**:
   - Protegida por `can(userContext, 'church:settings:update', { churchId })`.
   - Atualiza os dados cadastrais da congregação.

---

### Fase 4: Interface do Usuário e Telas (`apps/web`)
1. **Menu de Navegação (`menu.ts` e `Navbar.tsx`)**:
   - Registrar item `Congregações` (`/igrejas`) no grupo `administracao` com ícone `Church` e permissão `requires: 'church:create'`.
   - Incluir ícone `Church` no `ICON_MAP` da `Navbar`.
2. **Página Server Component `/igrejas/page.tsx`**:
   - Validação de sessão e permissão no servidor (`can(user, 'church:create')`). Redireciona para `/` se não autorizado.
   - Carrega as igrejas do banco e lista de pastores disponíveis (caso seja `ADMIN_MASTER`).
3. **Componente Cliente `/igrejas/IgrejasClient.tsx`**:
   - **Listagem de Congregações**: cards com nome, slug, cidade/UF, cores da identidade visual, pastores responsáveis e botão "Alternar para esta congregação".
   - **Botão e Modal "Nova Congregação"**:
     - Dados básicos: Nome, slug (gerado automaticamente via input do nome com opção de edição).
     - Endereço completo (com máscara de CEP e select de UF).
     - Contato telefônico.
     - Seletor de cores da congregação com preview visual.
     - Seção de seleção de pastores (visível apenas para `ADMIN_MASTER`).
   - **Feedback e UX**: Notificação toast de sucesso/erro e recarregamento dos dados.

---

### Fase 5: Testes Automatizados e Build
1. **Testes Unitários de Domínio (`church-contracts.test.ts` e `authz.test.ts`)**:
   - Teste do schema Zod `createChurchSchema` (campos válidos, inválidos, formatação de cores e slug).
   - Teste de autorização: `ADMIN_MASTER` e `PASTOR` permitidos; `ELDER` e `USER` bloqueados com 403.
2. **Execução de Testes da Suíte**: `pnpm test`.
3. **Verificação de Compilação**: `pnpm --filter @revezo/web build`.

---

## 4. Checklist de Aceitação
- [ ] Rota `/igrejas` protegida (apenas `ADMIN_MASTER` e `PASTOR` acessam; `ELDER` e `USER` bloqueados).
- [ ] Formulário de cadastro valida campos com Zod no cliente e no servidor.
- [ ] Criação de igreja por Pastor vincula automaticamente o pastor criador.
- [ ] Criação de igreja por Admin Master permite associar um ou mais pastores.
- [ ] Seletor de igrejas na `Navbar` reflete imediatamente a nova congregação criada.
- [ ] Logs de auditoria registram a criação com sucesso.
- [ ] 100% dos testes unitários e de integração passando.
- [ ] Build de produção do Next.js passando com 0 erros.
