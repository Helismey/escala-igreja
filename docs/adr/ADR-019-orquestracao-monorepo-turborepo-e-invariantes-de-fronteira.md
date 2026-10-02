# ADR-019: Orquestração do Monorepo com Turborepo e Invariantes de Fronteira

**Status:** Aprovada | **Data:** 2026-10-01

## Contexto
O projeto **Revezo** é estruturado como monorepo pnpm composto por 4 módulos: `apps/web`, `packages/contracts`, `packages/domain` e `packages/db`.
Anteriormente, os scripts de build e checagem eram orquestrados de forma sequencial ou via filtros manuais do pnpm (`pnpm -r --filter=!@revezo/web build && pnpm --filter @revezo/web build`). Com o crescimento de telas, rotas de API e suítes de teste (274 testes ativos), esse modelo apresentava:
1. Recompilação desnecessária de pacotes internos inalterados.
2. Tempo de validação de tipos e lint redundante em pipelines de CI gratuitos (consumo de minutos do GitHub Actions).
3. Risco de acoplamento acidental se as fronteiras entre domínio puro, persistência e UI não forem formalmente governadas.

## Decisão
1. **Adoção do Turborepo (`turbo`)**:
   - Introduzir o Turborepo como motor de orquestração de tarefas e cache de compilação sem custos adicionais.
   - Declarar o pipeline topológico em `turbo.json`, garantindo que dependências (`^build`) sejam construídas antes dos seus consumidores.
   - Habilitar memoização local de saídas (`dist/**`, `.next/**`, typecheck e lint).

2. **Formalização das Invariantes de Fronteira (Clean Architecture / Domain Purity)**:
   - `@revezo/domain`: Camada de domínio 100% pura. Proibida qualquer dependência de I/O, `@prisma/client`, `react` ou `next`.
   - `@revezo/contracts`: Apenas esquemas Zod e tipos estáticos.
   - `@revezo/db`: Encapsula a persistência PostgreSQL e o Prisma.
   - `apps/web`: Consome os pacotes sem vazar dependências para as camadas inferiores.

3. **Compatibilidade dos Scripts**:
   - Manter os comandos padrão do `package.json` (`build`, `typecheck`, `lint`) delegando transparentemente para o `turbo`, com opção de fallback (`build:raw`).

## Consequências

### Positivas
- **Velocidade Extrema (Full Turbo)**: Reavaliações de `typecheck` e `build` caem de 5-10 segundos para menos de 30-50 milissegundos quando inalterados.
- **Economia no Free Tier do CI**: Execuções no GitHub Actions aproveitam cache de compilação e validações concorrentes, economizando a cota mensal de 2.000 minutos.
- **Prontidão Multiplataforma**: A pureza do `@revezo/domain` garante que o mesmo motor de regras possa ser reutilizado pelo app móvel nativo ou PWA.

### Negativas / Mitigações
- Adição da dependência de desenvolvimento `turbo`. **Mitigação**: O `turbo` é mantido pela Vercel, opera como binário leve, compatível com a stack Next.js já adotada, sem custos e sem overhead em tempo de execução de produção.
