# Escala Igreja

Escalas de departamentos para igreja: equipes, programas com cronograma próprio, lembretes (7, 2 e 1 dia antes) e substituição automática quando alguém desmarca.

## Estrutura
Monorepo pnpm: `apps/web`, `packages/domain`, `packages/contracts`, `packages/db`. Regras para agentes em `.agent/`. Documentação em `docs/` (segurança em `docs/security/`).

## Como começar no Antigravity
1. Abra a pasta como workspace e confirme que `.agent/rules`, `.agent/skills` e `.agent/workflows` são reconhecidos (renomeie se a sua versão usar outro nome).
2. Configure as permissões do agente conforme `docs/security/agent-hardening.md` ANTES de começar.
3. Peça: "Leia AGENTS.md e docs/roadmap.md e execute a Fase 1."
4. Use `/revisar` antes de cada merge, `/auditoria-seguranca` ao fim de cada fase e `/deploy` antes de publicar.

## Stack (custo zero/baixo)
Next.js + TypeScript + Tailwind, PostgreSQL gratuito (Neon ou Supabase) com Prisma, PWA com Web Push, e-mail gratuito, WhatsApp via adaptador plugável. Depois, Capacitor para lojas.
