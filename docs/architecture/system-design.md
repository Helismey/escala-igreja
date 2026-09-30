# System design

## Visão geral
```
Navegador/PWA ──► Next.js (App Router, Server Actions) ──► PostgreSQL (Prisma)
                          │
                          ├─ packages/domain/src      regras puras (escala, conflito, substituição)
                          ├─ src/services    banco, notificações (canais plugáveis)
                          └─ Cron diário ──► lembretes D-7, D-2, D-1 ──► Canais: WhatsApp | E-mail | Push | SMS
```

## Componentes
- **Web/PWA**: Server Components por padrão, Client Components só para interação (calendário, formulários). Manifest e service worker para instalação e push.
- **Domínio**: funções puras de elegibilidade, ranking e substituição (ver skill motor-de-escala).
- **Persistência**: PostgreSQL gratuito; transações para atribuição com verificação de conflito.
- **Notificações**: interface `NotificationChannel`, `NotificationLog`, idempotência por (assignment, tipo).
- **Jobs**: cron diário para lembretes e verificação de slots abertos.
- **Arquivos**: fotos em armazenamento de objetos gratuito, com URL assinada.

## Estrutura do código (monorepo)
`apps/web` (Next.js), `packages/domain` (regras puras e autorização), `packages/contracts` (Zod), `packages/db` (Prisma).

## Segurança na arquitetura
Camadas: borda (HTTPS, cabeçalhos, rate limit) → aplicação (validação Zod, `can()`, sessão) → dados (privilégio mínimo, TLS, campos criptografados) → operação (segredos, CI, backups, auditoria). Detalhes em `docs/security/threat-model.md`.

## Fluxos críticos
1. **Atribuir**: valida permissão → verifica elegibilidade (conflito, limite, disponibilidade) em transação → cria Assignment → notifica.
2. **Desmarcar**: marca recusa → escolhe substituto → cria novo Assignment → notifica substituto e gestor; sem candidato, slot aberto e alerta.
3. **Lembrete**: cron → seleciona D+7/D+2/D+1 → envia pelo canal preferido com fallback → registra.

## Escala e confiabilidade
50 a algumas centenas de usuários: um Next.js e um Postgres pequenos bastam. Riscos: limites e pausa de planos gratuitos, bloqueio de número no WhatsApp não oficial, corrida entre atribuições simultâneas. Mitigações estão nos ADRs 002 a 004.

## O que revisitar ao crescer
Fila de jobs dedicada, API oficial do WhatsApp, cache de agenda, particionamento de NotificationLog.
