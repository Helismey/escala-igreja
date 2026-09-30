import { RenderedMessage } from '@escala-igreja/domain';

export interface NotificationRecipient {
  userId: string;
  name: string;
  email: string;
  phonePrimary?: string | null;
  whatsapp?: string | null;
  preferredChannel: 'WHATSAPP' | 'EMAIL' | 'PUSH' | 'SMS';
  optOutWhatsapp: boolean;
  optOutEmail: boolean;
  optOutPush: boolean;
  optOutSms: boolean;
}

export interface ChannelSendResult {
  success: boolean;
  channel: 'whatsapp' | 'email' | 'push' | 'sms';
  error?: string;
  externalMessageId?: string;
}

export interface NotificationChannel {
  name: 'whatsapp' | 'email' | 'push' | 'sms';
  send(recipient: NotificationRecipient, message: RenderedMessage): Promise<ChannelSendResult>;
}
