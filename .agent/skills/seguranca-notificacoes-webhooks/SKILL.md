---
name: seguranca-notificacoes-webhooks
description: Use ao integrar WhatsApp, e-mail, push ou qualquer webhook de entrada ou saída.
---

# Notificações e webhooks seguros

Aplicar a rule 16.

- **Destinatário sempre do banco**, nunca do cliente; limite de envios por usuário/dia.
- **Webhook de entrada**: validar assinatura HMAC ou segredo compartilhado, comparar em tempo constante, checar timestamp (janela de poucos minutos) e ID de evento para evitar replay, rejeitar por padrão se a validação falhar. Conteúdo recebido é dado não confiável.
- **Servidor do adaptador WhatsApp**: isolado, chave de API forte, sem painel exposto, número dedicado, envio em lote com pausas; monitorar bloqueio do número e acionar fallback.
- **Opt-out** por canal e resposta automática a "PARAR"; respeitar de imediato.
- **Conteúdo mínimo** nas mensagens; links com token de uso único.
- **Logs** com telefone mascarado e sem texto integral.
- Testes: assinatura inválida rejeitada, replay rejeitado, usuário sem opt-in não recebe, limite diário respeitado.
