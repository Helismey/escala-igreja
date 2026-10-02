import { WhatsAppProvider, WhatsAppSendMessagePayload, WhatsAppSendResult } from '../types';
import { maskPhoneNumber } from '@escala-igreja/domain';

/**
 * Adaptador de simulação segura para ambiente de desenvolvimento ou testes locais.
 * Mascara números de telefone para cumprir a LGPD e não envia dados externos.
 */
export class SimulationWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'simulation';

  async sendMessage(payload: WhatsAppSendMessagePayload): Promise<WhatsAppSendResult> {
    const masked = maskPhoneNumber(payload.toPhone);
    const preview = payload.subject || payload.text.slice(0, 40).replace(/\n/g, ' ');
    console.info(`[WhatsAppChannel Simulação] Mensagem enviada para ${masked}: "${preview}..."`);

    return {
      success: true,
      messageId: `sim-wpp-${Date.now()}`,
    };
  }
}
