# Roadmap

## Fase 1 — Base
Autenticação, perfis, autocadastro com aprovação, cadastro completo, departamentos e funções, programas com clonagem, escala manual com bloqueio de conflito e limite de 2 por dia, tema da igreja.
Segurança da fase: Argon2id, sessão segura, rate limit, MFA admin, `can()` com matriz de testes, cabeçalhos, `AuditLog`, CI com varredura de segredos e auditoria de dependências.
Critério de pronto: gestor monta uma escala completa, o sistema impede conflito e terceira escala no dia, e o checklist de `docs/security/checklist-pre-release.md` passa.

## Fase 2 — Comunicação
Segurança da fase: tokens de uso único, opt-out, webhooks assinados, logs sem dados pessoais.
Disponibilidade e preferências, confirmação por link, lembretes 7/2/1 dia (e-mail e push primeiro, WhatsApp em seguida), painel de slots abertos.

## Fase 3 — Inteligência
Substituição automática, pedidos de troca, alerta de sobrecarga, histórico de participação.

## Fase 3.5 — Mobile
PWA completo (offline e push) e, se houver demanda, Capacitor (skills pwa-offline-push e migracao-mobile-capacitor; regras 09 e 17).

## Fase 4 — Automação e relatórios
Geração automática de escala por programa, relatórios, refinamentos de desempenho e dívida técnica.
