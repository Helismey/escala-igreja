# ADR-010: Arquitetura de Notificações Multicanal e Idempotência (D-7, D-2 e D-1)

**Status:** Aceita | **Data:** 2026-09-30

## Contexto
A Fase 2 do projeto Escala Igreja exige a implementação de lembretes automáticos para os voluntários escalados em três momentos chave antes do culto: 7 dias antes (D-7), 2 dias antes (D-2) e 1 dia antes (D-1).

Para viabilizar isso com custo zero/baixo, alta confiabilidade e respeito à privacidade dos voluntários (Regras 01, 16 e LGPD):
- Os canais de envio devem ser modulares e desacoplados (`NotificationChannel`), começando com E-mail (gratuito) e Web Push, WhatsApp (adaptador plugável com número dedicado, ADR-003) e SMS (desativado por padrão).
- Deve haver estrita idempotência: o sistema nunca deve enviar mais de um lembrete do mesmo tipo (`D7`, `D2`, `D1`) para a mesma escala (`Assignment`), mesmo em caso de retentativas ou reinicializações do job cron.
- Deve-se respeitar preferências de canal do usuário e opt-outs individuais por canal.
- As mensagens devem conter apenas o mínimo necessário (sem dados pessoais sensíveis) e os logs em `NotificationLog` nunca devem armazenar o número de telefone em texto puro nem o conteúdo integral da mensagem.

## Decisão
1. **Interface única de canal:**
   ```ts
   export interface NotificationChannel {
     name: 'whatsapp' | 'email' | 'push' | 'sms';
     send(recipient: NotificationRecipient, message: RenderedMessage): Promise<ChannelSendResult>;
   }
   ```
2. **Motor de Lembretes no Domínio:**
   A função pura `identifyPendingReminders` recebe a lista de escalas ativas, o momento de referência (fuso `America/Sao_Paulo`) e o histórico de `NotificationLog`, calculando exatamente quais escalas estão na janela de D-7 (168h a 192h antes), D-2 (48h a 72h antes) e D-1 (24h a 48h antes), descartando aquelas que já possuem log de sucesso para aquele tipo de lembrete.
3. **Despachante Inteligente (`NotificationDispatcher`):**
   - Verifica se o recurso está ativado via `FeatureFlag` (`whatsapp_enabled`, etc.).
   - Prioriza o `preferredChannel` do voluntário caso não haja `optOut` para ele.
   - Realiza fallback automático: se o canal preferido falhar ou estiver em opt-out, tenta E-mail ou Push.
   - Introduz intervalo seguro (pausa) entre envios de WhatsApp para reduzir riscos de detecção e bloqueio de número.
4. **Endpoint de Cron Protegido:**
   A rota `/api/cron/reminders` é protegida pelo cabeçalho `Authorization: Bearer <CRON_SECRET>` e pode ser agendada para execução diária.

## Consequências
- **Mais fácil:** Adicionar novos provedores (ex.: migrar de Evolution API para Meta Cloud API) trocando apenas a implementação do adaptador `WhatsAppChannel`.
- **Mais difícil:** Requer monitoramento de entrega e tratamento de falhas transientes de rede.
- **O que revisar:** Na Fase 3, estender o despachante para notificações de substituição automática.
