# Padrões de código (sempre ativa)

- TypeScript `strict`. Sem `any` sem justificativa em comentário.
- Validação de entrada com Zod em toda Server Action e rota de API.
- Regras de negócio ficam em `packages/domain/src/` (funções puras, testáveis). UI e rotas só orquestram.
- Estrutura (monorepo): `apps/web/src/app` (rotas), `packages/domain/src` (escala, conflito, substituição, autorização), `packages/contracts` (schemas Zod), `apps/web/src/services` (banco, notificações), `apps/web/src/components`, `apps/web/src/lib`.
- Funções pequenas, nomes claros, sem duplicação. Erros tratados e propagados com mensagens úteis.
- Migrations Prisma versionadas; nunca editar migration já aplicada.
- Commits no padrão Conventional Commits.
