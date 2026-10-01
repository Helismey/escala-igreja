# Fase 0: bootstrap do monorepo (sem funcionalidades de negócio)

Objetivo: deixar a base pronta, com qualidade, segurança e testes funcionando, antes da Fase 1.

## Escopo
1. **Monorepo pnpm**: `apps/web`, `packages/domain`, `packages/contracts`, `packages/db`, com TypeScript estrito e `pnpm-workspace.yaml`.
2. **apps/web**: Next.js (App Router) + Tailwind. Copiar `docs/design/tokens.css` para `apps/web/src/styles/tokens.css` e ligar os tokens ao Tailwind (nada de cor, fonte ou raio fixos). Fontes Bricolage Grotesque e Public Sans auto-hospedadas (confirmar licença). Phosphor via `@phosphor-icons/react`, importando ícone por ícone.
3. **Página de verificação** (descartável): renderiza tokens, fontes, um botão primário e três ícones, só para conferir o setup. Sem lógica de negócio.
4. **packages/db**: Prisma com o `schema.prisma` já existente (validar e gerar o client); `docker-compose.yml` com PostgreSQL local; nenhum acesso a banco real.
5. **Qualidade**: ESLint, Prettier, `tsc --noEmit`, Conventional Commits.
6. **Testes**: Vitest (domínio e web), fast-check no domínio, Vitest de integração com PostgreSQL, Playwright com projetos celular e desktop e axe, configuração do Stryker no domínio. Um teste de exemplo em cada camada. Adaptador de notificação falso e `NOTIFICATIONS_DRIVER=fake` nos testes.
7. **Segurança**: cabeçalhos (CSP, HSTS, nosniff, Referrer-Policy, frame-ancestors, Permissions-Policy) em `next.config`; rota `/api/v1/health` sem dados; teste automático dos cabeçalhos.
8. **Scripts** na raiz: `lint`, `typecheck`, `test`, `test:unit`, `test:int`, `test:e2e`, `test:e2e:smoke`, `test:mutation`, `test:perf` (pode ser espaço reservado), `build`, `db:migrate:dev`.
9. **CI**: ajustar `.github/workflows/ci.yml` e `nightly.yml` aos scripts reais (confirmar versões atuais das ações e fixá-las).
10. **Arquivos**: `.env.example` e `.env.test.example` completos e sem valores reais; `.gitignore` conferido; `README.md` com como rodar.

## Critérios de aceite
- `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck` e `pnpm test` passam.
- Cada camada de teste tem ao menos um teste passando, incluindo o de cabeçalhos.
- `pnpm dev` abre a página de verificação com os tokens, as fontes e os ícones.
- Nenhum segredo no repositório; varredura de segredos e `pnpm audit` sem achados altos ou críticos.
- Relatório final: o que foi criado, o que passou, o que falhou, versões escolhidas e decisões pendentes.

## Fora do escopo
Autenticação, telas de negócio, motor de escala, notificações reais, mobile.
