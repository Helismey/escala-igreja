# Testes e qualidade (sempre ativa)

- Motor de escala (`packages/domain/src`) com cobertura alta: conflito de horário, limite de 2/dia, preferência, substituição, slot aberto.
- Testes unitários com Vitest; fluxos críticos com Playwright (login, cadastro pendente, criar programa, desmarcar e substituir).
- Toda correção de bug começa com um teste que falha.
- Antes de concluir uma tarefa: `pnpm lint`, `pnpm typecheck`, `pnpm test`.
- Toda mudança relevante de decisão técnica gera ADR em `docs/adr/`.
- Testes de segurança obrigatórios: matriz de autorização por perfil e escopo, rate limit de login, expiração e reuso de tokens, upload inválido, webhook com assinatura inválida, concorrência de atribuição (skills seguranca-autorizacao-rbac e testes-de-concorrencia).
