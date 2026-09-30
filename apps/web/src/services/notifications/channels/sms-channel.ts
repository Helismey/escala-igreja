import { NotificationChannel, NotificationRecipient, ChannelSendResult } from '../types';
import { RenderedMessage } from '@escala-igreja/domain';

export class SmsNotificationChannel implements NotificationChannel {
  name: 'sms' = 'sms';

  async send(recipient: NotificationRecipient, message: RenderedMessage): Promise<ChannelSendResult> {
    if (recipient.optOutSms) {
      return {
        channel: 'sms',
        success: false,
        error: 'Destinatário com opt-out para mensagens por SMS.',
      };
    }

    // Por padrão (Regra 01 e Roadmap), SMS fica desativado para garantir custo zero
    return {
      channel: 'sms',
      success: false,
      error: 'Canal SMS desativado por padrão para controle de custos operacionais.',
    };
  }
}
