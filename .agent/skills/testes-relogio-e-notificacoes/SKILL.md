---
name: testes-relogio-e-notificacoes
description: Use ao testar datas, fuso, cron de lembretes (D-7, D-2, D-1) e canais de notificação com adaptador falso.
---

# Relógio e notificações

## Relógio
- Injetar o relógio (função `now()`) no domínio; testes usam relógio congelado/avançável. Nunca depender da data real.
- Cenários: virada de dia, slot que cruza meia-noite, mudança de horário de verão (histórico), limite de 2 por dia no dia civil de America/Sao_Paulo, lembretes em D-7, D-2 e D-1.

## Notificações
- Interface `NotificationChannel`; em teste, `FakeChannel` que registra mensagens (destinatário mascarado, tipo, texto) e permite simular falha.
- Casos: envio por canal preferido, fallback quando falha, opt-out respeitado, destinatário sempre do banco, limite de envios por usuário/dia, idempotência (rodar o job duas vezes), webhook com assinatura inválida e replay rejeitados.
- Texto: teste de snapshot dos templates em pt-BR (nome, data, hora, função, link) e checagem de que não vaza dado sensível.
- Envio real só manualmente, com número e e-mail de teste, em ambiente de homologação.
