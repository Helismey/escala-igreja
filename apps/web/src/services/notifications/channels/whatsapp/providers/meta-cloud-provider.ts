import { WhatsAppProvider, WhatsAppSendMessagePayload, WhatsAppSendResult } from '../types';
import { maskPhoneNumber } from '@escala-igreja/domain';

export interface MetaCloudConfig {
  token?: string;
  phoneNumberId?: string;
  apiVersion?: string;
}

/**
 * Adaptador oficial da Meta WhatsApp Cloud API (Graph API).
 * Provedor recomendado para produção: sem risco de banimento de número e com alta confiabilidade.
 */
export class MetaCloudWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'meta';

  private readonly token: string;
  private readonly phoneNumberId: string;
  private readonly apiVersion: string;

  constructor(config?: MetaCloudConfig) {
    this.token = config?.token || process.env.META_WHATSAPP_TOKEN || '';
    this.phoneNumberId = config?.phoneNumberId || process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';
    this.apiVersion = config?.apiVersion || process.env.META_WHATSAPP_API_VERSION || 'v21.0';
  }

  isConfigured(): boolean {
    return Boolean(this.token && this.phoneNumberId);
  }

  async sendMessage(payload: WhatsAppSendMessagePayload): Promise<WhatsAppSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Meta WhatsApp Cloud API não está configurada (META_WHATSAPP_TOKEN ou META_WHATSAPP_PHONE_NUMBER_ID ausentes).',
      };
    }

    const endpoint = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: payload.toPhone,
          type: 'text',
          text: {
            preview_url: true,
            body: payload.text,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorDetail = data?.error?.message || `Erro HTTP ${response.status} na Meta Cloud API`;
        console.warn(`[MetaWhatsAppProvider] Falha no envio para ${maskPhoneNumber(payload.toPhone)}: ${errorDetail}`);
        return {
          success: false,
          error: errorDetail,
        };
      }

      const messageId = data?.messages?.[0]?.id;
      return {
        success: true,
        messageId,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha na requisição à Meta Cloud API';
      console.warn(`[MetaWhatsAppProvider] Erro de rede para ${maskPhoneNumber(payload.toPhone)}: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}
