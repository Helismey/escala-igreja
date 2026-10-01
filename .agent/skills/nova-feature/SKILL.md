---
name: nova-feature
description: Use para implementar uma nova funcionalidade seguindo as regras, ADRs e testes do projeto.
---

# Nova funcionalidade

1. Ler `AGENTS.md`, `docs/requirements.md` e a fase correspondente em `docs/roadmap.md`.
2. Descrever o plano (arquivos, modelo de dados, regras de negócio afetadas) e aguardar aprovação se houver mudança de banco.
3. Se envolver decisão técnica nova, criar ADR (skill decisoes-de-arquitetura).
4. Escrever testes do domínio primeiro (skill motor-de-escala quando aplicável).
5. Implementar; textos de interface seguindo a skill ux-copy-ptbr.
6. Rodar `pnpm lint && pnpm typecheck && pnpm test`.
7. Executar /revisar.
