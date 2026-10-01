# ADR-013: Disparo Real de Notificações Web Push com Chaves VAPID e RFC 8291

**Status:** Aceita | **Data:** 2026-10-01 | **Responsável:** Equipe Escala Igreja

## Contexto
O Escala Igreja necessita de um canal de notificação em tempo real gratuito, direto no celular e sem depender de provedores pagos de SMS ou de instâncias não-oficiais de WhatsApp para avisos críticos (lembretes D-7/D-2/D-1, pedidos de troca e confirmações de escala).

As diretrizes do projeto estabelecem:
- **Custo Zero/Baixo (Regra 01)**: O Web Push padrão dos navegadores modernos (W3C Push API / RFC 8030) é 100% gratuito e suportado no Android (Chrome/Edge/Firefox) e no iOS 16.4+ (Safari quando adicionado à Tela de Início como PWA).
- **Segurança e Privacidade (Regras 15 e 16)**: Chave VAPID privada mantida exclusivamente no servidor; mensagens sem dados pessoais sensíveis; opt-out respeitado pontualmente; remoção imediata de assinaturas expiradas ou revogadas.

## Decisão
1. **Biblioteca e Especificações RFC:**
   - Adotar a dependência `web-push` (`^3.6.7`, licença MPL-2.0, mantida por `web-push-libs`) e `@types/web-push`.
   - Implementa a criptografia simétrica e de envelope com ECDH curva P-256 e HKDF (RFC 8291) com codificação `aes128gcm` e autenticação de servidor VAPID (RFC 8292).
2. **Ciclo de Vida da Assinatura (`PushSubscription`):**
   - Criação do endpoint `/api/push/public-key` para fornecer a chave pública VAPID ao navegador.
   - Endpoint autenticado `/api/push/subscribe` para validar (`pushSubscriptionSchema`) e registrar ou atualizar as chaves `p256dh` e `auth` por dispositivo no banco PostgreSQL via `prisma.pushSubscription.upsert`.
   - Endpoint autenticado `/api/push/unsubscribe` para remover a inscrição associada ao dispositivo quando o usuário desativa o recurso ou faz logout.
3. **Limpeza Automática de Inscrições Obsoletas:**
   - Ao disparar notificações através do `PushNotificationChannel`, se o serviço de push do navegador (Google FCM, Mozilla Autopush, Apple Push) retornar código HTTP `404` (Not Found) ou `410` (Gone), o sistema remove automaticamente o registro correspondente da tabela `PushSubscription`.
4. **Resiliência e Fallback Seguro:**
   - Se as variáveis `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` não estiverem presentes no ambiente (ex.: desenvolvimento local ou CI), o canal opera em modo de simulação emitindo logs informativos mascarados sem derrubar os fluxos da aplicação.
5. **Integração com Service Worker Existente:**
   - O payload enviado respeita a estrutura `{ title: string, body: string, url: string }` já esperada pelo listener `push` do `apps/web/public/sw.js`.

## Consequências
- **Positivas:**
  - Voluntários recebem alertas push instantâneos em seus celulares com custo de infraestrutura zero.
  - O banco de dados não acumula endpoints mortos devido à remoção reativa em 404/410.
  - Conformidade estrita com LGPD e OWASP: as chaves são validadas, os tokens ficam no servidor e o usuário tem controle total de opt-out.
- **Ressalvas:**
  - No iOS, o usuário precisa ter instalado o PWA na tela de início (iOS 16.4+) para receber Web Push, o que já é suportado pelo nosso fluxo de PWA e banner de instalação.
