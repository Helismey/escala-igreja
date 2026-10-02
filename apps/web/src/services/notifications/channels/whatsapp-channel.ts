import { NotificationChannel, NotificationRecipient, ChannelSendResult } from '../types';
import { RenderedMessage } from '@escala-igreja/domain';
import {
  WhatsAppProvider,
  MetaCloudWhatsAppProvider,
  EvolutionWhatsAppProvider,
  ZApiWhatsAppProvider,
  SimulationWhatsAppProvider,
} from './whatsapp';

/**
 * Resolve o provedor de WhatsApp ativo com base em variáveis de ambiente:
 * 1. Respeita WHATSAPP_PROVIDER ('meta' | 'evolution' | 'zapi' | 'simulation')
 * 2. Faz auto-detecção pelas credenciais presentes caso WHATSAPP_PROVIDER não esteja explícito
 * 3. Fallback seguro para simulação local caso nenhuma chave esteja configurada
 */
export function resolveWhatsAppProvider(): WhatsAppProvider {
  const configuredProvider = (process.env.WHATSAPP_PROVIDER || '').toLowerCase().trim();

  if (configuredProvider === 'meta') {
    const meta = new MetaCloudWhatsAppProvider();
    if (meta.isConfigured()) return meta;
    console.warn(
      '[WhatsAppNotificationChannel] WHATSAPP_PROVIDER definido como "meta", mas credenciais ausentes. Alternando para simulação.'
    );
    return new SimulationWhatsAppProvider();
  }

  if (configuredProvider === 'evolution') {
    const evo = new EvolutionWhatsAppProvider();
    if (evo.isConfigured()) return evo;
    console.warn(
      '[WhatsAppNotificationChannel] WHATSAPP_PROVIDER definido como "evolution", mas credenciais ausentes. Alternando para simulação.'
    );
    return new SimulationWhatsAppProvider();
  }

  if (configuredProvider === 'zapi') {
    const zapi = new ZApiWhatsAppProvider();
    if (zapi.isConfigured()) return zapi;
    console.warn(
      '[WhatsAppNotificationChannel] WHATSAPP_PROVIDER definido como "zapi", mas credenciais ausentes. Alternando para simulação.'
    );
    return new SimulationWhatsAppProvider();
  }

  if (configuredProvider === 'simulation') {
    return new SimulationWhatsAppProvider();
  }

  // Auto-detecção inteligente
  const meta = new MetaCloudWhatsAppProvider();
  if (meta.isConfigured()) return meta;

  const evo = new EvolutionWhatsAppProvider();
  if (evo.isConfigured()) return evo;

  const zapi = new ZApiWhatsAppProvider();
  if (zapi.isConfigured()) return zapi;

  return new SimulationWhatsAppProvider();
}

export class WhatsAppNotificationChannel implements NotificationChannel {
  name: 'whatsapp' = 'whatsapp';

  private readonly provider: WhatsAppProvider;

  constructor(customProvider?: WhatsAppProvider) {
    this.provider = customProvider || resolveWhatsAppProvider();
  }

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

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return {
        channel: 'whatsapp',
        success: false,
        error: 'Número de telefone/WhatsApp inválido ou incompleto.',
      };
    }

    // Se tiver 10 ou 11 dígitos (número padrão brasileiro sem DDI 55), adiciona o DDI
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
      cleanPhone = `55${cleanPhone}`;
    }

    const sendResult = await this.provider.sendMessage({
      toPhone: cleanPhone,
      text: message.bodyText,
      subject: message.subject,
      actionUrl: message.actionUrl,
    });

    return {
      channel: 'whatsapp',
      success: sendResult.success,
      error: sendResult.error,
      externalMessageId: sendResult.messageId,
    };
  }
}
