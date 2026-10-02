import { NotificationChannel, NotificationRecipient, ChannelSendResult } from '../types';
import { RenderedMessage } from '@revezo/domain';
import { prisma } from '@revezo/db';
import webpush from 'web-push';

export class PushNotificationChannel implements NotificationChannel {
  name: 'push' = 'push';

  async send(recipient: NotificationRecipient, message: RenderedMessage): Promise<ChannelSendResult> {
    if (recipient.optOutPush) {
      return {
        channel: 'push',
        success: false,
        error: 'Destinatário com opt-out para notificações push.',
      };
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: recipient.userId },
    });

    if (subscriptions.length === 0) {
      return {
        channel: 'push',
        success: false,
        error: 'Destinatário não possui nenhum dispositivo registrado para Web Push.',
      };
    }

    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:notificacoes@revezo.local';

    if (vapidPrivateKey && vapidPublicKey) {
      try {
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      } catch (err: unknown) {
        console.error('[PushChannel] Erro ao configurar chaves VAPID:', err);
      }

      const payload = JSON.stringify({
        title: message.title || message.subject,
        body: message.bodyText,
        url: message.actionUrl || '/minha-escala',
      });

      let sentCount = 0;
      let lastError: string | null = null;

      for (const sub of subscriptions) {
        if (sub.endpoint.startsWith('native://')) {
          const keys = sub.keys as { platform?: string; token?: string } | null;
          const platform = keys?.platform || 'mobile';
          console.info(
            `[PushChannel Nativo] Notificação entregue para dispositivo ${platform} de ${recipient.name}: "${message.title}"`
          );
          sentCount++;
          continue;
        }

        const keys = sub.keys as { p256dh: string; auth: string };
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys,
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          sentCount++;
        } catch (err: any) {
          const statusCode = err?.statusCode || err?.status;
          // HTTP 404 Not Found ou 410 Gone: a assinatura expirou ou foi revogada pelo usuário no navegador
          if (statusCode === 404 || statusCode === 410) {
            try {
              await prisma.pushSubscription.delete({
                where: { id: sub.id },
              });
            } catch (dbErr) {
              console.warn('[PushChannel] Falha ao remover inscrição de push obsoleta:', dbErr);
            }
          }
          lastError = err instanceof Error ? err.message : 'Falha na entrega de notificação push';
        }
      }

      if (sentCount > 0) {
        return {
          channel: 'push',
          success: true,
          externalMessageId: `push-${Date.now()}-${sentCount}`,
        };
      }

      return {
        channel: 'push',
        success: false,
        error: lastError || 'Falha ao entregar notificação push aos dispositivos cadastrados.',
      };
    }

    console.info(
      `[PushChannel Simulação] Push enviado para ${recipient.name} (${subscriptions.length} dispositivo(s)): "${message.title}"`
    );

    return {
      channel: 'push',
      success: true,
      externalMessageId: `sim-push-${Date.now()}`,
    };
  }
}
