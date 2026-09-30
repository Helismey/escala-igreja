import { NotificationChannel, NotificationRecipient, ChannelSendResult } from '../types';
import { RenderedMessage, maskPhoneNumber } from '@escala-igreja/domain';

export class WhatsAppNotificationChannel implements NotificationChannel {
  name: 'whatsapp' = 'whatsapp';

  async send(recipient: NotificationRecipient, message: RenderedMessage): Promise<ChannelSendResult> {
    if (recipient.optOutWhatsapp) {
      return {
        channel: 'whatsapp',
        success: false,
        error: 'Destinatário com opt-out para mensagens por WhatsApp.',
      };
    }

    const phone = recipient.whatsapp || recipient.phonePrimary;
    if (!phone) {
      return {
        channel: 'whatsapp',
        success: false,
        error: 'Destinatário sem número de telefone/WhatsApp cadastrado.',
      };
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return {
        channel: 'whatsapp',
        success: false,
        error: 'Número de telefone/WhatsApp inválido ou incompleto.',
      };
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = process.env.EVOLUTION_INSTANCE_NAME || 'escala-igreja';

    if (apiUrl && apiKey) {
      try {
        const endpoint = `${apiUrl.replace(/\/$/, '')}/message/sendText/${instance}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            apikey: apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: cleanPhone,
            options: {
              delay: 1200,
              presence: 'composing',
              linkPreview: true,
            },
            textMessage: {
              text: message.bodyText,
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            channel: 'whatsapp',
            success: false,
            error: data.message || `Erro HTTP ${response.status} na Evolution API`,
          };
        }

        return {
          channel: 'whatsapp',
          success: true,
          externalMessageId: data.key?.id || data.id,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha na requisição ao adaptador de WhatsApp';
        return {
          channel: 'whatsapp',
          success: false,
          error: msg,
        };
      }
    }

    // Modo simulação / desenvolvimento local seguro sem instância conectada
    console.info(
      `[WhatsAppChannel Simulação] Mensagem enviada para ${maskPhoneNumber(phone)}: "${message.subject}"`
    );

    return {
      channel: 'whatsapp',
      success: true,
      externalMessageId: `sim-wpp-${Date.now()}`,
    };
  }
}
