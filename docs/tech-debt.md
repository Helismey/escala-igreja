# Dívida técnica

Prioridade = (Impacto + Risco) x (6 - Esforço). Escalas de 1 a 5.

| # | Item | Categoria | Impacto | Risco | Esforço | Prioridade | Plano |
|---|---|---|---|---|---|---|---|
| 1 | Adaptador WhatsApp não oficial | Arquitetura | 3 | 4 | 3 | 21 | Manter interface; avaliar API oficial na Fase 3 |
| 2 | Limites e pausa de banco gratuito | Infraestrutura | 3 | 4 | 2 | 28 | Backup agendado e teste de restauração; ping via cron |
| 3 | Cobertura de testes do motor | Testes | 4 | 4 | 2 | 32 | Testes obrigatórios desde a Fase 1 |
| 4 | ~~GHSA-82fw — vitest path traversal (moderate)~~ | ~~Segurança~~ | ~~3~~ | ~~3~~ | ~~1~~ | ~~18~~ | ✅ **Resolvido em 30/09/2026** — atualizado para vitest ^5.0.2 (correção em >=4.1.11). Detalhes: [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) |

Atualizar a cada fase com /divida-tecnica.

