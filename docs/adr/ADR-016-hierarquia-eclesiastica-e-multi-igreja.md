# ADR-016: Hierarquia Eclesiástica, Isolamento Multi-Igreja e Proteção Hierárquica de Recursos

**Status:** Aceita | **Data:** 2026-10-01 | **Responsável:** Equipe Escala Igreja

## Contexto
O sistema foi concebido originalmente com escopo monousuário/igreja única configurada via `ChurchSettings`. Com a expansão do uso para congregações coordenadas por liderança pastoral regional, surgiu a necessidade de:
1. Um papel **Pastor Master** com escopo multi-igreja para gestão completa de suas congregações, porém **sem permissão para alterar regras técnicas do sistema** (gateways de mensageria, SMTP, webhooks e flags de infraestrutura).
2. Um papel **Ancião** para administração local de **1 única congregação**, capaz de criar cronogramas e aceitar novos membros, vinculado exclusivamente por um Pastor ou Admin Master.
3. Uma regra de **proteção hierárquica**: níveis inferiores (ex.: Ancião) não podem alterar nem excluir dados cadastrados por níveis superiores (Pastor ou Admin Master).
4. **Isolamento estrito (anti-IDOR)**: Anciãos, Líderes de departamento e Voluntários devem ter acesso restrito à sua própria congregação, sem permissão para consultar ou modificar dados de outras igrejas.

## Decisão
1. **Modelagem Multi-Tenant Lógica no PostgreSQL (Prisma):**
   - Criação da tabela `Church` com chave de particionamento `churchId` nas entidades centrais (`User`, `Department`, `Program`, `AuditLog`).
   - Relação Many-to-Many `PastorChurch` para permitir que pastores administrem múltiplos templos, enquanto Anciãos, Líderes e Voluntários têm `churchId` escalar único no registro de `User`.
2. **Hierarquia de Papéis Numérica (`ROLE_HIERARCHY_LEVEL`):**
   - `ADMIN_MASTER`: Nível 4 (Acesso global técnico e operacional).
   - `PASTOR`: Nível 3 (Acesso operacional multi-igreja; ação `system:technical:manage` negada por padrão).
   - `ELDER`: Nível 2 (Acesso operacional local da sua igreja; imutabilidade de recursos de níveis 3 e 4).
   - `USER`: Nível 1 (Líder setorial e voluntário da sua congregação).
3. **Mecanismo Centralizado de Proteção Hierárquica:**
   - Adicionados metadados `createdById` e `createdByRole` em `Program` e `Department`.
   - A função `canModifyResourceByHierarchy(userRole, resourceCreatedByRole)` compara os níveis e impede mutação/exclusão por usuários de nível inferior.
4. **Contexto Ativo e Seletor de Congregação:**
   - Para o Pastor e Admin, a congregação ativa é alternada via seletor na interface e persistida através de cookie HTTP seguro `active_church_id`.
   - As telas e rotas de API leem o `activeChurchId` e validam o escopo em tempo de execução via `can(userContext, action, { churchId })`.

## Consequências
- **Positivas:**
  - Atendimento fiel à estrutura organizacional da igreja (Pastor regional, Anciãos locais, Líderes e Voluntários).
  - Segurança aprofundada contra acesso indevido entre congregações (anti-IDOR) e contra sobrescrita acidental de diretrizes pastorais.
  - Custo zero adicional: aproveitamento do mesmo banco relacional mantendo conformidade com as regras de performance e LGPD.
- **Ressalvas:**
  - Todas as novas queries e rotas de API devem sempre incluir o filtro `churchId: activeChurchId` para evitar vazamento acidental de registros entre congregações.
