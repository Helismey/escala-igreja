---
name: notificacoes-multicanal
description: Use ao implementar lembretes (7, 2 e 1 dia antes), confirmações de presença e envio por WhatsApp, e-mail, push ou SMS.
---

# Notificações multicanal

Interface única em `apps/web/src/services/notifications/`:

```ts
interface NotificationChannel {
  name: 'whatsapp' | 'email' | 'push' | 'sms';
  send(to: Recipient, message: RenderedMessage): Promise<SendResult>;
}
```

- Implementações independentes e trocáveis. WhatsApp começa com adaptador via Evolution API (não oficial, número dedicado, risco de bloqueio do número) e pode migrar para a API oficial sem mudar o restante.
- E-mail e Web Push são os canais gratuitos e estáveis; SMS fica desativado por padrão.
- Ordem: canal preferido do usuário, depois fallback na ordem configurada. Registrar cada tentativa em `NotificationLog`.
- Lembretes: job diário (cron) busca escalas que ocorrem em D+7, D+2 e D+1 com Assignment PENDING ou CONFIRMED. Idempotência: chave `assignmentId + tipoLembrete`; nunca enviar duas vezes.
- Envio em lote com pausa entre mensagens de WhatsApp para reduzir risco de bloqueio.
- Mensagens vêm de templates em pt-BR, com nome, data, horário, função e link de confirmação.
- Falha de canal não pode derrubar o job: capturar, registrar e seguir para o próximo.
