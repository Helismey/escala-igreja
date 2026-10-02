import { WhatsAppProvider, WhatsAppSendMessagePayload, WhatsAppSendResult } from '../types';
import { maskPhoneNumber } from '@escala-igreja/domain';

export interface ZApiConfig {
  instanceId?: string;
  token?: string;
  clientToken?: string;
}

/**
 * Adaptador para Z-API (provedor brasileiro de integração WhatsApp).
 */
export class ZApiWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'zapi';

  private readonly instanceId: string;
  private readonly token: string;
  private readonly clientToken?: string;

  constructor(config?: ZApiConfig) {
    this.instanceId = config?.instanceId || process.env.ZAPI_INSTANCE_ID || '';
    this.token = config?.token || process.env.ZAPI_TOKEN || '';
    this.clientToken = config?.clientToken || process.env.ZAPI_CLIENT_TOKEN;
  }

  isConfigured(): boolean {
    return Boolean(this.instanceId && this.token);
  }

  async sendMessage(payload: WhatsAppSendMessagePayload): Promise<WhatsAppSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Z-API não configurada (ZAPI_INSTANCE_ID ou ZAPI_TOKEN ausentes).',
      };
    }

    const endpoint = `https://api.z-api.io/instances/${this.instanceId}/token/${this.token}/send-text`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.clientToken) {
        headers['Client-Token'] = this.clientToken;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phone: payload.toPhone,
          message: payload.text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorDetail = data?.message || data?.error || `Erro HTTP ${response.status} na Z-API`;
        console.warn(`[ZApiWhatsAppProvider] Falha no envio para ${maskPhoneNumber(payload.toPhone)}: ${errorDetail}`);
        return {
          success: false,
          error: errorDetail,
        };
      }

      const messageId = data?.zaapId || data?.messageId || data?.id;
      return {
        success: true,
        messageId,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha na requisição à Z-API';
      console.warn(`[ZApiWhatsAppProvider] Erro de rede para ${maskPhoneNumber(payload.toPhone)}: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}
