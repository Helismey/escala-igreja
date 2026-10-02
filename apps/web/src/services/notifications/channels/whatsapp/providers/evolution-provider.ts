import { WhatsAppProvider, WhatsAppSendMessagePayload, WhatsAppSendResult } from '../types';
import { maskPhoneNumber } from '@revezo/domain';

export interface EvolutionConfig {
  apiUrl?: string;
  apiKey?: string;
  instanceName?: string;
}

/**
 * Adaptador para Evolution API (instância Baileys auto-hospedada).
 */
export class EvolutionWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'evolution';

  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly instanceName: string;

  constructor(config?: EvolutionConfig) {
    this.apiUrl = config?.apiUrl || process.env.EVOLUTION_API_URL || '';
    this.apiKey = config?.apiKey || process.env.EVOLUTION_API_KEY || '';
    this.instanceName = config?.instanceName || process.env.EVOLUTION_INSTANCE_NAME || 'revezo';
  }

  isConfigured(): boolean {
    return Boolean(this.apiUrl && this.apiKey);
  }

  async sendMessage(payload: WhatsAppSendMessagePayload): Promise<WhatsAppSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Evolution API não configurada (EVOLUTION_API_URL ou EVOLUTION_API_KEY ausentes).',
      };
    }

    const endpoint = `${this.apiUrl.replace(/\/$/, '')}/message/sendText/${this.instanceName}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          apikey: this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: payload.toPhone,
          options: {
            delay: 1200,
            presence: 'composing',
            linkPreview: true,
          },
          textMessage: {
            text: payload.text,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorDetail = data?.message || `Erro HTTP ${response.status} na Evolution API`;
        console.warn(`[EvolutionWhatsAppProvider] Falha no envio para ${maskPhoneNumber(payload.toPhone)}: ${errorDetail}`);
        return {
          success: false,
          error: errorDetail,
        };
      }

      const messageId = data?.key?.id || data?.id;
      return {
        success: true,
        messageId,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha na requisição à Evolution API';
      console.warn(`[EvolutionWhatsAppProvider] Erro de rede para ${maskPhoneNumber(payload.toPhone)}: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}
