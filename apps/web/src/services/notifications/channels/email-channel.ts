import { NotificationChannel, NotificationRecipient, ChannelSendResult } from '../types';
import { RenderedMessage, maskEmail } from '@revezo/domain';

export class EmailNotificationChannel implements NotificationChannel {
  name: 'email' = 'email';

  async send(recipient: NotificationRecipient, message: RenderedMessage): Promise<ChannelSendResult> {
    if (recipient.optOutEmail) {
      return {
        channel: 'email',
        success: false,
        error: 'Destinatário com opt-out para notificações por e-mail.',
      };
    }

    if (!recipient.email) {
      return {
        channel: 'email',
        success: false,
        error: 'Destinatário sem endereço de e-mail cadastrado.',
      };
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.EMAIL_FROM || 'Revezo <notificacoes@revezo.local>';

    if (apiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [recipient.email],
            subject: message.subject,
            text: message.bodyText,
            html: message.bodyHtml,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            channel: 'email',
            success: false,
            error: data.message || `Erro HTTP ${response.status} ao enviar e-mail`,
          };
        }

        return {
          channel: 'email',
          success: true,
          externalMessageId: data.id,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha na requisição ao provedor de e-mail';
        return {
          channel: 'email',
          success: false,
          error: msg,
        };
      }
    }

    // Modo simulação / desenvolvimento local seguro sem chaves externas
    console.info(`[EmailChannel Simulação] E-mail enviado para ${maskEmail(recipient.email)}: "${message.subject}"`);
    return {
      channel: 'email',
      success: true,
      externalMessageId: `sim-email-${Date.now()}`,
    };
  }
}
