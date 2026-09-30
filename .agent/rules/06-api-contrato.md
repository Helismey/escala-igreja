# API e contratos (sempre ativa)

- Toda rota e Server Action valida entrada com schema Zod de `packages/contracts`. Nada de `any` vindo do cliente.
- API versionada em `/api/v1`. Casos de uso ficam em `packages/domain` e são expostos por rotas finas; a interface web e o futuro app usam o mesmo contrato.
- Erros padronizados: `{ code, message }` com `message` em pt-BR, sem detalhes internos. Códigos HTTP corretos (400, 401, 403, 404, 409, 422, 429).
- Paginação obrigatória em listas (`limit` máximo 100). Nunca retornar entidade Prisma crua: mapear para DTO com só os campos permitidos ao perfil.
- Idempotência em ações repetíveis (confirmar presença, enviar lembrete).
