---
name: corrigir-bug
description: Use para corrigir bugs com teste que reproduz o problema primeiro.
---

# Corrigir bug

1. Reproduzir e descrever a causa raiz (não só o sintoma).
2. Escrever um teste que falha.
3. Corrigir com a menor mudança possível.
4. Rodar `pnpm lint && pnpm typecheck && pnpm test`.
5. Se o bug tiver impacto de segurança ou de dados, seguir /incidente e registrar em auditoria.
